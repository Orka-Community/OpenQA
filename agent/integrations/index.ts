/**
 * ExternalIntegrations
 *
 * Routes approved findings to the right external tracking system.
 * Supports: Jira, Linear, Azure DevOps, GitHub Issues (existing)
 *
 * Config keys needed:
 *   jira.host, jira.token, jira.project, jira.issueType (default: Bug)
 *   linear.token, linear.teamId
 *   azuredevops.org, azuredevops.token, azuredevops.project
 */

import type { OpenQADatabase, ProposedFinding } from '../../database/index.js';

export interface ExternalTicket {
  system: 'jira' | 'linear' | 'azuredevops' | 'github';
  id: string;
  url: string;
  title: string;
}

export class ExternalIntegrations {
  constructor(private db: OpenQADatabase) {}

  /** Create a ticket in whichever system(s) are configured. */
  async createTicket(finding: ProposedFinding): Promise<ExternalTicket[]> {
    const results: ExternalTicket[] = [];

    const [jiraHost, jiraToken, jiraProject] = await Promise.all([
      this.db.getConfig('jira.host'),
      this.db.getConfig('jira.token'),
      this.db.getConfig('jira.project'),
    ]);

    const [linearToken, linearTeamId] = await Promise.all([
      this.db.getConfig('linear.token'),
      this.db.getConfig('linear.teamId'),
    ]);

    const [adoOrg, adoToken, adoProject] = await Promise.all([
      this.db.getConfig('azuredevops.org'),
      this.db.getConfig('azuredevops.token'),
      this.db.getConfig('azuredevops.project'),
    ]);

    // Try each configured integration
    if (jiraHost && jiraToken && jiraProject) {
      const ticket = await this.createJiraTicket(finding, jiraHost, jiraToken, jiraProject);
      if (ticket) results.push(ticket);
    }

    if (linearToken && linearTeamId) {
      const ticket = await this.createLinearTicket(finding, linearToken, linearTeamId);
      if (ticket) results.push(ticket);
    }

    if (adoOrg && adoToken && adoProject) {
      const ticket = await this.createAzureDevOpsTicket(finding, adoOrg, adoToken, adoProject);
      if (ticket) results.push(ticket);
    }

    return results;
  }

  private async createJiraTicket(
    finding: ProposedFinding,
    host: string,
    token: string,
    project: string
  ): Promise<ExternalTicket | null> {
    // Jira REST API v3
    const issueType = (await this.db.getConfig('jira.issueType')) || 'Bug';
    const priorityMap: Record<string, string> = {
      critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low'
    };

    const body = {
      fields: {
        project: { key: project },
        summary: `[OpenQA] ${finding.title}`,
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: finding.description }] }]
        },
        issuetype: { name: issueType },
        priority: { name: priorityMap[finding.severity] || 'Medium' },
        labels: ['automated-qa', 'openqa', finding.category],
      }
    };

    const url = `https://${host}/rest/api/3/issue`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`openqa@openqa.io:${token}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Jira ticket creation failed: ${response.status} ${await response.text()}`);
      return null;
    }

    const data = await response.json() as { id: string; key: string };
    return {
      system: 'jira',
      id: data.key,
      url: `https://${host}/browse/${data.key}`,
      title: finding.title,
    };
  }

  private async createLinearTicket(
    finding: ProposedFinding,
    token: string,
    teamId: string
  ): Promise<ExternalTicket | null> {
    // Linear GraphQL API
    const priorityMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

    const query = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url title }
        }
      }
    `;

    const variables = {
      input: {
        teamId,
        title: `[OpenQA] ${finding.title}`,
        description: `${finding.description}\n\n**Session:** ${finding.session_id}\n**Confidence:** ${finding.confidence}%\n**Specialist:** ${finding.specialist_type || 'unknown'}`,
        priority: priorityMap[finding.severity] ?? 3,
        labelIds: [],
      }
    };

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { data?: { issueCreate?: { issue?: { id: string; identifier: string; url: string } } } };
    const issue = data.data?.issueCreate?.issue;
    if (!issue) return null;

    return { system: 'linear', id: issue.identifier, url: issue.url, title: finding.title };
  }

  private async createAzureDevOpsTicket(
    finding: ProposedFinding,
    org: string,
    token: string,
    project: string
  ): Promise<ExternalTicket | null> {
    // Azure DevOps REST API
    const severityMap: Record<string, string> = {
      critical: '1 - Critical', high: '2 - High', medium: '3 - Medium', low: '4 - Low'
    };

    const patchDoc = [
      { op: 'add', path: '/fields/System.Title', value: `[OpenQA] ${finding.title}` },
      { op: 'add', path: '/fields/System.Description', value: finding.description },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Severity', value: severityMap[finding.severity] || '3 - Medium' },
      { op: 'add', path: '/fields/System.Tags', value: `automated-qa; openqa; ${finding.category}` },
    ];

    const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitems/$Bug?api-version=7.0`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(patchDoc),
    });

    if (!response.ok) return null;

    const data = await response.json() as { id: number; _links: { html: { href: string } } };
    return {
      system: 'azuredevops',
      id: String(data.id),
      url: data._links.html.href,
      title: finding.title,
    };
  }

  /** Returns which integrations are currently configured. */
  async getConfiguredIntegrations(): Promise<string[]> {
    const configured: string[] = [];
    const [jiraHost, linearToken, adoOrg] = await Promise.all([
      this.db.getConfig('jira.host'),
      this.db.getConfig('linear.token'),
      this.db.getConfig('azuredevops.org'),
    ]);
    if (jiraHost) configured.push('jira');
    if (linearToken) configured.push('linear');
    if (adoOrg) configured.push('azuredevops');
    return configured;
  }
}

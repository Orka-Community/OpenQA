/**
 * ConfidenceScorer
 *
 * Scores a finding from 0 to 100 based on evidence quality.
 *
 * Score >= 75 → auto-approve (high confidence, clear evidence)
 * Score 50-74 → propose for human review
 * Score <  50 → discard (likely false positive)
 *
 * Factors:
 * - Has screenshot evidence:           +30
 * - Has specific payload/selector:     +20
 * - Is a known vulnerability class:    +20
 * - Severity is critical or high:      +15
 * - Description is detailed (>100 ch): +10
 * - Found by security specialist:      +10
 * - Description is vague (<50 chars):  -20
 * - Title contains "might" or "could": -15
 */

export interface ConfidenceResult {
  score: number;          // 0-100
  verdict: 'auto-approve' | 'needs-review' | 'discard';
  reasons: string[];
}

const KNOWN_VULN_CLASSES = [
  'xss', 'cross-site scripting', 'sql injection', 'sqli', 'csrf',
  'authentication bypass', 'directory traversal', 'path traversal',
  'open redirect', 'ssrf', 'xxe', 'rce', 'remote code execution',
  'privilege escalation', 'idor', 'broken access control',
  'sensitive data exposure', 'hardcoded secret', 'api key exposed',
];

const SECURITY_SPECIALISTS = [
  'security-scanner', 'sql-injection', 'xss-tester', 'auth-tester',
  'api-tester', 'github-security-auditor',
];

export class ConfidenceScorer {
  score(finding: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence?: string;
    specialist_type?: string;
    category?: string;
  }): ConfidenceResult {
    let score = 30; // baseline
    const reasons: string[] = [];
    const titleLower = finding.title.toLowerCase();
    const descLower = finding.description.toLowerCase();

    // Evidence: screenshot or specific payload
    if (finding.evidence && (finding.evidence.startsWith('http') || finding.evidence.includes('screenshot'))) {
      score += 30;
      reasons.push('+30 screenshot evidence');
    }

    // Specific payload or selector in description
    const hasPayload = /(<script|' or|1=1|onerror|alert\(|SELECT.*FROM|INSERT.*INTO|UNION.*SELECT)/i.test(finding.description)
      || /selector:|payload:|steps to reproduce:/i.test(finding.description);
    if (hasPayload) {
      score += 20;
      reasons.push('+20 specific payload or reproduction steps');
    }

    // Known vulnerability class
    const isKnownVuln = KNOWN_VULN_CLASSES.some(v => titleLower.includes(v) || descLower.includes(v));
    if (isKnownVuln) {
      score += 20;
      reasons.push('+20 known vulnerability class');
    }

    // Severity
    if (finding.severity === 'critical' || finding.severity === 'high') {
      score += 15;
      reasons.push(`+15 severity is ${finding.severity}`);
    }

    // Detailed description
    if (finding.description.length > 100) {
      score += 10;
      reasons.push('+10 detailed description');
    }

    // Security specialist
    if (finding.specialist_type && SECURITY_SPECIALISTS.includes(finding.specialist_type)) {
      score += 10;
      reasons.push('+10 reported by security specialist');
    }

    // Penalties
    if (finding.description.length < 50) {
      score -= 20;
      reasons.push('-20 description too vague');
    }
    if (/\b(might|could|possibly|may|perhaps|seems)\b/i.test(titleLower + ' ' + descLower)) {
      score -= 15;
      reasons.push('-15 uncertain language detected');
    }

    score = Math.max(0, Math.min(100, score));

    const verdict = score >= 75 ? 'auto-approve' : score >= 50 ? 'needs-review' : 'discard';
    return { score, verdict, reasons };
  }
}

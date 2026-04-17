/**
 * ApiHttpTools
 *
 * HTTP-level testing tools for backend API projects.
 * Works without a browser — pure fetch() requests.
 * Used by backend-api-tester, backend-code-auditor, backend-dependency-scanner specialists.
 */

import type { OpenQADatabase } from '../../database/index.js';

export class ApiHttpTools {
  private baseUrl: string;

  constructor(private db: OpenQADatabase, private sessionId: string, baseUrl: string) {
    // Normalize: remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private url(path: string): string {
    return path.startsWith('http') ? path : `${this.baseUrl}${path}`;
  }

  private async request(
    method: string,
    path: string,
    options: { body?: string; headers?: Record<string, string>; timeoutMs?: number } = {}
  ): Promise<{ status: number; headers: Record<string, string>; body: string; latencyMs: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    const start = Date.now();
    try {
      const res = await fetch(this.url(path), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenQA/2.0 (Automated Backend Testing)',
          ...options.headers,
        },
        body: options.body && method !== 'GET' && method !== 'HEAD' ? options.body : undefined,
        signal: controller.signal,
      });
      const body = await res.text().catch(() => '');
      // Extract headers into a plain object (compatible with Node.js fetch types)
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => { headers[key] = value; });
      return {
        status: res.status,
        latencyMs: Date.now() - start,
        headers,
        body,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  getTools() {
    return [
      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'test_http_endpoint',
        description: 'Make an HTTP request to a backend API endpoint and analyse the response for security issues, errors, and unexpected behaviour. Returns status code, latency, security header analysis, and response preview.',
        parameters: [
          { name: 'method', type: 'string' as const, description: 'HTTP method: GET, POST, PUT, PATCH, DELETE', required: true },
          { name: 'path', type: 'string' as const, description: 'API path (e.g. /api/users) or full URL', required: true },
          { name: 'body', type: 'string' as const, description: 'JSON body string for POST/PUT requests', required: false },
          { name: 'headers', type: 'string' as const, description: 'JSON object of extra request headers', required: false },
          { name: 'expect_status', type: 'number' as const, description: 'Expected HTTP status (default: 200)', required: false },
        ],
        execute: async ({
          method,
          path,
          body,
          headers,
          expect_status = 200,
        }: {
          method: string;
          path: string;
          body?: string;
          headers?: string;
          expect_status?: number;
        }) => {
          let extraHeaders: Record<string, string> = {};
          if (headers) {
            try { extraHeaders = JSON.parse(headers); } catch { /* ignore */ }
          }

          try {
            const res = await this.request(method, path, { body, headers: extraHeaders });

            // ── Security header analysis ─────────────────────────────────────
            const warnings: string[] = [];
            if (!res.headers['x-content-type-options']) warnings.push('Missing X-Content-Type-Options');
            if (!res.headers['x-frame-options'] && !res.headers['content-security-policy']) warnings.push('Missing X-Frame-Options / CSP');
            if (this.url(path).startsWith('https') && !res.headers['strict-transport-security']) warnings.push('Missing HSTS header');
            const server = res.headers['server'] || '';
            if (server && /\d+\.\d+/.test(server)) warnings.push(`Server version disclosed: "${server}"`);
            if (res.status >= 400 && (res.body.includes('stack') || res.body.includes('at Object.') || res.body.includes('Traceback'))) {
              warnings.push('SECURITY: Stack trace / traceback exposed in error response');
            }
            if (/password|secret|token|api_key/i.test(res.body.slice(0, 1000))) {
              warnings.push('SECURITY: Potential credential/secret in response body');
            }

            this.db.createAction({
              session_id: this.sessionId,
              type: 'api_test',
              description: `${method} ${path} → ${res.status}`,
              input: JSON.stringify({ method, path, body }),
              output: `${res.status} (${res.latencyMs}ms)`,
            });

            return {
              output: JSON.stringify({
                url: this.url(path),
                method,
                status: res.status,
                expectedStatus: expect_status,
                statusMatch: res.status === expect_status,
                latencyMs: res.latencyMs,
                contentType: res.headers['content-type'] ?? '',
                responsePreview: res.body.slice(0, 600),
                securityWarnings: warnings,
                securityHeaders: {
                  'x-content-type-options': res.headers['x-content-type-options'] ?? null,
                  'x-frame-options': res.headers['x-frame-options'] ?? null,
                  'content-security-policy': (res.headers['content-security-policy'] ?? null) ? '(present)' : null,
                  'strict-transport-security': res.headers['strict-transport-security'] ?? null,
                  'x-xss-protection': res.headers['x-xss-protection'] ?? null,
                },
              }, null, 2)
            };
          } catch (err: unknown) {
            return { output: `Request failed: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'discover_api_endpoints',
        description: 'Probe common REST API patterns to discover live endpoints. Tests /health, /api/v1, /swagger, /graphql, and resource paths. Returns all endpoints that respond with non-404 status.',
        parameters: [
          { name: 'prefix', type: 'string' as const, description: 'API prefix to probe (default: /api)', required: false },
          { name: 'resource_hints', type: 'string' as const, description: 'Comma-separated resource names to probe (e.g. users,products,orders)', required: false },
        ],
        execute: async ({
          prefix = '/api',
          resource_hints = '',
        }: { prefix?: string; resource_hints?: string }) => {
          const resources = resource_hints ? resource_hints.split(',').map(s => s.trim()).filter(Boolean) : [];

          const probePaths = [
            // Health / status
            '/health', '/healthz', '/ping', '/status', '/ready', '/live',
            '/',
            // API prefixes
            prefix, `${prefix}/v1`, `${prefix}/v2`, `${prefix}/v3`,
            // Auth
            `${prefix}/auth`, `${prefix}/auth/login`, `${prefix}/auth/register`, `${prefix}/login`,
            // Common resources
            `${prefix}/users`, `${prefix}/v1/users`,
            `${prefix}/products`, `${prefix}/v1/products`,
            `${prefix}/orders`, `${prefix}/items`,
            `${prefix}/me`, `${prefix}/v1/me`,
            // Admin / config
            `${prefix}/admin`, `${prefix}/config`, `${prefix}/settings`,
            // Docs
            '/docs', '/swagger', '/swagger-ui', '/openapi.json', '/swagger.json', '/api-docs',
            `${prefix}/docs`, `${prefix}/openapi.json`,
            // GraphQL
            '/graphql', `${prefix}/graphql`,
            // Metrics
            '/metrics', '/api/metrics', '/actuator', '/actuator/health',
          ];

          // Add resource hints
          for (const r of resources) {
            probePaths.push(`${prefix}/${r}`, `${prefix}/v1/${r}`);
          }

          const found: { path: string; status: number; contentType: string; latencyMs: number }[] = [];

          for (const path of [...new Set(probePaths)]) {
            try {
              const res = await this.request('GET', path, { timeoutMs: 3_000 });
              if (res.status !== 404) {
                found.push({ path, status: res.status, contentType: res.headers['content-type'] ?? '', latencyMs: res.latencyMs });
              }
            } catch { /* unreachable / timeout */ }
          }

          this.db.createAction({
            session_id: this.sessionId,
            type: 'endpoint_discovery',
            description: `Probed ${probePaths.length} paths at ${this.baseUrl}`,
            output: `${found.length} endpoints found`,
          });

          if (found.length === 0) {
            return {
              output: `No live endpoints found at ${this.baseUrl}. The server may be down, or the URL in the session config may be incorrect. Check /config and set the correct SaaS URL.`
            };
          }

          return { output: JSON.stringify({ baseUrl: this.baseUrl, found }, null, 2) };
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'test_endpoint_auth',
        description: 'Verify that an endpoint correctly requires authentication. Tests unauthenticated access, invalid tokens, malformed JWTs. A 200 response to any of these is a CRITICAL security vulnerability.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'API path to test (e.g. /api/users)', required: true },
          { name: 'method', type: 'string' as const, description: 'HTTP method (default: GET)', required: false },
        ],
        execute: async ({ path, method = 'GET' }: { path: string; method?: string }) => {
          const tests: { label: string; headers: Record<string, string> }[] = [
            { label: 'No Authorization header', headers: {} },
            { label: 'Invalid Bearer token', headers: { Authorization: 'Bearer invalid_token_openqa_test' } },
            { label: 'Empty Bearer', headers: { Authorization: 'Bearer ' } },
            { label: 'Malformed JWT (aaa.bbb.ccc)', headers: { Authorization: 'Bearer aaa.bbb.ccc' } },
            { label: 'SQL injection in token', headers: { Authorization: "Bearer ' OR '1'='1" } },
          ];

          const results: string[] = [];
          for (const { label, headers } of tests) {
            try {
              const res = await this.request(method, path, { headers, timeoutMs: 5_000 });
              let verdict = `HTTP ${res.status}`;
              if (res.status === 200) verdict += ' 🚨 CRITICAL: endpoint accessible without valid auth!';
              else if (res.status === 401 || res.status === 403) verdict += ' ✅ correctly rejected';
              else if (res.status === 500) verdict += ' ⚠️ 500 on auth check — may expose internal info';
              results.push(`• ${label}: ${verdict}`);
            } catch (e: unknown) {
              results.push(`• ${label}: ERROR — ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          this.db.createAction({
            session_id: this.sessionId,
            type: 'auth_test',
            description: `Auth tests on ${method} ${path}`,
            output: results.join(' | '),
          });

          return { output: `Auth test results for ${method} ${path}:\n${results.join('\n')}` };
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'test_endpoint_injection',
        description: 'Run a battery of injection and abuse tests on an API endpoint: SQL injection, NoSQL injection, XSS, mass assignment, oversized payloads. Reports suspicious responses.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'API path to test', required: true },
          { name: 'method', type: 'string' as const, description: 'HTTP method (default: POST)', required: false },
        ],
        execute: async ({ path, method = 'POST' }: { path: string; method?: string }) => {
          const payloads = [
            { label: 'SQL injection — classic', body: `{"username":"admin'--","password":"x"}` },
            { label: 'SQL injection — OR 1=1', body: `{"q":"' OR '1'='1","id":"1"}` },
            { label: 'SQL injection — UNION', body: `{"id":"1 UNION SELECT null,null,null--"}` },
            { label: 'NoSQL injection — $gt', body: `{"username":{"$gt":""},"password":{"$gt":""}}` },
            { label: 'NoSQL injection — $where', body: `{"$where":"this.password.match(/.*/)"}` },
            { label: 'XSS payload', body: `{"name":"<script>alert(1)</script>","email":"x@openqa.test"}` },
            { label: 'Mass assignment — admin role', body: `{"username":"test","role":"admin","isAdmin":true,"is_staff":true}` },
            { label: 'Empty body', body: `{}` },
            { label: 'Oversized payload (10 KB)', body: JSON.stringify({ data: 'A'.repeat(10_000) }) },
            { label: 'Prototype pollution', body: `{"__proto__":{"admin":true},"constructor":{"prototype":{"admin":true}}}` },
          ];

          const results: string[] = [];
          for (const { label, body } of payloads) {
            try {
              const res = await this.request(method, path, { body, timeoutMs: 8_000 });
              const preview = res.body.slice(0, 150).replace(/\n/g, ' ');
              let finding = `${label}: HTTP ${res.status}`;

              // Flag suspicious outcomes
              if (res.status === 200 && (label.includes('injection') || label.includes('admin') || label.includes('pollution'))) {
                finding += ' 🚨 SUSPICIOUS: 200 with attack payload';
              }
              if (/SQL|syntax error|mysql_|ORA-\d|PG::|pg_exception/i.test(res.body)) {
                finding += ' 🚨 SQL error message in response';
              }
              if (/Traceback|at Object\.|stack:|Exception in thread/i.test(res.body)) {
                finding += ' ⚠️ Stack trace in response';
              }
              if (res.status === 500 && label !== 'Oversized payload (10 KB)') {
                finding += ' ⚠️ Unhandled 500 — may indicate injection succeeded';
              }

              results.push(`• ${finding}\n  preview: ${preview}`);

              this.db.createAction({
                session_id: this.sessionId,
                type: 'injection_test',
                description: `${label} on ${path}`,
                input: body,
                output: `${res.status}`,
              });

              await new Promise(r => setTimeout(r, 150)); // polite delay
            } catch (err: unknown) {
              results.push(`• ${label}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
            }
          }

          return { output: `Injection tests for ${method} ${path}:\n${results.join('\n')}` };
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'test_rate_limiting',
        description: 'Test if an endpoint has rate limiting. Sends 20 rapid requests and checks if any are rejected with 429 Too Many Requests.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'API path to test', required: true },
          { name: 'method', type: 'string' as const, description: 'HTTP method (default: POST)', required: false },
        ],
        execute: async ({ path, method = 'POST' }: { path: string; method?: string }) => {
          const N = 20;
          const statuses: number[] = [];

          const requests = Array.from({ length: N }, () =>
            this.request(method, path, { body: '{}', timeoutMs: 5_000 })
              .then(r => r.status)
              .catch(() => 0)
          );
          const results = await Promise.all(requests);
          statuses.push(...results);

          const rateLimited = statuses.filter(s => s === 429).length;
          const errors = statuses.filter(s => s === 0).length;
          const ok = statuses.filter(s => s >= 200 && s < 300).length;

          this.db.createAction({
            session_id: this.sessionId,
            type: 'rate_limit_test',
            description: `Rate limit test: ${N} concurrent requests to ${path}`,
            output: `429s: ${rateLimited}, 2xx: ${ok}, errors: ${errors}`,
          });

          let verdict = '';
          if (rateLimited > 0) {
            verdict = `✅ Rate limiting active — ${rateLimited}/${N} requests returned 429`;
          } else if (ok === N) {
            verdict = `🚨 No rate limiting detected — all ${N} concurrent requests returned 2xx. This endpoint is vulnerable to brute-force and abuse.`;
          } else {
            verdict = `⚠️ Mixed results — ${ok} ok, ${errors} errors, ${rateLimited} rate-limited. Manual review recommended.`;
          }

          return { output: `Rate limit test for ${method} ${path}:\n${verdict}\nStatus distribution: ${JSON.stringify(statuses)}` };
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      {
        name: 'check_cors_policy',
        description: 'Check the CORS policy of an API endpoint. Detects wildcard origins, missing credentials controls, and overly permissive configurations.',
        parameters: [
          { name: 'path', type: 'string' as const, description: 'API path to check', required: true },
        ],
        execute: async ({ path }: { path: string }) => {
          const origins = [
            'https://evil.attacker.com',
            'http://localhost:3000',
            'null',
          ];

          const findings: string[] = [];

          for (const origin of origins) {
            try {
              const res = await this.request('OPTIONS', path, {
                headers: {
                  Origin: origin,
                  'Access-Control-Request-Method': 'GET',
                  'Access-Control-Request-Headers': 'Authorization',
                },
                timeoutMs: 5_000,
              });

              const acao = res.headers['access-control-allow-origin'] ?? '(none)';
              const acac = res.headers['access-control-allow-credentials'] ?? '(none)';

              let finding = `Origin "${origin}" → ACAO: ${acao}, Credentials: ${acac}`;
              if (acao === '*') finding += ' 🚨 CRITICAL: wildcard origin allows any site to read responses';
              if (acao === origin && acac === 'true') finding += ' 🚨 CRITICAL: echoes arbitrary origin with credentials=true — full CORS bypass';
              if (acao === 'null') finding += ' ⚠️ Allows "null" origin (used by sandboxed iframes — potential exploit)';

              findings.push(`• ${finding}`);
            } catch { /* ignore */ }
          }

          // Also check a simple GET
          try {
            const res = await this.request('GET', path, { headers: { Origin: 'https://evil.attacker.com' }, timeoutMs: 5_000 });
            const acao = res.headers['access-control-allow-origin'];
            if (acao) findings.push(`• GET response ACAO: ${acao}`);
          } catch { /* ignore */ }

          return { output: `CORS policy check for ${path}:\n${findings.join('\n') || '• No CORS headers returned (likely not a public API endpoint)'}` };
        },
      },
    ];
  }
}

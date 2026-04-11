import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';

export interface DiffResult {
  changedFiles: string[];
  affectedTests: string[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export class DiffAnalyzer {
  /**
   * Get files changed between current branch and base branch
   */
  getChangedFiles(repoPath: string, baseBranch: string = 'main'): string[] {
    try {
      const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
        cwd: repoPath,
        stdio: 'pipe',
      }).toString().trim();

      if (!output) return [];
      return output.split('\n').filter(Boolean);
    } catch {
      // Fallback: diff against HEAD~1 if base branch doesn't exist
      try {
        const output = execSync('git diff --name-only HEAD~1', {
          cwd: repoPath,
          stdio: 'pipe',
        }).toString().trim();

        if (!output) return [];
        return output.split('\n').filter(Boolean);
      } catch {
        return [];
      }
    }
  }

  /**
   * Map changed source files to their likely test files
   */
  mapFilesToTests(changedFiles: string[], repoPath: string): string[] {
    const testFiles = new Set<string>();

    for (const file of changedFiles) {
      // Skip non-source files
      if (!this.isSourceFile(file)) continue;

      const candidates = this.getTestCandidates(file);
      for (const candidate of candidates) {
        if (existsSync(join(repoPath, candidate))) {
          testFiles.add(candidate);
        }
      }
    }

    // Also include any changed test files directly
    for (const file of changedFiles) {
      if (this.isTestFile(file)) {
        testFiles.add(file);
      }
    }

    return Array.from(testFiles);
  }

  /**
   * Analyze a diff and return risk assessment + affected tests
   */
  analyze(repoPath: string, baseBranch: string = 'main'): DiffResult {
    const changedFiles = this.getChangedFiles(repoPath, baseBranch);
    const affectedTests = this.mapFilesToTests(changedFiles, repoPath);

    const riskLevel = this.assessRisk(changedFiles);

    const summary = this.buildSummary(changedFiles, affectedTests, riskLevel);

    return { changedFiles, affectedTests, riskLevel, summary };
  }

  private getTestCandidates(filePath: string): string[] {
    const dir = dirname(filePath);
    const base = basename(filePath);
    const candidates: string[] = [];

    // Remove extension
    const nameMatch = base.match(/^(.+)\.(tsx?|jsx?|vue|svelte|py|go|rs)$/);
    if (!nameMatch) return candidates;
    const name = nameMatch[1];
    const ext = nameMatch[2];

    // Common test file patterns
    const testExts = ext.startsWith('ts') ? ['test.ts', 'test.tsx', 'spec.ts', 'spec.tsx']
      : ext.startsWith('js') ? ['test.js', 'test.jsx', 'spec.js', 'spec.jsx']
      : ext === 'py' ? ['test.py']
      : ext === 'go' ? ['_test.go']
      : [];

    for (const testExt of testExts) {
      // Same directory: Foo.test.ts
      candidates.push(join(dir, `${name}.${testExt}`));
      // __tests__ directory: __tests__/Foo.test.ts
      candidates.push(join(dir, '__tests__', `${name}.${testExt}`));
      // test/ directory: test/Foo.test.ts
      candidates.push(join(dir, 'test', `${name}.${testExt}`));
      // tests/ directory: tests/Foo.test.ts
      candidates.push(join(dir, 'tests', `${name}.${testExt}`));
      // Root __tests__: __tests__/dir/Foo.test.ts
      candidates.push(join('__tests__', dir, `${name}.${testExt}`));
    }

    // Go convention: same file with _test suffix
    if (ext === 'go') {
      candidates.push(join(dir, `${name}_test.go`));
    }

    return candidates;
  }

  private isSourceFile(file: string): boolean {
    return /\.(tsx?|jsx?|vue|svelte|py|go|rs)$/.test(file) && !this.isTestFile(file);
  }

  private isTestFile(file: string): boolean {
    return /\.(test|spec)\.(tsx?|jsx?|py)$/.test(file) ||
      /_test\.go$/.test(file) ||
      file.includes('__tests__/');
  }

  private assessRisk(changedFiles: string[]): 'low' | 'medium' | 'high' {
    const highRiskPatterns = [
      /auth/i, /security/i, /middleware/i, /database/i, /migration/i,
      /config/i, /\.env/, /package\.json$/, /docker/i, /ci\//i,
      /payment/i, /billing/i, /permission/i,
    ];

    const mediumRiskPatterns = [
      /api/i, /route/i, /controller/i, /service/i, /model/i,
      /hook/i, /context/i, /store/i, /util/i,
    ];

    let highCount = 0;
    let mediumCount = 0;

    for (const file of changedFiles) {
      if (highRiskPatterns.some(p => p.test(file))) highCount++;
      else if (mediumRiskPatterns.some(p => p.test(file))) mediumCount++;
    }

    if (highCount >= 2 || (highCount >= 1 && changedFiles.length > 5)) return 'high';
    if (highCount >= 1 || mediumCount >= 3) return 'medium';
    return 'low';
  }

  private buildSummary(changedFiles: string[], affectedTests: string[], riskLevel: string): string {
    const lines: string[] = [];
    lines.push(`${changedFiles.length} file(s) changed, ${affectedTests.length} test(s) affected.`);
    lines.push(`Risk level: ${riskLevel}.`);

    if (affectedTests.length > 0) {
      lines.push(`Run: ${affectedTests.slice(0, 5).join(', ')}${affectedTests.length > 5 ? ` (+${affectedTests.length - 5} more)` : ''}`);
    } else if (changedFiles.length > 0) {
      lines.push('No matching test files found — consider running full suite.');
    }

    return lines.join(' ');
  }
}

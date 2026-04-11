import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiffAnalyzer } from '../../../agent/brain/diff-analyzer.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DiffAnalyzer', () => {
  let analyzer: DiffAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new DiffAnalyzer();
    tempDir = join(tmpdir(), `openqa-diff-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  });

  describe('mapFilesToTests', () => {
    it('should map source files to test files that exist', () => {
      // Create test file structure
      mkdirSync(join(tempDir, 'src', 'utils'), { recursive: true });
      mkdirSync(join(tempDir, 'src', 'utils', '__tests__'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'utils', 'auth.ts'), '');
      writeFileSync(join(tempDir, 'src', 'utils', '__tests__', 'auth.test.ts'), '');

      const result = analyzer.mapFilesToTests(
        ['src/utils/auth.ts'],
        tempDir,
      );

      expect(result).toContain('src/utils/__tests__/auth.test.ts');
    });

    it('should include changed test files directly', () => {
      const result = analyzer.mapFilesToTests(
        ['src/auth.test.ts', 'src/login.ts'],
        tempDir,
      );

      expect(result).toContain('src/auth.test.ts');
    });

    it('should find colocated test files', () => {
      mkdirSync(join(tempDir, 'src', 'components'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'components', 'Button.tsx'), '');
      writeFileSync(join(tempDir, 'src', 'components', 'Button.test.tsx'), '');

      const result = analyzer.mapFilesToTests(
        ['src/components/Button.tsx'],
        tempDir,
      );

      expect(result).toContain('src/components/Button.test.tsx');
    });

    it('should skip non-source files', () => {
      const result = analyzer.mapFilesToTests(
        ['README.md', 'package.json', '.env'],
        tempDir,
      );

      expect(result).toHaveLength(0);
    });

    it('should find root __tests__ directory matches', () => {
      mkdirSync(join(tempDir, '__tests__', 'src', 'utils'), { recursive: true });
      writeFileSync(join(tempDir, '__tests__', 'src', 'utils', 'helper.test.ts'), '');

      const result = analyzer.mapFilesToTests(
        ['src/utils/helper.ts'],
        tempDir,
      );

      expect(result).toContain('__tests__/src/utils/helper.test.ts');
    });
  });

  describe('risk assessment (via analyze)', () => {
    it('should return low risk for simple component changes', () => {
      // Not a git repo, so changedFiles will be empty, but we can test mapFilesToTests separately
      // Just test the analyze doesn't crash on a non-git dir
      const result = analyzer.analyze(tempDir);
      expect(result.riskLevel).toBe('low');
      expect(result.changedFiles).toHaveLength(0);
    });
  });
});

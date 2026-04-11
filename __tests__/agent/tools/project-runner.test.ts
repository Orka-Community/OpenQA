import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectRunner } from '../../../agent/tools/project-runner.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ProjectRunner', () => {
  let runner: ProjectRunner;
  let tempDir: string;

  beforeEach(() => {
    runner = new ProjectRunner();
    tempDir = join(tmpdir(), `openqa-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    runner.cleanup();
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  });

  describe('detectProjectType', () => {
    it('should detect a Node.js project with npm', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
        name: 'test-app',
        scripts: { dev: 'next dev', build: 'next build', test: 'vitest' },
        dependencies: { next: '14.0.0', react: '18.0.0' },
        devDependencies: { vitest: '2.0.0', typescript: '5.0.0' },
      }));

      const result = runner.detectProjectType(tempDir);
      expect(result.language).toBe('node');
      expect(result.framework).toBe('next');
      expect(result.packageManager).toBe('npm');
      expect(result.testRunner).toBe('vitest');
      expect(result.devCommand).toBe('npm run dev');
      expect(result.buildCommand).toBe('npm run build');
      expect(result.port).toBe(3000);
    });

    it('should detect pnpm from lockfile', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
        name: 'test',
        scripts: { dev: 'vite' },
        dependencies: { vue: '3.0.0' },
      }));
      writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '');

      const result = runner.detectProjectType(tempDir);
      expect(result.packageManager).toBe('pnpm');
      expect(result.framework).toBe('vue');
    });

    it('should detect yarn from lockfile', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
        name: 'test',
        dependencies: { express: '4.0.0' },
        devDependencies: { jest: '29.0.0' },
        scripts: { start: 'node index.js' },
      }));
      writeFileSync(join(tempDir, 'yarn.lock'), '');

      const result = runner.detectProjectType(tempDir);
      expect(result.packageManager).toBe('yarn');
      expect(result.framework).toBe('express');
      expect(result.testRunner).toBe('jest');
    });

    it('should detect a Python project', () => {
      writeFileSync(join(tempDir, 'requirements.txt'), 'flask==3.0.0\npytest==8.0.0\n');

      const result = runner.detectProjectType(tempDir);
      expect(result.language).toBe('python');
      expect(result.packageManager).toBe('pip');
      expect(result.testRunner).toBe('pytest');
    });

    it('should detect a Go project', () => {
      writeFileSync(join(tempDir, 'go.mod'), 'module example.com/app\ngo 1.22\n');

      const result = runner.detectProjectType(tempDir);
      expect(result.language).toBe('go');
      expect(result.packageManager).toBe('go');
      expect(result.testRunner).toBe('go test');
    });

    it('should detect a Rust project', () => {
      writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "app"\nversion = "0.1.0"\n');

      const result = runner.detectProjectType(tempDir);
      expect(result.language).toBe('rust');
      expect(result.packageManager).toBe('cargo');
      expect(result.testRunner).toBe('cargo test');
    });

    it('should return unknown for unrecognized projects', () => {
      writeFileSync(join(tempDir, 'README.md'), '# Hello');

      const result = runner.detectProjectType(tempDir);
      expect(result.language).toBe('unknown');
      expect(result.packageManager).toBe('unknown');
    });

    it('should throw for non-existent path', () => {
      expect(() => runner.detectProjectType('/nonexistent/path')).toThrow('Path does not exist');
    });

    it('should detect Angular with correct port', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
        name: 'ng-app',
        scripts: { start: 'ng serve' },
        dependencies: { '@angular/core': '17.0.0' },
        devDependencies: {},
      }));

      const result = runner.detectProjectType(tempDir);
      expect(result.framework).toBe('angular');
      expect(result.port).toBe(4200);
    });

    it('should detect Svelte with correct port', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
        name: 'svelte-app',
        scripts: { dev: 'vite dev' },
        dependencies: { svelte: '4.0.0' },
        devDependencies: { playwright: '1.48.0' },
      }));

      const result = runner.detectProjectType(tempDir);
      expect(result.framework).toBe('svelte');
      expect(result.testRunner).toBe('playwright');
      expect(result.port).toBe(5173);
    });
  });

  describe('getStatus', () => {
    it('should return initial status', () => {
      const status = runner.getStatus();
      expect(status.installed).toBe(false);
      expect(status.serverRunning).toBe(false);
      expect(status.serverUrl).toBeNull();
      expect(status.serverPid).toBeNull();
    });
  });
});

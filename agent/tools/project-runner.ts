import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { ProjectRunnerError } from '../errors.js';

/**
 * Resolve and validate a repo path — must be an existing directory.
 * Prevents path traversal by normalising before use.
 */
function sanitizeRepoPath(inputPath: string): string {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new ProjectRunnerError('repoPath must be a non-empty string');
  }
  const resolved = resolve(inputPath);
  try {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      throw new ProjectRunnerError(`repoPath is not a directory: ${resolved}`);
    }
  } catch (err) {
    if (err instanceof ProjectRunnerError) throw err;
    throw new ProjectRunnerError(`repoPath does not exist: ${resolved}`);
  }
  return resolved;
}

export interface ProjectType {
  language: 'node' | 'python' | 'go' | 'rust' | 'unknown';
  framework?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go' | 'unknown';
  scripts: Record<string, string>;
  testRunner?: string;
  devCommand?: string;
  buildCommand?: string;
  port?: number;
}

export interface TestRunResult {
  runner: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  raw: string;
}

export interface ProjectStatus {
  repoPath: string;
  projectType: ProjectType | null;
  installed: boolean;
  serverRunning: boolean;
  serverUrl: string | null;
  serverPid: number | null;
}

export class ProjectRunner extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private serverUrl: string | null = null;
  private installed = false;
  private projectType: ProjectType | null = null;
  private repoPath: string | null = null;

  /**
   * Detect what kind of project lives at the given path
   */
  detectProjectType(repoPath: string): ProjectType {
    repoPath = sanitizeRepoPath(repoPath);

    // Node.js project
    const pkgPath = join(repoPath, 'package.json');
    if (existsSync(pkgPath)) {
      return this.detectNodeProject(repoPath, pkgPath);
    }

    // Python project
    if (existsSync(join(repoPath, 'requirements.txt')) || existsSync(join(repoPath, 'pyproject.toml'))) {
      return this.detectPythonProject(repoPath);
    }

    // Go project
    if (existsSync(join(repoPath, 'go.mod'))) {
      return {
        language: 'go',
        packageManager: 'go',
        scripts: {},
        testRunner: 'go test',
        devCommand: 'go run .',
      };
    }

    // Rust project
    if (existsSync(join(repoPath, 'Cargo.toml'))) {
      return {
        language: 'rust',
        packageManager: 'cargo',
        scripts: {},
        testRunner: 'cargo test',
        devCommand: 'cargo run',
      };
    }

    return { language: 'unknown', packageManager: 'unknown', scripts: {} };
  }

  private detectNodeProject(repoPath: string, pkgPath: string): ProjectType {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts: Record<string, string> = pkg.scripts || {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Detect package manager
    let packageManager: ProjectType['packageManager'] = 'npm';
    if (existsSync(join(repoPath, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (existsSync(join(repoPath, 'yarn.lock'))) packageManager = 'yarn';
    else if (existsSync(join(repoPath, 'bun.lockb'))) packageManager = 'bun';

    // Detect framework
    let framework: string | undefined;
    if (deps['next']) framework = 'next';
    else if (deps['nuxt']) framework = 'nuxt';
    else if (deps['@angular/core']) framework = 'angular';
    else if (deps['svelte'] || deps['@sveltejs/kit']) framework = 'svelte';
    else if (deps['vue']) framework = 'vue';
    else if (deps['react']) framework = 'react';
    else if (deps['express']) framework = 'express';
    else if (deps['fastify']) framework = 'fastify';
    else if (deps['@nestjs/core']) framework = 'nestjs';

    // Detect test runner
    let testRunner: string | undefined;
    if (deps['vitest']) testRunner = 'vitest';
    else if (deps['jest']) testRunner = 'jest';
    else if (deps['mocha']) testRunner = 'mocha';
    else if (deps['playwright'] || deps['@playwright/test']) testRunner = 'playwright';
    else if (deps['cypress']) testRunner = 'cypress';

    // Detect dev command
    let devCommand: string | undefined;
    if (scripts['dev']) devCommand = `${packageManager} run dev`;
    else if (scripts['start']) devCommand = `${packageManager} run start`;
    else if (scripts['serve']) devCommand = `${packageManager} run serve`;

    // Detect build command
    let buildCommand: string | undefined;
    if (scripts['build']) buildCommand = `${packageManager} run build`;

    // Detect port
    let port: number | undefined;
    const devScript = scripts['dev'] || scripts['start'] || '';
    const portMatch = devScript.match(/--port[= ](\d+)|-p[= ]?(\d+)/);
    if (portMatch) {
      port = parseInt(portMatch[1] || portMatch[2]);
    } else if (framework === 'next') {
      port = 3000;
    } else if (framework === 'nuxt' || framework === 'vue') {
      port = 3000;
    } else if (framework === 'angular') {
      port = 4200;
    } else if (framework === 'svelte') {
      port = 5173;
    } else if (framework === 'react') {
      port = 3000;
    }

    return {
      language: 'node',
      framework,
      packageManager,
      scripts,
      testRunner,
      devCommand,
      buildCommand,
      port,
    };
  }

  private detectPythonProject(repoPath: string): ProjectType {
    let testRunner: string | undefined;

    // Check for pytest in requirements
    const reqPath = join(repoPath, 'requirements.txt');
    if (existsSync(reqPath)) {
      const content = readFileSync(reqPath, 'utf-8');
      if (content.includes('pytest')) testRunner = 'pytest';
    }

    const pyprojectPath = join(repoPath, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, 'utf-8');
      if (content.includes('pytest')) testRunner = 'pytest';
    }

    return {
      language: 'python',
      packageManager: 'pip',
      scripts: {},
      testRunner: testRunner || 'pytest',
      devCommand: 'python -m flask run',
    };
  }

  /**
   * Install project dependencies
   */
  async installDependencies(repoPath: string): Promise<void> {
    repoPath = sanitizeRepoPath(repoPath);
    const projectType = this.detectProjectType(repoPath);
    this.projectType = projectType;
    this.repoPath = repoPath;

    let command: string;
    let args: string[];

    switch (projectType.packageManager) {
      case 'pnpm':
        command = 'pnpm'; args = ['install']; break;
      case 'yarn':
        command = 'yarn'; args = ['install']; break;
      case 'bun':
        command = 'bun'; args = ['install']; break;
      case 'npm':
        command = 'npm'; args = ['install']; break;
      case 'pip':
        command = 'pip'; args = ['install', '-r', 'requirements.txt']; break;
      case 'cargo':
        command = 'cargo'; args = ['build']; break;
      case 'go':
        command = 'go'; args = ['mod', 'download']; break;
      default:
        throw new ProjectRunnerError(`Unknown package manager: ${projectType.packageManager}`);
    }

    this.emit('install-start', { command, packageManager: projectType.packageManager });

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: repoPath,
        stdio: 'pipe',
        timeout: 300000, // 5 min
      });

      let output = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.emit('install-progress', { text });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.emit('install-progress', { text });
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.installed = true;
          this.emit('install-complete', { success: true });
          resolve();
        } else {
          const err = new ProjectRunnerError(
            `Install failed (exit code ${code}): ${output.slice(-500)}`,
          );
          this.emit('install-complete', { success: false, error: err.message });
          reject(err);
        }
      });

      proc.on('error', (err) => {
        reject(new ProjectRunnerError(`Failed to spawn ${command}: ${err.message}`));
      });
    });
  }

  /**
   * Start the project's dev server
   */
  async startDevServer(repoPath: string): Promise<{ url: string; pid: number }> {
    repoPath = sanitizeRepoPath(repoPath);
    const projectType = this.projectType || this.detectProjectType(repoPath);
    this.repoPath = repoPath;

    if (!projectType.devCommand) {
      throw new ProjectRunnerError('No dev command detected for this project');
    }

    const [cmd, ...args] = projectType.devCommand.split(' ');

    this.emit('server-starting', { command: projectType.devCommand });

    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        cwd: repoPath,
        stdio: 'pipe',
        detached: true,
      });

      this.serverProcess = proc;
      let resolved = false;

      const readyPatterns = [
        /ready on\s+(https?:\/\/\S+)/i,
        /listening on\s+(https?:\/\/\S+)/i,
        /started on\s+(https?:\/\/\S+)/i,
        /Local:\s+(https?:\/\/\S+)/i,
        /http:\/\/localhost:(\d+)/,
        /http:\/\/127\.0\.0\.1:(\d+)/,
        /http:\/\/0\.0\.0\.0:(\d+)/,
        /ready in \d+/i,
        /compiled successfully/i,
      ];

      const checkOutput = (text: string) => {
        if (resolved) return;

        for (const pattern of readyPatterns) {
          const match = text.match(pattern);
          if (match) {
            resolved = true;
            let url: string;

            if (match[1]?.startsWith('http')) {
              url = match[1];
            } else if (match[1]) {
              url = `http://localhost:${match[1]}`;
            } else if (projectType.port) {
              url = `http://localhost:${projectType.port}`;
            } else {
              url = 'http://localhost:3000';
            }

            this.serverUrl = url;
            this.emit('server-ready', { url, pid: proc.pid });
            resolve({ url, pid: proc.pid! });
            return;
          }
        }
      };

      proc.stdout?.on('data', (data: Buffer) => {
        checkOutput(data.toString());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        checkOutput(data.toString());
      });

      proc.on('error', (err) => {
        if (!resolved) {
          reject(new ProjectRunnerError(`Failed to start dev server: ${err.message}`));
        }
      });

      proc.on('close', (code) => {
        if (!resolved) {
          reject(new ProjectRunnerError(`Dev server exited with code ${code}`));
        }
      });

      // Timeout: if no ready pattern matched after 60s, try probing the port
      setTimeout(async () => {
        if (resolved) return;

        const port = projectType.port || 3000;
        const candidatePorts = [port, 5173, 8080, 4200, 3001];

        for (const p of candidatePorts) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            await fetch(`http://localhost:${p}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            resolved = true;
            const url = `http://localhost:${p}`;
            this.serverUrl = url;
            this.emit('server-ready', { url, pid: proc.pid });
            resolve({ url, pid: proc.pid! });
            return;
          } catch {
            // Port not ready
          }
        }

        reject(new ProjectRunnerError('Dev server did not become ready within 60s'));
      }, 60000);
    });
  }

  /**
   * Run the project's existing test suite
   */
  async runExistingTests(repoPath: string): Promise<TestRunResult> {
    repoPath = sanitizeRepoPath(repoPath);
    const projectType = this.projectType || this.detectProjectType(repoPath);

    if (!projectType.testRunner) {
      throw new ProjectRunnerError('No test runner detected for this project');
    }

    let command: string;
    let args: string[];

    switch (projectType.testRunner) {
      case 'vitest':
        command = 'npx';
        args = ['vitest', 'run', '--reporter=json'];
        break;
      case 'jest':
        command = 'npx';
        args = ['jest', '--json', '--forceExit'];
        break;
      case 'mocha':
        command = 'npx';
        args = ['mocha', '--reporter', 'json'];
        break;
      case 'playwright':
        command = 'npx';
        args = ['playwright', 'test', '--reporter=json'];
        break;
      case 'pytest':
        command = 'python';
        args = ['-m', 'pytest', '--tb=short', '-q'];
        break;
      case 'go test':
        command = 'go';
        args = ['test', '-json', './...'];
        break;
      case 'cargo test':
        command = 'cargo';
        args = ['test', '--', '--format=json'];
        break;
      default:
        command = 'npx';
        args = [projectType.testRunner, '--json'];
    }

    this.emit('test-start', { runner: projectType.testRunner });

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: repoPath,
        stdio: 'pipe',
        timeout: 300000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        this.emit('test-progress', { text: data.toString() });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        const raw = stdout + '\n' + stderr;

        const result = this.parseTestResults(
          projectType.testRunner!,
          stdout,
          stderr,
          durationMs,
        );

        this.emit('test-complete', result);
        // Resolve even if tests fail — the result contains pass/fail info
        resolve(result);
      });

      proc.on('error', (err) => {
        reject(new ProjectRunnerError(`Failed to run tests: ${err.message}`));
      });
    });
  }

  private parseTestResults(
    runner: string,
    stdout: string,
    stderr: string,
    durationMs: number,
  ): TestRunResult {
    const raw = stdout + '\n' + stderr;

    // Try JSON parsing for vitest/jest
    if (runner === 'vitest' || runner === 'jest') {
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*"numPassedTests"[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          return {
            runner,
            passed: json.numPassedTests || 0,
            failed: json.numFailedTests || 0,
            skipped: json.numPendingTests || 0,
            total: json.numTotalTests || 0,
            durationMs,
            raw,
          };
        }
      } catch {
        // Fall through to regex parsing
      }
    }

    // Regex fallback: parse summary lines
    let passed = 0, failed = 0, skipped = 0;

    // "Tests: X passed, Y failed, Z skipped, W total"
    const summaryMatch = raw.match(/(\d+)\s*passed.*?(\d+)\s*failed/i);
    if (summaryMatch) {
      passed = parseInt(summaryMatch[1]);
      failed = parseInt(summaryMatch[2]);
    }

    const passedMatch = raw.match(/(\d+)\s*pass(?:ed|ing)/i);
    if (passedMatch && !summaryMatch) passed = parseInt(passedMatch[1]);

    const failedMatch = raw.match(/(\d+)\s*fail(?:ed|ing|ure)/i);
    if (failedMatch && !summaryMatch) failed = parseInt(failedMatch[1]);

    const skippedMatch = raw.match(/(\d+)\s*(?:skip(?:ped)?|pending|todo)/i);
    if (skippedMatch) skipped = parseInt(skippedMatch[1]);

    return {
      runner,
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
      durationMs,
      raw,
    };
  }

  /**
   * Stop the dev server and clean up
   */
  cleanup() {
    if (this.serverProcess) {
      // Kill the process group (detached)
      try {
        if (this.serverProcess.pid) {
          process.kill(-this.serverProcess.pid, 'SIGTERM');
        }
      } catch {
        // Process may already be dead
        try {
          this.serverProcess.kill('SIGTERM');
        } catch {
          // Ignore
        }
      }
      this.serverProcess = null;
      this.serverUrl = null;
      this.emit('server-stopped');
    }
  }

  getStatus(): ProjectStatus {
    return {
      repoPath: this.repoPath || '',
      projectType: this.projectType,
      installed: this.installed,
      serverRunning: this.serverProcess !== null && !this.serverProcess.killed,
      serverUrl: this.serverUrl,
      serverPid: this.serverProcess?.pid || null,
    };
  }
}

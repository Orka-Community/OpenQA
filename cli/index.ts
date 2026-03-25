#!/usr/bin/env node

import { Command } from 'commander';
import { OpenQAAgent } from '../agent/index.js';
import { ConfigManager } from '../agent/config/index.js';
import { OpenQADatabase } from '../database/index.js';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();
const PID_FILE = './data/openqa.pid';

program
  .name('openqa')
  .description('OpenQA - Autonomous QA Testing Agent powered by Orka.js')
  .version('1.0.0');

program
  .command('start')
  .description('Start the OpenQA agent and web UI')
  .option('-d, --daemon', 'Run in daemon mode')
  .action(async (options) => {
    const spinner = ora('Starting OpenQA...').start();

    try {
      if (existsSync(PID_FILE)) {
        const pid = readFileSync(PID_FILE, 'utf-8').trim();
        try {
          process.kill(parseInt(pid), 0);
          spinner.fail(chalk.red('OpenQA is already running'));
          console.log(chalk.yellow(`PID: ${pid}`));
          console.log(chalk.cyan('Run "openqa stop" to stop it first'));
          process.exit(1);
        } catch {
          unlinkSync(PID_FILE);
        }
      }

      if (options.daemon) {
        const child = spawn('node', [join(process.cwd(), 'dist/cli/daemon.js')], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        
        writeFileSync(PID_FILE, child.pid!.toString());
        
        spinner.succeed(chalk.green('OpenQA started in daemon mode'));
        console.log(chalk.cyan(`PID: ${child.pid}`));
      } else {
        spinner.succeed(chalk.green('OpenQA started'));
        
        const agent = new OpenQAAgent();
        const config = new ConfigManager();
        const cfg = config.getConfig();

        console.log(chalk.cyan('\n📊 OpenQA Status:'));
        console.log(chalk.white(`  Agent: Running`));
        console.log(chalk.white(`  Target: ${cfg.saas.url || 'Not configured'}`));
        console.log(chalk.white(`  Web UI: http://localhost:${cfg.web.port}`));
        console.log(chalk.white(`  DevTools: http://localhost:${cfg.web.port}`));
        console.log(chalk.white(`  Kanban: http://localhost:${cfg.web.port}/kanban`));
        console.log(chalk.white(`  Config: http://localhost:${cfg.web.port}/config`));
        console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

        if (cfg.agent.autoStart) {
          await agent.startAutonomous();
        } else {
          console.log(chalk.yellow('Auto-start disabled. Agent is idle.'));
          console.log(chalk.cyan('Set AGENT_AUTO_START=true to enable autonomous mode'));
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to start OpenQA'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop the OpenQA agent')
  .action(() => {
    const spinner = ora('Stopping OpenQA...').start();

    try {
      if (!existsSync(PID_FILE)) {
        spinner.fail(chalk.red('OpenQA is not running'));
        process.exit(1);
      }

      const pid = readFileSync(PID_FILE, 'utf-8').trim();
      
      try {
        process.kill(parseInt(pid), 'SIGTERM');
        unlinkSync(PID_FILE);
        spinner.succeed(chalk.green('OpenQA stopped'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to stop OpenQA'));
        console.error(chalk.red('Process not found. Cleaning up PID file...'));
        unlinkSync(PID_FILE);
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to stop OpenQA'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show OpenQA status')
  .action(() => {
    const config = new ConfigManager();
    const cfg = config.getConfig();
    const db = new OpenQADatabase(cfg.database.path);

    console.log(chalk.cyan.bold('\n📊 OpenQA Status\n'));

    if (existsSync(PID_FILE)) {
      const pid = readFileSync(PID_FILE, 'utf-8').trim();
      try {
        process.kill(parseInt(pid), 0);
        console.log(chalk.green('✓ Agent: Running'));
        console.log(chalk.white(`  PID: ${pid}`));
      } catch {
        console.log(chalk.red('✗ Agent: Stopped (stale PID file)'));
        unlinkSync(PID_FILE);
      }
    } else {
      console.log(chalk.red('✗ Agent: Stopped'));
    }

    console.log(chalk.cyan('\n🌐 Web Interfaces:'));
    console.log(chalk.white(`  DevTools: http://localhost:${cfg.web.port}`));
    console.log(chalk.white(`  Kanban: http://localhost:${cfg.web.port}/kanban`));
    console.log(chalk.white(`  Config: http://localhost:${cfg.web.port}/config`));

    console.log(chalk.cyan('\n⚙️  Configuration:'));
    console.log(chalk.white(`  LLM Provider: ${cfg.llm.provider}`));
    console.log(chalk.white(`  Target SaaS: ${cfg.saas.url || 'Not configured'}`));
    console.log(chalk.white(`  GitHub: ${cfg.github?.token ? 'Configured' : 'Not configured'}`));
    console.log(chalk.white(`  Test Interval: ${cfg.agent.intervalMs / 1000 / 60} minutes`));

    const sessions = db.getRecentSessions(5);
    console.log(chalk.cyan(`\n📋 Recent Sessions (${sessions.length}):`));
    sessions.forEach(s => {
      const status = s.status === 'completed' ? chalk.green('✓') : s.status === 'failed' ? chalk.red('✗') : chalk.yellow('⟳');
      console.log(chalk.white(`  ${status} ${s.id} - ${s.bugs_found} bugs found`));
    });

    const bugs = db.getBugsByStatus('open');
    console.log(chalk.cyan(`\n🐛 Open Bugs: ${bugs.length}`));

    const tickets = db.getKanbanTickets();
    const byColumn = {
      backlog: tickets.filter(t => t.column === 'backlog').length,
      'to-do': tickets.filter(t => t.column === 'to-do').length,
      'in-progress': tickets.filter(t => t.column === 'in-progress').length,
      done: tickets.filter(t => t.column === 'done').length
    };
    console.log(chalk.cyan('\n📊 Kanban Board:'));
    console.log(chalk.white(`  Backlog: ${byColumn.backlog}`));
    console.log(chalk.white(`  To Do: ${byColumn['to-do']}`));
    console.log(chalk.white(`  In Progress: ${byColumn['in-progress']}`));
    console.log(chalk.white(`  Done: ${byColumn.done}`));
    console.log('');
  });

program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: get, set, list')
  .argument('[key]', 'Configuration key (e.g., llm.provider)')
  .argument('[value]', 'Configuration value')
  .action((action, key, value) => {
    const config = new ConfigManager();

    if (!action || action === 'list') {
      const cfg = config.getConfig();
      console.log(chalk.cyan.bold('\n⚙️  OpenQA Configuration\n'));
      console.log(JSON.stringify(cfg, null, 2));
      console.log('');
      return;
    }

    if (action === 'get') {
      if (!key) {
        console.error(chalk.red('Error: key is required for "get" action'));
        process.exit(1);
      }
      const val = config.get(key);
      console.log(chalk.cyan(`${key}:`), chalk.white(val || 'Not set'));
      return;
    }

    if (action === 'set') {
      if (!key || !value) {
        console.error(chalk.red('Error: key and value are required for "set" action'));
        process.exit(1);
      }
      config.set(key, value);
      console.log(chalk.green(`✓ Set ${key} = ${value}`));
      return;
    }

    console.error(chalk.red(`Unknown action: ${action}`));
    console.log(chalk.cyan('Available actions: get, set, list'));
    process.exit(1);
  });

program
  .command('logs')
  .description('Show agent logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .action((options) => {
    const config = new ConfigManager();
    const cfg = config.getConfig();
    const db = new OpenQADatabase(cfg.database.path);

    const sessions = db.getRecentSessions(1);
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found'));
      return;
    }

    const session = sessions[0];
    const actions = db.getSessionActions(session.id);

    console.log(chalk.cyan.bold(`\n📋 Session Logs: ${session.id}\n`));
    console.log(chalk.white(`Status: ${session.status}`));
    console.log(chalk.white(`Started: ${session.started_at}`));
    console.log(chalk.white(`Actions: ${actions.length}\n`));

    const limit = parseInt(options.lines);
    const displayActions = actions.slice(0, limit);

    displayActions.forEach(action => {
      const icon = action.type === 'navigate' ? '🌐' : 
                   action.type === 'click' ? '👆' :
                   action.type === 'fill' ? '⌨️' :
                   action.type === 'screenshot' ? '📸' :
                   action.type === 'github_issue' ? '🐛' :
                   action.type === 'kanban_ticket' ? '📋' : '•';
      
      console.log(chalk.gray(`[${action.timestamp}]`), icon, chalk.white(action.description));
      if (action.output) {
        console.log(chalk.gray(`  → ${action.output}`));
      }
    });

    console.log('');
  });

program.parse();

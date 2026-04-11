#!/usr/bin/env node
/**
 * auto-changeset.mjs
 * Automatically detects if the package has been modified since its last Git tag
 * and creates a patch changeset if needed.
 * 
 * Logic:
 * - Searches for the Git tag `<name>@<version>`
 * - If the tag exists and files have changed → patch
 * - If the tag does not exist (never published or missing tag) → patch
 * - If a changeset already exists → skip
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const root = process.cwd();
const csDir = join(root, '.changeset');

// ── 1. Read the existing changesets to see if package is already covered. ──
const existingCsFiles = readdirSync(csDir)
  .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'config.json');

if (existingCsFiles.length > 0) {
  console.log(`ℹ  ${existingCsFiles.length} changeset(s) already exist, skipping auto-generation.`);
  process.exit(0);
}

// ── 2. Read package.json ──
const pkgJsonPath = join(root, 'package.json');
if (!existsSync(pkgJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
const { name, version } = pkg;

if (!name || !version) {
  console.error('❌ package.json must have name and version');
  process.exit(1);
}

console.log(`📦 Checking ${name}@${version}...`);

// ── 3. Check if changes exist since last published tag ──
const tag = `${name}@${version}`;
const refTag = `refs/tags/${tag}`;
let hasChanges = false;

try {
  // Check if the tag exists
  execSync(`git rev-parse "${refTag}"`, { stdio: 'pipe' });

  // Look for changes since this tag
  const diff = execSync(
    `git diff --name-only "${refTag}" HEAD -- .`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();

  if (diff) {
    console.log(`📝 Changes detected since ${tag}:`);
    diff.split('\n').slice(0, 10).forEach(f => console.log(`   - ${f}`));
    if (diff.split('\n').length > 10) {
      console.log(`   ... and ${diff.split('\n').length - 10} more files`);
    }
    hasChanges = true;
  } else {
    console.log(`✅ No changes since ${tag}, skipping.`);
    process.exit(0);
  }
} catch {
  // Tag not found → package never published or tag missing
  console.log(`📦 Tag "${tag}" not found, will create changeset for initial/missing publish.`);
  hasChanges = true;
}

if (!hasChanges) {
  console.log('✅ Package is up to date, no changeset needed.');
  process.exit(0);
}

// ── 4. Create a patch changeset ──
const id = randomBytes(4).toString('hex');
const content = `---
"${name}": patch
---

chore: update package
`;

writeFileSync(join(csDir, `auto-${id}.md`), content);

console.log(`\n✅ Changeset created: auto-${id}.md`);
console.log(`   Package: ${name}`);

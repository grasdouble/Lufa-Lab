#!/usr/bin/env node
/**
 * git-dashboard — Analyzes conventional commits on a branch
 *
 * Usage:
 *   node index.js [options]
 *
 * Local mode (default — requires a git repository in the working directory):
 *   --since <value>     Git --since value (default: "3 months ago")
 *   --branch <ref>      Branch ref, e.g. "origin/main" (default: "origin/main")
 *
 * Remote mode (no local clone needed — uses the GitHub REST API):
 *   --repo <owner/name> GitHub repository, e.g. "facebook/react"
 *   --branch <name>     Branch name, e.g. "main" (default: "main")
 *   --token <token>     GitHub token (optional; falls back to GITHUB_TOKEN env)
 *   --since <value>     Same as local mode (default: "3 months ago")
 *
 * Common options:
 *   --output <dir>      Output directory (default: ./output)
 *   --format <list>     Comma-separated list: json,md,html (default: "json,md,html")
 *   --types <list>      Only include these commit types, e.g. "feat,fix"
 *   --help              Show this help
 */

import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { getCommits } from './lib/git.js';
import { getCommitsFromGitHub } from './lib/github.js';
import { computeStats } from './lib/stats.js';
import { writeJsonReport } from './lib/reporters/json.js';
import { writeMarkdownReport } from './lib/reporters/markdown.js';
import { writeHtmlReport } from './lib/reporters/html.js';

// ── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    since: '3 months ago',
    branch: null,        // resolved later based on mode
    repo: null,          // if set → remote mode (GitHub API)
    token: null,         // GitHub token for remote mode
    output: resolve(process.cwd(), 'output'),
    formats: ['json', 'md', 'html'],
    types: [],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--since':
        opts.since = args[++i];
        break;
      case '--branch':
        opts.branch = args[++i];
        break;
      case '--repo':
        opts.repo = args[++i];
        break;
      case '--token':
        opts.token = args[++i];
        break;
      case '--output':
        opts.output = resolve(args[++i]);
        break;
      case '--format':
        opts.formats = args[++i].split(',').map((f) => f.trim().toLowerCase());
        break;
      case '--types':
        opts.types = args[++i].split(',').map((t) => t.trim().toLowerCase());
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  // Resolve branch default based on mode
  if (opts.branch === null) {
    opts.branch = opts.repo ? 'main' : 'origin/main';
  }

  return opts;
}

function printHelp() {
  console.log(`
git-dashboard — Analyzes conventional commits on a branch

Usage:
  node index.js [options]

Local mode (default — requires a git repository in the working directory):
  --since <value>     Git --since value (default: "3 months ago")
  --branch <ref>      Branch ref, e.g. "origin/main" (default: "origin/main")

Remote mode (no local clone needed — uses the GitHub REST API):
  --repo <owner/name> GitHub repository, e.g. "facebook/react"
  --branch <name>     Branch name, e.g. "main" (default: "main")
  --token <token>     GitHub token (optional; falls back to GITHUB_TOKEN env)
  --since <value>     Same as local mode (default: "3 months ago")

Common options:
  --output <dir>      Output directory (default: ./output)
  --format <list>     Comma-separated list: json,md,html (default: "json,md,html")
  --types <list>      Only include these commit types, e.g. "feat,fix"
  --help              Show this help

Examples:
  # Local mode
  node index.js
  node index.js --branch origin/main --since "6 months ago"

  # Remote mode
  node index.js --repo facebook/react
  node index.js --repo facebook/react --branch main --since "6 months ago"
  node index.js --repo facebook/react --types "feat,fix,perf" --format html
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  const isRemote = opts.repo !== null;

  console.log(`\n🔍 git-dashboard`);
  if (isRemote) {
    console.log(`   Mode   : remote (GitHub API)`);
    console.log(`   Repo   : ${opts.repo}`);
  } else {
    console.log(`   Mode   : local (git)`);
  }
  console.log(`   Branch : ${opts.branch}`);
  console.log(`   Since  : ${opts.since}`);
  if (opts.types.length > 0) {
    console.log(`   Types  : ${opts.types.join(', ')}`);
  }
  console.log('');

  // Fetch commits
  console.log('⏳ Fetching commits...');
  let commits;

  if (isRemote) {
    commits = await getCommitsFromGitHub({
      repo: opts.repo,
      branch: opts.branch,
      since: opts.since,
      token: opts.token,
      types: opts.types,
    });
  } else {
    commits = getCommits({
      since: opts.since,
      branch: opts.branch,
      types: opts.types,
    });
  }

  if (commits.length === 0) {
    console.warn('⚠️  No commits found for the given parameters.');
    process.exit(0);
  }

  console.log(`✅ Found ${commits.length} commit(s).`);

  // Compute stats
  const stats = computeStats(commits);

  // Print quick summary to terminal
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total          : ${stats.total}`);
  console.log(`   Conventional   : ${stats.conventional}`);
  console.log(`   Non-conv.      : ${stats.nonConventional}`);
  console.log(`   Breaking (!)   : ${stats.breaking}`);
  console.log('');
  console.log('   By type:');
  for (const [type, data] of Object.entries(stats.byType)) {
    console.log(`     ${type.padEnd(12)}: ${data.count}`);
  }
  console.log('');

  // Write reports
  mkdirSync(opts.output, { recursive: true });
  const written = [];

  if (opts.formats.includes('json')) {
    const p = writeJsonReport({ repo: opts.repo, since: opts.since, branch: opts.branch, commits, stats, outputDir: opts.output });
    written.push(p);
  }
  if (opts.formats.includes('md')) {
    const p = writeMarkdownReport({ repo: opts.repo, since: opts.since, branch: opts.branch, commits, stats, outputDir: opts.output });
    written.push(p);
  }
  if (opts.formats.includes('html')) {
    const p = writeHtmlReport({ outputDir: opts.output });
    written.push(p);
  }

  if (written.length > 0) {
    console.log('📁 Output files:');
    for (const p of written) console.log(`   ${p}`);
  }

  console.log('\n✅ Done.\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

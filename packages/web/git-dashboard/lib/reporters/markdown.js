import { writeFileSync } from 'fs';
import { join } from 'path';
import { KNOWN_TYPES, TYPE_LABELS } from '../stats.js';

/**
 * Formats an ISO date string to a readable UTC datetime.
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—';
  return iso.replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace(/\+00:00$/, ' UTC');
}

/**
 * Writes the full analysis as commit-analysis.md.
 *
 * @param {Object} opts
 * @param {string} opts.since
 * @param {string} opts.branch
 * @param {Array}  opts.commits
 * @param {Object} opts.stats
 * @param {string} opts.outputDir
 * @returns {string} path to the written file
 */
export function writeMarkdownReport({ repo, since, branch, commits, stats, outputDir }) {
  const lines = [];

  lines.push('# Commit Analysis');
  lines.push('');
  if (repo) lines.push(`- **Repo:** \`${repo}\``);
  lines.push(`- **Branch:** \`${branch}\``);
  lines.push(`- **Since:** ${since}`);
  if (stats.timeRange.first) {
    lines.push(`- **First commit:** ${fmtDate(stats.timeRange.first)}`);
    lines.push(`- **Last commit:** ${fmtDate(stats.timeRange.last)}`);
  }
  lines.push('');

  // ── Summary ──────────────────────────────────────────────────────────────
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total commits | **${stats.total}** |`);
  lines.push(`| Conventional commits | ${stats.conventional} |`);
  lines.push(`| Non-conventional commits | ${stats.nonConventional} |`);
  lines.push(`| Breaking changes (\`!\`) | ${stats.breaking} |`);
  lines.push('');

  // ── By type ───────────────────────────────────────────────────────────────
  lines.push('## Commits by Type');
  lines.push('');
  lines.push('| Type | Count | Breaking | % of conventional |');
  lines.push('|------|------:|--------:|------------------:|');

  const orderedTypes = [
    ...KNOWN_TYPES.filter((t) => stats.byType[t]),
    ...Object.keys(stats.byType).filter((t) => !KNOWN_TYPES.includes(t)),
  ];

  for (const type of orderedTypes) {
    const d = stats.byType[type];
    const label = TYPE_LABELS[type] ?? type;
    const pct =
      stats.conventional > 0 ? ((d.count / stats.conventional) * 100).toFixed(1) : '0.0';
    const breakingCell = d.breaking > 0 ? `⚠️ ${d.breaking}` : '—';
    lines.push(`| ${label} | ${d.count} | ${breakingCell} | ${pct}% |`);
  }

  if (stats.unknown.count > 0) {
    lines.push(`| _(non-conventional)_ | ${stats.unknown.count} | — | — |`);
  }
  lines.push('');

  // ── Top authors ────────────────────────────────────────────────────────────
  if (stats.topAuthors.length > 0) {
    lines.push('## Top Authors');
    lines.push('');
    lines.push('| Author | Commits |');
    lines.push('|--------|--------:|');
    for (const { author, count } of stats.topAuthors) {
      lines.push(`| ${author} | ${count} |`);
    }
    lines.push('');
  }

  // ── Per-type commit lists ──────────────────────────────────────────────────
  lines.push('## Commit Details');
  lines.push('');

  for (const type of orderedTypes) {
    const d = stats.byType[type];
    const label = TYPE_LABELS[type] ?? type;
    lines.push(`### ${label} (${d.count})`);
    lines.push('');
    lines.push('| Hash | Date | Author | Scope | Description |');
    lines.push('|------|------|--------|-------|-------------|');
    for (const c of d.commits) {
      const shortHash = c.hash.slice(0, 7);
      const scope = c.scope ? `\`${c.scope}\`` : '—';
      const desc = c.breaking ? `**[BREAKING]** ${c.description}` : c.description;
      lines.push(`| \`${shortHash}\` | ${fmtDate(c.date)} | ${c.author} | ${scope} | ${desc} |`);
    }
    lines.push('');
  }

  // ── Non-conventional commits ───────────────────────────────────────────────
  if (stats.unknown.count > 0) {
    lines.push(`### Non-conventional commits (${stats.unknown.count})`);
    lines.push('');
    lines.push('| Hash | Date | Author | Subject |');
    lines.push('|------|------|--------|---------|');
    for (const c of stats.unknown.commits) {
      const shortHash = c.hash.slice(0, 7);
      lines.push(`| \`${shortHash}\` | ${fmtDate(c.date)} | ${c.author} | ${c.subject} |`);
    }
    lines.push('');
  }

  const outPath = join(outputDir, 'commit-analysis.md');
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}

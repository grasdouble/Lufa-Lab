import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Writes the full analysis as commit-analysis.json.
 *
 * @param {Object} opts
 * @param {string} opts.since
 * @param {string} opts.branch
 * @param {Array}  opts.commits
 * @param {Object} opts.stats
 * @param {string} opts.outputDir
 * @returns {string} path to the written file
 */
export function writeJsonReport({ repo, since, branch, commits, stats, outputDir }) {
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      ...(repo ? { repo } : {}),
      since,
      branch,
      timeRange: stats.timeRange,
    },
    summary: {
      total: stats.total,
      conventional: stats.conventional,
      nonConventional: stats.nonConventional,
      breaking: stats.breaking,
      topAuthors: stats.topAuthors,
    },
    byType: stats.byType,
    unknown: stats.unknown,
    commits,
  };

  const outPath = join(outputDir, 'commit-analysis.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  return outPath;
}

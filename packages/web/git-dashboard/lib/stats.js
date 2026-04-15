/**
 * All known conventional commit types, in display order.
 */
export const KNOWN_TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'style', 'chore', 'ci', 'build', 'revert'];

/**
 * Human-readable label for each type.
 */
export const TYPE_LABELS = {
  feat: '✨ feat',
  fix: '🐛 fix',
  perf: '⚡ perf',
  refactor: '♻️  refactor',
  docs: '📝 docs',
  test: '🧪 test',
  style: '🎨 style',
  chore: '🔧 chore',
  ci: '⚙️  ci',
  build: '🏗️  build',
  revert: '⏪ revert',
};

/**
 * Computes per-type statistics from a flat list of commits.
 *
 * @param {Array} commits - as returned by getCommits()
 * @returns {{
 *   total: number,
 *   conventional: number,
 *   nonConventional: number,
 *   breaking: number,
 *   byType: Record<string, { count: number, breaking: number, commits: Array }>,
 *   unknown: { count: number, commits: Array },
 *   timeRange: { first: string|null, last: string|null },
 *   topAuthors: Array<{ author: string, count: number }>,
 * }}
 */
export function computeStats(commits) {
  const byType = {};
  const unknown = { count: 0, commits: [] };

  for (const c of commits) {
    if (!c.conventional) {
      unknown.count++;
      unknown.commits.push(c);
      continue;
    }
    if (!byType[c.type]) {
      byType[c.type] = { count: 0, breaking: 0, commits: [] };
    }
    byType[c.type].count++;
    if (c.breaking) byType[c.type].breaking++;
    byType[c.type].commits.push(c);
  }

  const dates = commits.map((c) => c.date).sort();
  const breaking = commits.filter((c) => c.breaking).length;

  // top authors by commit count
  const authorMap = {};
  for (const c of commits) {
    authorMap[c.author] = (authorMap[c.author] ?? 0) + 1;
  }
  const topAuthors = Object.entries(authorMap)
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: commits.length,
    conventional: commits.filter((c) => c.conventional).length,
    nonConventional: commits.filter((c) => !c.conventional).length,
    breaking,
    byType,
    unknown,
    timeRange: { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null },
    topAuthors,
  };
}

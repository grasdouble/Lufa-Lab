import { execSync } from 'child_process';

/**
 * Conventional commit type regex.
 * Matches: feat, fix, chore, docs, style, refactor, test, perf, ci, build, revert
 * Supports optional scope: feat(auth): ...
 * Supports breaking change marker: feat!: ... or feat(auth)!: ...
 */
const CONVENTIONAL_RE =
  /^(feat|fix|chore|docs|style|refactor|test|perf|ci|build|revert)(\([^)]+\))?(!)?: (.+)$/i;

/**
 * Parses a conventional commit subject into its components.
 * Returns null if the subject does not match the conventional commit format.
 *
 * @param {string} subject
 * @returns {{ type: string, scope: string|null, breaking: boolean, description: string } | null}
 */
export function parseConventionalCommit(subject) {
  const m = CONVENTIONAL_RE.exec(subject);
  if (!m) return null;
  return {
    type: m[1].toLowerCase(),
    scope: m[2] ? m[2].slice(1, -1) : null, // strip surrounding parens
    breaking: m[3] === '!',
    description: m[4].trim(),
  };
}

/**
 * Returns all commits on a branch since a given date, with their parsed
 * conventional commit metadata.
 *
 * @param {Object} options
 * @param {string} options.since   - git --since value, e.g. "3 months ago"
 * @param {string} options.branch  - branch ref, e.g. "origin/main"
 * @param {string[]} [options.types] - optional filter: only include these types
 * @returns {Array<{
 *   hash: string,
 *   date: string,
 *   author: string,
 *   subject: string,
 *   type: string|null,
 *   scope: string|null,
 *   breaking: boolean,
 *   description: string|null,
 *   conventional: boolean,
 * }>}
 */
export function getCommits({ since = '3 months ago', branch = 'origin/main', types = [] } = {}) {
  // Use \x1f (unit separator) as field delimiter to handle spaces safely
  const SEP = '\x1f';
  const raw = execSync(
    `git log --format="%H${SEP}%aI${SEP}%aN${SEP}%s" ${branch} --since="${since}"`,
    { encoding: 'utf-8' }
  ).trim();

  if (!raw) return [];

  const commits = raw
    .split('\n')
    .map((line) => {
      const [hash, date, author, ...subjectParts] = line.split(SEP);
      const subject = subjectParts.join(SEP); // subject may contain the separator (unlikely but safe)
      if (!hash || hash.length !== 40) return null;

      const parsed = parseConventionalCommit(subject);
      return {
        hash,
        date,
        author,
        subject,
        type: parsed?.type ?? null,
        scope: parsed?.scope ?? null,
        breaking: parsed?.breaking ?? false,
        description: parsed?.description ?? null,
        conventional: parsed !== null,
      };
    })
    .filter(Boolean);

  if (types.length > 0) {
    const typeSet = new Set(types.map((t) => t.toLowerCase()));
    return commits.filter((c) => c.type && typeSet.has(c.type));
  }

  return commits;
}

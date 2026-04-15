import { parseConventionalCommit } from './git.js';

// GitHub API base URL — hardcoded to prevent SSRF via user-supplied URL
const GITHUB_API = 'https://api.github.com';

/**
 * Converts a git-style --since string or ISO date to an ISO 8601 string
 * suitable for the GitHub API `since` query parameter.
 *
 * Supports:
 *   - Relative: "3 months ago", "2 weeks ago", "1 year ago", "10 days ago"
 *   - ISO date : "2024-01-01" or "2024-01-01T00:00:00Z"
 *
 * @param {string} since
 * @returns {string} ISO 8601 date string
 */
export function parseSinceToISO(since) {
  const trimmed = since.trim();

  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  // Relative: "N day(s)/week(s)/month(s)/year(s) ago"
  const m = /^(\d+)\s+(day|week|month|year)s?\s+ago$/i.exec(trimmed);
  if (!m) {
    throw new Error(
      `Cannot parse --since value for remote mode: "${since}".\n` +
        `Use a relative value like "3 months ago" or an ISO date like "2024-01-01".`
    );
  }

  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const d = new Date();

  switch (unit) {
    case 'day':
      d.setDate(d.getDate() - n);
      break;
    case 'week':
      d.setDate(d.getDate() - n * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() - n);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() - n);
      break;
  }

  return d.toISOString();
}

/**
 * Fetches paginated commits from the GitHub REST API and returns them in the
 * same shape as getCommits() from lib/git.js.
 *
 * @param {Object} options
 * @param {string}   options.repo      - "owner/repo" format, e.g. "facebook/react"
 * @param {string}   options.branch    - branch name (default: "main")
 * @param {string}   options.since     - git-style or ISO date string (default: "3 months ago")
 * @param {string}   [options.token]   - GitHub token; falls back to GITHUB_TOKEN env variable
 * @param {string[]} [options.types]   - filter: only include these commit types
 * @returns {Promise<Array<{
 *   hash: string,
 *   date: string,
 *   author: string,
 *   subject: string,
 *   type: string|null,
 *   scope: string|null,
 *   breaking: boolean,
 *   description: string|null,
 *   conventional: boolean,
 * }>>}
 */
export async function getCommitsFromGitHub({
  repo,
  branch = 'main',
  since = '3 months ago',
  token,
  types = [],
} = {}) {
  // Resolve token — never log it
  const resolvedToken = token ?? process.env.GITHUB_TOKEN ?? null;
  const sinceISO = parseSinceToISO(since);

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'git-dashboard-poc',
  };
  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }

  const allCommits = [];
  let page = 1;

  while (true) {
    const url =
      `${GITHUB_API}/repos/${repo}/commits` +
      `?sha=${encodeURIComponent(branch)}` +
      `&since=${encodeURIComponent(sinceISO)}` +
      `&per_page=100&page=${page}`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) {
        throw new Error(
          `GitHub API: authentication required (401).\n` +
            `Set the GITHUB_TOKEN environment variable or use --token.`
        );
      }
      if (res.status === 403) {
        throw new Error(
          `GitHub API: access forbidden (403) — rate limit or permission issue.\n` +
            `Set GITHUB_TOKEN to increase rate limits.`
        );
      }
      if (res.status === 404) {
        throw new Error(
          `GitHub API: repository or branch not found (404).\n` +
            `Check that --repo "${repo}" and --branch "${branch}" are correct.`
        );
      }
      throw new Error(`GitHub API error ${res.status} ${res.statusText}: ${body}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      const subject = item.commit.message.split('\n')[0].trim();
      const parsed = parseConventionalCommit(subject);
      allCommits.push({
        hash: item.sha,
        date: item.commit.author?.date ?? item.commit.committer?.date ?? null,
        author: item.commit.author?.name ?? item.commit.committer?.name ?? 'unknown',
        subject,
        type: parsed?.type ?? null,
        scope: parsed?.scope ?? null,
        breaking: parsed?.breaking ?? false,
        description: parsed?.description ?? null,
        conventional: parsed !== null,
      });
    }

    // GitHub returns fewer than 100 items on the last page
    if (data.length < 100) break;
    page++;
  }

  if (types.length > 0) {
    const typeSet = new Set(types.map((t) => t.toLowerCase()));
    return allCommits.filter((c) => c.type && typeSet.has(c.type));
  }

  return allCommits;
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GitHubRefResponse = {
  object?: {
    sha?: string;
  };
};

type GitHubCommitResponse = {
  sha?: string;
  commit?: {
    committer?: {
      date?: string;
    };
  };
};

function getEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

async function githubJson<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'technician-drop-portal',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function GET() {
  const owner = getEnv('GITHUB_OWNER');
  const repo = getEnv('GITHUB_REPO');
  const branch = getEnv('GITHUB_BRANCH') || 'main';
  const token = getEnv('GITHUB_TOKEN');

  const railwayBranch = getEnv('RAILWAY_GIT_BRANCH');
  const railwaySha = getEnv('RAILWAY_GIT_COMMIT_SHA');
  const railwayCommit = railwaySha ? railwaySha.slice(0, 7) : '';

  try {
    if (!owner || !repo) {
      throw new Error('Missing GITHUB_OWNER or GITHUB_REPO');
    }

    const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(
      branch
    )}`;
    const refData = await githubJson<GitHubRefResponse>(refUrl, token);

    const sha = refData.object?.sha;
    if (!sha) {
      throw new Error('GitHub ref did not include a SHA');
    }

    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
    const commitData = await githubJson<GitHubCommitResponse>(commitUrl, token);

    const shortCommit = (commitData.sha || sha).slice(0, 7);
    const lastEditedIso =
      commitData.commit?.committer?.date || new Date().toISOString();

    return NextResponse.json({
      branch,
      commit: shortCommit,
      lastEditedIso,
      source: 'github',
    });
  } catch (error) {
    console.error('GET /api/build-info failed:', error);

    return NextResponse.json({
      branch: railwayBranch || branch || 'main',
      commit: railwayCommit || 'unknown',
      lastEditedIso: new Date().toISOString(),
      source: railwayCommit ? 'railway-fallback' : 'fallback',
      error: error instanceof Error ? error.message : 'Failed to load build info',
    });
  }
}

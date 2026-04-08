import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GitHubCommitResponse = {
  sha: string;
  commit?: {
    committer?: {
      date?: string;
    };
  };
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function GET() {
  try {
    const owner = requireEnv('GITHUB_OWNER');
    const repo = requireEnv('GITHUB_REPO');
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'technician-drop-portal',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as GitHubCommitResponse;

    const sha = data.sha?.slice(0, 7) || 'unknown';
    const lastEditedIso = data.commit?.committer?.date || new Date().toISOString();

    return NextResponse.json({
      branch,
      commit: sha,
      lastEditedIso,
    });
  } catch (error) {
    console.error('GET /api/build-info failed:', error);

    return NextResponse.json(
      {
        branch: process.env.GITHUB_BRANCH || 'main',
        commit: 'unknown',
        lastEditedIso: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to load build info',
      },
      { status: 200 }
    );
  }
}

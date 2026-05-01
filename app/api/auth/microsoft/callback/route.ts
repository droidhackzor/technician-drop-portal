import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionToken, getUserByEmail } from '@/lib/auth';

type MicrosoftTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type MicrosoftGraphMe = {
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
};

function clearOauthCookies(response: NextResponse) {
  for (const name of ['ms_oauth_state', 'ms_oauth_verifier', 'ms_oauth_redirect']) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
}

function makeLoginRedirect(req: Request, message: string) {
  const url = new URL('/login', req.url);
  url.searchParams.set('error', message);
  const response = NextResponse.redirect(url);
  clearOauthCookies(response);
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const returnedError = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (returnedError) {
    return makeLoginRedirect(req, 'Microsoft sign-in was cancelled or failed.');
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return makeLoginRedirect(req, 'Microsoft login is not configured.');
  }

  const cookieStore = cookies();
  const expectedState = cookieStore.get('ms_oauth_state')?.value;
  const codeVerifier = cookieStore.get('ms_oauth_verifier')?.value;
  const redirectTo = cookieStore.get('ms_oauth_redirect')?.value || '/dashboard';

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    return makeLoginRedirect(req, 'Microsoft sign-in state mismatch. Please try again.');
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      cache: 'no-store',
    }
  );

  const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    return makeLoginRedirect(req, 'Microsoft token exchange failed.');
  }

  const meResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const me = (await meResponse.json()) as MicrosoftGraphMe;
  const email = me.mail || me.userPrincipalName || '';

  if (!meResponse.ok || !email) {
    return makeLoginRedirect(req, 'Unable to read Microsoft account email.');
  }

  const user = await getUserByEmail(email.toLowerCase());
  if (!user) {
    return makeLoginRedirect(req, 'Your Microsoft account is not allowed for this portal yet.');
  }

  const token = await createSessionToken({
    ...user,
    name: user.name ?? me.displayName ?? null,
  });

  const redirectUrl = new URL(redirectTo.startsWith('/') ? redirectTo : '/dashboard', req.url);
  const response = NextResponse.redirect(redirectUrl);
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set('session', token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  clearOauthCookies(response);
  return response;
}

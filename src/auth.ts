import { html, redirect } from './html.js';
import { cookiePathForBase, joinBasePath, resolveBasePath } from './path.js';

export async function hexSha256(secret: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let out = 0;
  for (let index = 0; index < a.length; index++) {
    out |= (a.codePointAt(index) ?? 0) ^ (b.codePointAt(index) ?? 0);
  }
  return out === 0;
}

export const DEFAULT_COOKIE_NAME = 'admin_auth';

export function adminAuthCookie(
  token: string,
  isSecure: boolean,
  maxAge: number,
  cookieName: string = DEFAULT_COOKIE_NAME,
  path: string = '/',
): string {
  const secureFlag = isSecure ? 'Secure; ' : '';
  return `${cookieName}=${token}; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=${maxAge}; Path=${path}`;
}

export async function isAuthenticated(
  request: Request,
  secret: string,
  cookieName: string = DEFAULT_COOKIE_NAME,
): Promise<boolean> {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (timingSafeEqual(token, secret)) {
      return true;
    }
  }

  const cookie = request.headers.get('Cookie') || '';
  const match = new RegExp(
    String.raw`(?:^|;\s*)${escapeRegExp(cookieName)}=([^;]+)`,
  ).exec(cookie);
  if (!match) {
    return false;
  }
  const expected = await hexSha256(secret);
  return timingSafeEqual(match[1], expected);
}

function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export async function loginResponse(options: {
  secret: string;
  password: string;
  secureCookie: boolean;
  successRedirect?: string;
  loginHtml: (error?: string) => string;
  cookieName?: string;
  cookiePath?: string;
  basePath?: string;
}): Promise<Response> {
  const {
    secret,
    password,
    secureCookie,
    loginHtml: renderLogin,
    cookieName = DEFAULT_COOKIE_NAME,
    cookiePath = '/',
    basePath,
  } = options;
  if (!timingSafeEqual(password, secret)) {
    return html(renderLogin('Invalid password'), 401);
  }
  const successRedirect =
    options.successRedirect ?? joinBasePath(resolveBasePath(basePath));
  const token = await hexSha256(secret);
  return redirect(
    successRedirect,
    adminAuthCookie(token, secureCookie, 86_400, cookieName, cookiePath),
  );
}

export function logoutResponse(options: {
  secureCookie: boolean;
  redirectTo?: string;
  cookieName?: string;
  cookiePath?: string;
  basePath?: string;
}): Response {
  const {
    secureCookie,
    cookieName = DEFAULT_COOKIE_NAME,
    cookiePath = '/',
    basePath,
  } = options;
  const resolvedBase = resolveBasePath(basePath);
  const redirectTo = options.redirectTo ?? joinBasePath(resolvedBase, 'login');
  // Browsers only drop a cookie when Path matches exactly, so clear the
  // configured path, `/`, and the mount-scoped path (e.g. `/admin`).
  const paths = new Set<string>([
    cookiePath,
    '/',
    cookiePathForBase(resolvedBase),
  ]);
  const cookies = [...paths].map((path) =>
    adminAuthCookie('', secureCookie, 0, cookieName, path),
  );
  return redirect(redirectTo, cookies);
}

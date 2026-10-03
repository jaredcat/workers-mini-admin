import { SHARED_CSS } from './css.js';
import { escapeHtml } from './escape.js';
import { joinBasePath, resolveBasePath } from './path.js';

export { escapeHtml } from './escape.js';

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export function redirect(location: string, cookie?: string): Response {
  const headers: Record<string, string> = { Location: location };
  if (cookie) {
    headers['Set-Cookie'] = cookie;
  }
  return new Response(undefined, { status: 302, headers });
}

const DEFAULT_ADMIN_DISABLED_MESSAGE =
  'Admin UI is disabled. Set the ADMIN_SECRET secret (wrangler secret put ADMIN_SECRET).';

export function adminDisabledResponse(message?: string): Response {
  return new Response(message ?? DEFAULT_ADMIN_DISABLED_MESSAGE, {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export function loginPageHtml(options: {
  title: string;
  error?: string;
  action?: string;
  basePath?: string;
}): string {
  const {
    title,
    error,
    basePath,
    action = joinBasePath(resolveBasePath(basePath), 'login'),
  } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — login</title>
  <style>${SHARED_CSS}</style>
</head>
<body class="admin-body">
  <div class="login-shell">
  <div class="panel-card">
  <h1>${escapeHtml(title)}</h1>
  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
  <form method="post" action="${escapeHtml(action)}">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <div class="actions">
      <button type="submit" class="btn-primary">Sign in</button>
    </div>
  </form>
  </div>
  </div>
</body>
</html>`;
}

export function adminPage(options: {
  title: string;
  body: string;
  flash?: string;
  hint?: string;
  logoutAction?: string;
  basePath?: string;
}): string {
  const {
    title,
    body,
    flash,
    hint,
    basePath,
    logoutAction = joinBasePath(resolveBasePath(basePath), 'logout'),
  } = options;
  const flashClass = flash?.startsWith('Error:') ? 'flash-err' : 'ok';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${SHARED_CSS}</style>
</head>
<body class="admin-body">
  <div class="page-shell">
  <header class="page-header">
    <h1>${escapeHtml(title)}</h1>
    ${hint ? `<p class="hint">${hint}</p>` : ''}
  </header>
  ${flash ? `<p class="${flashClass}">${escapeHtml(flash)}</p>` : ''}
  <div class="panel-card">
  ${body}
  </div>
  <form method="post" action="${escapeHtml(logoutAction)}" style="margin-top:0.75rem">
    <button type="submit" class="btn-ghost">Sign out</button>
  </form>
  </div>
</body>
</html>`;
}

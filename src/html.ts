import { SHARED_CSS } from './css.js';
import { escapeHtml } from './escape.js';
import { joinBasePath, resolveBasePath } from './path.js';

export { escapeHtml } from './escape.js';

export type FlashTone = 'ok' | 'warn' | 'error';

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export function redirect(
  location: string,
  cookie?: string | readonly string[],
): Response {
  const headers = new Headers({ Location: location });
  if (typeof cookie === 'string') {
    headers.append('Set-Cookie', cookie);
  } else if (cookie) {
    for (const value of cookie) {
      headers.append('Set-Cookie', value);
    }
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

/**
Allow only simple CSS lengths for shellMaxWidth (no injection).
*/
export function isSafeCssLength(value: string): boolean {
  return /^-?\d+(\.\d+)?(px|rem|em|%|ch|vw|vh)$/.test(value.trim());
}

export function resolveFlashClass(
  flash: string,
  tone?: FlashTone,
): 'ok' | 'warn' | 'flash-err' {
  if (tone === 'error' || (!tone && flash.startsWith('Error:'))) {
    return 'flash-err';
  }
  return tone === 'warn' || (!tone && /\bfailed\b/i.test(flash))
    ? 'warn'
    : 'ok';
}

function bodyAttributesToString(attributes?: Record<string, string>): string {
  if (!attributes) {
    return '';
  }
  let out = '';
  for (const [key, value] of Object.entries(attributes)) {
    out += ` ${escapeHtml(key)}="${escapeHtml(value)}"`;
  }
  return out;
}

export interface AdminPageOptions {
  title: string;
  body: string;
  flash?: string;
  flashTone?: FlashTone;
  /**
  Hint under the title. Not escaped — may include trusted HTML (e.g. `<code>`).
  */
  hint?: string;
  logoutAction?: string;
  basePath?: string;
  /**
  Appended after shared CSS (app-specific rules).
  */
  extraCss?: string;
  /**
  Sets `.page-shell { max-width }`. Must be a simple length (e.g. `1200px`).
  */
  shellMaxWidth?: string;
  /**
  When false, `body` is not wrapped in `.panel-card` (default true).
  Use for multi-panel / bring-your-own-card layouts.
  */
  wrapBody?: boolean;
  /**
  Attributes merged onto `<body>` (values escaped).
  */
  bodyAttrs?: Record<string, string>;
}

export function adminPage(options: AdminPageOptions): string {
  const {
    title,
    body,
    flash,
    flashTone,
    hint,
    basePath,
    extraCss,
    shellMaxWidth,
    wrapBody = true,
    bodyAttrs,
    logoutAction = joinBasePath(resolveBasePath(basePath), 'logout'),
  } = options;
  const flashClass = flash ? resolveFlashClass(flash, flashTone) : 'ok';
  const shellRule =
    shellMaxWidth && isSafeCssLength(shellMaxWidth)
      ? '\n.page-shell { max-width: ' + shellMaxWidth.trim() + '; }'
      : '';
  const styles = SHARED_CSS + shellRule + (extraCss ? '\n' + extraCss : '');
  const main = wrapBody
    ? `<div class="panel-card">
  ${body}
  </div>`
    : body;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body class="admin-body"${bodyAttributesToString(bodyAttrs)}>
  <div class="page-shell">
  <header class="page-header">
    <h1>${escapeHtml(title)}</h1>
    ${hint ? `<p class="hint">${hint}</p>` : ''}
  </header>
  ${flash ? `<p class="${flashClass}">${escapeHtml(flash)}</p>` : ''}
  ${main}
  <form method="post" action="${escapeHtml(logoutAction)}" style="margin-top:0.75rem">
    <button type="submit" class="btn-ghost">Sign out</button>
  </form>
  </div>
</body>
</html>`;
}

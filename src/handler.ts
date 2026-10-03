import {
  DEFAULT_COOKIE_NAME,
  isAuthenticated,
  loginResponse,
  logoutResponse,
} from './auth.js';
import { adminForm, formText, type Field } from './form.js';
import {
  adminDisabledResponse,
  adminPage,
  html,
  loginPageHtml,
} from './html.js';
import {
  cookiePathForBase,
  joinBasePath,
  normalizeBasePath,
  relativeToBase,
} from './path.js';

export type AdminRenderResult = {
  hint?: string;
  flash?: string;
  submitLabel?: string;
} & (
  { fields: Field[]; body?: undefined } | { body: string; fields?: undefined }
);

export type AdminSaveResult = {
  flash?: string;
};

export type AdminRouteContext<Env = unknown> = {
  request: Request;
  env: Env;
  url: URL;
  secret: string;
  basePath: string;
  /**
  Relative path under the mount (e.g. `/preview`).
  */
  path: string;
  requireAuth: () => Promise<Response | undefined>;
};

export type CreateAdminOptions<Env = unknown> = {
  /**
  Mount path. `""` or `"/"` = site root; default `"/admin"`.
  */
  basePath?: string;
  title: string;
  getSecret: (env: Env) => string | undefined;
  cookieName?: string;
  render: (context: {
    request: Request;
    env: Env;
    url: URL;
  }) => AdminRenderResult | Promise<AdminRenderResult>;
  save: (context: {
    request: Request;
    env: Env;
    url: URL;
    form: FormData;
  }) => AdminSaveResult | Promise<AdminSaveResult>;
  /**
   * Extra routes relative to `basePath`, e.g. `"POST /preview"`.
   * Run after secret is present; use `context.requireAuth()` for cookie/Bearer checks.
   */
  routes?: Record<
    string,
    (context: AdminRouteContext<Env>) => Response | Promise<Response>
  >;
  disabledMessage?: string;
};

export type AdminHandler<Env = unknown> = {
  fetch: (request: Request, env: Env) => Promise<Response | undefined>;
};

function isSecureCookie(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

function isRootMount(basePath: string): boolean {
  return normalizeBasePath(basePath) === '';
}

function knownRelativePaths(
  routes: Record<string, unknown> | undefined,
): Set<string> {
  const known = new Set<string>(['/', '/login', '/logout']);
  if (!routes) {
    return known;
  }
  for (const key of Object.keys(routes)) {
    const space = key.indexOf(' ');
    if (space === -1) {
      continue;
    }
    const relativePath = key.slice(space + 1);
    known.add(relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
  }
  return known;
}

export function createAdmin<Env = unknown>(
  options: CreateAdminOptions<Env>,
): AdminHandler<Env> {
  const basePath = normalizeBasePath(options.basePath ?? '/admin');
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const cookiePath = cookiePathForBase(basePath);
  const homePath = joinBasePath(basePath);
  const known = knownRelativePaths(options.routes);

  const loginHtml = (error?: string) =>
    loginPageHtml({
      title: options.title,
      error,
      basePath,
    });

  async function requireAuth(
    request: Request,
    secret: string,
  ): Promise<Response | undefined> {
    const isSignedIn = await isAuthenticated(request, secret, cookieName);
    return isSignedIn ? undefined : html(loginHtml(), 401);
  }

  async function loginGet(request: Request, url: URL, secret: string) {
    const isSignedIn = await isAuthenticated(request, secret, cookieName);
    return isSignedIn
      ? Response.redirect(new URL(homePath, url).href, 302)
      : html(loginHtml());
  }

  async function loginPost(request: Request, secret: string) {
    const form = await request.formData();
    const password = formText(form, 'password');
    return loginResponse({
      secret,
      password,
      secureCookie: isSecureCookie(request),
      basePath,
      cookieName,
      cookiePath,
      loginHtml,
    });
  }

  async function home(
    request: Request,
    env: Env,
    url: URL,
    secret: string,
  ): Promise<Response> {
    const unauth = await requireAuth(request, secret);
    if (unauth) {
      return unauth;
    }

    if (request.method === 'GET') {
      const page = await options.render({ request, env, url });
      return html(renderAdminPage(options.title, basePath, page));
    }

    return request.method === 'POST'
      ? saveHome(request, env, url)
      : new Response('Method not allowed', { status: 405 });
  }

  async function saveHome(request: Request, env: Env, url: URL) {
    try {
      const form = await request.formData();
      const saved = await options.save({
        request,
        env,
        url,
        form,
      });
      const page = await options.render({ request, env, url });
      return html(
        renderAdminPage(options.title, basePath, {
          ...page,
          flash: saved.flash ?? page.flash,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const page = await options.render({ request, env, url });
      return html(
        renderAdminPage(options.title, basePath, {
          ...page,
          flash: `Error: ${message}`,
        }),
        400,
      );
    }
  }

  return {
    async fetch(request, env): Promise<Response | undefined> {
      const url = new URL(request.url);
      const relativePath = relativeToBase(url.pathname, basePath);
      if (relativePath === undefined) {
        return undefined;
      }

      if (isRootMount(basePath) && !known.has(relativePath)) {
        return undefined;
      }

      const secret = options.getSecret(env);
      if (!secret) {
        return adminDisabledResponse(options.disabledMessage);
      }

      const routeKey = `${request.method} ${relativePath}`;
      const custom = options.routes?.[routeKey];
      if (custom) {
        return custom({
          request,
          env,
          url,
          secret,
          basePath,
          path: relativePath,
          requireAuth: () => requireAuth(request, secret),
        });
      }

      if (relativePath === '/login' && request.method === 'GET') {
        return loginGet(request, url, secret);
      }

      if (relativePath === '/login' && request.method === 'POST') {
        return loginPost(request, secret);
      }

      if (relativePath === '/logout' && request.method === 'POST') {
        return logoutResponse({
          secureCookie: isSecureCookie(request),
          basePath,
          cookieName,
          cookiePath,
        });
      }

      if (relativePath === '/') {
        return home(request, env, url, secret);
      }

      return isRootMount(basePath)
        ? undefined
        : new Response('Not found', { status: 404 });
    },
  };
}

function renderAdminPage(
  title: string,
  basePath: string,
  page: AdminRenderResult,
): string {
  let body: string;
  if ('body' in page && page.body !== undefined) {
    body = page.body;
  } else if ('fields' in page) {
    body = adminForm({
      action: joinBasePath(basePath),
      fields: page.fields,
      submitLabel: page.submitLabel,
    });
  } else {
    body = '';
  }
  return adminPage({
    title,
    body,
    flash: page.flash,
    hint: page.hint,
    basePath,
  });
}

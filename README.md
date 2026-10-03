# `@codekitties/workers-mini-admin`

Tiny single-user admin for Cloudflare Workers: password cookie / Bearer auth, HTML chrome, declarative forms, and a configurable mount path.

Declare fields (or pass your own HTML). Domain save/load stays in your Worker.

## Install

```bash
pnpm add @codekitties/workers-mini-admin
```

## Local preview

From a clone of this repo:

```bash
cp playground/.dev.vars.example playground/.dev.vars
pnpm dev
```

Open the URL Wrangler prints, then `/admin`. Login password is `ADMIN_SECRET` from `playground/.dev.vars` (default `dev`). See [playground/README.md](playground/README.md).

## Usage

```ts
import {
  createAdmin,
  parseAdminForm,
  type Field,
} from '@codekitties/workers-mini-admin';

type Env = { ADMIN_SECRET?: string; SETTINGS: KVNamespace };

const admin = createAdmin<Env>({
  basePath: '/admin',
  title: 'My Admin',
  getSecret: (env) => env.ADMIN_SECRET,
  async render({ env }) {
    const note = (await env.SETTINGS.get('note')) ?? '';
    const fields: Field[] = [
      {
        type: 'textarea',
        name: 'note',
        label: 'Note',
        value: note,
      },
    ];
    return {
      hint: 'Signed in. Edit settings below.',
      fields,
      submitLabel: 'Save',
    };
  },
  async save({ form, env }) {
    const values = parseAdminForm(form, [
      { type: 'textarea', name: 'note', label: 'Note' },
    ]);
    await env.SETTINGS.put('note', String(values.note ?? ''));
    return { flash: 'Saved.' };
  },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await admin.fetch(request, env);
    if (res) return res;
    return new Response('Not found', { status: 404 });
  },
};
```

### Mount path / reverse proxy

`basePath` defaults to `"/admin"`. Use `""` or `"/"` when the admin is the site root (e.g. `admin.example.com`):

```ts
createAdmin({
  basePath: '',
  title: 'My Admin',
  // login at /login, logout at /logout, form at /
  getSecret: (env) => env.ADMIN_SECRET,
  render: async () => ({ fields: [] }),
  save: async () => ({ flash: 'Saved.' }),
});
```

Routes, form `action`s, redirects, and the auth cookie `Path` are derived from `basePath`. The Worker must see the same pathname the browser uses (normal on Cloudflare Workers). Path-stripping reverse proxies are not supported.

### Bring your own HTML

Return `body` instead of `fields`, or mix in `{ type: "html", html: "…" }` among fields:

```ts
async render() {
 return {
  body: `<form method="post" action="/admin">…</form>`,
 };
}
```

### Extra routes

For preview/upload endpoints under the mount:

```ts
createAdmin({
  basePath: '/admin',
  title: 'My Admin',
  getSecret: (env) => env.ADMIN_SECRET,
  render: async () => ({ fields: [] }),
  save: async () => ({}),
  routes: {
    'POST /preview': async (ctx) => {
      const unauth = await ctx.requireAuth();
      if (unauth) return unauth;
      return Response.json({ ok: true });
    },
  },
});
```

Unknown paths under a non-root mount return `404`. Paths outside the mount return `undefined` so your Worker can handle them. On a root mount (`basePath: ""`), unknown paths also return `undefined`.

### Low-level helpers

You can still wire auth and chrome yourself (`isAuthenticated`, `loginResponse`, `adminPage`, `adminForm`, …). Omitting `basePath` on those helpers keeps the legacy `/admin` defaults.

### Options

- `adminDisabledResponse(message?)` — optional custom 503 body (default mentions `ADMIN_SECRET`)
- `cookieName` on auth helpers and `createAdmin` — defaults to `admin_auth`
- `cookiePath` on `loginResponse` / `logoutResponse` — `createAdmin` sets this from `basePath`

## API

| Export                               | Role                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `createAdmin`                        | Auth router + form page with configurable `basePath` |
| `adminForm` / `Field`                | Declarative form HTML                                |
| `formText` / `parseAdminForm`        | FormData helpers                                     |
| `escapeHtml`                         | Safe HTML text interpolation                         |
| `hexSha256` / `timingSafeEqual`      | Cookie token helpers                                 |
| `isAuthenticated`                    | Cookie or `Authorization: Bearer` check              |
| `adminAuthCookie`                    | `Set-Cookie` value builder                           |
| `loginResponse` / `logoutResponse`   | Login POST / logout POST handlers                    |
| `html` / `redirect`                  | Small response helpers                               |
| `adminDisabledResponse`              | 503 when admin secret is unset                       |
| `loginPageHtml` / `adminPage`        | HTML shells                                          |
| `joinBasePath` / `normalizeBasePath` | Mount path helpers                                   |

## License

MIT

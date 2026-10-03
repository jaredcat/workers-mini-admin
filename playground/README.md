# Playground

Local preview of `@codekitties/workers-mini-admin` (login, all field types, CSS).

```bash
cp playground/.dev.vars.example playground/.dev.vars
pnpm dev
```

Open the URL Wrangler prints, then go to `/admin`. Password is `ADMIN_SECRET` from `.dev.vars` (default `dev`).

Settings persist in local KV under `.wrangler/state`.

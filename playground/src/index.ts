import { createAdmin, parseAdminForm, type Field } from '../../src/index.ts';

type Env = {
  ADMIN_SECRET?: string;
  SETTINGS: KVNamespace;
};

type DemoSettings = {
  title: string;
  siteUrl: string;
  apiToken: string;
  limit: string;
  notes: string;
  theme: string;
  mode: string;
  enabled: boolean;
  nested: string;
};

const SETTINGS_KEY = 'demo';

const defaultSettings: DemoSettings = {
  title: 'Playground',
  siteUrl: 'https://example.com',
  apiToken: '',
  limit: '10',
  notes: 'Edit fields, save, and reload to confirm KV persistence.',
  theme: 'system',
  mode: 'live',
  enabled: true,
  nested: '',
};

function fieldsFrom(settings: DemoSettings): Field[] {
  return [
    {
      type: 'html',
      html: '<p class="hint">All field types for UI development. Password for login is <code>ADMIN_SECRET</code> from <code>playground/.dev.vars</code>.</p>',
    },
    {
      type: 'text',
      name: 'title',
      label: 'Title',
      value: settings.title,
      required: true,
      placeholder: 'Site title',
    },
    {
      type: 'url',
      name: 'siteUrl',
      label: 'Site URL',
      value: settings.siteUrl,
      placeholder: 'https://…',
    },
    {
      type: 'password',
      name: 'apiToken',
      label: 'API token',
      value: settings.apiToken,
      hint: 'Stored in local KV only.',
      placeholder: '••••••••',
    },
    {
      type: 'number',
      name: 'limit',
      label: 'Limit',
      value: settings.limit,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      type: 'textarea',
      name: 'notes',
      label: 'Notes',
      value: settings.notes,
      placeholder: 'Free-form notes',
    },
    {
      type: 'select',
      name: 'theme',
      label: 'Theme',
      value: settings.theme,
      options: [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    },
    {
      type: 'radio',
      name: 'mode',
      label: 'Mode',
      value: settings.mode,
      options: [
        { value: 'live', label: 'Live' },
        { value: 'draft', label: 'Draft' },
      ],
    },
    {
      type: 'checkbox',
      name: 'enabled',
      label: 'Enabled',
      checked: settings.enabled,
      hint: 'Toggle feature flag',
    },
    {
      type: 'fieldset',
      legend: 'Nested fieldset',
      hint: 'Fields inside a fieldset',
      fields: [
        {
          type: 'text',
          name: 'nested',
          label: 'Nested text',
          value: settings.nested,
          placeholder: 'Inside fieldset',
        },
      ],
    },
  ];
}

async function loadSettings(env: Env): Promise<DemoSettings> {
  const raw = await env.SETTINGS.get(SETTINGS_KEY);
  if (!raw) {
    return { ...defaultSettings };
  }
  try {
    return { ...defaultSettings, ...(JSON.parse(raw) as DemoSettings) };
  } catch {
    return { ...defaultSettings };
  }
}

const admin = createAdmin<Env>({
  basePath: '/admin',
  title: 'workers-mini-admin playground',
  getSecret: (env) => env.ADMIN_SECRET,
  async render({ env }) {
    const settings = await loadSettings(env);
    return {
      hint: 'Signed in. Change fields below and save.',
      fields: fieldsFrom(settings),
      submitLabel: 'Save',
    };
  },
  async save({ form, env }) {
    const previous = await loadSettings(env);
    const values = parseAdminForm(form, fieldsFrom(previous));
    const next: DemoSettings = {
      title: String(values.title ?? previous.title),
      siteUrl: String(values.siteUrl ?? previous.siteUrl),
      apiToken: String(values.apiToken ?? previous.apiToken),
      limit: String(values.limit ?? previous.limit),
      notes: String(values.notes ?? previous.notes),
      theme: String(values.theme ?? previous.theme),
      mode: String(values.mode ?? previous.mode),
      enabled: Boolean(values.enabled),
      nested: String(values.nested ?? previous.nested),
    };
    await env.SETTINGS.put(SETTINGS_KEY, JSON.stringify(next));
    return { flash: 'Saved.' };
  },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await admin.fetch(request, env);
    if (res) {
      return res;
    }
    const url = new URL(request.url);
    if (url.pathname === '/') {
      return Response.redirect(new URL('/admin', url).href, 302);
    }
    return new Response('Not found', { status: 404 });
  },
};

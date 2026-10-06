import { createAdmin, parseAdminForm, type Field } from '../../src/index.ts';

type Env = {
  ADMIN_SECRET?: string;
  SETTINGS: KVNamespace;
};

type FeedRow = {
  label: string;
  url: string;
};

type DemoSettings = {
  title: string;
  siteUrl: string;
  apiToken: string;
  outputFilename: string;
  day: string;
  month: string;
  year: string;
  limit: string;
  notes: string;
  theme: string;
  mode: string;
  enabled: boolean;
  nested: string;
  feeds: FeedRow[];
};

const SETTINGS_KEY = 'demo';

const defaultSettings: DemoSettings = {
  title: 'Playground',
  siteUrl: 'https://example.com',
  apiToken: '',
  outputFilename: 'combined.xml',
  day: '6',
  month: '10',
  year: '2026',
  limit: '10',
  notes: 'Edit fields, save, and reload to confirm KV persistence.',
  theme: 'system',
  mode: 'live',
  enabled: true,
  nested: '',
  feeds: [
    { label: 'Example', url: 'https://example.com/feed.xml' },
    { label: 'Cloudflare', url: 'https://blog.cloudflare.com/rss/' },
  ],
};

function fieldsFrom(settings: DemoSettings): Field[] {
  return [
    {
      type: 'text',
      name: 'title',
      label: 'Title',
      value: settings.title,
      required: true,
      placeholder: 'Site title',
      hintHtml:
        'Password for login is <code>ADMIN_SECRET</code> from <code>playground/.dev.vars</code>.',
    },
    {
      type: 'url',
      name: 'siteUrl',
      label: 'Site URL',
      value: settings.siteUrl,
      placeholder: 'https://…',
      autocomplete: 'url',
    },
    {
      type: 'password',
      name: 'apiToken',
      label: 'API token',
      value: settings.apiToken,
      hint: 'Stored in local KV only.',
      placeholder: '••••••••',
      autocomplete: 'off',
    },
    {
      type: 'text',
      name: 'outputFilename',
      label: 'Output filename',
      value: settings.outputFilename,
      pattern: '^[A-Za-z0-9._-]+\\.xml$',
      maxlength: 64,
      hintHtml:
        'Must end in <code>.xml</code> (letters, digits, <code>._-</code>).',
    },
    {
      type: 'row',
      fields: [
        {
          type: 'number',
          name: 'day',
          label: 'Day',
          value: settings.day,
          min: 1,
          max: 31,
          step: 1,
        },
        {
          type: 'number',
          name: 'month',
          label: 'Month',
          value: settings.month,
          min: 1,
          max: 12,
          step: 1,
        },
        {
          type: 'number',
          name: 'year',
          label: 'Year',
          value: settings.year,
          min: 2000,
          max: 2100,
          step: 1,
        },
      ],
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
      maxlength: 2000,
      spellcheck: true,
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
      type: 'list',
      name: 'feeds',
      legend: 'Feed sources',
      hintHtml:
        'Repeatable rows. Form names look like <code>feeds_0_url</code>.',
      minItems: 1,
      maxItems: 8,
      addLabel: 'Add feed',
      removeLabel: 'Remove',
      itemFields: [
        {
          type: 'text',
          name: 'label',
          label: 'Label',
          placeholder: 'Name',
          required: true,
        },
        {
          type: 'url',
          name: 'url',
          label: 'Feed URL',
          placeholder: 'https://…/rss',
          required: true,
        },
      ],
      values: settings.feeds,
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

function parseFeeds(value: unknown): FeedRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record =
      row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      label: String(record.label ?? ''),
      url: String(record.url ?? ''),
    };
  });
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
      outputFilename: String(values.outputFilename ?? previous.outputFilename),
      day: String(values.day ?? previous.day),
      month: String(values.month ?? previous.month),
      year: String(values.year ?? previous.year),
      limit: String(values.limit ?? previous.limit),
      notes: String(values.notes ?? previous.notes),
      theme: String(values.theme ?? previous.theme),
      mode: String(values.mode ?? previous.mode),
      enabled: Boolean(values.enabled),
      nested: String(values.nested ?? previous.nested),
      feeds: parseFeeds(values.feeds),
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

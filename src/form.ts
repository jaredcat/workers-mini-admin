import { escapeHtml } from './escape.js';

export type FieldOption = { value: string; label: string };

type FieldBase = {
  label?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
};

export type TextField = FieldBase & {
  type: 'text' | 'url' | 'password';
  name: string;
  value?: string;
};

export type NumberField = FieldBase & {
  type: 'number';
  name: string;
  value?: string | number;
  min?: number;
  max?: number;
  step?: number | string;
};

export type TextareaField = FieldBase & {
  type: 'textarea';
  name: string;
  value?: string;
};

export type SelectField = FieldBase & {
  type: 'select';
  name: string;
  value?: string;
  options: FieldOption[];
};

export type RadioField = FieldBase & {
  type: 'radio';
  name: string;
  value?: string;
  options: FieldOption[];
};

export type CheckboxField = FieldBase & {
  type: 'checkbox';
  name: string;
  /**
	Whether the checkbox is checked when rendering.
	*/
  checked?: boolean;
  value?: string;
};

export type FieldsetField = {
  type: 'fieldset';
  legend: string;
  hint?: string;
  fields: Field[];
};

export type HtmlField = {
  type: 'html';
  html: string;
};

export type Field =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | CheckboxField
  | FieldsetField
  | HtmlField;

function optionalHint(hint: string | undefined): string {
  return hint ? ` <span class="hint">${escapeHtml(hint)}</span>` : '';
}

function labelHtml(id: string, label: string, hint?: string): string {
  return `<label for="${escapeHtml(id)}">${escapeHtml(label)}${optionalHint(hint)}</label>`;
}

function requiredAttribute(required: boolean | undefined): string {
  return required ? ' required' : '';
}

function renderField(field: Field): string {
  switch (field.type) {
    case 'html': {
      return field.html;
    }
    case 'fieldset': {
      return renderFieldset(field);
    }
    case 'radio': {
      return renderRadio(field);
    }
    case 'checkbox': {
      return renderCheckbox(field);
    }
    case 'textarea': {
      return renderTextarea(field);
    }
    case 'select': {
      return renderSelect(field);
    }
    case 'number': {
      return renderNumber(field);
    }
    default: {
      return renderTextInput(field);
    }
  }
}

function renderFieldset(field: FieldsetField): string {
  const hint = field.hint
    ? `<p class="hint">${escapeHtml(field.hint)}</p>`
    : '';
  const inner = field.fields.map((child) => renderField(child)).join('\n');
  return `<fieldset>
  <legend>${escapeHtml(field.legend)}</legend>
  ${hint}
  ${inner}
</fieldset>`;
}

function renderRadio(field: RadioField): string {
  const legend = field.label
    ? `<legend>${escapeHtml(field.label)}${optionalHint(field.hint)}</legend>`
    : '';
  const options = field.options
    .map((option) => {
      const id = `${field.name}_${option.value}`;
      const checked = option.value === (field.value ?? '') ? ' checked' : '';
      return `<label for="${escapeHtml(id)}"><input id="${escapeHtml(id)}" type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(option.value)}"${checked}${requiredAttribute(field.required)}> ${escapeHtml(option.label)}</label>`;
    })
    .join('\n    ');
  return `<fieldset>
  ${legend}
  <div class="mode-row">
    ${options}
  </div>
</fieldset>`;
}

function renderCheckbox(field: CheckboxField): string {
  const id = field.name;
  const checked = field.checked ? ' checked' : '';
  const value = field.value ?? 'on';
  return `<label class="checkbox-row" for="${escapeHtml(id)}">
  <input id="${escapeHtml(id)}" type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(value)}"${checked}>
  ${escapeHtml(field.label ?? field.name)}${optionalHint(field.hint)}
</label>`;
}

function renderTextarea(field: TextareaField): string {
  const id = field.name;
  const label = field.label ? labelHtml(id, field.label, field.hint) : '';
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  return `${label}
<textarea id="${escapeHtml(id)}" name="${escapeHtml(field.name)}"${placeholder}${requiredAttribute(field.required)}>${escapeHtml(field.value ?? '')}</textarea>`;
}

function renderSelect(field: SelectField): string {
  const id = field.name;
  const label = field.label ? labelHtml(id, field.label, field.hint) : '';
  const options = field.options
    .map((option) => {
      const selected = option.value === (field.value ?? '') ? ' selected' : '';
      return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
    })
    .join('\n    ');
  return `${label}
<select id="${escapeHtml(id)}" name="${escapeHtml(field.name)}"${requiredAttribute(field.required)}>
    ${options}
  </select>`;
}

function renderNumber(field: NumberField): string {
  const id = field.name;
  const label = field.label ? labelHtml(id, field.label, field.hint) : '';
  const min = field.min === undefined ? '' : ` min="${field.min}"`;
  const max = field.max === undefined ? '' : ` max="${field.max}"`;
  const step =
    field.step === undefined ? '' : ` step="${escapeHtml(String(field.step))}"`;
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  const value =
    field.value !== undefined && field.value !== ''
      ? ` value="${escapeHtml(String(field.value))}"`
      : '';
  return `${label}
<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="number"${value}${min}${max}${step}${placeholder}${requiredAttribute(field.required)}>`;
}

function renderTextInput(field: TextField): string {
  const id = field.name;
  const label = field.label ? labelHtml(id, field.label, field.hint) : '';
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  const value =
    field.value === undefined ? '' : ` value="${escapeHtml(field.value)}"`;
  return `${label}
<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="${field.type}"${value}${placeholder}${requiredAttribute(field.required)}>`;
}

export function adminForm(options: {
  action: string;
  fields: Field[];
  method?: 'get' | 'post';
  submitLabel?: string;
  id?: string;
}): string {
  const { action, fields, method = 'post', submitLabel = 'Save', id } = options;
  const idAttribute = id ? ` id="${escapeHtml(id)}"` : '';
  const body = fields.map((field) => renderField(field)).join('\n');
  return `<form method="${method}" action="${escapeHtml(action)}"${idAttribute}>
${body}
  <div class="actions">
    <button type="submit" class="btn-primary">${escapeHtml(submitLabel)}</button>
  </div>
</form>`;
}

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

type ValueField =
  TextField | NumberField | TextareaField | SelectField | RadioField;

const VALUE_FIELD_TYPES = new Set<Field['type']>([
  'text',
  'url',
  'password',
  'number',
  'textarea',
  'select',
  'radio',
]);

function isValueField(field: Field): field is ValueField {
  return VALUE_FIELD_TYPES.has(field.type);
}

function walkScalarFields(fields: Field[], out: Field[]): void {
  for (const field of fields) {
    if (field.type === 'html') {
      continue;
    }
    if (field.type === 'fieldset') {
      walkScalarFields(field.fields, out);
      continue;
    }
    out.push(field);
  }
}

/**
Named scalar values from a form matching the field schema (checkbox → boolean).
*/
export function parseAdminForm(
  form: FormData,
  fields: Field[],
): Record<string, string | boolean> {
  const scalars: Field[] = [];
  walkScalarFields(fields, scalars);
  const result: Record<string, string | boolean> = {};
  for (const field of scalars) {
    if (field.type === 'checkbox') {
      const raw = form.get(field.name);
      const expected = field.value ?? 'on';
      result[field.name] = typeof raw === 'string' && raw === expected;
      continue;
    }
    if (isValueField(field)) {
      result[field.name] = formText(form, field.name);
    }
  }
  return result;
}

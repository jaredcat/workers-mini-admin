import { escapeHtml } from './escape.js';
import { LIST_FIELD_SCRIPT } from './list-script.js';

export interface FieldOption {
  value: string;
  label: string;
}

interface FieldBase {
  label?: string;
  /**
	Plain-text hint (escaped). Ignored when `hintHtml` is set.
	*/
  hint?: string;
  /**
	Trusted HTML hint. Prefer this over `hint` when both are set.
	*/
  hintHtml?: string;
  required?: boolean;
  placeholder?: string;
}

interface TextInputAttributes {
  pattern?: string;
  maxlength?: number;
  minlength?: number;
  autocomplete?: string;
  spellcheck?: boolean;
}

export type TextField = FieldBase &
  TextInputAttributes & {
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
  autocomplete?: string;
};

export type TextareaField = FieldBase & {
  type: 'textarea';
  name: string;
  value?: string;
  maxlength?: number;
  minlength?: number;
  autocomplete?: string;
  spellcheck?: boolean;
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

export interface FieldsetField {
  type: 'fieldset';
  legend: string;
  hint?: string;
  hintHtml?: string;
  fields: Field[];
}

export interface HtmlField {
  type: 'html';
  html: string;
}

/**
Side-by-side layout for short related fields (e.g. day · month · year).
*/
export interface RowField {
  type: 'row';
  fields: Field[];
}

export type ListItemValue = Record<string, string | boolean>;

/**
Repeatable group of fields. Form names use `listName_index_fieldName`.
*/
export interface ListField {
  type: 'list';
  name: string;
  legend?: string;
  hint?: string;
  hintHtml?: string;
  /**
	Template fields for each row (scalars, row, fieldset, html — not nested list).
	*/
  itemFields: Field[];
  values: ListItemValue[];
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}

export type Field =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | CheckboxField
  | FieldsetField
  | HtmlField
  | RowField
  | ListField;

export type ParsedAdminForm = Record<
  string,
  string | boolean | ListItemValue[]
>;

function optionalAttribute(
  name: string,
  value: string | number | undefined,
): string {
  return value === undefined || value === ''
    ? ''
    : ` ${name}="${escapeHtml(String(value))}"`;
}

function spellcheckAttribute(value: boolean | undefined): string {
  if (value === undefined) {
    return '';
  }
  const spellcheckValue = value ? 'true' : 'false';
  return ` spellcheck="${spellcheckValue}"`;
}

function hintMarkup(
  hint: string | undefined,
  hintHtml: string | undefined,
  isBlock = false,
): string {
  if (hintHtml) {
    return isBlock
      ? `<p class="hint">${hintHtml}</p>`
      : ` <span class="hint">${hintHtml}</span>`;
  }
  if (hint) {
    return isBlock
      ? `<p class="hint">${escapeHtml(hint)}</p>`
      : ` <span class="hint">${escapeHtml(hint)}</span>`;
  }
  return '';
}

function optionalHint(hint: string | undefined, hintHtml?: string): string {
  return hintMarkup(hint, hintHtml, false);
}

function labelHtml(
  id: string,
  label: string,
  hint?: string,
  hintHtml?: string,
): string {
  return `<label for="${escapeHtml(id)}">${escapeHtml(label)}${optionalHint(hint, hintHtml)}</label>`;
}

function requiredAttribute(required: boolean | undefined): string {
  return required ? ' required' : '';
}

function withNamePrefix(field: Field, prefix: string): Field {
  if (field.type === 'html') {
    return field;
  }
  if (field.type === 'fieldset') {
    return {
      ...field,
      fields: field.fields.map((child) => withNamePrefix(child, prefix)),
    };
  }
  if (field.type === 'row') {
    return {
      ...field,
      fields: field.fields.map((child) => withNamePrefix(child, prefix)),
    };
  }
  if (field.type === 'list') {
    return field;
  }
  return {
    ...field,
    name: `${prefix}${field.name}`,
  };
}

function applyListItemValues(field: Field, values: ListItemValue): Field {
  if (field.type === 'html') {
    return field;
  }
  if (field.type === 'fieldset' || field.type === 'row') {
    return {
      ...field,
      fields: field.fields.map((child) => applyListItemValues(child, values)),
    };
  }
  if (field.type === 'list') {
    return field;
  }
  if (field.type === 'checkbox') {
    const raw = values[field.name];
    const expected = field.value ?? 'on';
    return {
      ...field,
      checked:
        raw === true ||
        (typeof raw === 'string' && ['true', expected].includes(raw)),
    };
  }
  if (isValueField(field)) {
    const raw = values[field.name];
    return {
      ...field,
      value: typeof raw === 'string' || typeof raw === 'number' ? raw : '',
    };
  }
  return field;
}

function emptyItemValues(itemFields: Field[]): ListItemValue {
  const values: ListItemValue = {};
  walkScalarFields(itemFields, (field) => {
    if (field.type === 'checkbox') {
      values[field.name] = false;
    } else if (isValueField(field)) {
      values[field.name] = '';
    }
  });
  return values;
}

function renderField(field: Field): string {
  switch (field.type) {
    case 'html': {
      return field.html;
    }
    case 'fieldset': {
      return renderFieldset(field);
    }
    case 'row': {
      return renderRow(field);
    }
    case 'list': {
      return renderList(field);
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
  const hint = hintMarkup(field.hint, field.hintHtml, true);
  const inner = field.fields.map((child) => renderField(child)).join('\n');
  return `<fieldset>
  <legend>${escapeHtml(field.legend)}</legend>
  ${hint}
  ${inner}
</fieldset>`;
}

function renderRow(field: RowField): string {
  const inner = field.fields.map((child) => renderField(child)).join('\n');
  return `<div class="row">
  ${inner}
</div>`;
}

function renderListItem(
  list: ListField,
  index: number,
  values: ListItemValue,
): string {
  const prefix = `${list.name}_${String(index)}_`;
  const prepared = list.itemFields.map((child) =>
    withNamePrefix(applyListItemValues(child, values), prefix),
  );
  const inner = prepared.map((child) => renderField(child)).join('\n');
  const itemRemoveText = list.removeLabel ?? 'Remove';
  return `<fieldset class="list-item" data-list-index="${String(index)}">
  ${inner}
  <div class="list-item-actions">
    <button type="button" class="btn-secondary list-item-remove">${escapeHtml(itemRemoveText)}</button>
  </div>
</fieldset>`;
}

function renderList(field: ListField): string {
  const minItems = field.minItems ?? 0;
  const rows =
    field.values.length > 0
      ? field.values
      : Array.from({ length: minItems }, () =>
          emptyItemValues(field.itemFields),
        );
  const items = rows
    .map((values, index) => renderListItem(field, index, values))
    .join('\n');
  const templateValues = emptyItemValues(field.itemFields);
  const templateItem = renderListItem(field, 0, templateValues);
  const hint = hintMarkup(field.hint, field.hintHtml, true);
  const legend = field.legend
    ? `<legend>${escapeHtml(field.legend)}</legend>`
    : '';
  const listAddText = field.addLabel ?? 'Add';
  const maxAttribute =
    field.maxItems === undefined
      ? ''
      : ` data-max-items="${String(field.maxItems)}"`;
  return `<fieldset class="list-field" data-list-name="${escapeHtml(field.name)}" data-min-items="${String(minItems)}"${maxAttribute}>
  ${legend}
  ${hint}
  ${items}
  <template class="list-item-template">${templateItem}</template>
  <button type="button" class="btn-secondary list-add">${escapeHtml(listAddText)}</button>
</fieldset>`;
}

function renderRadio(field: RadioField): string {
  const legend = field.label
    ? `<legend>${escapeHtml(field.label)}${optionalHint(field.hint, field.hintHtml)}</legend>`
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
  ${escapeHtml(field.label ?? field.name)}${optionalHint(field.hint, field.hintHtml)}
</label>`;
}

function renderTextarea(field: TextareaField): string {
  const id = field.name;
  const label = field.label
    ? labelHtml(id, field.label, field.hint, field.hintHtml)
    : '';
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  return `${label}
<textarea id="${escapeHtml(id)}" name="${escapeHtml(field.name)}"${placeholder}${optionalAttribute('maxlength', field.maxlength)}${optionalAttribute('minlength', field.minlength)}${optionalAttribute('autocomplete', field.autocomplete)}${spellcheckAttribute(field.spellcheck)}${requiredAttribute(field.required)}>${escapeHtml(field.value ?? '')}</textarea>`;
}

function renderSelect(field: SelectField): string {
  const id = field.name;
  const label = field.label
    ? labelHtml(id, field.label, field.hint, field.hintHtml)
    : '';
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
  const label = field.label
    ? labelHtml(id, field.label, field.hint, field.hintHtml)
    : '';
  const min = field.min === undefined ? '' : ` min="${String(field.min)}"`;
  const max = field.max === undefined ? '' : ` max="${String(field.max)}"`;
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
<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="number"${value}${min}${max}${step}${placeholder}${optionalAttribute('autocomplete', field.autocomplete)}${requiredAttribute(field.required)}>`;
}

function renderTextInput(field: TextField): string {
  const id = field.name;
  const label = field.label
    ? labelHtml(id, field.label, field.hint, field.hintHtml)
    : '';
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  const value =
    field.value === undefined ? '' : ` value="${escapeHtml(field.value)}"`;
  const spellcheck =
    field.type === 'text' ? spellcheckAttribute(field.spellcheck) : '';
  return `${label}
<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="${field.type}"${value}${placeholder}${optionalAttribute('pattern', field.pattern)}${optionalAttribute('maxlength', field.maxlength)}${optionalAttribute('minlength', field.minlength)}${optionalAttribute('autocomplete', field.autocomplete)}${spellcheck}${requiredAttribute(field.required)}>`;
}

function hasListField(fields: Field[]): boolean {
  for (const field of fields) {
    if (field.type === 'list') {
      return true;
    }
    if (
      (field.type === 'fieldset' || field.type === 'row') &&
      hasListField(field.fields)
    ) {
      return true;
    }
  }
  return false;
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
  const script = hasListField(fields)
    ? `\n<script>${LIST_FIELD_SCRIPT}</script>`
    : '';
  return `<form method="${method}" action="${escapeHtml(action)}"${idAttribute}>
${body}
  <div class="actions">
    <button type="submit" class="btn-primary">${escapeHtml(submitLabel)}</button>
  </div>
</form>${script}`;
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

function walkScalarFields(
  fields: Field[],
  visit: (field: Field) => void,
): void {
  for (const field of fields) {
    if (field.type === 'html' || field.type === 'list') {
      continue;
    }
    if (field.type === 'fieldset' || field.type === 'row') {
      walkScalarFields(field.fields, visit);
      continue;
    }
    visit(field);
  }
}

function walkLists(fields: Field[], out: ListField[]): void {
  for (const field of fields) {
    if (field.type === 'list') {
      out.push(field);
      continue;
    }
    if (field.type === 'fieldset' || field.type === 'row') {
      walkLists(field.fields, out);
    }
  }
}

type NamedScalarField = ValueField | CheckboxField;

function isNamedScalarField(field: Field): field is NamedScalarField {
  return field.type === 'checkbox' || isValueField(field);
}

function isCheckboxChecked(
  form: FormData,
  field: CheckboxField,
  name: string,
): boolean {
  const raw = form.get(name);
  const expected = field.value ?? 'on';
  return typeof raw === 'string' && raw === expected;
}

function collectListIndices(form: FormData, listName: string): number[] {
  const indices = new Set<number>();
  const prefix = `${listName}_`;
  for (const key of form.keys()) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const rest = key.slice(prefix.length);
    const underscore = rest.indexOf('_');
    if (underscore <= 0) {
      continue;
    }
    const indexPart = rest.slice(0, underscore);
    if (!/^\d+$/.test(indexPart)) {
      continue;
    }
    indices.add(Number(indexPart));
  }
  return [...indices].toSorted((a, b) => a - b);
}

function parseListField(form: FormData, list: ListField): ListItemValue[] {
  const indices = collectListIndices(form, list.name);
  return indices.map((index) => {
    const row: ListItemValue = {};
    walkScalarFields(list.itemFields, (field) => {
      if (!isNamedScalarField(field)) {
        return;
      }
      const name = `${list.name}_${String(index)}_${field.name}`;
      row[field.name] =
        field.type === 'checkbox'
          ? isCheckboxChecked(form, field, name)
          : formText(form, name);
    });
    return row;
  });
}

/**
Named scalar values from a form matching the field schema (checkbox → boolean).
List fields become arrays of row objects keyed by `list.name`.
*/
export function parseAdminForm(
  form: FormData,
  fields: Field[],
): ParsedAdminForm {
  const result: ParsedAdminForm = {};
  walkScalarFields(fields, (field) => {
    if (!isNamedScalarField(field)) {
      return;
    }
    result[field.name] =
      field.type === 'checkbox'
        ? isCheckboxChecked(form, field, field.name)
        : formText(form, field.name);
  });
  const lists: ListField[] = [];
  walkLists(fields, lists);
  for (const list of lists) {
    result[list.name] = parseListField(form, list);
  }
  return result;
}

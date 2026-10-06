/**
Client script for `type: 'list'` add/remove. Injected once when a form contains a list.
*/
export const LIST_FIELD_SCRIPT = `(function () {
  function escapeRegExp(value) {
    return value.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  }

  function reindexItem(item, index, listName) {
    var nextPrefix = listName + '_' + index + '_';
    var nameRe = new RegExp('^' + escapeRegExp(listName) + '_\\\\d+_');
    item.setAttribute('data-list-index', String(index));
    item.querySelectorAll('[name]').forEach(function (el) {
      var name = el.getAttribute('name');
      if (!name || !nameRe.test(name)) return;
      var fieldName = name.replace(nameRe, '');
      el.setAttribute('name', nextPrefix + fieldName);
      if (el.id && nameRe.test(el.id)) {
        el.id = nextPrefix + fieldName;
      }
    });
    item.querySelectorAll('[for]').forEach(function (el) {
      var forId = el.getAttribute('for');
      if (!forId || !nameRe.test(forId)) return;
      var fieldName = forId.replace(nameRe, '');
      el.setAttribute('for', nextPrefix + fieldName);
    });
  }

  function reindexAll(list) {
    var listName = list.getAttribute('data-list-name');
    var items = list.querySelectorAll(':scope > .list-item');
    items.forEach(function (item, index) {
      reindexItem(item, index, listName);
    });
    updateButtons(list);
  }

  function updateButtons(list) {
    var minItems = Number(list.getAttribute('data-min-items') || '0');
    var maxItems = list.getAttribute('data-max-items');
    var max = maxItems === null || maxItems === '' ? Infinity : Number(maxItems);
    var items = list.querySelectorAll(':scope > .list-item');
    var count = items.length;
    items.forEach(function (item) {
      var remove = item.querySelector('.list-item-remove');
      if (remove) remove.disabled = count <= minItems;
    });
    var add = list.querySelector(':scope > .list-add');
    if (add) add.disabled = count >= max;
  }

  function clearItemValues(item) {
    item.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var addBtn = target.closest('.list-add');
    if (addBtn) {
      var list = addBtn.closest('.list-field');
      if (!list) return;
      event.preventDefault();
      var maxItems = list.getAttribute('data-max-items');
      var max = maxItems === null || maxItems === '' ? Infinity : Number(maxItems);
      var items = list.querySelectorAll(':scope > .list-item');
      if (items.length >= max) return;
      var template = list.querySelector(':scope > template.list-item-template');
      var source = template
        ? template.content.querySelector('.list-item')
        : items[items.length - 1];
      if (!source) return;
      var clone = source.cloneNode(true);
      clearItemValues(clone);
      list.insertBefore(clone, template || addBtn);
      reindexAll(list);
      return;
    }

    var removeBtn = target.closest('.list-item-remove');
    if (removeBtn) {
      var item = removeBtn.closest('.list-item');
      var listEl = removeBtn.closest('.list-field');
      if (!item || !listEl) return;
      event.preventDefault();
      var minItems = Number(listEl.getAttribute('data-min-items') || '0');
      var count = listEl.querySelectorAll(':scope > .list-item').length;
      if (count <= minItems) return;
      item.remove();
      reindexAll(listEl);
    }
  });

  document.querySelectorAll('.list-field').forEach(updateButtons);
})();`;

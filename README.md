# remAddRow v1

Stable Version: **v1 (Jan 2026)**

`remAddRow` is a lightweight, dependency-minimal jQuery plugin designed to safely **add, remove, and reindex dynamic form rows**.  
It is callback-driven, predictable, and works with both synchronous and asynchronous workflows.

This documentation focuses first on **core functionality only** (no validator, no SweetAlert2), then introduces optional features later.

---

## 1. Core Concept

The plugin manages a **collection of rows** inside a wrapper element.  
Each row:

- Has a predictable **ID pattern**
- Contains indexed input names
- Can be safely removed and **automatically reindexed**

The plugin guarantees:

- No duplicated indexes
- Consistent DOM structure
- Safe removal even with async logic

---

## 2. Minimal Usage

### HTML
```html
<div id="items_wrap"></div>

<button type="button" id="add_item">Add Item</button>
```

### JavaScript
```js
$('#items_wrap').remAddRow({
  addBtn: '#add_item'
});
```

This creates rows with a default structure and allows adding/removing rows.

---

## 3. Required Structural Rules

To function correctly, these rules **must** be followed.

### Row Selector Contract

If:
```js
rowSelector: 'rowserial'
```

Each row **must** be:
```html
<div id="rowserial_0" class="rowserial"></div>
```

✔ `id` format: `rowSelector_index`  
✔ `class` must contain `rowSelector`

---

### Remove Button Contract

Each remove button **must contain** either:

```html
data-index="0"
```
or
```html
data-id="0"
```

Example:
```html
<button type="button" class="serial_remove" data-index="0">×</button>
```

This allows the plugin to correctly locate the row.

---

## 4. Options Reference (Core)

| Option | Type | Description |
|------|------|------------|
| addBtn | string | Selector for add button |
| maxRows | number | Maximum allowed rows |
| startRow | number | Starting index |
| fieldName | string | Base name for inputs |
| rowSelector | string | Row class + ID prefix |
| removeClass | string | Remove button class |
| rowTemplate | function | Custom row generator |
| onAdd | function | Callback before add |
| onRemove | function | Callback before remove |
| reindexRowName | array | Attributes to reindex names |
| reindexRowID | array | Attributes to reindex IDs |
| reindexRowIndex | array | Attributes to reindex numeric index |

---

## 5. onAdd Callback

### Signature
```js
onAdd(index, event, $row, fieldName)
```

### Behavior
- Runs **after row creation**
- Return `false` to block add
- Useful for:
  - Custom initialization
  - Conditional row creation

Example:
```js
onAdd: (i, e, $row) => {
  console.log('Row added:', i);
}
```

---

## 6. onRemove Callback (Core)

### Signature
```js
onRemove(index, event, $row, fieldName)
```

### Sync Usage
```js
onRemove: () => {
  return confirm('Remove this row?');
}
```

### Async Usage
```js
onRemove: async () => {
  const ok = await myAsyncCheck();
  return ok;
}
```

### Rules
| Return | Result |
|------|-------|
| false | Block removal |
| true | Allow removal |
| Promise<false> | Block |
| Promise<true> | Allow |

`onRemove` always runs **before DOM removal**.

---

## 7. Reindexing System (Core Feature)

Reindexing occurs **after any row removal**.

### 7.1 reindexRowIDPattern

Targets attributes ending with `_number`.

Example:
```html
id="email_3" → id="email_1"
```

Ensures unique DOM IDs.

---

### 7.2 reindexRowNamePattern

Targets attributes containing:
```
fieldName[index]
```

Example:
```html
name="items[3][name]" → items[1][name]
```

Works with:
- name
- data-bv-field
- data-bv-for

---

### 7.3 reindexRowIndexPattern

Targets numeric-only attributes.

Example:
```html
data-index="3" → data-index="1"
```

Used for buttons and UI logic.

---

## 8. Examples

### Example 1 – Minimal

```js
$('#wrap').remAddRow({
  addBtn: '#add'
});
```

---

### Example 2 – Full Core Usage

```js
$('#wrap').remAddRow({
  addBtn: '#add',
  maxRows: 10,
  fieldName: 'products',
  rowSelector: 'product',
  removeClass: 'product_remove',
  rowTemplate: (i, name) => `
    <div id="product_${i}" class="product">
      <input name="${name}[${i}][title]">
      <button class="product_remove" data-index="${i}">×</button>
    </div>
  `
});
```

---

### Example 3 – Complex Nested Usage

```js
$('.order').each(function () {
  $(this).find('.items').remAddRow({
    addBtn: $(this).find('.add_item'),
    fieldName: 'orders',
    rowSelector: 'item'
  });
});
```

Each instance is isolated and safely indexed.

---

## 9. BootstrapValidator Integration (No AJAX)

The plugin:
- Adds fields on row add
- Removes fields on row removal

Example:
```js
validator: {
  form: '#myForm',
  fields: {
    '[name]': {
      validators: { notEmpty: {} }
    }
  }
}
```

---

## 10. AJAX / SweetAlert2 (Advanced)

The plugin supports:
- DB-backed rows
- Frontend-only rows
- Async confirmation + deletion

Rows without a DB ID are removed **without AJAX**.

---

## 11. Stability Notes

- No global state
- Async-safe
- Fully reentrant
- Designed for large dynamic forms

---

## License

MIT

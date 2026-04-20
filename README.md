# simple-table

A reusable, declarative Angular Material data table built with Angular 21. Configure columns with a JSON array, get sorting, multi-select, dropdown filters, and pagination out of the box — with an escape hatch for custom cell templates. Zero third-party dependencies beyond Angular Material.

| | |
| --- | --- |
| **Live demo** | [ng-simple-table.vercel.app](https://ng-simple-table.vercel.app/) |
| **Source** | [github.com/xonaib/ng-simple-table](https://github.com/xonaib/ng-simple-table) |

## Why

Most Angular Material table examples require you to write `<ng-container matColumnDef>` blocks for every column. This component flips that: you describe your columns as data, and the table renders itself. You only drop down to a template when a cell needs custom markup.

Each column is identified by a **`key`** string: it is both the `matColumnDef` id Material uses internally and the property name read for default cell text (`row[key]`), so it stays aligned with your row type.

## Features

| Feature | Notes |
| --- | --- |
| Declarative columns | Pass a `ColumnDef[]` array — no per-column template boilerplate |
| Sorting | `MatSort` on data columns; **`sortable` defaults to true** — set `sortable: false` to opt out. The **`select` column is never sortable** |
| Row selection | Multi-select checkboxes, master toggle, `selectedRows` input |
| Dropdown column filters | Distinct values for each filterable column are **derived from `dataSource`** (sorted strings). Server-side paging: options reflect the **current page**; client-side: the **full** array you pass in. Apply/Clear still emits `(filterChange)` |
| Pagination | `MatPaginator` with configurable page sizes; server- and client-side modes in the demo |
| Column widths | Optional `width` on `ColumnDef` (`number` = px, `string` = CSS length). Resize overrides at runtime; internal **filler column** when pinned widths are narrower than the host (not listed in the column chooser) |
| Column reorder | CDK drag-drop on header cells and in the column-chooser menu |
| Column chooser | Show/hide columns and reorder via toolbar menu |
| Column resize | Drag handles; `(columnWidthChange)` emits `Record<string, number>` |
| Custom cell templates | `cellDef` attribute on `<ng-template>` — value must match that column’s **`key`** (see below) |
| Array + Observable | `dataSource` accepts `T[]` or `Observable<T[]>` |
| OnPush | `ChangeDetectionStrategy.OnPush` on components |

## Known gaps

- **Cell text overflow:** With explicit or resized column widths and `table-layout: fixed`, body cells still use **`white-space: nowrap`** / **`overflow: hidden`** in places. Long text is clipped. A future improvement is to **opt into wrapping** (e.g. per-column or global flag) so content can wrap inside the allotted width instead of overflowing visually.

## Setup

```bash
ng new my-app --standalone --style=scss
cd my-app
ng add @angular/material
# copy src/app/simple-table/ into your project
```

## Quick start

```typescript
import { SimpleTableComponent } from './simple-table/simple-table.component';
import { ColumnDef, FilterType, TableConfig } from './simple-table/table.types';

columns: ColumnDef[] = [
  { key: 'select' },
  { key: 'name', label: 'Name' },
  {
    key: 'status',
    label: 'Status',
    hasColumnFilters: true,
    filterType: FilterType.DropDown,
  },
];

tableConfig: TableConfig = {
  isPaginated: true,
  paginationOptions: { defaultPageSize: 10, pageSizeOptions: [5, 10, 25] },
};
```

```html
<simple-table
  [dataSource]="pagedItems"
  [tableColumns]="columns"
  [tableConfig]="tableConfig"
  [length]="totalCount"
  (page)="onPage($event)"
  (sortChange)="onSort($event)"
  (filterChange)="onFilter($event)"
  (selectionChange)="onSelect($event)"
>
</simple-table>
```

## Demo app columns

The hosted demo uses a task row shape and these definitions (trim or extend for your own pages):

```typescript
columns: ColumnDef[] = [
  { key: 'select' },
  { key: 'id', label: 'ID', width: 72 },
  { key: 'title', label: 'Title', width: 200 },
  { key: 'assignee', label: 'Assignee', hasColumnFilters: true, filterType: FilterType.DropDown },
  { key: 'status', label: 'Status', hasColumnFilters: true, filterType: FilterType.DropDown },
  { key: 'priority', label: 'Priority', hasColumnFilters: true, filterType: FilterType.DropDown },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'storyPoints', label: 'Points' },
];
```

## Custom cell templates

When a cell needs more than plain text — a link, a badge, a chip — add an `<ng-template>` with the **`cellDef`** attribute set to the same string as the column’s **`key`** (the directive keeps the `cellDef` name for the attribute; it is not related to Material’s `matColumnDef` template syntax).

```html
<simple-table [dataSource]="items" [tableColumns]="columns" ...>
  <ng-template cellDef="name" let-row>
    <a [routerLink]="['/items', row.id]">{{ row.name }}</a>
  </ng-template>

  <ng-template cellDef="status" let-row>
    <span [class]="'badge badge-' + row.status">{{ row.status }}</span>
  </ng-template>
</simple-table>
```

## Column definition (`ColumnDef`)

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string` | **Required.** Column id (Material `matColumnDef`) and default `row[key]` field. Use `'select'` for the checkbox column. |
| `label` | `string` | Column header text. Title-cased from `key` if omitted. |
| `width` | `number \| string` | Optional width (`number` = px; string = any CSS length). Omitted = auto. |
| `sortable` | `boolean` | Set `false` to disable sorting. Omitted = sortable. `select` is never sortable. |
| `hasColumnFilters` | `boolean` | Shows the filter icon and dropdown. |
| `filterType` | `FilterType` | `FilterType.DropDown` — checkbox list with search. |

**Naming:** The field is **`key`** rather than `columnDef` so the config reads like plain data (`key` / `label` / `width`) and matches how it is used on the row object. Angular Material still uses `matColumnDef` inside the component; you only pass `key` in `ColumnDef`.

**Reserved:** `st-layout-filler` is used internally for the layout filler column — do not use it as a host column `key`.

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `dataSource` | `T[] \| Observable<T[]>` | — | Row data. Required. |
| `tableColumns` | `ColumnDef[]` | — | Column definitions. Required. |
| `tableConfig` | `TableConfig` | `{}` | Pagination, client-side mode, toolbar, drag/resize flags. |
| `length` | `number` | `0` | Total row count for the paginator (server-side). |
| `pageIndex` | `number` | — | Sync paginator when the host resets page (server-side). |
| `selectedRows` | `T[]` | — | Pre-select rows programmatically. |
| `stickyHeaders` | `boolean` | `false` | Sticky header row. |

## Outputs

| Output | Payload | Description |
| --- | --- | --- |
| `page` | `PageEvent` | Page or page-size change. |
| `sortChange` | `Sort` | Column sort. |
| `filterChange` | `Map<string, ItemParent>` | Apply or Clear (map keys = column `key`). |
| `selectionChange` | `T[]` | Selected rows. |
| `refresh` | `void` | Refresh toolbar button. |
| `columnOrderChange` | `string[]` | Data column keys after header drag-reorder. |
| `columnWidthChange` | `Record<string, number>` | Column widths in px after resize (object keys = column `key`). |

## Column filters

Set `hasColumnFilters: true` (and `filterType: FilterType.DropDown` when multiple types exist). The table scans the current **`dataSource` rows** and builds one checkbox list per filterable column from **distinct `row[key]` values** (stringified, sorted).

- **Server-side paging:** `dataSource` is usually one page from the API — dropdown choices match that page only and update after each fetch. If the user had selected a value that disappears from the new page, that selection is dropped and **`(filterChange)`** is emitted again so the host can sync query params.
- **Client-side mode:** `dataSource` is the full in-memory array — distinct values span the whole dataset, not only the visible page.

`(filterChange)` still fires when the user clicks Apply or Clear. Read `ItemParent.selectedKeys` for active values.

## Pagination

`(page)` emits Angular Material’s `PageEvent`. For client-side pagination inside the table, set `tableConfig.clientSide: true` and pass the full dataset, or slice in the host and pass `[length]` for the total.

## Run the demo locally

```bash
npm start
```

Opens `http://localhost:4200` — task table with server/client toggle, filters, selection, column chooser, reorder, resize, custom title cell, and demo `ColumnDef` widths.

## Roadmap

**V2**

- Date range filter
- Optional **text wrap** for fixed-width / narrow columns (see Known gaps)
- Richer server-side query typing helpers

**V3**

- Virtual scrolling
- Inline row editing
- `ng-packagr` library build for npm publish
- Storybook stories

## License

MIT

## Blog Post

[I got tired of copy-pasting the same Angular Material table setup, so I built a library](https://dev.to/zonaibbokhari/i-got-tired-of-copy-pasting-the-same-table-code-so-i-built-a-library-434k) — covers the build process, decisions, and what broke along the way.

---

## References

Similar “dynamic Material table” ideas (for comparison, not dependencies):

- [dynamic-mat-table (npm)](https://www.npmjs.com/package/dynamic-mat-table)
- [relair/material-dynamic-table](https://github.com/relair/material-dynamic-table)
- [arditsinani/mat-dynamic-table](https://github.com/arditsinani/mat-dynamic-table)
- [lukekroon/ngx-mat-dynamic-table](https://github.com/lukekroon/ngx-mat-dynamic-table)

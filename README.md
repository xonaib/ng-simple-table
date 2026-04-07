# simple-table

A reusable, declarative Angular Material data table built with Angular 21. Configure columns with a JSON array, get sorting, multi-select, dropdown filters, and pagination out of the box — with an escape hatch for custom cell templates. Zero third-party dependencies beyond Angular Material.

| | |
| --- | --- |
| **Live demo** | [ng-simple-table.vercel.app](https://ng-simple-table.vercel.app/) |
| **Source** | [github.com/xonaib/ng-simple-table](https://github.com/xonaib/ng-simple-table) |

## Why

Most Angular Material table examples require you to write `<ng-container matColumnDef>` blocks for every column. This component flips that: you describe your columns as data, and the table renders itself. You only drop down to a template when a cell needs custom markup.

## Features

| Feature | Notes |
| --- | --- |
| Declarative columns | Pass a `ColumnDef[]` array — no per-column template boilerplate |
| Sorting | `MatSort` on data columns; **`sortable` defaults to true** — set `sortable: false` to opt out. The **`select` column is never sortable** |
| Row selection | Multi-select checkboxes, master toggle, `selectedRows` input |
| Dropdown column filters | Searchable checkbox list, select-all, asc/desc in panel, active-state icon |
| Pagination | `MatPaginator` with configurable page sizes; server- and client-side modes in the demo |
| Column widths | Optional `width` on `ColumnDef` (`number` = px, `string` = CSS length). Resize overrides at runtime; internal **filler column** when pinned widths are narrower than the host (not listed in the column chooser) |
| Column reorder | CDK drag-drop on header cells and in the column-chooser menu |
| Column chooser | Show/hide columns and reorder via toolbar menu |
| Column resize | Drag handles; `(columnWidthChange)` emits `Record<string, number>` |
| Custom cell templates | `[cellDef]` directive — header stays auto-generated so sorting works |
| Array + Observable | `dataSource` and `columnFiltersData` accept `T[]` or `Observable<...>` |
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
// your-page.component.ts
import { SimpleTableComponent } from './simple-table/simple-table.component';
import { ColumnDef, FilterType, TableConfig } from './simple-table/table.types';

columns: ColumnDef[] = [
  { columnDef: 'select' },
  { columnDef: 'name', header: 'Name' },
  {
    columnDef: 'status',
    header: 'Status',
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
  [columnFiltersData]="filtersData"
  (page)="onPage($event)"
  (sortChange)="onSort($event)"
  (filterChange)="onFilter($event)"
  (selectionChange)="onSelect($event)"
>
</simple-table>
```

## Custom cell templates

When a cell needs more than plain text — a link, a badge, a chip — provide an `<ng-template [cellDef]="columnDef">` inside `<simple-table>`. The header for that column is still auto-generated, so sorting works on every column uniformly.

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
| `columnDef` | `string` | Key matching the data property. Use `'select'` for the checkbox column. |
| `header` | `string` | Display label. Title-cased from `columnDef` if omitted. |
| `width` | `number \| string` | Optional width (`number` = px; string = any CSS length). Omitted = auto. |
| `sortable` | `boolean` | Set `false` to disable sorting. Omitted = sortable. `select` is never sortable. |
| `hasColumnFilters` | `boolean` | Shows the filter icon and dropdown. |
| `filterType` | `FilterType` | `FilterType.DropDown` — checkbox list with search. |

Reserved: `st-layout-filler` is used internally for layout; do not use as a host `columnDef`.

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `dataSource` | `T[] \| Observable<T[]>` | — | Row data. Required. |
| `tableColumns` | `ColumnDef[]` | — | Column definitions. Required. |
| `tableConfig` | `TableConfig` | `{}` | Pagination, client-side mode, toolbar, drag/resize flags. |
| `length` | `number` | `0` | Total row count for the paginator (server-side). |
| `pageIndex` | `number` | — | Sync paginator when the host resets page (server-side). |
| `columnFiltersData` | `ColumnFiltersData \| Observable<...>` | — | Filter option lists. |
| `selectedRows` | `T[]` | — | Pre-select rows programmatically. |
| `stickyHeaders` | `boolean` | `false` | Sticky header row. |

## Outputs

| Output | Payload | Description |
| --- | --- | --- |
| `page` | `PageEvent` | Page or page-size change. |
| `sortChange` | `Sort` | Column sort. |
| `filterChange` | `Map<string, ItemParent>` | Apply or Clear. |
| `selectionChange` | `T[]` | Selected rows. |
| `refresh` | `void` | Refresh toolbar button. |
| `columnOrderChange` | `string[]` | Data column keys after header drag-reorder. |
| `columnWidthChange` | `Record<string, number>` | Column widths in px after resize. |

## Column filters

Build `ColumnFiltersData` by deriving unique values from your dataset:

```typescript
filtersData: ColumnFiltersData = {
  parents: [
    {
      id: 'status',
      children: [
        { id: 'todo', value: 'Todo' },
        { id: 'in-progress', value: 'In Progress' },
        { id: 'done', value: 'Done' },
      ],
    },
  ],
};
```

`filterChange` emits a `Map<string, ItemParent>`. Read `ItemParent.selectedKeys` for active values.

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

## References

Similar “dynamic Material table” ideas (for comparison, not dependencies):

- [dynamic-mat-table (npm)](https://www.npmjs.com/package/dynamic-mat-table)
- [relair/material-dynamic-table](https://github.com/relair/material-dynamic-table)
- [arditsinani/mat-dynamic-table](https://github.com/arditsinani/mat-dynamic-table)
- [lukekroon/ngx-mat-dynamic-table](https://github.com/lukekroon/ngx-mat-dynamic-table)

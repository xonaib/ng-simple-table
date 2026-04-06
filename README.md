# simple-table

A reusable, declarative Angular Material data table built with Angular 21.
Configure columns with a JSON array, get sorting, multi-select, dropdown filters,
and pagination out of the box — with an escape hatch for custom cell templates.
Zero third-party dependencies beyond Angular Material.

## Why

Most Angular Material table examples require you to write `<ng-container matColumnDef>` blocks
for every column. This component flips that: you describe your columns as data, and the table
renders itself. You only drop down to a template when a cell needs custom markup.

## Features

| Feature | Notes |
|---|---|
| Declarative columns | Pass a `ColumnDef[]` array — no per-column template boilerplate |
| Sorting | Full `MatSort` integration on every column including custom-cell columns |
| Row selection | Multi-select checkboxes, master toggle, `selectedRows` input for programmatic pre-selection |
| Dropdown column filters | Searchable checkbox list, select-all, asc/desc sort, active-state icon |
| Pagination | `MatPaginator` with configurable page sizes |
| Custom cell templates | `[cellDef]` directive for per-column cell override — header stays auto-generated so sorting works |
| Array + Observable | `dataSource` and `columnFiltersData` accept `T[]` or `Observable<T[]>` |
| OnPush throughout | `ChangeDetectionStrategy.OnPush` on every component |

## Setup

```bash
ng new my-app --standalone --style=scss
cd my-app
ng add @angular/material
# copy src/app/simple-table/ into your project
```

## Quick Start

```typescript
// your-page.component.ts
import { SimpleTableComponent } from './simple-table/simple-table.component';
import { ColumnDef, FilterType, TableConfig } from './simple-table/table.types';

columns: ColumnDef[] = [
  { columnDef: 'select' },
  { columnDef: 'name',   header: 'Name',   isSortable: true },
  { columnDef: 'status', header: 'Status', isSortable: true,
    hasColumnFilters: true, filterType: FilterType.DropDown },
];

tableConfig: TableConfig = {
  isPaginated: true,
  paginationOptions: { defaultPageSize: 10, pageSizeOptions: [5, 10, 25] },
};
```

```html
<!-- your-page.component.html -->
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

## Custom Cell Templates

When a cell needs more than plain text — a link, a badge, a chip — provide an
`<ng-template [cellDef]="columnDef">` inside `<simple-table>`. The header for
that column is still auto-generated, so sorting works on every column uniformly.

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

## Column Definition (`ColumnDef`)

| Property | Type | Description |
|---|---|---|
| `columnDef` | `string` | Key matching the data property. Use `'select'` for the checkbox column. |
| `header` | `string` | Display label. Title-cased from `columnDef` if omitted. |
| `isSortable` | `boolean` | Enables the sort arrow. |
| `hasColumnFilters` | `boolean` | Shows the filter icon and dropdown. |
| `filterType` | `FilterType` | `FilterType.DropDown` — checkbox list with search. |

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `dataSource` | `T[] \| Observable<T[]>` | — | Row data. Required. |
| `tableColumns` | `ColumnDef[]` | — | Column definitions. Required. |
| `tableConfig` | `TableConfig` | `{}` | Pagination settings. |
| `length` | `number` | `0` | Total row count for the paginator (unsliced). |
| `columnFiltersData` | `ColumnFiltersData \| Observable<ColumnFiltersData>` | — | Filter option lists. |
| `selectedRows` | `T[]` | — | Pre-select rows programmatically. |
| `stickyHeaders` | `boolean` | `false` | Sticky header row. |

## Outputs

| Output | Payload | Description |
|---|---|---|
| `page` | `PageEvent` | Fired on page or page-size change. |
| `sortChange` | `Sort` | Fired on column sort. Active column and direction. |
| `filterChange` | `Map<string, ItemParent>` | Fired on Apply or Clear. Keyed by `columnDef`. |
| `selectionChange` | `T[]` | Full selected row array on every change. |

## Column Filters

Build `ColumnFiltersData` by deriving unique values from your dataset:

```typescript
filtersData: ColumnFiltersData = {
  parents: [
    {
      id: 'status',
      children: [
        { id: 'todo',        value: 'Todo' },
        { id: 'in-progress', value: 'In Progress' },
        { id: 'done',        value: 'Done' },
      ],
    },
  ],
};
```

`filterChange` emits a `Map<string, ItemParent>`. Read `ItemParent.selectedKeys`
to know which values are active, then filter your data array in the host component.

## Pagination

`(page)` emits Angular Material's `PageEvent`. For client-side pagination, slice your array
and pass the unsliced total as `[length]`:

```typescript
onPage(event: PageEvent): void {
  const start = event.pageIndex * event.pageSize;
  this.pagedData = this.allData.slice(start, start + event.pageSize);
}
```

## Run the Demo

```bash
npm start
```

Opens `http://localhost:4200` — a task management table with all features active:
50 rows, 4 assignees, sorting on every column, dropdown filters on three columns,
multi-select, pagination, and a custom cell template on the Title column.

## Roadmap

**V2**
- Date range filter
- Column visibility toggle
- `selectedRows` input for server-driven selection
- Server-side sort/query model

**V3**
- Virtual scrolling
- Inline row editing
- `ng-packagr` library build for npm publish
- Storybook stories

## License

MIT

## References
https://www.npmjs.com/package/dynamic-mat-table
https://github.com/relair/material-dynamic-table
https://github.com/arditsinani/mat-dynamic-table
https://github.com/lukekroon/ngx-mat-dynamic-table
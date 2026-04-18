# ngx-mat-simple-table

A reusable, declarative Angular Material table component built with Angular Signals.

Wraps `mat-table` with sorting, filtering, pagination, column chooser, column resize, column drag-reorder, and checkbox selection — all wired up and ready to use with a clean declarative API.

**[Live Demo](https://ng-simple-table.vercel.app)** · **[GitHub](https://github.com/xonaib/ng-simple-table)**

---

## Features

- Declarative column config via `ColumnDef[]`
- Sorting via `mat-sort-header` on all columns (including custom-cell columns)
- Dropdown column filters — searchable, select-all, active-state indicator
- Pagination via `MatPaginator` with configurable page sizes
- Custom cell templates per column via `[cellDef]` directive
- Multi-row checkbox selection with master toggle
- Column chooser — show/hide columns at runtime
- Column resize — drag handles on header boundaries
- Column drag-reorder — reorder columns via drag and drop
- Client-side mode — pass a plain array; the table handles sort, filter, and pagination internally
- Server-side mode — drive sort, filter, and page via outputs and pass paged data back in
- Fully signals-based — no `ChangeDetectorRef`, no manual subscriptions
- `OnPush` change detection throughout

---

## Requirements

- Angular 21+
- Angular Material 21+
- Angular CDK 21+

---

## Installation

```bash
npm install ngx-mat-simple-table
```

Make sure you have Angular Material set up in your project. If not:

```bash
ng add @angular/material
```

---

## Quick Start

### 1. Import in your component

```typescript
import { SimpleTableComponent, CellDefDirective } from 'ngx-mat-simple-table';
import { ColumnDef, TableConfig, FilterType } from 'ngx-mat-simple-table';
```

### 2. Define your columns

```typescript
columns: ColumnDef[] = [
  { key: 'select' },                                          // built-in checkbox column
  { key: 'name',   label: 'Name',   sortable: true },
  { key: 'status', label: 'Status', sortable: true, hasColumnFilters: true, filterType: FilterType.DropDown },
  { key: 'date',   label: 'Date',   sortable: true },
];
```

### 3. Configure the table

```typescript
config: TableConfig = {
  clientSide: true,
  isPaginated: true,
  paginationOptions: { defaultPageSize: 10, pageSizeOptions: [10, 25, 50] },
};
```

### 4. Add to your template

```html
<simple-table
  [dataSource]="rows"
  [tableColumns]="columns"
  [tableConfig]="config"
  (selectionChange)="onSelection($event)"
>
  <!-- Custom cell template for the 'status' column -->
  <ng-template cellDef="status" let-row>
    <span [class]="'badge badge-' + row.status">{{ row.status }}</span>
  </ng-template>
</simple-table>
```

---

## Client-Side vs Server-Side Mode

### Client-Side (`clientSide: true`)

Pass your full dataset. The table handles sort, filter, and pagination internally via `MatTableDataSource`.

```typescript
config: TableConfig = { clientSide: true, isPaginated: true };
```

```html
<simple-table [dataSource]="allRows" [tableColumns]="columns" [tableConfig]="config" />
```

### Server-Side (default)

React to output events, fetch a page, and pass it back in. Use `length` to tell the paginator the total row count.

```typescript
onPage(event: PageEvent)   { /* update page/size signals, refetch */ }
onSort(event: Sort)        { /* update sort signals, refetch */ }
onFilter(filters: Map<string, ItemParent>) { /* update filter signals, refetch */ }
```

```html
<simple-table
  [dataSource]="currentPage$"
  [tableColumns]="columns"
  [tableConfig]="config"
  [length]="totalRows"
  [pageIndex]="currentPageIndex"
  (page)="onPage($event)"
  (sortChange)="onSort($event)"
  (filterChange)="onFilter($event)"
/>
```

---

## Custom Cell Templates

Use `[cellDef]` to provide a custom template for any column. The header is always auto-generated so sorting continues to work.

```html
<simple-table [dataSource]="rows" [tableColumns]="columns" [tableConfig]="config">

  <ng-template cellDef="priority" let-row>
    <mat-icon [style.color]="priorityColor(row.priority)">flag</mat-icon>
    {{ row.priority }}
  </ng-template>

  <ng-template cellDef="actions" let-row>
    <button mat-icon-button (click)="edit(row)"><mat-icon>edit</mat-icon></button>
    <button mat-icon-button (click)="delete(row)"><mat-icon>delete</mat-icon></button>
  </ng-template>

</simple-table>
```

---

## API Reference

### `SimpleTableComponent` Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `dataSource` | `T[] \| Observable<T[]>` | required | Row data — plain array or observable |
| `tableColumns` | `ColumnDef[]` | required | Column definitions |
| `tableConfig` | `TableConfig` | `{}` | Table-level configuration |
| `length` | `number` | `0` | Total row count for server-side pagination |
| `pageIndex` | `number` | `undefined` | Current page index (server-side mode) |
| `selectedRows` | `T[]` | `undefined` | Programmatic pre-selection |
| `stickyHeaders` | `boolean` | `false` | Sticky column headers |

### `SimpleTableComponent` Outputs

| Output | Payload | Description |
|---|---|---|
| `page` | `PageEvent` | Pagination change |
| `sortChange` | `Sort` | Column sort change |
| `filterChange` | `Map<string, ItemParent>` | Column filter applied or cleared |
| `selectionChange` | `T[]` | Currently selected rows |
| `refresh` | `void` | Refresh button clicked |
| `columnOrderChange` | `string[]` | New column key order after drag-reorder |
| `columnWidthChange` | `Record<string, number>` | Column key → width in px after resize |

### `ColumnDef`

| Property | Type | Description |
|---|---|---|
| `key` | `string` | Unique column id. Use `'select'` for the built-in checkbox column |
| `label` | `string` | Header text — title-cased from `key` if omitted |
| `width` | `number \| string` | Column width — number = px, string = any CSS width |
| `sortable` | `boolean` | Enables sort on this column (default `true`) |
| `hasColumnFilters` | `boolean` | Enables dropdown filter for this column |
| `filterType` | `FilterType` | Filter UI type — currently `FilterType.DropDown` |

### `TableConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `clientSide` | `boolean` | `false` | Table handles sort/filter/pagination internally |
| `isPaginated` | `boolean` | `false` | Show paginator |
| `paginationOptions` | `PaginationOptions` | — | Page size config |
| `tableWidth` | `string` | — | CSS width of the table |
| `showColumnChooser` | `boolean` | `true` | Show column chooser toolbar button |
| `showRefresh` | `boolean` | `true` | Show refresh toolbar button |
| `columnDraggable` | `boolean` | `true` | Enable column drag-reorder |
| `columnResizable` | `boolean` | `true` | Enable column resize handles |

### `PaginationOptions`

| Property | Type | Description |
|---|---|---|
| `defaultPageSize` | `number` | Initial page size |
| `pageSizeOptions` | `number[]` | Page size dropdown options |

---

## License

MIT

# simple-table

A reusable, declarative Angular Material data table built with Angular 21. Configure columns with a JSON array, get sorting, multi-select, dropdown filters, pagination, sticky columns, row actions, theming, and dark mode out of the box — with an escape hatch for custom cell templates. Zero third-party dependencies beyond Angular Material.

| | |
| --- | --- |
| **Live demo** | [ng-simple-table.vercel.app](https://ng-simple-table.vercel.app/) |
| **npm** | [ngx-mat-simple-table](https://www.npmjs.com/package/ngx-mat-simple-table) |
| **Source** | [github.com/xonaib/ng-simple-table](https://github.com/xonaib/ng-simple-table) |

## Why

Most Angular Material table examples require you to write `<ng-container matColumnDef>` blocks for every column. This component flips that: you describe your columns as data, and the table renders itself. You only drop down to a template when a cell needs custom markup.

Each column is identified by a **`key`** string: it is both the `matColumnDef` id Material uses internally and the property name read for default cell text (`row[key]`), so it stays aligned with your row type.

## Features

| Feature | Notes |
| --- | --- |
| Declarative columns | Pass a `ColumnDef[]` array — no per-column template boilerplate |
| Sorting | `MatSort` on data columns; **`sortable` defaults to true** — set `sortable: false` to opt out |
| Row selection | Multi-select checkboxes, master toggle, `selectionChange` output |
| Dropdown column filters | Distinct values built from `dataSource`; Apply/Clear emits `(filterChange)` |
| Pagination | `MatPaginator` with configurable page sizes; server- and client-side modes |
| Unknown-total pagination | Omit `[length]` in server-side mode — next/prev inferred automatically from page row count |
| **Declarative actions** | `TableAction[]` with five position slots: toolbar, above, below, row-inline, row-menu |
| Sticky columns | `ColumnDef.sticky: 'left' \| 'right'` — pins columns to either edge; drag-reorder is disabled for sticky columns |
| Fill-container height | `TableConfig.fillContainer: true` — table expands to fill its parent; toolbar and paginator always stay in view |
| Column widths | Optional `width` on `ColumnDef` (`number` = px, `string` = CSS). Resize overrides at runtime |
| Column reorder | CDK drag-drop on header cells and in the column-chooser menu |
| Column chooser | Show/hide columns and reorder via toolbar menu with responsive max-height |
| Column resize | Drag handles on header cells; `(columnWidthChange)` emits `Record<string, number>` |
| `displayValue` | Per-column `(value, row) => string` transform for formatting or derived display text |
| `cellClass` | Per-column `(value, row) => string \| string[]` for conditional cell styling (status badges, colour-coded priority, etc.) |
| Custom cell templates | `cellDef` attribute on `<ng-template>` — value must match the column `key` |
| State persistence | `StStateStoringDirective` saves column order, visibility, and widths to `localStorage` |
| Export to Excel | `StExportDirective` with full XLSX via ExcelJS; export all records via `allDataProvider` |
| **Virtual scroll** | `TableConfig.virtual: true` — renders only visible rows via `CdkVirtualScrollViewport`; works in client-side and server-side modes |
| CSS theming | 22 `--st-*` custom properties for colours, borders, font, row height, scrollbar, and sticky cells |
| Dark mode | Set `body { color-scheme: dark }` — all `--st-*` tokens and Angular Material tokens flip automatically |
| OnPush + signals | `ChangeDetectionStrategy.OnPush` throughout; zero `ChangeDetectorRef` usage |

## Setup

```bash
npm install ngx-mat-simple-table
```

Add `provideHttpClient()` to your `app.config.ts` if not already present.

## Quick start

```typescript
import {
  SimpleTableComponent,
  CellDefDirective,
  ColumnDef,
  FilterType,
  TableConfig,
} from 'ngx-mat-simple-table';

columns: ColumnDef[] = [
  { key: 'select' },
  { key: 'id',     label: 'ID',     width: 72,  sticky: 'left' },
  { key: 'name',   label: 'Name',   width: 220, sticky: 'left' },
  {
    key: 'status',
    label: 'Status',
    hasColumnFilters: true,
    filterType: FilterType.DropDown,
    displayValue: v => String(v).toUpperCase(),
    cellClass:    v => `status-${v}`,
  },
  { key: 'priority', label: 'Priority', hasColumnFilters: true, filterType: FilterType.DropDown },
  { key: 'dueDate',  label: 'Due Date' },
];

tableConfig: TableConfig = {
  isPaginated: true,
  paginationOptions: { defaultPageSize: 25, pageSizeOptions: [10, 25, 50] },
  horizontalScroll: true,
  fillContainer: true,
};
```

```html
<simple-table
  [dataSource]="pagedItems"
  [tableColumns]="columns"
  [tableConfig]="tableConfig"
  [length]="totalCount"
  [stickyHeaders]="true"
  (page)="onPage($event)"
  (sortChange)="onSort($event)"
  (filterChange)="onFilter($event)"
  (selectionChange)="onSelect($event)"
>
</simple-table>
```

## Custom cell templates

When a cell needs more than plain text — a link, a badge, a chip — add an `<ng-template>` with the **`cellDef`** attribute set to the same string as the column `key`.

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

> **Tip:** `cellClass` on `ColumnDef` handles most styling-only cases without a template — reserve `cellDef` for when you need actual HTML structure.

## Column definition (`ColumnDef`)

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string` | **Required.** Column id and default `row[key]` field. Use `'select'` for the checkbox column. |
| `label` | `string` | Header text. Title-cased from `key` if omitted. |
| `width` | `number \| string` | Optional width (`number` = px; string = any CSS length). Omitted = auto. |
| `sticky` | `'left' \| 'right'` | Pin column to an edge. Drag-reorder is disabled for sticky columns. |
| `sortable` | `boolean` | Set `false` to disable sorting. Omitted = sortable. `select` is never sortable. |
| `hasColumnFilters` | `boolean` | Shows the filter icon and builds a dropdown from distinct values. |
| `filterType` | `FilterType` | `FilterType.DropDown` — checkbox list with search. |
| `displayValue` | `(value, row) => string` | Transform the displayed cell text (formatting, derived values). |
| `cellClass` | `(value, row) => string \| string[] \| null` | Return a CSS class or array of classes to apply to the body cell. |

**Reserved key:** `st-layout-filler` is used internally — do not use it as a column key.

## Table config (`TableConfig`)

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `isPaginated` | `boolean` | `false` | Show `MatPaginator`. |
| `paginationOptions` | `PaginationOptions` | — | `defaultPageSize` and `pageSizeOptions`. |
| `clientSide` | `boolean` | `false` | Hand sorting, filtering, and pagination to an internal `MatTableDataSource`. |
| `horizontalScroll` | `boolean` | `false` | Enable horizontal scroll on the table wrapper. |
| `fillContainer` | `boolean` | `false` | Stretch the table to fill its parent height; toolbar and paginator stay in view. |
| `showColumnChooser` | `boolean` | `true` | Show the column-chooser button in the toolbar. |
| `showRefresh` | `boolean` | `true` | Show the refresh button in the toolbar. |
| `columnDraggable` | `boolean` | `true` | Enable column drag-reorder. |
| `columnResizable` | `boolean` | `true` | Enable column resize handles. |
| `maxHeight` | `string` | — | CSS max-height on the scroll wrapper (ignored when `fillContainer` is true). |
| `virtual` | `boolean` | `false` | Enable virtual scrolling. Replaces the paginator with a `CdkVirtualScrollViewport` that only renders visible rows. Requires a defined height — use `fillContainer: true` or `maxHeight`. |
| `virtualRowHeight` | `number` | `48` | Pixel height of each data row. **Must match the actual rendered row height** (same as `--st-row-height`). |

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `dataSource` | `T[] \| Observable<T[]>` | — | Row data. Required. |
| `tableColumns` | `ColumnDef[]` | — | Column definitions. Required. |
| `tableConfig` | `TableConfig` | `{}` | Pagination, scroll, toolbar, drag/resize flags. |
| `tableId` | `string` | — | Unique key for `StStateStoringDirective` persistence. |
| `length` | `number` | `0` | Total row count for the paginator (server-side). |
| `pageIndex` | `number` | — | Sync paginator when the host resets the page (server-side). |
| `selectedRows` | `T[]` | — | Pre-select rows programmatically. |
| `stickyHeaders` | `boolean` | `false` | Sticky header row. |
| `virtualOffset` | `number` | `0` | Server-side virtual scroll only. The absolute row index (0-based) of the first row in `dataSource`. See [Virtual scroll — server-side](#server-side-virtual-scroll). |

## Outputs

| Output | Payload | Description |
| --- | --- | --- |
| `page` | `PageEvent` | Page or page-size change. |
| `sortChange` | `Sort` | Column sort changed. |
| `filterChange` | `Map<string, ItemParent>` | Apply or Clear (map keys = column `key`). |
| `selectionChange` | `T[]` | Selected rows. |
| `refresh` | `void` | Refresh toolbar button clicked. |
| `columnOrderChange` | `string[]` | Data column keys after header drag-reorder. |
| `columnWidthChange` | `Record<string, number>` | Column widths in px after resize. |
| `virtualRangeChange` | `VirtualRange` | Server-side virtual scroll only. Emits `{ start, end }` as the user scrolls — the host should fetch that window and update `[dataSource]`, `[virtualOffset]`, and `[length]`. |

## Theming

Override any `--st-*` property on the `<simple-table>` element or any ancestor:

```scss
simple-table {
  --st-header-bg:       #1e293b;
  --st-header-color:    #f1f5f9;
  --st-border-color:    #334155;
  --st-row-hover-bg:    #0f172a;
  --st-row-selected-bg: #1e3a5f;
  --st-sticky-cell-bg:  #1a2535;
  --st-cell-color:      #e2e8f0;
  --st-row-bg:          transparent;
  --st-font-size:       13px;
  --st-row-height:      44px;
  --st-toolbar-bg:      #0f172a;
}
```

| Token | Default | Controls |
| --- | --- | --- |
| `--st-header-bg` | `surface-variant` | Header row background |
| `--st-header-color` | `on-surface-variant` | Header row text |
| `--st-border-color` | `outline-variant` | All cell and toolbar borders |
| `--st-row-bg` | `transparent` | Default body row background |
| `--st-row-hover-bg` | `surface-container-low` | Hovered row background |
| `--st-row-selected-bg` | `secondary-container` | Selected row background |
| `--st-sticky-cell-bg` | `surface-container` | Body cells in sticky columns |
| `--st-cell-color` | `on-surface` | Body cell text colour |
| `--st-font-size` | `14px` | Body cell font size |
| `--st-row-height` | `48px` | Row min-height |
| `--st-toolbar-bg` | `surface` | Toolbar background |
| `--st-scrollbar-width` | `thin` | Scrollbar width (`thin \| auto \| none`) |
| `--st-scrollbar-thumb` | `outline` | Scrollbar thumb colour |
| `--st-scrollbar-track` | `transparent` | Scrollbar track colour |
| `--st-chooser-max-height` | `320px` | Column chooser list max-height before scroll |
| `--st-filter-popup-bg` | `surface` | Filter dropdown background |
| `--st-filter-popup-border` | `outline-variant` | Filter dropdown border |
| `--st-filter-header-bg` | `surface-variant` | Filter dropdown header strip |
| `--st-filter-header-color` | `on-surface-variant` | Filter dropdown header text |
| `--st-filter-footer-bg` | `surface-variant` | Filter dropdown footer strip |
| `--st-filter-footer-border` | `outline-variant` | Filter dropdown footer top border |
| `--st-filter-input-bg` | `surface` | Filter search input background |
| `--st-filter-input-border` | `outline` | Filter search input border |

### Dark mode

All defaults alias Angular Material's `--mat-sys-*` tokens, so the full table adapts automatically when you switch `color-scheme`:

```typescript
// toggle dark/light at runtime
document.body.style.colorScheme = 'dark'; // or 'light'
```

Use the CSS `light-dark()` function for any custom cell colours so they adapt too:

```scss
.status-done {
  background: light-dark(#dcfce7, #14532d);
  color:      light-dark(#15803d, #86efac);
}
```

## Column filters

Set `hasColumnFilters: true` and `filterType: FilterType.DropDown`. The table builds a checkbox list per filterable column from **distinct `row[key]` values** in the current `dataSource`.

- **Server-side:** options reflect the current page only; stale selections are pruned on each fetch and `(filterChange)` re-emits automatically.
- **Client-side:** options span the full dataset.

Read `ItemParent.selectedKeys` in the `(filterChange)` handler for the active values.

## Actions

Pass a `TableAction<T>[]` to `[actions]` to add buttons anywhere around the table without writing any extra template code.

```typescript
import { TableAction } from 'ngx-mat-simple-table';

actions: TableAction<Task>[] = [
  // left side of the toolbar
  {
    id: 'add',
    label: 'New task',
    icon: 'add',
    position: 'toolbar',
    color: 'primary',
    variant: 'flat',
    cb: () => this.openCreateDialog(),
  },
  {
    id: 'bulk-delete',
    label: 'Delete selected',
    icon: 'delete_sweep',
    position: 'toolbar',
    color: 'warn',
    variant: 'stroked',
    disabled: () => this.selected().length === 0,
    cb: () => this.bulkDelete(this.selected()),
  },
  // icon button on every row (label omitted → icon-only with tooltip)
  {
    id: 'edit',
    icon: 'edit',
    position: 'row-inline',
    cb: (row) => this.openEditDialog(row),
  },
  // overflow menu on every row
  {
    id: 'delete',
    label: 'Delete',
    icon: 'delete',
    position: 'row-menu',
    color: 'warn',
    cb: (row) => this.deleteTask(row),
  },
  // left side of the paginator row
  {
    id: 'export-selected',
    label: 'Export selected',
    icon: 'file_download',
    position: 'below',
    disabled: () => this.selected().length === 0,
    cb: () => this.exportSelected(),
  },
];
```

```html
<simple-table
  [dataSource]="tasks"
  [tableColumns]="columns"
  [tableConfig]="config"
  [actions]="actions"
  (selectionChange)="selected.set($event)"
>
</simple-table>
```

### Action positions

| Position | Where it renders |
| --- | --- |
| `toolbar` | Left side of the toolbar row, alongside the column-chooser and export icons |
| `above` | Same toolbar row, rendered before `toolbar` actions |
| `below` | Left side of the paginator row |
| `row-inline` | Icon button visible on every row in a sticky-end column |
| `row-menu` | Item inside the ⋯ overflow menu in the same sticky column |

### `TableAction<T>` properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | **Required.** Unique key; used as track id. |
| `position` | `ActionPosition` | **Required.** Where the action renders. |
| `cb` | `(row: T \| undefined) => void` | **Required.** Called on click. `row` is the clicked row for row positions, `undefined` otherwise. |
| `label` | `string` | Button label. Omit for an icon-only button (tooltip falls back to `id`). |
| `icon` | `string` | Material icon name. |
| `variant` | `'flat' \| 'stroked' \| 'text' \| 'icon'` | Button style for non-row positions. Defaults to `'stroked'`. |
| `color` | `'primary' \| 'accent' \| 'warn'` | Material button colour. |
| `disabled` | `(row: T \| undefined) => boolean` | Return `true` to disable. |

## Unknown-total pagination

If your API doesn't return a total row count, omit `[length]`. The table infers next/prev availability from the number of rows returned: a full page enables the next button; a short page disables it. No extra configuration needed.

```html
<simple-table
  [dataSource]="currentPage()"
  [pageIndex]="_pageIndex()"
  [tableColumns]="columns"
  [tableConfig]="config"
  (page)="onPage($event)"
>
</simple-table>
```


## Virtual scroll

Set `virtual: true` in `TableConfig` to replace pagination with `CdkVirtualScrollViewport`. Only the rows visible in the viewport (plus a small buffer) are in the DOM, keeping rendering fast for large datasets.

**Requirements:**
- The table must have a defined height. Use `fillContainer: true` (recommended) or `maxHeight`.
- `virtualRowHeight` must equal the actual rendered row height in pixels (default `48`, matching `--st-row-height`).

### Client-side virtual scroll

Pass the entire dataset as `dataSource`. The table filters, sorts, and virtualises it internally — no additional wiring needed.

```typescript
tableConfig: TableConfig = {
  virtual:          true,
  virtualRowHeight: 48,
  clientSide:       true,
  fillContainer:    true,
};
```

```html
<simple-table
  [dataSource]="allRows"
  [tableColumns]="columns"
  [tableConfig]="tableConfig"
  [stickyHeaders]="true"
>
</simple-table>
```

### Server-side virtual scroll

The table emits `(virtualRangeChange)` as the user scrolls. The host fetches the requested window from the server and passes it back with the window's absolute start index (`[virtualOffset]`) and the total row count (`[length]`).

```typescript
tableConfig: TableConfig = {
  virtual:          true,
  virtualRowHeight: 48,
  fillContainer:    true,
};

// --- state in the host component ---
readonly rows         = signal<Row[]>([]);
readonly totalCount   = signal(0);
readonly windowOffset = signal(0);

onVirtualRangeChange(range: VirtualRange): void {
  // range.start / range.end are absolute indices into the full dataset.
  // Fetch the window from your API and update the signals.
  this.http.get<{ data: Row[]; total: number }>('/api/rows', {
    params: { offset: range.start, limit: range.end - range.start },
  }).subscribe(({ data, total }) => {
    this.rows.set(data);
    this.totalCount.set(total);
    this.windowOffset.set(range.start);
  });
}
```

```html
<simple-table
  [dataSource]="rows()"
  [tableColumns]="columns"
  [tableConfig]="tableConfig"
  [length]="totalCount()"
  [virtualOffset]="windowOffset()"
  [stickyHeaders]="true"
  (virtualRangeChange)="onVirtualRangeChange($event)"
>
</simple-table>
```

**How the table positions the window:**
Each row `N` in the full dataset sits at pixel `N × virtualRowHeight` from the top of the scroll container. When the host provides rows `[offset … offset+n]`, the table sets `margin-top: offset × virtualRowHeight` on the content wrapper, placing those rows at exactly the right scroll position. `length × virtualRowHeight` drives the scrollbar height so the full range is scrollable immediately.

## State persistence

Add `<st-state-storing />` inside `<simple-table>` and provide a unique `tableId`:

```html
<simple-table tableId="my-table" ...>
  <st-state-storing />
</simple-table>
```

Column order, visibility, and widths are saved to `localStorage` under that key and restored on next load. New columns added after a saved state are appended at the end rather than dropped.

## Export

Add `<st-export />` inside `<simple-table>`. For server-side tables, pass `[allDataProvider]` to fetch all records for export regardless of the current page:

```html
<simple-table ...>
  <st-export [allDataProvider]="getAllForExport" />
</simple-table>
```

```typescript
readonly getAllForExport = (): Promise<Row[]> =>
  firstValueFrom(this.http.get<{ data: Row[] }>('/api/rows').pipe(map(r => r.data)));
```

## Running the project locally

### Prerequisites

- Node.js 20+
- npm 10+

### Clone and run

```bash
git clone https://github.com/xonaib/ng-simple-table.git
cd ng-simple-table
npm install
npm run build:lib   # build the library once before starting the demo
npm start           # opens http://localhost:4200
```

The demo runs against an in-memory interceptor — no backend required.

### Library development

```bash
# In one terminal — rebuild the library on every change
npm run build:lib:watch

# In another terminal — serve the demo app
npm start
```

Changes to `projects/ngx-mat-simple-table/` are picked up automatically; refresh the browser to see them.

### Build for production

```bash
npm run build       # builds lib + demo app
```

### Publishing the library

```bash
npm run publish:lib # runs build:lib then publishes dist/ngx-mat-simple-table to npm
```

## Roadmap

**v1.3**

- `TableConfig.scrollbarVisibility: 'auto' | 'always' | 'hover'`
- Inline row editing
- Storybook stories
- Unit test suite

## License

MIT

## Blog Post

[I got tired of copy-pasting the same Angular Material table setup, so I built a library](https://dev.to/zonaibbokhari/i-got-tired-of-copy-pasting-the-same-table-code-so-i-built-a-library-2c3l) — covers the build process, decisions, and what broke along the way.

---

## Release Notes

### v1.2.2

- **Declarative actions API** — `TableAction<T>[]` with five
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
| Sticky columns | `ColumnDef.sticky: 'left' \| 'right'` — pins columns to either edge; drag-reorder is disabled for sticky columns |
| Fill-container height | `TableConfig.fillContainer: true` — table expands to fill its parent; toolbar and paginator always stay in view |
| Column widths | Optional `width` on `ColumnDef` (`number` = px, `string` = CSS). Resize overrides at runtime |
| Column reorder | CDK drag-drop on header cells and in the column-chooser menu |
| Column chooser | Show/hide columns and reorder via toolbar menu with responsive max-height |
| Column resize | Drag handles on header cells; `(columnWidthChange)` emits `Record<string, number>` |
| `displayValue` | Per-column `(value, row) => string` transform for formatting or derived display text |
| `cellClass` | Per-column `(value, row) => string \| string[]` for conditional cell styling (status badges, colour-coded priority, etc.) |
| Custom cell templates | `cellDef` attribute on `<ng-template>` — value must match the column `key` |
| **Row & global actions** | Declarative `TableAction[]` with five position slots — see [Actions](#actions) |
| State persistence | `StStateStoringDirective` saves column order, visibility, and widths to `localStorage` |
| Export to Excel | `StExportDirective` with full XLSX via ExcelJS; export all records via `allDataProvider` |
| CSS theming | 20+ `--st-*` custom properties for colours, borders, font, row height, scrollbar, and sticky cells |
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
  TableAction,
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
  [actions]="tableActions"
  (page)="onPage($event)"
  (sortChange)="onSort($event)"
  (filterChange)="onFilter($event)"
  (selectionChange)="onSelect($event)"
>
  <st-state-storing />
  <st-export [allDataProvider]="getAllForExport" />
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

## Actions

Pass a `TableAction<T>[]` array to `[actions]`. Each action specifies a `position` that controls where it renders.

```typescript
import { TableAction } from 'ngx-mat-simple-table';

readonly actions: TableAction<Row>[] = [
  // toolbar — left side of the toolbar row
  {
    id: 'add',
    label: 'New item',
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

  // row-inline — icon button on every row
  {
    id: 'edit',
    label: 'Edit',
    icon: 'edit',
    position: 'row-inline',
    cb: row => this.openEditDialog(row),
  },

  // row-menu — items in the ⋯ overflow menu
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: 'content_copy',
    position: 'row-menu',
    cb: row => this.duplicate(row),
  },

  // below — rendered on the left of the paginator row
  {
    id: 'export-selected',
    label: 'Export selected',
    icon: 'file_download',
    position: 'below',
    disabled: () => this.selected().length === 0,
    cb: () => this.exportSelected(this.selected()),
  },
];
```

### Action positions

| Position | Where it renders |
| --- | --- |
| `'toolbar'` | Left side of the toolbar row (Column Chooser / Export / Refresh icons stay right) |
| `'above'` | Also merged into the toolbar left side |
| `'below'` | Left of the paginator row as a styled button |
| `'row-inline'` | Icon button visible on every data row (sticky-end column) |
| `'row-menu'` | Item inside the ⋯ overflow menu in the same sticky-end column |

### `TableAction<T>` properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique key (track identity, not displayed). |
| `label` | `string?` | Button text. Optional — omit for icon-only with tooltip. |
| `icon` | `string?` | Material icon name. |
| `position` | `ActionPosition` | Where the action renders (see table above). |
| `cb` | `(row: T \| undefined) => void` | Callback. `row` is the clicked row for `row-inline`/`row-menu`; `undefined` for all others. |
| `disabled` | `(row?: T) => boolean` | Return `true` to disable. |
| `color` | `'primary' \| 'accent' \| 'warn'` | Material button colour. |
| `variant` | `'flat' \| 'stroked' \| 'text' \| 'icon'` | Button style for non-row positions. Defaults to `'stroked'`. Omitting `label` also forces icon-only. |

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
| `displayValue` | `(value, row) => unknown` | Transform the displayed cell text (formatting, derived values). Also used for export unless `exportValue` is set. |
| `exportValue` | `(value, row) => unknown` | Export-only override. Use when the cell needs rich rendering in the grid but plain text in the file. |
| `cellClass` | `(value, row) => string \| string[] \| null` | Return a CSS class or array of classes to apply to the body cell. |

**Reserved keys:** `select`, `st-layout-filler`, `st-row-actions` are used internally — do not use them as column keys.

## Table config (`TableConfig`)

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `isPaginated` | `boolean` | `false` | Show `MatPaginator`. |
| `paginationOptions` | `PaginationOptions` | — | `defaultPageSize` and `pageSizeOptions`. |
| `clientSide` | `boolean` | `false` | Hand sorting, filtering, and pagination to an internal `MatTableDataSource`. |
| `horizontalScroll` | `boolean` | `false` | Enable horizontal scroll on the table wrapper. |
| `fillContainer` | `boolean` | `false` | Stretch the table to fill its parent height; toolbar and paginator stay in view. |
| `showColumnChooser` | `boolean` | `true` | Show the column-chooser button. |
| `showRefresh` | `boolean` | `true` | Show the refresh button. |
| `columnDraggable` | `boolean` | `true` | Enable column drag-reorder. |
| `columnResizable` | `boolean` | `true` | Enable column resize handles. |
| `maxHeight` | `string` | — | CSS max-height on the scroll wrapper (ignored when `fillContainer` is true). |

## Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `dataSource` | `T[] \| Observable<T[]>` | — | Row data. Required. |
| `tableColumns` | `ColumnDef[]` | — | Column definitions. Required. |
| `tableConfig` | `TableConfig` | `{}` | Pagination, scroll, toolbar, drag/resize flags. |
| `tableId` | `string` | — | Unique key for `StStateStoringDirective` persistence. |
| `length` | `number` | `0` | Total row count for server-side pagination. Omit or pass `0` to enable auto next/prev detection. |
| `pageIndex` | `number` | — | Sync paginator when the host resets the page (server-side). |
| `selectedRows` | `T[]` | — | Pre-select rows programmatically. |
| `stickyHeaders` | `boolean` | `false` | Sticky header row. |
| `actions` | `TableAction<T>[]` | `[]` | Declarative action buttons. |

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
| `dataExport` | `string` | CSV string emitted when the export button is clicked (if no `StExportDirective`). |

## Pagination — unknown total

In server-side mode, if your API does not return a total count, simply omit `[length]` (or pass `0`). The component infers whether a next page exists from the current page's row count:

- **Page is full** (rows returned = page size) → next button enabled
- **Page is short** (rows returned < page size) → next button disabled, last page reached
- The range label shows `"1 – 25"` instead of `"1 – 25 of 0"`

No extra inputs or configuration needed.

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

- Virtual scrolling for large datasets
- Date range filter type
- Inline row editing
- Storybook stories

## License

MIT

## Blog Post

[I got tired of copy-pasting the same Angular Material table setup, so I built a library](https://dev.to/zonaibbokhari/i-got-tired-of-copy-pasting-the-same-table-code-so-i-built-a-library-2c3l) — covers the build process, decisions, and what broke along the way.

---

## Release Notes

### v1.2.2

- **Declarative actions** — `TableAction<T>[]` input with five position slots: `toolbar`, `above` (merged into toolbar), `below` (rendered left of paginator row), `row-inline` (icon button per row), `row-menu` (⋯ overflow menu per row)
- **Optional `label` on actions** — omit `label` to force icon-only rendering with an automatic tooltip; both `label` and `icon` are optional but at least one should be set
- **`cb` callback** — action callback renamed from `handler` to `cb` for brevity
- **Unified toolbar row** — `above` and `toolbar` actions render together on the left of a single toolbar row; built-in icons (Column Chooser, Export, Refresh) stay right with tooltips
- **Paginator row merged with below actions** — `below` actions appear as styled buttons on the left of the paginator row, eliminating the separate strip below the table
- **Unknown-total pagination** — omit `[length]` in server-side mode; next/prev buttons are inferred automatically from page row count; range label shows `"X – Y"` instead of `"X – Y of 0"`
- **Tooltips on built-in toolbar buttons** — Column Chooser, Export, and Refresh icons now show tooltips on hover
- **`MatTooltipModule`** added to library imports

### v1.2.1

- Fixed npm package README not reflecting v1.2 changes (was publishing stale library-level README)
- Row hover now correctly overrides `cellClass` backgrounds for consistent hover behaviour across all cells
- `publish:lib` script auto-syncs root README to library folder before every publish

### v1.2.0

- **Sticky columns** — `ColumnDef.sticky: 'left' | 'right'` pins columns to either edge during horizontal scroll; drag guard prevents sticky columns from being reordered
- **`fillContainer` mode** — `TableConfig.fillContainer: true` makes the table stretch to fill its parent height; toolbar, sticky header, and paginator stay visible at all times
- **`cellClass` callback** — `(value, row) => string | string[]` on `ColumnDef` for conditional body-cell CSS (colour-coded status, priority badges, etc.) without needing a custom template
- **Dark mode** — all `--st-*` tokens alias Angular Material 3 system tokens so switching `body { color-scheme: dark }` adapts the full table automatically
- **CSS custom properties expanded** — added `--st-cell-color` (body text colour) and `--st-row-bg` (default row background) to the theming surface; 22 tokens total covering every visual surface including filter popup and scrollbar
- **Sticky cell background token** — `--st-sticky-cell-bg` (defaults to `surface-container`) gives pinned columns a subtle darker shade to distinguish them during horizontal scroll
- **Column chooser responsive max-height** — `--st-chooser-max-height` caps the list at 320px by default with breakpoint overrides (220px tablet, 160px mobile)
- **Filter popup CSS tokens** — 8 `--st-filter-*` tokens let consumers restyle the dropdown panel without touching Angular Material internals
- **`applyUserSettings` column merge fix** — new columns added after a saved state are now appended rather than silently dropped

### v1.1.2

- Deployment and package stability fixes
- Vercel build pipeline corrections

### v1.1.0

- **Export to Excel** — `StExportDirective` with full XLSX support via ExcelJS (header styling, column formatting)
- **`displayValue` transform** — per-column `(value, row) => string` for display formatting
- **Export-all-records** — `allDataProvider` callback fetches all matching rows for export in server-side mode
- Library build pipeline via ng-packagr; published to npm as `ngx-mat-simple-table`

### v1.0.0

- **Declarative columns** — `ColumnDef[]` drives every aspect: label, width, sort, filter type, sticky side, displayValue
- **Dual data-source mode** — server-side (host owns state signals) and client-side (`MatTableDataSource` owned internally)
- **Custom cell templates** — `cellDef` directive for fully custom cell markup while keeping auto-generated sort headers
- **Column-level dropdown filters** — builds option lists from visible data; Apply/Clear only
- **Header drag-reorder** — CDK drag-drop; sticky columns excluded
- **Column chooser** — toolbar menu with checkboxes and drag handles
- **State persistence** — `StStateStoringDirective` saves to `localStorage`
- **Export** — `StExportDirective` with ExcelJS
- **Resize handles** — per-column drag; emits `(columnWidthChange)`
- **`select` column** — built-in checkbox column with master toggle
- **OnPush + signals throughout**

# simple-table — Development Plan

## V1 — Complete ✅

### Shipped

- [x] `SimpleTableComponent<T>` — standalone, generic, `OnPush`
- [x] Declarative column config via `ColumnDef[]` array
- [x] Sorting — `mat-sort-header` on all columns including custom-cell columns
- [x] Multi-row checkbox selection via `SelectionModel<T>`; master toggle
- [x] `selectedRows` input for programmatic pre-selection
- [x] Dropdown column filters — searchable checkbox list, select-all, asc/desc sort, active-state icon, Escape to close
- [x] Pagination via `MatPaginator` with configurable page sizes
- [x] `[cellDef]` directive — custom cell template per column; header stays auto-generated so sorting works on all columns
- [x] Array and `Observable<T[]>` support for `dataSource` and `columnFiltersData`
- [x] Outputs: `sortChange`, `filterChange`, `selectionChange`, `page`
- [x] `OnPush` + `takeUntilDestroyed` throughout
- [x] Task management demo — 50 rows, 4 assignees, 3 statuses, 3 priorities
- [x] Deployed to Vercel: https://ng-simple-table.vercel.app
- [x] Published to GitHub: https://github.com/xonaib/ng-simple-table

---

## Signals Migration ✅

Migrated `SimpleTableComponent`, `ColumnFilterComponent`, and `CellDefDirective`
from decorator-based API to Angular 17+ signal primitives.

### SimpleTableComponent

- [x] `@Input()` → `input()` / `input.required()`
- [x] `@Output()` + `EventEmitter` → `output()`
- [x] `@ContentChildren(CellDefDirective)` + `QueryList` → `contentChildren(CellDefDirective)`
- [x] Setter side-effects (`dataSource`, `columnFiltersData`, `selectedRows`) → `effect()`
- [x] `_data: T[]` → `signal<T[]>([])` (removes need for `markForCheck()` in subscriptions)
- [x] `columnFilters` Map → `signal<Map<string, ItemParent>>(new Map())`
- [x] Remove `ChangeDetectorRef` entirely

### ColumnFilterComponent

- [x] `@Input()` → `input()` / `input.required()`
- [x] `@Output()` + `EventEmitter` → `output()`
- [x] `@ViewChild` × 2 → `viewChild()`
- [x] `isMenuOpen`, `searchTerm`, `sortDirection`, `popupStyle` → `signal()`
- [x] `_pendingKeys: Set` → `signal<ReadonlySet<number | string>>(new Set())`
- [x] `filteredItems` getter → `computed()`
- [x] `isFilterActive` getter → `computed()`
- [x] Remove `ChangeDetectorRef` entirely (signals auto-track)
- [x] Template: `[(ngModel)]="searchTerm"` → `[ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"`

### CellDefDirective

- [x] `@Input('cellDef') columnDef` → `input.required<string>({ alias: 'cellDef' })`

### Demo page

- No changes needed — already fully signal-based

---

## V2 — Complete ✅

### Client-Side Data Mode ✅

When the host passes a plain `T[]` (not paged), the table handles sort, filter, and pagination
internally via `MatTableDataSource` so the host doesn't need to wire up computed signals.

- `clientSide: boolean` flag in `TableConfig` (default `false`)
- Internally owns and connects `MatTableDataSource<T>` to `MatSort` and `MatPaginator` via signal `effect()` — works correctly when the host toggles `clientSide` at runtime, not just on init
- Column filters drive `MatTableDataSource.filterPredicate`; `_syncMatDsFilter` resets to page 1 on filter change
- `filterChange`, `sortChange`, and `page` outputs still fire for observability
- `length` input ignored — data source counts rows itself
- Master toggle and `isAllSelected()` scoped to the current page via `_visibleRows()` (uses `_matDs.filteredData` + paginator slice in client-side mode; uses `_data()` in server-side mode)
- `pageIndex` input added — in server-side mode the host passes the current page index so the paginator visually resets when sort or filter forces a return to page 1

### Server-Side HTTP Demo ✅

Demonstrates server-side pagination, sorting, and filtering via a real `HttpClient` request
intercepted in-process — no backend required.

- `TasksInterceptor` (`src/app/demo/tasks.interceptor.ts`) — functional interceptor matching `/api/tasks`; parses `page`, `size`, `sort`, `direction`, and per-column filter params; filters, sorts, and slices the in-memory `TASKS` array; returns a 300 ms delayed `HttpResponse<TasksResponse>`
- `provideHttpClient(withInterceptors([tasksInterceptor]))` registered in `app.config.ts`
- Demo component drives requests reactively: `_serverSideParams` computed → `_queryTrigger` computed → `toObservable` + `switchMap` + `toSignal`; `switchMap` cancels in-flight requests on rapid changes
- `isLoading` signal drives a `mat-progress-bar` above the table
- Demo toggle: **Server-side** (HTTP + interceptor) ↔ **Client-side** (`MatTableDataSource`)

---

### Column Chooser ✅

Allow users to show or hide columns at runtime via a panel inside the table header area.

- `showColumnChooser: boolean` in `TableConfig` (default `false`) — renders a column chooser button in the table toolbar
- Panel is a `MatMenu` or overlay listing all columns with toggle checkboxes; the `select` built-in column is always excluded
- `ColumnDef.hideable?: boolean` (default `true`) — set to `false` to lock a column (e.g. a required ID column) so it always appears and cannot be toggled off
- Hidden columns are removed from `_headers` and `_dataColumns` in the template; sort/filter state for hidden columns is preserved so re-showing them restores their state
- `columnVisibilityChange` output — emits the full `ColumnDef[]` with updated `hidden` flags whenever visibility changes; host can persist this if needed
- Demo page: column chooser enabled by default so all features are visible together

---

### User Settings Persistence ✅

Remember per-user table configuration (visible columns, column widths, column order) across
sessions. The storage backend is controlled by a flag so the host chooses where state lives.

**`TableUserSettings` interface**
```typescript
interface TableUserSettings {
  hiddenColumns: string[];          // columnDef keys of hidden columns
  columnOrder:   string[];          // ordered list of columnDef keys (maps to displayIndex)
  columnWidths:  Record<string, number>; // columnDef key → pixel width
}
```

**Persistence modes** — set via `TableConfig.persistSettings`:

| Mode | Behaviour |
|---|---|
| `'none'` (default) | No persistence; component is stateless across sessions |
| `'local'` | Auto-save/load from `localStorage` using `TableConfig.settingsKey` |
| `'server'` | Host owns persistence — table loads from `[userSettings]` input and emits changes via `(settingsChange)` output |

**`TableConfig` additions**
- `persistSettings?: 'none' | 'local' | 'server'`
- `settingsKey?: string` — required when `persistSettings: 'local'`; scopes the key so multiple tables on one page don't collide

**Inputs / outputs for server mode**
- `userSettings = input<TableUserSettings | undefined>()` — host passes the loaded settings object; table applies them on init and whenever the input changes
- `settingsChange = output<TableUserSettings>()` — emits the full settings snapshot whenever columns, widths, or order change; host persists to its own endpoint

**Column widths**
- Requires resizable column headers — drag handle on each `<th>` boundary, `ResizeObserver` on the table to track pixel widths
- Minimum column width enforced (e.g. 60 px) so columns cannot be collapsed to zero

**Column order**
- `ColumnDef.displayIndex` is already reserved in the type — user drag-to-reorder in the header populates this
- Column reorder in headers uses Angular CDK drag-drop (same dependency as the row reorder feature)
- `columnOrderChange` output for observability (also captured inside `settingsChange`)

**Demo additions**
- Toggle: `'local'` storage vs. `'server'` (mock) vs. `'none'`
- "Reset settings" button that clears localStorage or calls the mock server endpoint

---

### Theming & Style Customisation ✅

- Expose `--st-*` CSS custom properties for row height, header background, border colour, selected-row highlight, hover colour, scrollbar colours
- `TableConfig.maxHeight?: string` — fixed-height scrollable body with sticky header
- Sensible Material-aligned defaults; no override required for standard usage
- Document full token list in README; demo gains a live-preview panel

---

### Sticky / Fixed Columns ✅

Pin columns to the left or right edge so they remain visible when the table scrolls horizontally.
Angular Material's `mat-table` supports `sticky` and `stickyEnd` on `<ng-container matColumnDef>` natively — this feature wires that up declaratively via `ColumnDef`.

**`ColumnDef` additions**
- `sticky?: 'left' | 'right'` — `'left'` maps to `[sticky]="true"`, `'right'` maps to `[stickyEnd]="true"`; omitting the property means no pinning (current behaviour)

**Template changes**
- Each `<ng-container [matColumnDef]>` receives `[sticky]` and `[stickyEnd]` bindings driven by `column.sticky`
- The `select` checkbox column and any future built-in columns (`expand`, `drag`) also respect the flag so hosts can pin them
- The table wrapper gets `overflow-x: auto` when any sticky columns are present, allowing horizontal scroll while pinned columns stay fixed

**`TableConfig` addition**
- `TableConfig.horizontalScroll?: boolean` — explicit opt-in for horizontal scroll (auto-enabled when any `sticky` column is detected, but can also be forced without pinned columns)

**Interaction with User Settings**
- Sticky state is part of the column definition supplied by the host, not a user-adjustable setting — it is therefore intentionally excluded from `TableUserSettings`
- If the Column Chooser is active, sticky columns are visually distinguished (e.g. a pin icon) and their `hideable` flag defaults to `false` to prevent the table from becoming unusable

**Demo additions**
- `id` column pinned `'left'`, `storyPoints` column pinned `'right'` to demonstrate both directions simultaneously

---

### Other V2 ✅

- [x] Date range column filter (native date inputs, no extra deps)
- [x] Export to CSV — toolbar button, browser download, `csvExport` output

---

## V3 — Future

- Inline row editing (`isEditable` on `ColumnDef`, `editDef` content directive, `rowSave`/`rowCancel` outputs) — keeping editor out of the grid scope until unavoidable
- Nested / Expandable Rows — `expandDef` directive, `expand` built-in column, signal-tracked expanded row IDs
- Drag & Drop Row Reordering — CDK on `<tbody>`, `drag` built-in column, `rowReorder` output
- Virtual scrolling (`CdkVirtualScrollViewport`) for large datasets
- Storybook stories per feature
- Unit test suite (Vitest + Angular Testing Library)
- StackBlitz live demo embed in README

---

## Published ✅

- [x] `ng-packagr` library build — multi-project workspace under `projects/ngx-mat-simple-table/`
- [x] Published to npm as [`ngx-mat-simple-table@1.0.0`](https://www.npmjs.com/package/ngx-mat-simple-table)
- [x] Tagged `v1.0.0` on GitHub
- [x] Published `ngx-mat-simple-table@2.0.0` — full V2 feature set

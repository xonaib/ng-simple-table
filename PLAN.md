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

## V2 — Planned

### Nested / Expandable Rows
- `expandDef` content directive (mirrors `cellDef`) for the expansion panel template
- `expand` built-in column (`columnDef: 'expand'`) — chevron toggle
- Expanded row IDs tracked in `signal<Set<unknown>>()`
- Second `*matRowDef` in template renders full-width expansion panel via `NgTemplateOutlet`
- Recursive by default — host can nest `<simple-table>` inside the expansion template

### Inline Row Editing
- `isEditable: boolean` added to `ColumnDef`
- `editDef` content directive for custom edit-mode cell templates
- Active edit row tracked in `signal<T | null>(null)`
- Auto-generates `<input>` for editable columns with no custom `editDef`
- `rowSave` and `rowCancel` outputs
- Edit/confirm/cancel rendered in a dedicated actions column

### Drag & Drop Row Reordering
- `reorderable` input (default `false`)
- `cdkDropList` on `<tbody>`, `cdkDrag` on each `<tr mat-row>` (Angular CDK — no extra packages)
- `drag` built-in column for the drag handle (`cdkDragHandle`)
- `rowReorder` output emits `{ previousIndex, currentIndex, data: T[] }`

### Client-Side Data Mode
When the host passes a plain `T[]` (not paged), the table should handle sort, filter, and pagination internally so the host doesn't need to wire up computed signals.
- `clientSide: boolean` flag in `TableConfig` (default `false` to keep current behaviour)
- When `true`, `SimpleTableComponent` owns a `MatTableDataSource<T>` internally — sort, filter, and paginator are connected automatically
- Column filters drive `MatTableDataSource.filterPredicate` rather than emitting to the host
- `filterChange` and `sortChange` outputs still fire for observability, but the host no longer needs to act on them
- `length` input becomes optional/ignored — the data source counts rows itself
- Demo page gains a toggle to switch between client-side and server-side mode to showcase both

### Theming & Style Customisation
Allow hosts to control the visual appearance without forking the component.
- Expose a set of CSS custom properties (`--st-*`) for the most common overrides: row height, header background, header text colour, border colour, selected-row highlight, hover colour, scrollbar track/thumb colours
- Wrap the table in a fixed-height container with `overflow-y: auto` when a `maxHeight` option is set in `TableConfig` — gives a scrollable body with a sticky header
- `TableConfig.maxHeight?: string` (e.g. `'400px'`, `'60vh'`) controls the container; unset means no scroll constraint (current behaviour)
- All CSS custom properties have sensible Material-aligned defaults so the table looks correct out of the box
- Document the full token list in README with a copy-paste override block
- Demo page gains a "Custom theme" panel that live-previews a few overrides

### Other V2
- Date range column filter (`MatDatepicker`)
- Column visibility toggle (`showColumnsToggle` in `TableConfig`)
- Server-side sort/filter/page model (`serverSide: boolean` flag)
- Export to CSV utility

---

## V3 — Future

- Virtual scrolling (`CdkVirtualScrollViewport`) for large datasets
- `ng-packagr` library build — publish to npm
- Storybook stories per feature
- Unit test suite (Vitest + Angular Testing Library)
- StackBlitz live demo embed in README

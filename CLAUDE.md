# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server at http://localhost:4200
npm run build      # production build
npm test           # run tests (Vitest)
```

No single-test runner is configured yet — the test suite is planned for V3.

## Architecture

This is an Angular 21 standalone app demonstrating `SimpleTableComponent`, a reusable declarative table wrapper around Angular Material.

### Component tree

```
AppComponent
└── DemoTablePageComponent          # demo host — owns all state & event handlers
    └── SimpleTableComponent<T>     # the reusable table
        └── ColumnFilterComponent   # dropdown filter popup per filterable column
```

### SimpleTableComponent

The core component (`src/app/simple-table/`). Key design decisions:

- **Fully signals-based**: all `@Input()`/`@Output()`/`@ContentChildren()` use the Angular 17+ signal API (`input()`, `output()`, `contentChildren()`). No `ChangeDetectorRef`.
- **Generic `<T>`**: typed on the row data shape; the host provides `T[]` or `Observable<T[]>`.
- **Custom cell templates**: host drops `<ng-template [cellDef]="columnKey" let-row>` inside `<simple-table>`. `CellDefDirective` marks the template; `SimpleTableComponent` collects them via `contentChildren(CellDefDirective)` and resolves them with `NgTemplateOutlet`. Headers are always auto-generated so `mat-sort-header` works on every column including custom ones.
- **Column filter state**: `columnFilters` is a `signal<Map<string, ItemParent>>`. `ColumnFilterComponent` holds its own pending selection state (`_pendingKeys` signal) — changes are only committed to the parent on Apply/Clear.
- **No `MatTableDataSource`**: data flows through a raw signal (`_data`). Sorting, filtering, and pagination are the host's responsibility (server-side model by default). Client-side mode is planned for V2.

### DemoTablePageComponent

Lives in `src/app/demo/`. Demonstrates server-side-style data management using only signals and `computed()`:

- `_allTasks` → `_filteredTasks` (computed, applies active filters + sort) → `pagedTasks` (computed, slices by page)
- Event handlers (`onPage`, `onSortChange`, `onFilterChange`) update the relevant signals; computed values re-derive automatically.
- `filtersData` is built once from the static `TASKS` array.

### Types (`src/app/simple-table/table.types.ts`)

- `ColumnDef` — column config (key, header, sortable, filter flags)
- `TableConfig` / `PaginationOptions` — table-level settings
- `ColumnFiltersData` / `ItemParent` / `Item` — filter option tree (parent = column, children = selectable values, `selectedKeys` = active selections)
- `FilterType` — enum; only `DropDown` exists today

## Conventions

- Every component uses `ChangeDetectionStrategy.OnPush`.
- Subscriptions use `takeUntilDestroyed(destroyRef)` — no manual `unsubscribe`.
- The `select` columnDef is a reserved keyword that renders the checkbox column; it must not be used for data columns.
- Adding a new built-in column type (e.g. `expand`, `drag` from the V2 plan) follows the same pattern as `select`: hardcode the `<ng-container matColumnDef>` block in `simple-table.component.html` and branch on `columnDef !== 'select'` (or the new key) in `_populateColumns()`.

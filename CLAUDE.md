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
- **Dual data source**: in server-side mode (default) data flows through `_data` signal directly into `mat-table`. In client-side mode (`TableConfig.clientSide: true`) a `MatTableDataSource<T>` (`_matDs`) is owned internally and connected to `MatSort`/`MatPaginator` via a signal `effect()` — this fires on init and whenever `clientSide` is toggled at runtime. Master toggle and `isAllSelected()` use `_visibleRows()` which returns the current page slice from `_matDs` in client-side mode and `_data()` in server-side mode.
- **`pageIndex` input**: in server-side mode the host passes the current page index so the paginator visually resets when sort/filter handlers call `_pageIndex.set(0)`.

### DemoTablePageComponent

Lives in `src/app/demo/`. Supports two modes toggled at runtime via `isClientSide` signal:

**Server-side mode** (default): makes HTTP requests through `TasksInterceptor` (`tasks.interceptor.ts`). State signals (`_pageIndex`, `_pageSize`, `_sortState`, `_activeFilters`) feed a `_serverSideParams` computed → `_queryTrigger` computed → `toObservable` + `switchMap` + `toSignal`. `switchMap` cancels in-flight requests on rapid changes. `isLoading` signal drives a progress bar.

**Client-side mode**: passes the full `TASKS` array directly; `SimpleTableComponent` handles sort, filter, and pagination internally.

`filtersData` is built once from the static `TASKS` array and used in both modes.

### TasksInterceptor (`src/app/demo/tasks.interceptor.ts`)

Functional HTTP interceptor registered in `app.config.ts`. Matches `/api/tasks`, reads `page`/`size`/`sort`/`direction` and per-column filter params from `req.params`, filters+sorts+slices the in-memory `TASKS` array, returns a 300 ms delayed `HttpResponse<TasksResponse>`. No backend required.

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

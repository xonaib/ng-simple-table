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
- **Column filter state**: `columnFilters` is a `signal<Map<string, ItemParent>>`. `ColumnFilterComponent` holds its own pending selection state (`_pendingKeys` signal) — changes are only committed to the parent on Apply/Clear. Distinct dropdown values are **rebuilt from `_data()`** whenever rows or filterable columns change (`_rebuildColumnFilterOptionsFromData`); server-side that is the current API page, client-side the full `dataSource` array. If active `selectedKeys` are no longer in the new option list, they are pruned and **`filterChange` is re-emitted** (server-side) so the host can update query params.
- **Dual data source**: in server-side mode (default) data flows through `_data` signal directly into `mat-table`. In client-side mode (`TableConfig.clientSide: true`) a `MatTableDataSource<T>` (`_matDs`) is owned internally and connected to `MatSort`/`MatPaginator` via a signal `effect()` — this fires on init and whenever `clientSide` is toggled at runtime. Master toggle and `isAllSelected()` use `_visibleRows()` which returns the current page slice from `_matDs` in client-side mode and `_data()` in server-side mode.
- **`pageIndex` input**: in server-side mode the host passes the current page index so the paginator visually resets when sort/filter handlers call `_pageIndex.set(0)`.
- **Column drag-reorder**: uses CDK `CdkDrag`/`CdkDropList`/`CdkDropListGroup` on the header cells. Each `<th>` is simultaneously a `CdkDropList` and a `CdkDrag`; the `<table>` carries `cdkDropListGroup` to auto-connect them. `*ngFor` (not `@for`) is required so CDK can traverse the view tree. Filter and resize-handle elements stop `pointerdown` propagation to avoid triggering a drag.

### DemoTablePageComponent

Lives in `src/app/demo/`. Supports two modes toggled at runtime via `isClientSide` signal:

**Server-side mode** (default): makes HTTP requests through `TasksInterceptor` (`tasks.interceptor.ts`). State signals (`_pageIndex`, `_pageSize`, `_sortState`, `_activeFilters`) feed a `_serverSideParams` computed → `_queryTrigger` computed → `toObservable` + `switchMap` + `toSignal`. `switchMap` cancels in-flight requests on rapid changes. `isLoading` signal drives a progress bar.

**Client-side mode**: passes the full `TASKS` array directly; `SimpleTableComponent` handles sort, filter, and pagination internally.

### TasksInterceptor (`src/app/demo/tasks.interceptor.ts`)

Functional HTTP interceptor registered in `app.config.ts`. Matches `/api/tasks`, reads `page`/`size`/`sort`/`direction` and per-column filter params from `req.params`, filters+sorts+slices the in-memory `TASKS` array, returns a 300 ms delayed `HttpResponse<TasksResponse>`. No backend required.

### Types (`src/app/simple-table/table.types.ts`)

- `ColumnDef` — column config (key, label, sortable, filter flags)
- `TableConfig` / `PaginationOptions` — table-level settings
- `ItemParent` / `Item` — filter option tree per column (`selectedKeys` = active selections). `ColumnFiltersData` remains as a structural type only; the host no longer passes it in.
- `FilterType` — enum; only `DropDown` exists today

## Conventions

- Every component uses `ChangeDetectionStrategy.OnPush`.
- Subscriptions use `takeUntilDestroyed(destroyRef)` — no manual `unsubscribe`.
- The `select` column `key` is reserved: it renders the checkbox column and must not be used for data columns.
- Adding a new built-in column type (e.g. `expand`, `drag` from the V2 plan) follows the same pattern as `select`: hardcode the `<ng-container matColumnDef>` block in `simple-table.component.html` and branch on `key !== 'select'` (or the new key) in `_populateColumns()` / `_allDataColumns`.

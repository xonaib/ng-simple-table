# ff-simple-table — Development Roadmap

## V1 (current)

Goal: Clean, working showcase of core table capabilities in Angular 21.

### Implemented
- [x] Standalone Angular 21 component (`SimpleTableComponent<T>`)
- [x] Declarative column config via `FFColumnDef`
- [x] Client-side sorting via `MatSort` — emit `sortChange`, host page handles sort
- [x] Multi-row checkbox selection (`SelectionModel<T>` from `@angular/cdk`)
- [x] Dropdown column filters (`FilterType.DropDown`) with search, select-all, sort
- [x] Pagination via Angular Material `MatPaginator`
- [x] Custom cell templates via `@ContentChildren(MatColumnDef)` — hybrid approach
- [x] Observable and array `dataSource` support
- [x] Observable `columnFiltersData` support
- [x] `filterChange` output — host page responsible for applying filters to data
- [x] `selectionChange` output — emits full selected array on change
- [x] `OnPush` change detection throughout
- [x] `inject()` and `takeUntilDestroyed()` — modern Angular 21 patterns
- [x] Demo app: Task Management dataset (50 tasks, 4 assignees, 3 statuses, 3 priorities)
- [x] Demo shows: sorting, selection badge, dropdown filters, pagination, custom title template

### Explicitly deferred
- Date/calendar column filters
- Column visibility toggle
- `selectedRows` input for pre-selection
- Server-side sorting flag
- Row expansion / collapsible rows
- Inline cell editing

---

## V2 (planned)

- **Date range column filters** using `MatDatepicker` — no extra packages
- **Column visibility toggle** (`showColumnsToggle` in `TableConfig`)
- **`selectedRows` input** — pre-select rows on load
- **Server-side sorting** — `serverSideSort: boolean` flag + `sortChange` becomes the trigger
- **Export to CSV** — utility function, triggered via a button in the demo
- **`filterApplied` CSS class** on header cells when a filter has active selections

---

## V3 (future)

- Virtual scrolling for large datasets (`CdkVirtualScrollViewport`)
- Expandable/hierarchy rows
- Inline cell editing (signal-based reactive forms)
- `ng-packagr` library build — publish to npm as `@your-scope/ff-simple-table`
- Storybook stories for each feature
- Unit test suite (Vitest + Angular Testing Library)
- StackBlitz live demo link in README

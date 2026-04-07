import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SimpleTableComponent } from '../simple-table/simple-table.component';
import { CellDefDirective } from '../simple-table/cell-def.directive';
import {
  ColumnFiltersData,
  ColumnDef,
  FilterType,
  ItemParent,
  TableConfig,
} from '../simple-table/table.types';
import { Task, TASKS } from './demo-data';
import { TasksResponse } from './tasks.interceptor';

@Component({
  selector: 'app-demo-table-page',
  standalone: true,
  imports: [SimpleTableComponent, CellDefDirective, MatButtonToggleModule, MatProgressBarModule],
  templateUrl: './demo-table-page.component.html',
  styleUrl: './demo-table-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoTablePageComponent {
  private readonly _http = inject(HttpClient);

  // ---- column definitions ----

  readonly columns: ColumnDef[] = [
    { columnDef: 'select' },
    { columnDef: 'id',          header: 'ID',          width: 72 },
    { columnDef: 'title',       header: 'Title',       width: 200 },
    { columnDef: 'assignee',    header: 'Assignee',    hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'status',      header: 'Status',      hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'priority',    header: 'Priority',    hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'dueDate',     header: 'Due Date' },
    { columnDef: 'storyPoints', header: 'Points' },
  ];

  // ---- mode toggle ----

  readonly isClientSide = signal(false);

  readonly effectiveConfig = computed((): TableConfig => ({
    isPaginated: true,
    paginationOptions: { defaultPageSize: 10, pageSizeOptions: [5, 10, 25, 50] },
    clientSide: this.isClientSide(),
  }));

  // ---- filter options (derived once from the full dataset) ----

  readonly filtersData: ColumnFiltersData = this._buildFiltersData();

  // ---- server-side state signals ----

  private readonly _activeFilters  = signal<Map<string, ItemParent>>(new Map());
  private readonly _sortState      = signal<Sort | null>(null);
  readonly _pageIndex              = signal(0);   // non-private: passed to simple-table [pageIndex]
  private readonly _pageSize       = signal(10);
  private readonly _refreshCounter = signal(0);

  // ---- HTTP params (server-side mode) ----

  private readonly _serverSideParams = computed((): Record<string, string> => {
    const params: Record<string, string> = {
      page: String(this._pageIndex()),
      size: String(this._pageSize()),
    };
    const sort = this._sortState();
    if (sort?.active && sort.direction) {
      params['sort']      = sort.active;
      params['direction'] = sort.direction;
    }
    for (const [col, parent] of this._activeFilters()) {
      const keys = parent.selectedKeys ?? [];
      if (keys.length > 0) params[col] = keys.map(String).join(',');
    }
    return params;
  });

  // Combined trigger so switching modes also fires a new request.
  // _refreshCounter is included so incrementing it forces a new HTTP request.
  private readonly _queryTrigger = computed(() => ({
    clientSide: this.isClientSide(),
    params:     this._serverSideParams(),
    refresh:    this._refreshCounter(),
  }));

  // ---- loading + HTTP response ----

  readonly isLoading = signal(false);

  private readonly _serverResponse = toSignal(
    toObservable(this._queryTrigger).pipe(
      switchMap(({ clientSide, params }) => {
        if (clientSide) {
          this.isLoading.set(false);
          return EMPTY;
        }
        this.isLoading.set(true);
        return this._http.get<TasksResponse>('/api/tasks', { params }).pipe(
          tap(() => this.isLoading.set(false)),
        );
      }),
    ),
    { initialValue: { data: [] as Task[], total: 0 } },
  );

  // ---- data bound to the table ----

  /** full dataset in client-side mode; current page slice returned by the API in server-side mode */
  readonly effectiveDataSource = computed<Task[]>(() =>
    this.isClientSide() ? TASKS : (this._serverResponse()?.data ?? [])
  );

  /** ignored by the table in client-side mode (it counts rows itself) */
  readonly effectiveLength = computed(() =>
    this.isClientSide() ? 0 : (this._serverResponse()?.total ?? 0)
  );

  // ---- selection state ----

  readonly selectedTasks = signal<Task[]>([]);

  // ---- event handlers ----

  onPage(event: PageEvent): void {
    this._pageIndex.set(event.pageIndex);
    this._pageSize.set(event.pageSize);
  }

  onSortChange(sort: Sort): void {
    this._sortState.set(sort);
    this._pageIndex.set(0);
  }

  onFilterChange(filters: Map<string, ItemParent>): void {
    this._activeFilters.set(new Map(filters));
    this._pageIndex.set(0);
  }

  onSelectionChange(rows: Task[]): void {
    this.selectedTasks.set(rows);
  }

  onRefresh(): void {
    this._pageIndex.set(0);
    this._refreshCounter.update(n => n + 1);
  }

  onColumnOrderChange(order: string[]): void {
    console.log('[demo] column order:', order);
  }

  onColumnWidthChange(widths: Record<string, number>): void {
    console.log('[demo] column widths:', widths);
  }

  // ---- helpers ----

  private _buildFiltersData(): ColumnFiltersData {
    const unique = (key: keyof Task) =>
      [...new Set(TASKS.map(t => String(t[key])))].sort();

    return {
      parents: [
        { id: 'assignee', children: unique('assignee').map(v => ({ id: v, value: v })) },
        { id: 'status',   children: unique('status').map(v   => ({ id: v, value: v })) },
        { id: 'priority', children: unique('priority').map(v => ({ id: v, value: v })) },
      ],
    };
  }
}

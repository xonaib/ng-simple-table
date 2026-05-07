import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, firstValueFrom, switchMap } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import {
  SimpleTableComponent,
  CellDefDirective,
  StStateStoringDirective,
  StExportDirective,
  ColumnDef,
  FilterType,
  ItemParent,
  TableAction,
  TableConfig,
} from 'ngx-mat-simple-table';
import { DEFAULT_TASK_COUNT, generateTasks, Task, TASK_COUNT_OPTIONS } from './demo-data';
import { TasksResponse } from './tasks.interceptor';

@Component({
  selector: 'app-demo-table-page',
  standalone: true,
  imports: [
    SimpleTableComponent,
    CellDefDirective,
    StStateStoringDirective,
    StExportDirective,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './demo-table-page.component.html',
  styleUrl: './demo-table-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoTablePageComponent {
  private readonly _http = inject(HttpClient);
  private readonly _document = inject(DOCUMENT);

  // ---- theme toggle ----

  readonly isDarkTheme = signal(false);

  constructor() {
    effect(() => {
      this._document.body.style.colorScheme = this.isDarkTheme() ? 'dark' : 'light';
    });
  }

  // ---- column definitions ----

  readonly columns: ColumnDef[] = [
    { key: 'select' },
    { key: 'id', label: 'ID', width: 72, sticky: 'left' },
    { key: 'title', label: 'Title', width: 220, sticky: 'left', hasColumnFilters: true },
    {
      key: 'assignee',
      label: 'Assignee',
      width: 140,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
      displayValue: (v: unknown) =>
        String(v ?? '')
          .replace(/-/g, ' ')
          .toUpperCase(),
      cellClass: (v: unknown) => `status-${String(v ?? '')}`,
    },
    {
      key: 'priority',
      label: 'Priority',
      width: 110,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
      displayValue: (v: unknown) => String(v ?? '').toUpperCase(),
      cellClass: (v: unknown) => `priority-${String(v ?? '')}`,
    },
    {
      key: 'team',
      label: 'Team',
      width: 120,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
    },
    {
      key: 'sprint',
      label: 'Sprint',
      width: 120,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
    },
    {
      key: 'reporter',
      label: 'Reporter',
      width: 120,
      hasColumnFilters: true,
      filterType: FilterType.DropDown,
    },
    { key: 'estimate', label: 'Estimate', width: 100 },
    { key: 'tags', label: 'Tags', width: 180 },
    { key: 'dueDate', label: 'Due Date', width: 120 },
    { key: 'storyPoints', label: 'Points', width: 90 },
  ];

  // ---- mode toggle ----

  readonly isClientSide = signal(false);
  readonly isVirtual = signal(false);
  readonly taskCountOptions = TASK_COUNT_OPTIONS;
  readonly selectedTaskCount = signal(DEFAULT_TASK_COUNT);
  private readonly _clientTasks = computed(() => generateTasks(this.selectedTaskCount()));

  readonly effectiveConfig = computed(
    (): TableConfig => ({
      isPaginated: !this.isVirtual(),
      paginationOptions: { defaultPageSize: 25, pageSizeOptions: [5, 10, 25, 50] },
      clientSide: this.isClientSide(),
      virtual: this.isVirtual(),
      virtualRowHeight: 48,
      horizontalScroll: true,
      fillContainer: true,
    }),
  );

  // ---- server-side state signals ----

  private readonly _activeFilters = signal<Map<string, ItemParent>>(new Map());
  private readonly _sortState = signal<Sort | null>(null);
  readonly _pageIndex = signal(0); // non-private: passed to simple-table [pageIndex]
  private readonly _pageSize = signal(25);
  private readonly _refreshCounter = signal(0);

  // ---- HTTP params (server-side mode) ----

  private readonly _serverSideParams = computed((): Record<string, string> => {
    const virtual = this.isVirtual();
    const params: Record<string, string> = {
      page: virtual ? '0' : String(this._pageIndex()),
      size: String(virtual ? this.selectedTaskCount() : this._pageSize()),
      count: String(this.selectedTaskCount()),
    };
    const sort = this._sortState();
    if (sort?.active && sort.direction) {
      params['sort'] = sort.active;
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
    params: this._serverSideParams(),
    refresh: this._refreshCounter(),
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
        return this._http
          .get<TasksResponse>('/api/tasks', { params })
          .pipe(tap(() => this.isLoading.set(false)));
      }),
    ),
    { initialValue: { data: [] as Task[], total: 0 } },
  );

  // ---- data bound to the table ----

  /** full dataset in client-side mode; current page slice returned by the API in server-side mode */
  readonly effectiveDataSource = computed<Task[]>(() =>
    this.isClientSide() ? this._clientTasks() : (this._serverResponse()?.data ?? []),
  );

  /** ignored by the table in client-side mode (it counts rows itself) */
  readonly effectiveLength = computed(() =>
    this.isClientSide() ? 0 : (this._serverResponse()?.total ?? 0),
  );

  // ---- selection state ----

  readonly selectedTasks = signal<Task[]>([]);

  // ---- actions ----

  readonly tableActions: TableAction<Task>[] = [
    // 'toolbar' — rendered on the left of the toolbar row
    {
      id: 'add',
      label: 'New task',
      icon: 'add',
      position: 'toolbar',
      color: 'primary',
      variant: 'flat',
      cb: () => console.log('[demo] add task'),
    },
    {
      id: 'bulk-delete',
      label: 'Delete selected',
      icon: 'delete_sweep',
      position: 'toolbar',
      color: 'warn',
      variant: 'stroked',
      disabled: () => this.selectedTasks().length === 0,
      cb: () => console.log('[demo] bulk delete', this.selectedTasks()),
    },
    // 'row-inline' — icon button visible on every row
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      position: 'row-inline',
      cb: (row: Task | undefined) => console.log('[demo] edit', row),
    },
    // 'row-menu' — items in the ⋯ overflow menu
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: 'content_copy',
      position: 'row-menu',
      cb: (row: Task | undefined) => console.log('[demo] duplicate', row),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      position: 'row-menu',
      color: 'warn',
      cb: (row: Task | undefined) => console.log('[demo] delete', row),
    },
    // 'below' — rendered on the left of the paginator row
    {
      id: 'export-custom',
      label: 'Export selected',
      icon: 'file_download',
      position: 'below',
      disabled: () => this.selectedTasks().length === 0,
      cb: () => console.log('[demo] export selected', this.selectedTasks()),
    },
  ];

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

  onTaskCountChange(count: number): void {
    this.selectedTaskCount.set(count);
    this.selectedTasks.set([]);
    this._pageIndex.set(0);
  }

  onScrollModeChange(mode: 'paginated' | 'virtual'): void {
    this.isVirtual.set(mode === 'virtual');
    this.selectedTasks.set([]);
    this._pageIndex.set(0);
  }

  onRefresh(): void {
    this._pageIndex.set(0);
    this._refreshCounter.update((n) => n + 1);
  }

  onColumnOrderChange(order: string[]): void {
    console.log('[demo] column order:', order);
  }

  onColumnWidthChange(widths: Record<string, number>): void {
    console.log('[demo] column widths:', widths);
  }

  readonly getAllForExport = (): Promise<Task[]> => {
    const params: Record<string, string> = {
      count: String(this.selectedTaskCount()),
    };
    const sort = this._sortState();
    if (sort?.active && sort.direction) {
      params['sort'] = sort.active;
      params['direction'] = sort.direction;
    }
    for (const [col, parent] of this._activeFilters()) {
      const keys = parent.selectedKeys ?? [];
      if (keys.length > 0) params[col] = keys.map(String).join(',');
    }
    return firstValueFrom(
      this._http.get<TasksResponse>('/api/tasks', { params }).pipe(map((r) => r.data)),
    );
  };
}

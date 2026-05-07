import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass, NgFor, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionViewer, DataSource, SelectionModel } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { BehaviorSubject, Observable, ReplaySubject, Subscription, combineLatest, isObservable, map, of as observableOf, startWith, switchMap } from 'rxjs';
import { ColumnFilterComponent } from './column-filter/column-filter.component';
import { CellDefDirective } from './cell-def.directive';
import { StExportDirective } from './st-export.directive';
import { SimpleTableExportService } from './simple-table-export.service';
import {
  ColumnDef,
  FilterType,
  ItemParent,
  SIMPLE_TABLE_LAYOUT_FILLER_COLUMN,
  ST_ROW_ACTIONS_COLUMN,
  TableAction,
  TableConfig,
  TableUserSettings,
} from './table.types';

// ---- Virtual scroll datasource (internal) ----

/**
 * Number of extra rows rendered above and below the visible window to
 * reduce blank flashes during fast scrolling.
 */
const _VIRTUAL_BUFFER_ROWS = 3;

/**
 * Internal DataSource that integrates CdkVirtualScrollViewport with mat-table.
 * Attach the viewport reference after view init — the ReplaySubject buffers it
 * so connect() can be called (by mat-table) before attach().
 */
class _VirtualTableDataSource<T> extends DataSource<T> {
  private readonly _data$ = new BehaviorSubject<T[]>([]);
  private readonly _viewport$ = new ReplaySubject<CdkVirtualScrollViewport>(1);

  /** Must match TableConfig.virtualRowHeight. Update before attaching the viewport. */
  itemSize = 48;

  attach(vp: CdkVirtualScrollViewport): void {
    this._viewport$.next(vp);

    // CDK's built-in scroll strategy calls setRenderedContentOffset() which sets
    // `transform: translateY(offset)` on .cdk-virtual-scroll-content-wrapper.
    // A CSS transform creates a new stacking context that breaks `position: sticky`
    // on the <thead> inside the viewport.
    //
    // Fix: replace the offset mechanism with `margin-top` on the content wrapper,
    // which achieves the same visual offset without creating a stacking context.
    // We no-op setRenderedContentOffset so CDK's strategy cannot re-apply the
    // transform after we clear it.
    (vp as any).setRenderedContentOffset = () => {};
  }

  set data(rows: T[]) {
    this._data$.next(rows);
  }

  get data(): T[] {
    return this._data$.value;
  }

  private _getWrapper(vp: CdkVirtualScrollViewport): HTMLElement | null {
    return vp.elementRef.nativeElement.querySelector('.cdk-virtual-scroll-content-wrapper');
  }

  connect(_viewer: CollectionViewer): Observable<T[]> {
    // We ignore the CollectionViewer because mat-table's viewChange always emits
    // {start: 0, end: MAX_SAFE_INTEGER}. Instead we subscribe directly to the
    // viewport's scroll position.
    return this._viewport$.pipe(
      switchMap((vp) =>
        combineLatest([
          this._data$,
          vp.scrolledIndexChange.pipe(startWith(0)),
        ]).pipe(
          map(([data]) => {
            const scrollOffset = vp.measureScrollOffset();
            const startIdx = Math.max(
              0,
              Math.floor(scrollOffset / this.itemSize) - _VIRTUAL_BUFFER_ROWS,
            );
            const endIdx = Math.min(
              Math.ceil((scrollOffset + vp.getViewportSize()) / this.itemSize) + _VIRTUAL_BUFFER_ROWS,
              data.length,
            );
            vp.setTotalContentSize(data.length * this.itemSize);
            vp.setRenderedRange({ start: startIdx, end: endIdx });

            // Position the rendered rows at their correct scroll-offset pixel position
            // using margin-top instead of transform so sticky <thead> works correctly.
            // Row N in the data is always at exactly N * itemSize px from the scroll-container top:
            //   marginTop = startIdx * itemSize   (content starts at first rendered row position)
            //   row K within rendered slice => marginTop + K * itemSize = (startIdx + K) * itemSize ✓
            const wrapper = this._getWrapper(vp);
            if (wrapper) {
              wrapper.style.marginTop = `${startIdx * this.itemSize}px`;
            }

            return data.slice(startIdx, endIdx);
          }),
        ),
      ),
    );
  }

  disconnect(): void {
    // Intentionally not completing subjects — this instance is reused across mode changes.
  }
}

// ---- Component ----

const LAYOUT_WIDTH_FUDGE_PX = 2;
/** Used only for layout-sum / filler when select has no explicit width (matches default CSS). */
const ST_SELECT_DEFAULT_SUM_PX = 52;

@Component({
  selector: 'simple-table',
  standalone: true,
  host: {
    '[class.st-fill-container-host]': '_fillContainer()',
  },
  imports: [
    TitleCasePipe,
    NgClass,
    NgFor,
    NgTemplateOutlet,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    CdkDropListGroup,
    ScrollingModule,
    ColumnFilterComponent,
  ],
  templateUrl: './simple-table.component.html',
  styleUrl: './simple-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MatPaginatorIntl],
})
export class SimpleTableComponent<T> implements AfterContentInit {
  private readonly _destroyRef  = inject(DestroyRef);
  private readonly _hostEl      = inject(ElementRef<HTMLElement>);
  private readonly _exportSvc   = inject(SimpleTableExportService);
  private readonly _paginatorIntl = inject(MatPaginatorIntl);

  /** `matColumnDef` id for the internal filler column (template + row defs only). */
  readonly layoutFillerColumnDef = SIMPLE_TABLE_LAYOUT_FILLER_COLUMN;

  // ---- selection model ----
  readonly selection = new SelectionModel<T>(true, []);

  // ---- view children ----
  private readonly _sortRef      = viewChild(MatSort);
  private readonly _paginatorRef = viewChild(MatPaginator);
  private readonly _viewportRef  = viewChild(CdkVirtualScrollViewport);

  // ---- virtual scroll ----

  readonly _isVirtual       = computed(() => this.tableConfig().virtual === true);
  readonly _virtualRowHeight = computed(() => this.tableConfig().virtualRowHeight ?? 48);

  /** Internal datasource used when virtual: true. */
  private readonly _virtualDs = new _VirtualTableDataSource<T>();

  /**
   * Subscription that feeds filtered+sorted rows from MatTableDataSource into
   * _virtualDs when in client-side virtual mode. Recreated on mode change.
   */
  private _virtualClientSub: Subscription | null = null;

  /**
   * Resolves the active datasource for [dataSource] on mat-table.
   * - virtual      → _virtualDs (CdkVirtualScrollViewport-aware DataSource)
   * - clientSide   → _matDs     (MatTableDataSource — handles sort/filter/page)
   * - server-side  → _data()    (plain array, host drives all state)
   */
  readonly _tableDataSource = computed<DataSource<T> | T[]>(() => {
    if (this._isVirtual()) return this._virtualDs;
    if (this.tableConfig().clientSide) return this._matDs;
    return this._data();
  });

  /** custom cell templates provided by the host via [cellDef] */
  readonly cellDefs = contentChildren(CellDefDirective);
  /** present when the host drops <st-export /> inside <simple-table> */
  readonly _exportDirective = contentChild(StExportDirective);

  // ---- inputs ----

  readonly dataSource = input.required<T[] | Observable<T[]>>();
  readonly tableColumns = input.required<ColumnDef[]>();
  readonly tableConfig = input<TableConfig>({});
  readonly length = input(0);
  /** Unique identifier for this table instance. Required when using StStateStoringDirective. */
  readonly tableId = input<string | undefined>(undefined);
  /**
   * Current page index for server-side pagination. When provided the paginator
   * is synced to this value, keeping it aligned when the host resets the page
   * after a sort or filter change. Has no effect in client-side mode.
   */
  readonly pageIndex = input<number | undefined>(undefined);
  readonly stickyHeaders = input(false);
  readonly selectedRows = input<T[] | undefined>();
  /**
   * Declarative action buttons for the table. Each action specifies a `position`:
   * - `'above'`      — strip rendered above the toolbar
   * - `'toolbar'`    — left side of the built-in toolbar
   * - `'below'`      — strip rendered below the paginator
   * - `'row-inline'` — icon button(s) on every row, in an auto-injected sticky-end column
   * - `'row-menu'`   — items in a ⋯ overflow menu in the same column
   */
  readonly actions = input<TableAction<T>[]>([]);

  // ---- pagination state ----

  /** Tracks the active page size so effective-length can be recomputed on page-size change. */
  private readonly _activePageSize = signal(
    this.tableConfig().paginationOptions?.defaultPageSize ?? 10,
  );

  /**
   * The length value actually bound to mat-paginator.
   * - Known total (length > 0): passed straight through.
   * - Unknown total (length === 0, server-side): inferred from the current page's row count.
   *   If the page is full (rows === pageSize) we assume more pages exist and set length one
   *   item beyond the current page end, keeping the next button enabled. If the page is
   *   short (rows < pageSize) we set length to exactly the current page end, disabling next.
   */
  readonly _effectiveLength = computed(() => {
    if (this.length() > 0) return this.length();
    // unknown total — infer from current page data
    const idx     = this.pageIndex() ?? 0;
    const size    = this._activePageSize();
    const rows    = this._data().length;
    const hasNext = rows >= size;
    return idx * size + rows + (hasNext ? 1 : 0);
  });

  // ---- outputs ----

  /** emits Angular Material's PageEvent on pagination change */
  readonly page = output<PageEvent>();
  /** emits full array of currently selected rows */
  readonly selectionChange = output<T[]>();
  /** emits the current filter map keyed by column `key` when Apply or Clear is clicked */
  readonly filterChange = output<Map<string, ItemParent>>();
  /** emits Angular Material's Sort object on column sort change */
  readonly sortChange = output<Sort>();
  /** emits when the refresh button is clicked; host is responsible for re-fetching data */
  readonly refresh = output<void>();
  /** emits the new column key order (excluding 'select') after a drag-reorder */
  readonly columnOrderChange = output<string[]>();
  /** emits a map of column `key` → width in px after a resize interaction */
  readonly columnWidthChange = output<Record<string, number>>();
  /** emits the CSV string when the export button is clicked — host can save or process it */
  readonly dataExport = output<string>();

  // ---- internal state (template-accessible) ----

  readonly _data = signal<T[]>([]);
  readonly columnFilters = signal<Map<string, ItemParent>>(new Map());
  readonly customCellTemplates = new Map<string, TemplateRef<{ $implicit: unknown }>>();

  /**
   * All non-select columns in their original tableColumns order.
   * Used only to register every matColumnDef with Material Table — order here is irrelevant.
   * Display order is controlled exclusively by _headers() via *matHeaderRowDef / *matRowDef.
   * Keeping this stable prevents unnecessary matColumnDef re-registration which would
   * reset Material Table's internal state and break data-row updates when _headers() changes.
   */
  readonly _allDataColumns = computed(() =>
    this.tableColumns().filter((col) => col.key !== 'select'),
  );

  /**
   * Same defs as _allDataColumns but ordered by _columnOrder (for the column chooser menu).
   * Appends any column missing from the order (e.g. host added a column at runtime).
   */
  readonly _chooserColumnDefs = computed((): ColumnDef[] => {
    const byKey = new Map(this._allDataColumns().map((c) => [c.key, c] as const));
    const out: ColumnDef[] = [];
    for (const key of this._columnOrder()) {
      const c = byKey.get(key);
      if (c) out.push(c);
    }
    for (const c of this._allDataColumns()) {
      if (!out.some((x) => x.key === c.key)) out.push(c);
    }
    return out;
  });

  /** Column keys currently hidden by the column chooser */
  readonly _hiddenColumns = signal<Set<string>>(new Set());

  /**
   * User-controlled display order for data columns (excludes 'select').
   * Initialised from tableColumns on ngAfterContentInit.
   */
  readonly _columnOrder = signal<string[]>([]);

  /** Sum of px-known widths for visible columns (explicit `NN`/`NNpx`, resize map, select default). */
  readonly _sumPinnedWidthsPx = computed(() => {
    let sum = 0;
    const cols = this.tableColumns();
    const hidden = this._hiddenColumns();
    const order = this._columnOrder();
    const map = this._columnWidths();

    if (cols.some((c) => c.key === 'select')) {
      const sel = cols.find((c) => c.key === 'select');
      const rw = map.get('select');
      if (rw != null) sum += rw;
      else {
        const px = this._parseDefWidthToPx(sel?.width);
        sum += px ?? ST_SELECT_DEFAULT_SUM_PX;
      }
    }

    for (const key of order) {
      if (hidden.has(key)) continue;
      const col = cols.find((c) => c.key === key);
      if (!col) continue;
      const rw = map.get(key);
      if (rw != null) {
        sum += rw;
        continue;
      }
      const px = this._parseDefWidthToPx(col.width);
      if (px != null) sum += px;
    }
    return sum;
  });

  private readonly _hostTableWidthPx = signal(0);

  /** True when pinned widths do not fill the host — append internal filler column. */
  readonly _fillerActive = computed(() => {
    const host = this._hostTableWidthPx();
    if (host <= 0) return false;
    const sum = this._sumPinnedWidthsPx();
    if (sum <= 0) return false;
    return sum < host - LAYOUT_WIDTH_FUDGE_PX;
  });

  /** Use fixed table layout whenever column widths must be honored (resize, defs, filler). */
  readonly _tableLayoutFixed = computed(() => {
    if (this._isResizable()) return true;
    if (this._fillerActive()) return true;
    if (this._columnWidths().size > 0) return true;
    return this.tableColumns().some((c) => {
      const w = c.width;
      return w != null && String(w).trim() !== '';
    });
  });

  /** Visible column keys in display order — drives *matHeaderRowDef / *matRowDef */
  readonly _headers = computed(() => {
    const order = this._columnOrder();
    const hidden = this._hiddenColumns();
    const hasSelect = this.tableColumns().some((c) => c.key === 'select');
    const visible = order.filter((key) => !hidden.has(key));
    const base = hasSelect ? ['select', ...visible] : visible;
    // Filler absorbs remaining width in the scrollable area; row-actions is stickyEnd after it.
    const withFiller = this._fillerActive() ? [...base, SIMPLE_TABLE_LAYOUT_FILLER_COLUMN] : base;
    return this._hasRowActions() ? [...withFiller, ST_ROW_ACTIONS_COLUMN] : withFiller;
  });

  // ---- toolbar visibility (opt-out: undefined = on, false = off) ----

  readonly _showColumnChooser = computed(() => this.tableConfig().showColumnChooser !== false);
  readonly _showRefresh = computed(() => this.tableConfig().showRefresh !== false);
  readonly _showExport = computed(() => !!this._exportDirective());

  // ---- actions (grouped by position) ----

  /** Exposed so the template can reference the internal column key. */
  readonly rowActionsColumnDef = ST_ROW_ACTIONS_COLUMN;

  readonly _toolbarActions  = computed(() => this.actions().filter(a => a.position === 'toolbar'));
  readonly _aboveActions    = computed(() => this.actions().filter(a => a.position === 'above'));
  readonly _belowActions    = computed(() => this.actions().filter(a => a.position === 'below'));
  readonly _rowInlineActions = computed(() => this.actions().filter(a => a.position === 'row-inline'));
  readonly _rowMenuActions   = computed(() => this.actions().filter(a => a.position === 'row-menu'));
  /** True when any row-level actions are defined — causes the actions column to appear in _headers(). */
  readonly _hasRowActions    = computed(() => this._rowInlineActions().length > 0 || this._rowMenuActions().length > 0);

  readonly _hasToolbar = computed(
    () =>
      this._showColumnChooser() ||
      this._showRefresh() ||
      this._showExport() ||
      this._toolbarActions().length > 0 ||
      this._aboveActions().length > 0,
  );

  // ---- drag / resize feature flags (opt-out) ----

  readonly _isDraggable = computed(() => this.tableConfig().columnDraggable !== false);
  readonly _isResizable = computed(() => this.tableConfig().columnResizable !== false);

  // ---- sticky / scroll ----

  readonly _hasHorizontalScroll = computed(() => {
    if (this.tableConfig().horizontalScroll) return true;
    return this.tableColumns().some((c) => c.sticky === 'left' || c.sticky === 'right');
  });

  readonly _maxHeight       = computed(() => this.tableConfig().maxHeight ?? null);
  readonly _fillContainer   = computed(() => this.tableConfig().fillContainer ?? false);

  // ---- column width state ----

  readonly _columnWidths = signal<Map<string, number>>(new Map());

  /** owned MatTableDataSource used when clientSide: true */
  readonly _matDs = new MatTableDataSource<T>();

  constructor() {
    effect(() => {
      this._switchDataSource(this.dataSource());
    });
    effect(() => {
      this._rebuildColumnFilterOptionsFromData();
    });
    effect(() => {
      const rows = this.selectedRows();
      this.selection.clear();
      if (rows?.length) this.selection.select(...rows);
    });
    // sync data into MatTableDataSource in client-side mode
    effect(() => {
      if (this.tableConfig().clientSide) {
        this._matDs.data = this._data();
      }
    });
    // in server-side mode with no known total, hide the "of X" from the range label
    effect(() => {
      const unknownTotal = !this.tableConfig().clientSide && this.length() === 0;
      if (unknownTotal) {
        const rows = this._data().length;
        this._paginatorIntl.getRangeLabel = (page, pageSize) => {
          if (rows === 0) return '0';
          const start = page * pageSize + 1;
          const end   = page * pageSize + rows;
          return `${start} – ${end}`;
        };
      } else {
        this._paginatorIntl.getRangeLabel = new MatPaginatorIntl().getRangeLabel;
      }
      this._paginatorIntl.changes.next();
    });
    // in server-side mode, sync the paginator's visual page when the host resets the index
    // (e.g. after a sort or filter change). Setting pageIndex directly does not emit a (page)
    // event so there is no risk of a feedback loop.
    effect(() => {
      if (!this.tableConfig().clientSide) {
        const pi = this.pageIndex();
        const paginator = this._paginatorRef();
        if (pi !== undefined && paginator) paginator.pageIndex = pi;
      }
    });
    // connect MatSort and MatPaginator to MatTableDataSource whenever clientSide is enabled.
    // using an effect (not ngAfterViewInit) so this also fires when the host toggles clientSide
    // after the view has already been initialised.
    effect(() => {
      if (this.tableConfig().clientSide) {
        const sort = this._sortRef();
        const paginator = this._isVirtual() ? null : this._paginatorRef();
        if (sort) this._matDs.sort = sort;
        this._matDs.paginator = paginator ?? null;
      } else {
        this._matDs.sort = null;
        this._matDs.paginator = null;
      }
    });

    this._matDs.filterPredicate = (row: T) => {
      const filters = this.columnFilters();
      const colDefs = this.tableColumns();
      for (const [col, parent] of filters) {
        const keys = parent.selectedKeys ?? [];
        if (keys.length === 0) continue;
        const colDef = colDefs.find((c) => c.key === col);
        if (colDef?.filterType === FilterType.DateRange) {
          // keys[0] = start ISO string, keys[1] = end ISO string
          const cellVal = (row as Record<string, unknown>)[col];
          const cellDate = cellVal ? new Date(String(cellVal)).getTime() : NaN;
          if (isNaN(cellDate)) return false;
          const start = keys[0] ? new Date(String(keys[0])).getTime() : null;
          const end = keys[1] ? new Date(String(keys[1])).getTime() : null;
          if (start !== null && cellDate < start) return false;
          if (end !== null && cellDate > end) return false;
        } else {
          const keySet = new Set(keys.map((k) => String(k)));
          if (!keySet.has(String((row as Record<string, unknown>)[col]))) return false;
        }
      }
      return true;
    };

    // Keep _columnOrder in sync when tableColumns gains/loses non-select columns after init.
    effect(() => {
      const keys = this._allDataColumns().map((c) => c.key);
      const keySet = new Set(keys);
      this._columnOrder.update((order) => {
        if (!order.length) return order;
        let next = order.filter((k) => keySet.has(k));
        for (const k of keys) {
          if (!next.includes(k)) next.push(k);
        }
        if (next.length === order.length && next.every((k, i) => k === order[i])) return order;
        return next;
      });
    });

    // ---- virtual scroll effects ----

    // 1. Attach the viewport to _virtualDs once it exists in the view.
    //    itemSize is also synced here so the datasource always has the latest value.
    effect(() => {
      const vp = this._viewportRef();
      if (!vp) return;
      this._virtualDs.itemSize = this._virtualRowHeight();
      this._virtualDs.attach(vp);
    });

    // 2. Server-side virtual: push _data() directly into _virtualDs.
    effect(() => {
      if (!this._isVirtual() || this.tableConfig().clientSide) return;
      this._virtualDs.itemSize = this._virtualRowHeight();
      this._virtualDs.data     = this._data();
    });

    // 3. Client-side virtual: subscribe to MatTableDataSource's filtered+sorted stream
    //    so that sort and filter changes are reflected in the virtual viewport.
    //    The subscription is re-created when the mode changes.
    effect(() => {
      this._virtualClientSub?.unsubscribe();
      this._virtualClientSub = null;

      if (!this._isVirtual() || !this.tableConfig().clientSide) return;

      this._virtualDs.itemSize = this._virtualRowHeight();

      // connect() (no args in Angular Material 17+) returns the filtered+sorted BehaviorSubject.
      // Since no paginator is attached in virtual mode, this emits all filtered+sorted rows.
      this._virtualClientSub = this._matDs.connect().subscribe((rows) => {
        this._virtualDs.data = rows as T[];
      });
    });

    // Clean up virtual subscription on component destroy.
    this._destroyRef.onDestroy(() => this._virtualClientSub?.unsubscribe());

    afterNextRender(() => {
      const el = this._hostEl.nativeElement;
      const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect.width;
        const w = cr != null && cr > 0 ? cr : el.clientWidth;
        this._hostTableWidthPx.set(Math.round(w));
      });
      ro.observe(el);
      const w0 = el.clientWidth;
      if (w0 > 0) this._hostTableWidthPx.set(Math.round(w0));
      this._destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  // ---- lifecycle ----

  ngAfterContentInit(): void {
    this._populateColumns();
    this._subscribeToSelection();
    // Initialise display order from the host-provided column list
    this._columnOrder.set(
      this.tableColumns()
        .filter((col) => col.key !== 'select')
        .map((col) => col.key),
    );
  }

  // ---- data source ----

  private _switchDataSource(value: T[] | Observable<T[]>): void {
    this._data.set([]);
    const stream = isObservable(value) ? value : observableOf(value as T[]);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: T[]) => {
      this._data.set(data ?? []);
    });
  }

  // ---- filters ----

  /**
   * Builds dropdown options from the same row array the table uses (`_data()`).
   * Server-side: usually the current API page — distinct values can change each fetch.
   * Client-side: the full array you pass as `dataSource` (not the paginated view).
   * Preserves `selectedKeys` when still present; drops keys no longer in the list.
   */
  private _rebuildColumnFilterOptionsFromData(): void {
    void this.tableConfig();
    const rows = this._data();
    const cols = this.tableColumns().filter(
      (c) => c.hasColumnFilters && (c.filterType ?? FilterType.DropDown) === FilterType.DropDown,
    );
    const prev = this.columnFilters();
    const next = new Map<string, ItemParent>();

    for (const col of cols) {
      const uniq = [
        ...new Set(rows.map((r) => String((r as Record<string, unknown>)[col.key]))),
      ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      const allowed = new Set(uniq);
      const old = prev.get(col.key);
      const selectedKeys = (old?.selectedKeys ?? []).filter((k) => allowed.has(String(k)));
      next.set(col.key, {
        id: col.key,
        children: uniq.map((v) => ({ id: v, value: v })),
        selectedKeys,
      });
    }

    let changed = prev.size !== next.size;
    if (!changed) {
      for (const [k, v] of next) {
        const o = prev.get(k);
        if (!o) {
          changed = true;
          break;
        }
        const sk0 = [...(o.selectedKeys ?? [])].sort().join('\0');
        const sk1 = [...(v.selectedKeys ?? [])].sort().join('\0');
        if (sk0 !== sk1 || o.children?.length !== v.children?.length) {
          changed = true;
          break;
        }
        const ch0 = (o.children ?? []).map((c) => String(c.id)).join('\0');
        const ch1 = (v.children ?? []).map((c) => String(c.id)).join('\0');
        if (ch0 !== ch1) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return;

    const selSig = (m: Map<string, ItemParent>) =>
      [...m.entries()]
        .map(([k, p]) => `${k}=${[...(p.selectedKeys ?? [])].sort().join(',')}`)
        .sort()
        .join(';');

    this.columnFilters.set(next);

    if (!this.tableConfig().clientSide && selSig(prev) !== selSig(next)) {
      this.filterChange.emit(new Map(next));
    }

    if (this.tableConfig().clientSide) {
      this._syncMatDsFilter(next);
      this._matDs.data = [...this._matDs.data];
    }
  }

  onFilterApplied(colKey: string, parent: ItemParent): void {
    const map = new Map(this.columnFilters());
    map.set(colKey, parent);
    this.columnFilters.set(map);
    this.filterChange.emit(new Map(map));
    if (this.tableConfig().clientSide) {
      this._syncMatDsFilter(map);
    }
  }

  onFilterCleared(colKey: string): void {
    const map = new Map(this.columnFilters());
    const current = map.get(colKey);
    if (current) {
      map.set(colKey, { ...current, selectedKeys: [] });
    }
    this.columnFilters.set(map);
    this.filterChange.emit(new Map(map));
    if (this.tableConfig().clientSide) {
      this._syncMatDsFilter(map);
    }
  }

  private _syncMatDsFilter(map: Map<string, ItemParent>): void {
    const hasActive = [...map.values()].some((p) => (p.selectedKeys?.length ?? 0) > 0);
    this._matDs.filter = hasActive ? 'active' : '';
    if (this._matDs.paginator) {
      this._matDs.paginator.firstPage();
    }
  }

  // ---- columns ----

  private _populateColumns(): void {
    this.customCellTemplates.clear();
    this.cellDefs().forEach((d) => this.customCellTemplates.set(d.key(), d.template));
  }

  /** Exports visible columns and all data, triggers a browser download, and emits via dataExport. */
  exportData(): void {
    const visibleKeys = this._headers().filter(
      (k) => k !== 'select' && k !== SIMPLE_TABLE_LAYOUT_FILLER_COLUMN,
    );
    const colMap    = new Map(this.tableColumns().map((c) => [c.key, c]));
    const cols      = visibleKeys.map((k) => colMap.get(k)).filter((c): c is ColumnDef => !!c);
    const directive = this._exportDirective();
    const name      = directive?.filename() ?? this.tableId() ?? 'export';
    const format    = directive?.format() ?? 'xlsx';
    const hostEl    = this._hostEl.nativeElement as HTMLElement;

    const doExport = (rows: T[]) => {
      if (format === 'xlsx') {
        this._exportSvc.exportXlsx(cols, rows as unknown[], name, hostEl)
          .then(() => this.dataExport.emit(''))
          .catch(() => {
            console.warn(
              '[ngx-mat-simple-table] xlsx export requires the "exceljs" package. ' +
              'Install it: npm install exceljs. Falling back to CSV.',
            );
            this._exportSvc.exportCsv(cols, rows as unknown[], name);
            this.dataExport.emit('');
          });
      } else {
        this._exportSvc.exportCsv(cols, rows as unknown[], name);
        this.dataExport.emit('');
      }
    };

    if (this.tableConfig().clientSide) {
      doExport(this._matDs.filteredData);
      return;
    }

    const provider = directive?.allDataProvider();
    if (provider) {
      provider().then((rows) => doExport(rows as T[]));
    } else {
      console.warn(
        '[ngx-mat-simple-table] Server-side export without allDataProvider — ' +
        'exporting current page only. Add [allDataProvider] to <st-export> to export all records.',
      );
      doExport(this._data());
    }
  }

  /** Called by StStateStoringDirective to restore persisted user preferences on init. */
  applyUserSettings(settings: TableUserSettings): void {
    if (settings.columnOrder?.length) {
      // Merge saved order with the current column definitions:
      // 1. Keep saved positions for columns that still exist.
      // 2. Append any columns that are new since the state was saved.
      // This prevents new columns from vanishing when old state is restored.
      const currentKeys = this._allDataColumns().map((c) => c.key);
      const savedSet    = new Set(settings.columnOrder);
      const merged = [
        ...settings.columnOrder.filter((k) => currentKeys.includes(k)),
        ...currentKeys.filter((k) => !savedSet.has(k)),
      ];
      this._columnOrder.set(merged);
    }
    if (settings.hiddenColumns?.length) {
      this._hiddenColumns.set(new Set(settings.hiddenColumns));
    }
    if (settings.columnWidths && Object.keys(settings.columnWidths).length) {
      this._columnWidths.set(
        new Map(Object.entries(settings.columnWidths).map(([k, v]) => [k, v])),
      );
    }
  }

  toggleColumn(colKey: string): void {
    const hidden = new Set(this._hiddenColumns());
    hidden.has(colKey) ? hidden.delete(colKey) : hidden.add(colKey);
    this._hiddenColumns.set(hidden);
  }

  /** Checkbox stops click bubbling to the menu-item button, so visibility must sync from `(change)`. */
  onColumnChooserCheckboxChange(colKey: string, e: MatCheckboxChange): void {
    const hidden = new Set(this._hiddenColumns());
    if (e.checked) hidden.delete(colKey);
    else hidden.add(colKey);
    this._hiddenColumns.set(hidden);
  }

  // ---- drag-reorder (CDK drag-drop) ----

  onColumnDrop(event: CdkDragDrop<string>): void {
    const fromKey = String(event.item.data);
    const toKey = String(event.container.data);
    if (!fromKey || !toKey || fromKey === toKey) return;

    // Sticky columns have a fixed edge position — block any reorder involving them.
    const cols = this.tableColumns();
    const fromCol = cols.find((c) => c.key === fromKey);
    const toCol   = cols.find((c) => c.key === toKey);
    if (fromCol?.sticky || toCol?.sticky) return;

    const order = [...this._columnOrder()];
    const fi = order.indexOf(fromKey);
    const ti = order.indexOf(toKey);
    if (fi < 0 || ti < 0) return;

    moveItemInArray(order, fi, ti);
    this._columnOrder.set(order);
    this.columnOrderChange.emit([...order]);
  }


  /** Column chooser menu: reorder only; list order matches _chooserColumnDefs / _columnOrder. */
  onColumnChooserDrop(event: CdkDragDrop<void>): void {
    if (event.previousIndex === event.currentIndex) return;

    // Guard: resolve the keys at both indices and block if either column is sticky.
    const order = [...this._columnOrder()];
    const cols  = this.tableColumns();
    const fromKey = order[event.previousIndex];
    const toKey   = order[event.currentIndex];
    const fromCol = cols.find((c) => c.key === fromKey);
    const toCol   = cols.find((c) => c.key === toKey);
    if (fromCol?.sticky || toCol?.sticky) return;

    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this._columnOrder.set(order);
    this.columnOrderChange.emit([...order]);
  }

  // ---- column resize ----

  /** Effective CSS `width` for a data column (resize overrides `ColumnDef.width`). */
  effectiveWidthStyleForDataColumn(column: ColumnDef): string | null {
    const rw = this._columnWidths().get(column.key);
    if (rw != null) return `${rw}px`;
    return this._formatCssWidth(column.width);
  }

  /**
   * True when this column has no inline width (auto). Under `table-layout: fixed`, auto columns
   * need a CSS min-width or they collapse to 0 when another column uses a greedy width.
   */
  isAutoSizedDataColumn(column: ColumnDef): boolean {
    return this.effectiveWidthStyleForDataColumn(column) == null;
  }

  /** `select` is never sortable; otherwise sortable unless `sortable === false`. */
  isColumnSortable(column: ColumnDef): boolean {
    if (column.key === 'select') return false;
    return column.sortable !== false;
  }

  /** Effective CSS `width` for the select column. */
  effectiveWidthStyleForSelect(): string | null {
    const sel = this.tableColumns().find((c) => c.key === 'select');
    const rw = this._columnWidths().get('select');
    if (rw != null) return `${rw}px`;
    return sel ? this._formatCssWidth(sel.width) : null;
  }

  private _formatCssWidth(w: number | string | undefined | null): string | null {
    if (w == null) return null;
    if (typeof w === 'number' && Number.isFinite(w)) return `${w}px`;
    const s = String(w).trim();
    return s.length ? s : null;
  }

  /** Parses widths that contribute a definite px sum for filler layout (`number` or `123px` only). */
  private _parseDefWidthToPx(w: number | string | undefined | null): number | null {
    if (w == null) return null;
    if (typeof w === 'number' && Number.isFinite(w)) return w;
    const s = String(w).trim();
    const m = /^(\d+(?:\.\d+)?)px$/i.exec(s);
    if (m) return parseFloat(m[1]);
    return null;
  }

  /**
   * Returns the rows currently visible in the table.
   * In client-side mode this is the current page slice from MatTableDataSource.
   * In server-side mode it is the full _data() array (the host already sliced it).
   * In virtual mode (either client or server) all loaded rows are returned since
   * the virtual viewport controls visibility — there is no paginator slice.
   */
  private _visibleRows(): T[] {
    if (this._isVirtual()) return this._data();
    if (this.tableConfig().clientSide) {
      const paginator = this._paginatorRef();
      if (!paginator) return this._matDs.data;
      const start = paginator.pageIndex * paginator.pageSize;
      return this._matDs.data.slice(start, start + paginator.pageSize);
    }
    return this._data();
  }

  /** Wires the SelectionModel change event to the selectionChange output. */
  private _subscribeToSelection(): void {
    this.selection.changed
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this.selectionChange.emit(this.selection.selected));
  }

  onResizeStart(event: MouseEvent, colKey: string): void {
    event.preventDefault();
    event.stopPropagation();

    // The mousedown target is the resize-handle span; walk up to the <th>
    const thEl = (event.currentTarget as HTMLElement).closest('th') as HTMLElement;
    const startX = event.clientX;
    const col = this.tableColumns().find((c) => c.key === colKey);
    const fromDef = col ? this._parseDefWidthToPx(col.width) : null;
    const startW = this._columnWidths().get(colKey) ?? fromDef ?? thEl.offsetWidth;

    const onMove = (e: MouseEvent): void => {
      const widths = new Map(this._columnWidths());
      const newW = Math.max(40, startW + e.clientX - startX);
      widths.set(colKey, newW);
      this._columnWidths.set(widths);
    };

    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.columnWidthChange.emit(Object.fromEntries(this._columnWidths()));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ---- selection helpers ----

  isAllSelected(): boolean {
    return this._visibleRows().every(row => this.selection.isSelected(row));
  }

  masterToggle(): void {
    const rows = this._visibleRows();
    if (this.isAllSelected()) {
      this.selection.deselect(...rows);
    } else {
      this.selection.select(...rows);
    }
  }

  checkboxLabel(row?: T): string {
    if (!row) {
      return this.isAllSelected() ? 'deselect all' : 'select all';
    }
    return this.selection.isSelected(row) ? 'deselect row' : 'select row';
  }

  // ---- pagination ----

  onPageChange(event: PageEvent): void {
    this._activePageSize.set(event.pageSize);
    this.selection.clear();
    this.page.emit(event);
  }

  // ---- sort ----

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }
}

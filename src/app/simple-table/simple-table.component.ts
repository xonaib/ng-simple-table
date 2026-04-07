import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { SelectionChange, SelectionModel } from '@angular/cdk/collections';
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
import { Observable, isObservable, of as observableOf } from 'rxjs';
import { ColumnFilterComponent } from './column-filter/column-filter.component';
import { CellDefDirective } from './cell-def.directive';
import {
  ColumnFiltersData,
  ColumnDef,
  ItemParent,
  SIMPLE_TABLE_LAYOUT_FILLER_COLUMN,
  TableConfig,
} from './table.types';

const LAYOUT_WIDTH_FUDGE_PX = 2;
/** Used only for layout-sum / filler when select has no explicit width (matches default CSS). */
const ST_SELECT_DEFAULT_SUM_PX = 52;

@Component({
  selector: 'simple-table',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgFor,
    NgTemplateOutlet,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    CdkDropListGroup,
    ColumnFilterComponent,
  ],
  templateUrl: './simple-table.component.html',
  styleUrl: './simple-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleTableComponent<T> implements AfterContentInit {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _hostEl = inject(ElementRef<HTMLElement>);

  /** `matColumnDef` id for the internal filler column (template + row defs only). */
  readonly layoutFillerColumnDef = SIMPLE_TABLE_LAYOUT_FILLER_COLUMN;

  // ---- selection model ----
  readonly selection = new SelectionModel<T>(true, []);

  // ---- view children (used for client-side mode) ----
  private readonly _sortRef      = viewChild(MatSort);
  private readonly _paginatorRef = viewChild(MatPaginator);

  /** custom cell templates provided by the host via [cellDef] */
  readonly cellDefs = contentChildren(CellDefDirective);

  // ---- inputs ----

  readonly dataSource = input.required<T[] | Observable<T[]>>();
  readonly tableColumns = input.required<ColumnDef[]>();
  readonly tableConfig = input<TableConfig>({});
  readonly length = input(0);
  /**
   * Current page index for server-side pagination. When provided the paginator
   * is synced to this value, keeping it aligned when the host resets the page
   * after a sort or filter change. Has no effect in client-side mode.
   */
  readonly pageIndex = input<number | undefined>(undefined);
  readonly columnFiltersData = input<
    ColumnFiltersData | Observable<ColumnFiltersData> | undefined
  >();
  readonly stickyHeaders = input(false);
  readonly selectedRows = input<T[] | undefined>();

  // ---- outputs ----

  /** emits Angular Material's PageEvent on pagination change */
  readonly page = output<PageEvent>();
  /** emits full array of currently selected rows */
  readonly selectionChange = output<T[]>();
  /** emits the current filter map keyed by columnDef when Apply or Clear is clicked */
  readonly filterChange = output<Map<string, ItemParent>>();
  /** emits Angular Material's Sort object on column sort change */
  readonly sortChange = output<Sort>();
  /** emits when the refresh button is clicked; host is responsible for re-fetching data */
  readonly refresh = output<void>();
  /** emits the new column key order (excluding 'select') after a drag-reorder */
  readonly columnOrderChange = output<string[]>();
  /** emits a map of columnDef → width in px after a resize interaction */
  readonly columnWidthChange = output<Record<string, number>>();

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
    this.tableColumns().filter(col => col.columnDef !== 'select')
  );

  /**
   * Same defs as _allDataColumns but ordered by _columnOrder (for the column chooser menu).
   * Appends any column missing from the order (e.g. host added a column at runtime).
   */
  readonly _chooserColumnDefs = computed((): ColumnDef[] => {
    const byKey = new Map(this._allDataColumns().map((c) => [c.columnDef, c] as const));
    const out: ColumnDef[] = [];
    for (const key of this._columnOrder()) {
      const c = byKey.get(key);
      if (c) out.push(c);
    }
    for (const c of this._allDataColumns()) {
      if (!out.some((x) => x.columnDef === c.columnDef)) out.push(c);
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

    if (cols.some((c) => c.columnDef === 'select')) {
      const sel = cols.find((c) => c.columnDef === 'select');
      const rw = map.get('select');
      if (rw != null) sum += rw;
      else {
        const px = this._parseDefWidthToPx(sel?.width);
        sum += px ?? ST_SELECT_DEFAULT_SUM_PX;
      }
    }

    for (const key of order) {
      if (hidden.has(key)) continue;
      const col = cols.find((c) => c.columnDef === key);
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
    const hasSelect = this.tableColumns().some((c) => c.columnDef === 'select');
    const visible = order.filter((key) => !hidden.has(key));
    const base = hasSelect ? ['select', ...visible] : visible;
    if (this._fillerActive()) {
      return [...base, SIMPLE_TABLE_LAYOUT_FILLER_COLUMN];
    }
    return base;
  });

  // ---- toolbar visibility (opt-out: undefined = on, false = off) ----

  readonly _showColumnChooser = computed(() => this.tableConfig().showColumnChooser !== false);
  readonly _showRefresh       = computed(() => this.tableConfig().showRefresh       !== false);
  readonly _hasToolbar        = computed(() => this._showColumnChooser() || this._showRefresh());

  // ---- drag / resize feature flags (opt-out) ----

  readonly _isDraggable = computed(() => this.tableConfig().columnDraggable !== false);
  readonly _isResizable = computed(() => this.tableConfig().columnResizable  !== false);

  // ---- column width state ----

  readonly _columnWidths = signal<Map<string, number>>(new Map());

  /** owned MatTableDataSource used when clientSide: true */
  readonly _matDs = new MatTableDataSource<T>();

  constructor() {
    effect(() => {
      this._switchDataSource(this.dataSource());
    });
    effect(() => {
      this._subscribeToFilters(this.columnFiltersData());
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
        const paginator = this._paginatorRef();
        if (sort) this._matDs.sort = sort;
        if (paginator) this._matDs.paginator = paginator;
      } else {
        this._matDs.sort = null;
        this._matDs.paginator = null;
      }
    });

    this._matDs.filterPredicate = (row: T) => {
      const filters = this.columnFilters();
      for (const [col, parent] of filters) {
        const keys = parent.selectedKeys ?? [];
        if (keys.length > 0) {
          const keySet = new Set(keys.map((k) => String(k)));
          if (!keySet.has(String((row as Record<string, unknown>)[col]))) return false;
        }
      }
      return true;
    };

    // Keep _columnOrder in sync when tableColumns gains/loses non-select columns after init.
    effect(() => {
      const keys = this._allDataColumns().map((c) => c.columnDef);
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
        .filter(col => col.columnDef !== 'select')
        .map(col => col.columnDef),
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

  private _subscribeToFilters(
    source: ColumnFiltersData | Observable<ColumnFiltersData> | undefined,
  ): void {
    if (!source) return;
    const stream = isObservable(source) ? source : observableOf(source as ColumnFiltersData);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: ColumnFiltersData) => {
      const map = new Map<string, ItemParent>();
      data.parents.forEach((p) => map.set(String(p.id), p));
      this.columnFilters.set(map);
    });
  }

  onFilterApplied(columnDef: string, parent: ItemParent): void {
    const map = new Map(this.columnFilters());
    map.set(columnDef, parent);
    this.columnFilters.set(map);
    this.filterChange.emit(new Map(map));
    if (this.tableConfig().clientSide) {
      this._syncMatDsFilter(map);
    }
  }

  onFilterCleared(columnDef: string): void {
    const map = new Map(this.columnFilters());
    const current = map.get(columnDef);
    if (current) {
      map.set(columnDef, { ...current, selectedKeys: [] });
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
    this.cellDefs().forEach((d) => this.customCellTemplates.set(d.columnDef(), d.template));
  }

  toggleColumn(columnDef: string): void {
    const hidden = new Set(this._hiddenColumns());
    hidden.has(columnDef) ? hidden.delete(columnDef) : hidden.add(columnDef);
    this._hiddenColumns.set(hidden);
  }

  /** Checkbox stops click bubbling to the menu-item button, so visibility must sync from `(change)`. */
  onColumnChooserCheckboxChange(columnDef: string, e: MatCheckboxChange): void {
    const hidden = new Set(this._hiddenColumns());
    if (e.checked) hidden.delete(columnDef);
    else hidden.add(columnDef);
    this._hiddenColumns.set(hidden);
  }

  // ---- drag-reorder (CDK drag-drop) ----

  onColumnDrop(event: CdkDragDrop<string>): void {
    const fromKey = String(event.item.data);
    const toKey   = String(event.container.data);
    if (!fromKey || !toKey || fromKey === toKey) return;

    const order = [...this._columnOrder()];
    const fi    = order.indexOf(fromKey);
    const ti    = order.indexOf(toKey);
    if (fi < 0 || ti < 0) return;

    moveItemInArray(order, fi, ti);
    this._columnOrder.set(order);
    this.columnOrderChange.emit([...order]);
  }

  /** Column chooser menu: reorder only; list order matches _chooserColumnDefs / _columnOrder. */
  onColumnChooserDrop(event: CdkDragDrop<void>): void {
    if (event.previousIndex === event.currentIndex) return;
    const order = [...this._columnOrder()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this._columnOrder.set(order);
    this.columnOrderChange.emit([...order]);
  }

  // ---- column resize ----

  /** Effective CSS `width` for a data column (resize overrides `ColumnDef.width`). */
  effectiveWidthStyleForDataColumn(column: ColumnDef): string | null {
    const rw = this._columnWidths().get(column.columnDef);
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
    if (column.columnDef === 'select') return false;
    return column.sortable !== false;
  }

  /** Effective CSS `width` for the select column. */
  effectiveWidthStyleForSelect(): string | null {
    const sel = this.tableColumns().find((c) => c.columnDef === 'select');
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

  onResizeStart(event: MouseEvent, colKey: string): void {
    event.preventDefault();
    event.stopPropagation();

    // The mousedown target is the resize-handle span; walk up to the <th>
    const thEl = (event.currentTarget as HTMLElement).closest('th') as HTMLElement;
    const startX = event.clientX;
    const col = this.tableColumns().find((c) => c.columnDef === colKey);
    const fromDef = col ? this._parseDefWidthToPx(col.width) : null;
    const startW = this._columnWidths().get(colKey) ?? fromDef ?? thEl.offsetWidth;

    const onMove = (e: MouseEvent): void => {
      const widths = new Map(this._columnWidths());
      widths.set(colKey, Math.max(50, startW + e.clientX - startX));
      this._columnWidths.set(widths);
    };

    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      this.columnWidthChange.emit(Object.fromEntries(this._columnWidths()));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  // ---- selection ----

  private _subscribeToSelection(): void {
    this.selection.changed
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((change: SelectionChange<T>) => {
        this.selectionChange.emit(change.source.selected);
      });
  }

  /**
   * In server-side mode the host already passes only the current page slice, so
   * _data() is the right reference. In client-side mode MatTableDataSource owns
   * paging, so we derive the visible rows from its paginator instead.
   */
  private _visibleRows(): T[] {
    if (this.tableConfig().clientSide) {
      const p = this._matDs.paginator;
      if (p) {
        const start = p.pageIndex * p.pageSize;
        return this._matDs.filteredData.slice(start, start + p.pageSize);
      }
      return this._matDs.filteredData;
    }
    return this._data();
  }

  isAllSelected(): boolean {
    const rows = this._visibleRows();
    if (!rows.length) return false;
    return rows.every((r) => this.selection.isSelected(r));
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
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  // ---- pagination ----

  onPageChange(event: PageEvent): void {
    this.selection.clear();
    this.page.emit(event);
  }

  // ---- sort ----

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }
}

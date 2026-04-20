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
import { StExportDirective } from './st-export.directive';
import {
  ColumnDef,
  FilterType,
  ItemParent,
  SIMPLE_TABLE_LAYOUT_FILLER_COLUMN,
  TableConfig,
  TableUserSettings,
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
    this.tableColumns().filter(col => col.key !== 'select')
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
    if (this._fillerActive()) {
      return [...base, SIMPLE_TABLE_LAYOUT_FILLER_COLUMN];
    }
    return base;
  });

  // ---- toolbar visibility (opt-out: undefined = on, false = off) ----

  readonly _showColumnChooser = computed(() => this.tableConfig().showColumnChooser !== false);
  readonly _showRefresh       = computed(() => this.tableConfig().showRefresh       !== false);
  readonly _showExport        = computed(() => !!this._exportDirective());
  readonly _hasToolbar        = computed(() => this._showColumnChooser() || this._showRefresh() || this._showExport());

  // ---- drag / resize feature flags (opt-out) ----

  readonly _isDraggable = computed(() => this.tableConfig().columnDraggable !== false);
  readonly _isResizable = computed(() => this.tableConfig().columnResizable  !== false);

  // ---- sticky / scroll ----

  readonly _hasHorizontalScroll = computed(() => {
    if (this.tableConfig().horizontalScroll) return true;
    return this.tableColumns().some(c => c.sticky === 'left' || c.sticky === 'right');
  });

  readonly _maxHeight = computed(() => this.tableConfig().maxHeight ?? null);

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
      const filters  = this.columnFilters();
      const colDefs  = this.tableColumns();
      for (const [col, parent] of filters) {
        const keys = parent.selectedKeys ?? [];
        if (keys.length === 0) continue;
        const colDef = colDefs.find(c => c.key === col);
        if (colDef?.filterType === FilterType.DateRange) {
          // keys[0] = start ISO string, keys[1] = end ISO string
          const cellVal = (row as Record<string, unknown>)[col];
          const cellDate = cellVal ? new Date(String(cellVal)).getTime() : NaN;
          if (isNaN(cellDate)) return false;
          const start = keys[0] ? new Date(String(keys[0])).getTime() : null;
          const end   = keys[1] ? new Date(String(keys[1])).getTime() : null;
          if (start !== null && cellDate < start) return false;
          if (end   !== null && cellDate > end)   return false;
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
        .filter(col => col.key !== 'select')
        .map(col => col.key),
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
      k => k !== 'select' && k !== SIMPLE_TABLE_LAYOUT_FILLER_COLUMN
    );
    // Preserve visible display order by mapping from visibleKeys, not tableColumns order
    const colMap = new Map(this.tableColumns().map(c => [c.key, c]));
    const cols      = visibleKeys.map(k => colMap.get(k)).filter((c): c is ColumnDef => !!c);
    const directive = this._exportDirective();
    const name      = directive?.filename() ?? this.tableId() ?? 'export';
    const format    = directive?.format() ?? 'xlsx';

    const doExport = (rows: T[]) => {
      if (format === 'xlsx') this._exportXlsx(cols, rows, name);
      else                   this._exportCsv(cols, rows, name);
    };

    if (this.tableConfig().clientSide) {
      // Client-side: filteredData contains every matching row across all pages
      doExport(this._matDs.filteredData);
      return;
    }

    // Server-side: the table only holds the current page — use allDataProvider to fetch everything
    const provider = directive?.allDataProvider();
    if (provider) {
      provider().then(rows => doExport(rows as T[]));
    } else {
      console.warn(
        '[ngx-mat-simple-table] Server-side export without allDataProvider — ' +
        'exporting current page only. Add [allDataProvider] to <st-export> to export all records.'
      );
      doExport(this._data());
    }
  }

  private _getCellValue(v: unknown): unknown {
    if (v == null) return '';
    // Return Date objects and ISO date strings as real Date so xlsx sets the correct cell type
    if (v instanceof Date) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    // Numeric ms timestamp → Date
    if (typeof v === 'number' && v > 1_000_000_000_000) return new Date(v);
    return v;
  }

  private _exportXlsx(cols: ColumnDef[], rows: T[], filename: string): void {
    // Dynamic import keeps ExcelJS out of the initial bundle — loaded only when export is used.
    import('exceljs').then(m => {
      const wb = new m.Workbook();
      const ws = wb.addWorksheet('Export');

      // ---- read header styles from the rendered table header cell ----
      const headerStyle = this._readHeaderStyle();

      // ---- header row ----
      const headerRow = ws.addRow(cols.map(c => c.label ?? c.key));
      headerRow.eachCell(cell => {
        cell.font   = headerStyle.font   as import('exceljs').Font;
        cell.fill   = headerStyle.fill;
        cell.border = headerStyle.border as import('exceljs').Borders;
      });

      // ---- data rows ----
      const pad = (n: number) => String(n).padStart(2, '0');
      for (const row of rows) {
        const values = cols.map(c => {
          const v = this._getCellValue((row as Record<string, unknown>)[c.key]);
          if (v instanceof Date && !isNaN(v.getTime())) {
            // Format as DD/MM/YYYY string — avoids locale/timezone ambiguity in Excel
            return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
          }
          return v;
        });
        ws.addRow(values);
      }

      // ---- download ----
      wb.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${filename}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.dataExport.emit('');
      });
    }).catch(() => {
      console.warn('[ngx-mat-simple-table] xlsx export requires the "exceljs" package. ' +
        'Install it: npm install exceljs. Falling back to CSV.');
      this._exportCsv(cols, rows, filename);
    });
  }

  /**
   * Reads background colour, text colour, and font weight from the first rendered header cell
   * and returns an ExcelJS-compatible style object. Falls back to a neutral grey if the header
   * background is transparent or the DOM query fails.
   */
  private _readHeaderStyle(): {
    font:   Partial<import('exceljs').Font>;
    fill:   import('exceljs').Fill;
    border: Partial<import('exceljs').Borders>;
  } {
    const fallbackArgb = 'FFEEEEEE';
    const fallbackFg   = 'FF333333';
    const fallbackFill: import('exceljs').Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: fallbackArgb },
    };

    let bgArgb = fallbackArgb;
    let fgArgb = fallbackFg;
    let bold   = true;

    try {
      const el = (this._hostEl.nativeElement as HTMLElement)
        .querySelector('th.mat-mdc-header-cell') as HTMLElement | null;
      if (el) {
        const cs = window.getComputedStyle(el);
        bgArgb = this._cssColorToArgb(cs.backgroundColor) ?? fallbackArgb;
        fgArgb = this._cssColorToArgb(cs.color) ?? fallbackFg;
        bold   = parseInt(cs.fontWeight || '400') >= 600;
      }
    } catch { /* fall through to defaults */ }

    return {
      font:   { bold, color: { argb: fgArgb } },
      fill:   bgArgb !== fallbackArgb
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
                : fallbackFill,
      border: { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } },
    };
  }

  /**
   * Converts a CSS `rgb()`/`rgba()` string to an 8-char ARGB hex string (ExcelJS format).
   * Returns undefined for fully-transparent or pure-white values (no meaningful fill).
   */
  private _cssColorToArgb(css: string): string | undefined {
    const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return undefined;
    const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (alpha === 0) return undefined;
    const aa  = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    const rgb = [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return rgb === 'FFFFFF' ? undefined : `${aa}${rgb}`;
  }

  private _exportCsv(cols: ColumnDef[], rows: T[], filename: string): void {
    const formatValue = (v: unknown): string => {
      const resolved = this._getCellValue(v);
      if (resolved instanceof Date) return resolved.toLocaleDateString();
      return String(resolved ?? '');
    };
    const escape = (v: unknown): string => {
      const s = formatValue(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const header = cols.map(c => escape(c.label ?? c.key)).join(',');
    const body   = rows.map(row =>
      cols.map(c => escape((row as Record<string, unknown>)[c.key])).join(',')
    );
    const csv = [header, ...body].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.dataExport.emit(csv);
  }

  /** Called by StStateStoringDirective to restore persisted user preferences on init. */
  applyUserSettings(settings: TableUserSettings): void {
    if (settings.columnOrder?.length) {
      this._columnOrder.set([...settings.columnOrder]);
    }
    if (settings.hiddenColumns?.length) {
      this._hiddenColumns.set(new Set(settings.hiddenColumns));
    }
    if (settings.columnWidths && Object.keys(settings.columnWidths).length) {
      this._columnWidths.set(new Map(Object.entries(settings.columnWidths).map(([k, v]) => [k, v])));
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
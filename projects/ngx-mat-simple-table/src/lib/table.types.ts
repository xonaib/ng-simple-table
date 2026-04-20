export interface ColumnDef {
  /**
   * Unique id for the column: becomes Angular Material `matColumnDef` and the row property
   * used for default cell text (`row[key]`). Use `'select'` for the checkbox column.
   */
  key: string;
  /** Column header text — title-cased from `key` if omitted */
  label?: string;
  /**
   * Column width: number is treated as px; string is any valid CSS width (e.g. `'12rem'`, `'20%'`).
   * Omitted = auto. User resize overrides are applied on top at runtime.
   */
  width?: number | string;
  /** When false, disables sort for this column. Omitted = sortable (except `select`, never sortable). */
  sortable?: boolean;
  hasColumnFilters?: boolean;
  filterType?: FilterType;
  /** reserved for future column reordering (v2) */
  displayIndex?: number;
  /**
   * Pin column to the left or right edge during horizontal scroll.
   * 'left' maps to Material's [sticky]="true", 'right' maps to [stickyEnd]="true".
   */
  sticky?: 'left' | 'right';
  /**
   * When false, the column cannot be hidden via the column chooser.
   * Defaults to true. Sticky columns default to false.
   */
  hideable?: boolean;
  /**
   * Optional transform applied to the cell value for **both** the grid's default cell renderer
   * and export (xlsx / csv). Define formatting here once and it works everywhere — no need for
   * a custom `cellDef` template just to apply a pipe.
   *
   * @param value  The raw value from the row (`row[key]`)
   * @param row    The full row object, in case you need other fields for the display value
   * @returns      The value to display in the grid cell and write to the export file
   *
   * @example
   * { key: 'priority', displayValue: v => String(v).toUpperCase() }
   * { key: 'status',   displayValue: v => String(v).replace(/-/g, ' ').toUpperCase() }
   */
  displayValue?: (value: unknown, row: unknown) => unknown;
  /**
   * Export-only override. When set, this is used **instead of** `displayValue` during export.
   * Use when the grid needs rich rendering (badge, icon, link) but the export needs plain text.
   *
   * @example
   * { key: 'title', displayValue: v => v, exportValue: v => String(v) }
   */
  exportValue?: (value: unknown, row: unknown) => unknown;
}

/** Reserved column `key` for the internal layout filler — do not use in host configs. */
export const SIMPLE_TABLE_LAYOUT_FILLER_COLUMN = 'st-layout-filler' as const;

export interface TableConfig {
  isPaginated?: boolean;
  paginationOptions?: PaginationOptions;
  tableWidth?: string;
  /**
   * When true the table owns sort, filter, and pagination internally via
   * MatTableDataSource. The host can pass the full unsliced dataset and skip
   * wiring up page/sort/filter event handlers.
   */
  clientSide?: boolean;
  /** Set false to hide the column chooser toolbar button. Default: on. */
  showColumnChooser?: boolean;
  /** Set false to hide the refresh toolbar button. Default: on. */
  showRefresh?: boolean;
  /** Set false to disable column drag-reorder. Default: on. */
  columnDraggable?: boolean;
  /** Set false to disable column width resize handles. Default: on. */
  columnResizable?: boolean;
  /**
   * Enable horizontal scroll on the table wrapper.
   * Auto-enabled when any column has sticky: 'left' | 'right', but can be
   * forced independently for tables with many columns.
   */
  horizontalScroll?: boolean;
  /** Fixed height for the table body with sticky header. Any valid CSS height value. */
  maxHeight?: string;
}

export interface PaginationOptions {
  defaultPageSize: number;
  pageSizeOptions?: number[];
}

export enum FilterType {
  DropDown  = 'DropDown',
  DateRange = 'DateRange',
}

export interface Item {
  id: number | string;
  value: string;
}

export interface ItemParent {
  id: number | string;
  children?: Item[];
  selected?: Item[];
  selectedKeys?: Array<number | string>;
}

export interface ColumnFiltersData {
  parents: ItemParent[];
}

/** Persisted per-user table preferences managed by StStateStoringDirective. */
export interface TableUserSettings {
  /** Ordered list of column keys (excludes 'select'). */
  columnOrder:   string[];
  /** Column keys currently hidden by the column chooser. */
  hiddenColumns: string[];
  /** Column key → width in px from user resize interactions. */
  columnWidths:  Record<string, number>;
}

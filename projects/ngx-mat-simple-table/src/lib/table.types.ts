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
}

export interface PaginationOptions {
  defaultPageSize: number;
  pageSizeOptions?: number[];
}

export enum FilterType {
  DropDown = 'DropDown',
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

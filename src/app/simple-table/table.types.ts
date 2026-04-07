export interface ColumnDef {
  /** unique key matching the data property name */
  columnDef: string;
  /** display label — title-cased from columnDef if omitted */
  header?: string;
  isSortable?: boolean;
  hasColumnFilters?: boolean;
  filterType?: FilterType;
  /** reserved for future column reordering (v2) */
  displayIndex?: number;
}

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
  /** Show a column chooser button in the toolbar to toggle column visibility. */
  showColumnChooser?: boolean;
  /** Show a refresh button in the toolbar; emits the `refresh` output when clicked. */
  showRefresh?: boolean;
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

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

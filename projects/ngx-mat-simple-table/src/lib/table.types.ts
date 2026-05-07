export interface ColumnDef {
  /**
   * Unique id for the column: becomes Angular Material matColumnDef and the row property
   * used for default cell text (row[key]). Use 'select' for the checkbox column.
   */
  key: string;
  /** Column header text — title-cased from key if omitted */
  label?: string;
  /**
   * Column width: number is treated as px; string is any valid CSS width (e.g. '12rem', '20%').
   * Omitted = auto. User resize overrides are applied on top at runtime.
   */
  width?: number | string;
  /** When false, disables sort for this column. Omitted = sortable (except select, never sortable). */
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
   * Optional transform applied to the cell value for both the grid's default cell renderer
   * and export (xlsx / csv). Define formatting here once and it works everywhere.
   */
  displayValue?: (value: unknown, row: unknown) => unknown;
  /**
   * Export-only override. When set, this is used instead of displayValue during export.
   * Use when the grid needs rich rendering (badge, icon, link) but the export needs plain text.
   */
  exportValue?: (value: unknown, row: unknown) => unknown;
  /**
   * Optional CSS class(es) applied to the body td for this column.
   * Receives the raw cell value and the full row object; return a string,
   * an array of strings, or null/undefined for no extra class.
   */
  cellClass?: (value: unknown, row: unknown) => string | string[] | null | undefined;
}

/** Reserved column key for the internal layout filler — do not use in host configs. */
export const SIMPLE_TABLE_LAYOUT_FILLER_COLUMN = 'st-layout-filler' as const;

/** Reserved column key for the auto-injected row-actions column — do not use in host configs. */
export const ST_ROW_ACTIONS_COLUMN = 'st-row-actions' as const;

/**
 * Where an action button is rendered relative to the table.
 *
 * - 'above'      — strip above the toolbar
 * - 'toolbar'    — left side of the built-in toolbar row
 * - 'below'      — strip below the paginator
 * - 'row-inline' — icon button(s) visible on every row, in a sticky-end actions column
 * - 'row-menu'   — items inside a overflow menu in the same sticky-end column
 */
export type ActionPosition = 'above' | 'toolbar' | 'below' | 'row-inline' | 'row-menu';

/**
 * Declarative action definition for SimpleTableComponent.
 *
 * Pass an array of these to the [actions] input.
 *
 * For 'row-inline' and 'row-menu' positions the clicked row is passed to cb and disabled.
 * For all other positions row is undefined — use a closure over your component state.
 *
 * At least one of label or icon must be provided.
 * When label is omitted the button renders as an icon-only button with a tooltip equal to id.
 */
export interface TableAction<T = unknown> {
  /** Unique identifier — used as a track key; not displayed. */
  id: string;
  /**
   * Button label / menu-item text. Optional — when omitted the action renders
   * as an icon-only button (requires icon to be set) and shows id as a tooltip.
   */
  label?: string;
  /** Material icon name (e.g. 'add', 'edit', 'delete'). */
  icon?: string;
  position: ActionPosition;
  /** Called when the action is activated. row is undefined for non-row positions. */
  cb: (row: T | undefined) => void;
  /** Return true to disable this action. Receives row for row-level positions. */
  disabled?: (row: T | undefined) => boolean;
  /** Material button colour. */
  color?: 'primary' | 'accent' | 'warn';
  /**
   * Button style for non-row positions ('above', 'toolbar', 'below').
   * Defaults to 'stroked'. 'icon' renders mat-icon-button; the others render the
   * matching mat-*-button variant with both icon (if provided) and label.
   * Omitting label also forces icon-only rendering regardless of this field.
   * Row-inline actions always use mat-icon-button; row-menu items are always mat-menu-item.
   */
  variant?: 'icon' | 'flat' | 'stroked' | 'text';
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
  /**
   * When true the table wrapper stretches to fill its parent container's height
   * and scrolls internally. The parent element must have a defined height (px, vh, flex, etc.).
   * Takes precedence over maxHeight when both are set.
   */
  fillContainer?: boolean;
  /**
   * When true, rows are rendered through a CdkVirtualScrollViewport so only the
   * visible slice of the dataset is in the DOM. Works in both client-side and
   * server-side modes.
   *
   * - Client-side: all data is passed in; the table filters/sorts internally and
   *   virtualises the result. The paginator is hidden.
   * - Server-side: the host is responsible for loading the rows it wants shown
   *   (e.g. a single large page); the table virtualises whatever it receives.
   *
   * Requires the viewport to have a defined height — set either `fillContainer: true`
   * or `maxHeight`. false by default.
   */
  virtual?: boolean;
  /**
   * Pixel height of each data row, used by the virtual scroll viewport to
   * calculate which rows are in view. Must match the rendered row height.
   * Defaults to 48, which matches the `--st-row-height` CSS custom property.
   */
  virtualRowHeight?: number;
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
  /** Column key to width in px from user resize interactions. */
  columnWidths:  Record<string, number>;
}

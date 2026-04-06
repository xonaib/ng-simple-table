import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { SelectionChange, SelectionModel } from '@angular/cdk/collections';
import { Observable, isObservable, of as observableOf } from 'rxjs';
import { ColumnFilterComponent } from './column-filter/column-filter.component';
import { CellDefDirective } from './cell-def.directive';
import { ColumnFiltersData, ColumnDef, ItemParent, TableConfig } from './table.types';

@Component({
  selector: 'simple-table',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgTemplateOutlet,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatIconModule,
    ColumnFilterComponent,
  ],
  templateUrl: './simple-table.component.html',
  styleUrl: './simple-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleTableComponent<T> implements AfterContentInit {
  private readonly _destroyRef = inject(DestroyRef);

  // ---- selection model ----
  readonly selection = new SelectionModel<T>(true, []);

  // ---- view children (used for client-side mode) ----
  private readonly _sortRef = viewChild(MatSort);
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

  // ---- internal state (template-accessible) ----

  readonly _data = signal<T[]>([]);
  _headers: string[] = [];
  _dataColumns: ColumnDef[] = [];
  readonly columnFilters = signal<Map<string, ItemParent>>(new Map());
  readonly customCellTemplates = new Map<string, TemplateRef<{ $implicit: unknown }>>();

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
  }

  // ---- lifecycle ----

  ngAfterContentInit(): void {
    this._populateColumns();
    this._subscribeToSelection();
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

    this._headers = [];
    this._dataColumns = [];

    this.tableColumns().forEach((col: ColumnDef) => {
      this._headers.push(col.columnDef);
      if (col.columnDef !== 'select') {
        this._dataColumns.push(col);
      }
    });
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

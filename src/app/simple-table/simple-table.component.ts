import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  TemplateRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { SelectionChange, SelectionModel } from '@angular/cdk/collections';
import { Observable, isObservable, of as observableOf } from 'rxjs';
import { ColumnFilterComponent } from './column-filter/column-filter.component';
import { CellDefDirective } from './cell-def.directive';
import {
  ColumnFiltersData,
  ColumnDef,
  ItemParent,
  TableConfig,
} from './table.types';

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
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  // ---- selection model ----
  readonly selection = new SelectionModel<T>(true, []);

  // ---- sort ref (used to reset active state when needed) ----
  private _sort?: MatSort;

  /** custom cell templates provided by the host via [cellDef] */
  @ContentChildren(CellDefDirective) cellDefs!: QueryList<CellDefDirective>;

  // ---- inputs ----

  @Input()
  get dataSource(): T[] | Observable<T[]> { return this._dataSource!; }
  set dataSource(value: T[] | Observable<T[]>) {
    this._dataSource = value;
    if (this._isInit) {
      this._switchDataSource(value);
    }
  }
  private _dataSource?: T[] | Observable<T[]>;

  @Input()
  get tableColumns(): ColumnDef[] { return this._colsDef; }
  set tableColumns(value: ColumnDef[]) {
    if (Array.isArray(value)) {
      this._colsDef = value;
    }
  }
  private _colsDef: ColumnDef[] = [];

  @Input()
  get tableConfig(): TableConfig { return this._tableConfig; }
  set tableConfig(value: TableConfig) {
    this._tableConfig = value ?? {};
  }
  private _tableConfig: TableConfig = {};

  /** total record count — used for server-side pagination */
  @Input()
  get length(): number { return this._length; }
  set length(value: number) {
    this._length = Math.max(0, Number(value) || 0);
  }
  private _length = 0;

  @Input()
  get columnFiltersData(): ColumnFiltersData | Observable<ColumnFiltersData> | undefined {
    return this._filtersSource;
  }
  set columnFiltersData(value: ColumnFiltersData | Observable<ColumnFiltersData> | undefined) {
    this._filtersSource = value;
    if (this._isInit) {
      this._subscribeToFilters();
    }
  }
  private _filtersSource?: ColumnFiltersData | Observable<ColumnFiltersData>;

  @Input() stickyHeaders = false;

  /** pre-select rows programmatically; pass a new array reference to update */
  @Input()
  set selectedRows(value: T[]) {
    this.selection.clear();
    if (value?.length) {
      this.selection.select(...value);
    }
  }

  // ---- outputs ----

  /** emits Angular Material's PageEvent on pagination change */
  @Output() readonly page = new EventEmitter<PageEvent>();
  /** emits full array of currently selected rows */
  @Output() readonly selectionChange = new EventEmitter<T[]>();
  /** emits the current filter map keyed by columnDef when Apply or Clear is clicked */
  @Output() readonly filterChange = new EventEmitter<Map<string, ItemParent>>();
  /** emits Angular Material's Sort object on column sort change */
  @Output() readonly sortChange = new EventEmitter<Sort>();

  // ---- internal state (template-accessible) ----

  _data: T[] = [];
  _headers: string[] = [];
  _dataColumns: ColumnDef[] = [];
  readonly columnFilters = new Map<string, ItemParent>();
  readonly customCellTemplates = new Map<string, TemplateRef<{ $implicit: unknown }>>();

  private _isInit = false;

  // ---- lifecycle ----

  ngAfterContentInit(): void {
    this._isInit = true;

    this._populateColumns();
    this._subscribeToData();
    this._subscribeToFilters();
    this._subscribeToSelection();
  }

  // ---- data source ----

  private _subscribeToData(): void {
    if (!this._dataSource) return;
    const stream = isObservable(this._dataSource)
      ? this._dataSource
      : observableOf(this._dataSource as T[]);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: T[]) => {
      this._data = data ?? [];
      this._cdr.markForCheck();
    });
  }

  private _switchDataSource(value: T[] | Observable<T[]>): void {
    this._data = [];
    this._dataSource = value;
    this._subscribeToData();
  }

  // ---- filters ----

  private _subscribeToFilters(): void {
    if (!this._filtersSource) return;
    const stream = isObservable(this._filtersSource)
      ? this._filtersSource
      : observableOf(this._filtersSource as ColumnFiltersData);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: ColumnFiltersData) => {
      this.columnFilters.clear();
      data.parents.forEach(p => this.columnFilters.set(String(p.id), p));
      this._cdr.markForCheck();
    });
  }

  onFilterApplied(columnDef: string, parent: ItemParent): void {
    this.columnFilters.set(columnDef, parent);
    this.filterChange.emit(new Map(this.columnFilters));
  }

  onFilterCleared(columnDef: string): void {
    const current = this.columnFilters.get(columnDef);
    if (current) {
      this.columnFilters.set(columnDef, { ...current, selectedKeys: [] });
    }
    this.filterChange.emit(new Map(this.columnFilters));
  }

  // ---- columns ----

  private _populateColumns(): void {
    // build custom cell template map from cellDef directives
    this.customCellTemplates.clear();
    this.cellDefs.forEach(d => this.customCellTemplates.set(d.columnDef, d.template));

    this._headers = [];
    this._dataColumns = [];

    this._colsDef.forEach((col: ColumnDef) => {
      this._headers.push(col.columnDef);
      // all non-select columns are rendered by the @for loop in the template;
      // custom cell content is provided via customCellTemplates
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

  isAllSelected(): boolean {
    if (!this._data?.length) return false;
    return this.selection.selected.length === this._data.length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this._data);
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

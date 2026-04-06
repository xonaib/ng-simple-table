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
  private readonly _destroyRef = inject(DestroyRef);

  // ---- selection model ----
  readonly selection = new SelectionModel<T>(true, []);

  // ---- sort ref (used to reset active state when needed) ----
  private _sort?: MatSort;

  /** custom cell templates provided by the host via [cellDef] */
  readonly cellDefs = contentChildren(CellDefDirective);

  // ---- inputs ----

  readonly dataSource    = input.required<T[] | Observable<T[]>>();
  readonly tableColumns  = input.required<ColumnDef[]>();
  readonly tableConfig   = input<TableConfig>({});
  readonly length        = input(0);
  readonly columnFiltersData = input<ColumnFiltersData | Observable<ColumnFiltersData> | undefined>();
  readonly stickyHeaders = input(false);
  readonly selectedRows  = input<T[] | undefined>();

  // ---- outputs ----

  /** emits Angular Material's PageEvent on pagination change */
  readonly page            = output<PageEvent>();
  /** emits full array of currently selected rows */
  readonly selectionChange = output<T[]>();
  /** emits the current filter map keyed by columnDef when Apply or Clear is clicked */
  readonly filterChange    = output<Map<string, ItemParent>>();
  /** emits Angular Material's Sort object on column sort change */
  readonly sortChange      = output<Sort>();

  // ---- internal state (template-accessible) ----

  readonly _data    = signal<T[]>([]);
  _headers: string[] = [];
  _dataColumns: ColumnDef[] = [];
  readonly columnFilters = signal<Map<string, ItemParent>>(new Map());
  readonly customCellTemplates = new Map<string, TemplateRef<{ $implicit: unknown }>>();

  constructor() {
    effect(() => { this._switchDataSource(this.dataSource()); });
    effect(() => { this._subscribeToFilters(this.columnFiltersData()); });
    effect(() => {
      const rows = this.selectedRows();
      this.selection.clear();
      if (rows?.length) this.selection.select(...rows);
    });
  }

  // ---- lifecycle ----

  ngAfterContentInit(): void {
    this._populateColumns();
    this._subscribeToSelection();
  }

  // ---- data source ----

  private _switchDataSource(value: T[] | Observable<T[]>): void {
    this._data.set([]);
    const stream = isObservable(value)
      ? value
      : observableOf(value as T[]);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: T[]) => {
      this._data.set(data ?? []);
    });
  }

  // ---- filters ----

  private _subscribeToFilters(source: ColumnFiltersData | Observable<ColumnFiltersData> | undefined): void {
    if (!source) return;
    const stream = isObservable(source)
      ? source
      : observableOf(source as ColumnFiltersData);

    stream.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((data: ColumnFiltersData) => {
      const map = new Map<string, ItemParent>();
      data.parents.forEach(p => map.set(String(p.id), p));
      this.columnFilters.set(map);
    });
  }

  onFilterApplied(columnDef: string, parent: ItemParent): void {
    const map = new Map(this.columnFilters());
    map.set(columnDef, parent);
    this.columnFilters.set(map);
    this.filterChange.emit(new Map(map));
  }

  onFilterCleared(columnDef: string): void {
    const map = new Map(this.columnFilters());
    const current = map.get(columnDef);
    if (current) {
      map.set(columnDef, { ...current, selectedKeys: [] });
    }
    this.columnFilters.set(map);
    this.filterChange.emit(new Map(map));
  }

  // ---- columns ----

  private _populateColumns(): void {
    this.customCellTemplates.clear();
    this.cellDefs().forEach(d => this.customCellTemplates.set(d.columnDef(), d.template));

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

  isAllSelected(): boolean {
    if (!this._data()?.length) return false;
    return this.selection.selected.length === this._data().length;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this._data());
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

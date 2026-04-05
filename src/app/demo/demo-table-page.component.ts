import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { SimpleTableComponent } from '../simple-table/simple-table.component';
import { CellDefDirective } from '../simple-table/cell-def.directive';
import {
  ColumnFiltersData,
  ColumnDef,
  FilterType,
  ItemParent,
  TableConfig,
} from '../simple-table/table.types';
import { Task, TASKS } from './demo-data';

@Component({
  selector: 'app-demo-table-page',
  standalone: true,
  imports: [SimpleTableComponent, CellDefDirective],
  templateUrl: './demo-table-page.component.html',
  styleUrl: './demo-table-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoTablePageComponent {

  // ---- column definitions ----

  readonly columns: ColumnDef[] = [
    { columnDef: 'select' },
    { columnDef: 'id',          header: 'ID',          isSortable: true },
    { columnDef: 'title',       header: 'Title',       isSortable: true },
    { columnDef: 'assignee',    header: 'Assignee',    isSortable: true,  hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'status',      header: 'Status',      isSortable: true,  hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'priority',    header: 'Priority',    isSortable: true,  hasColumnFilters: true, filterType: FilterType.DropDown },
    { columnDef: 'dueDate',     header: 'Due Date',    isSortable: true },
    { columnDef: 'storyPoints', header: 'Points',      isSortable: true },
  ];

  readonly tableConfig: TableConfig = {
    isPaginated: true,
    paginationOptions: { defaultPageSize: 10, pageSizeOptions: [5, 10, 25, 50] },
  };

  // ---- filter data derived from the full task list ----

  readonly filtersData: ColumnFiltersData = this._buildFiltersData();

  // ---- reactive state ----

  private readonly _allTasks = signal<Task[]>(TASKS);
  private readonly _activeFilters = signal<Map<string, ItemParent>>(new Map());
  private readonly _sortState = signal<Sort | null>(null);
  private readonly _pageIndex = signal(0);
  private readonly _pageSize = signal(10);

  /** tasks after filters and sort are applied */
  private readonly _filteredTasks = computed(() => {
    let tasks = this._allTasks();

    // apply column filters
    const filters = this._activeFilters();
    for (const [columnDef, parent] of filters) {
      const keys = parent.selectedKeys ?? [];
      if (keys.length > 0) {
        const keySet = new Set(keys.map(k => String(k)));
        tasks = tasks.filter(t => keySet.has(String(t[columnDef as keyof Task])));
      }
    }

    // apply sort
    const sort = this._sortState();
    if (sort?.active && sort.direction) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const key = sort.active as keyof Task;
      tasks = [...tasks].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null) return dir;
        if (bv == null) return -dir;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }

    return tasks;
  });

  /** total count for the paginator */
  readonly totalCount = computed(() => this._filteredTasks().length);

  /** current page slice bound to the table */
  readonly pagedTasks = computed(() => {
    const start = this._pageIndex() * this._pageSize();
    return this._filteredTasks().slice(start, start + this._pageSize());
  });

  // ---- selection state ----

  readonly selectedTasks = signal<Task[]>([]);

  // ---- event handlers ----

  onPage(event: PageEvent): void {
    this._pageIndex.set(event.pageIndex);
    this._pageSize.set(event.pageSize);
  }

  onSortChange(sort: Sort): void {
    this._sortState.set(sort);
    this._pageIndex.set(0);
  }

  onFilterChange(filters: Map<string, ItemParent>): void {
    this._activeFilters.set(new Map(filters));
    this._pageIndex.set(0);
  }

  onSelectionChange(rows: Task[]): void {
    this.selectedTasks.set(rows);
  }

  // ---- helpers ----

  private _buildFiltersData(): ColumnFiltersData {
    const assignees = this._uniqueValues('assignee');
    const statuses  = this._uniqueValues('status');
    const priorities = this._uniqueValues('priority');

    return {
      parents: [
        { id: 'assignee',  children: assignees.map(v  => ({ id: v,  value: v  })) },
        { id: 'status',    children: statuses.map(v   => ({ id: v,  value: v  })) },
        { id: 'priority',  children: priorities.map(v => ({ id: v,  value: v  })) },
      ],
    };
  }

  private _uniqueValues(key: keyof Task): string[] {
    return [...new Set(TASKS.map(t => String(t[key])))].sort();
  }
}

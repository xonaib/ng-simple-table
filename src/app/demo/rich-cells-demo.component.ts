import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  CellDefDirective,
  ColumnDef,
  FilterType,
  SimpleTableComponent,
  TableConfig,
} from 'ngx-mat-simple-table';
import { Task, TASKS } from './demo-data';

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#06b6d4',
];

@Component({
  selector: 'app-rich-cells-demo',
  standalone: true,
  imports: [SimpleTableComponent, CellDefDirective, MatButtonModule, MatIconModule, TitleCasePipe],
  templateUrl: './rich-cells-demo.component.html',
  styleUrl: './rich-cells-demo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichCellsDemoComponent {
  // Use first 200 rows — enough to page through, no need to intercept HTTP here
  readonly tasks: Task[] = TASKS.slice(0, 200);

  readonly columns: ColumnDef[] = [
    { key: 'id',         label: '#',        width: 60  },
    { key: 'assignee',   label: 'Assignee', width: 200, hasColumnFilters: true, filterType: FilterType.DropDown },
    { key: 'title',      label: 'Task',     width: 300 },
    { key: 'status',     label: 'Status',   width: 150, hasColumnFilters: true, filterType: FilterType.DropDown },
    { key: 'priority',   label: 'Priority', width: 120, hasColumnFilters: true, filterType: FilterType.DropDown },
    { key: 'dueDate',    label: 'Due',      width: 110 },
    { key: 'storyPoints',label: 'Pts',      width: 64  },
    { key: 'rowActions', label: 'Actions',  width: 170 },
  ];

  readonly tableConfig: TableConfig = {
    isPaginated: true,
    paginationOptions: { defaultPageSize: 20, pageSizeOptions: [10, 20, 50] },
    clientSide: true,
    horizontalScroll: true,
    fillContainer: true,
  };

  // ---- helpers used in the template ----

  getAvatarColor(name: string): string {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  splitTags(tags: string): string[] {
    return tags ? tags.split(', ') : [];
  }

  statusLabel(status: string): string {
    return ({ 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' } as Record<string, string>)[status] ?? status;
  }

  statusIcon(status: string): string {
    return ({ 'todo': 'radio_button_unchecked', 'in-progress': 'pending', 'done': 'check_circle' } as Record<string, string>)[status] ?? 'help';
  }

  priorityIcon(priority: string): string {
    return ({ 'high': 'keyboard_double_arrow_up', 'medium': 'remove', 'low': 'keyboard_double_arrow_down' } as Record<string, string>)[priority] ?? 'remove';
  }

  // ---- row action handlers ----

  onEdit(task: Task): void {
    console.log('[rich-demo] edit', task.id, task.title);
  }

  onApprove(task: Task): void {
    console.log('[rich-demo] approve', task.id, task.title);
  }
}

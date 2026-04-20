import { Directive, input } from '@angular/core';

/**
 * Drop `<st-export />` inside `<simple-table>` to add an export button to the toolbar.
 * Requires the `xlsx` peer dependency for XLSX format (default). Falls back to CSV if not installed.
 *
 * @example
 * <simple-table tableId="tasks" ...>
 *   <st-export />
 *   <st-export format="csv" />
 *   <st-export format="xlsx" filename="my-report" />
 * </simple-table>
 */
@Directive({
  selector: 'st-export',
  standalone: true,
})
export class StExportDirective {
  /** Export file format. 'xlsx' requires the 'xlsx' (SheetJS) peer dependency. Default: 'xlsx'. */
  readonly format = input<'csv' | 'xlsx'>('xlsx');
  /** File name without extension. Defaults to the parent table's tableId, or 'export'. */
  readonly filename = input<string | undefined>(undefined);
  /**
   * Required in server-side mode. An async function that returns **all** rows (unpaginated) for
   * export. The library only holds the current page in server-side mode, so without this the
   * export would only contain the visible page.
   *
   * In client-side mode this input is ignored — the table already has every row locally.
   *
   * @example
   * // host component:
   * getAllForExport = (): Promise<Task[]> =>
   *   firstValueFrom(this.http.get<TasksResponse>('/api/tasks', { params: { size: '999999' } })
   *     .pipe(map(r => r.data)));
   *
   * // template:
   * <st-export [allDataProvider]="getAllForExport" />
   */
  readonly allDataProvider = input<(() => Promise<unknown[]>) | undefined>(undefined);
}

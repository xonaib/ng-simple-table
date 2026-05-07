import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DEFAULT_TASK_COUNT, generateTasks, Task } from './demo-data';

export interface TasksResponse {
  data: Task[];
  total: number;
}

const FILTERABLE = ['title', 'assignee', 'status', 'priority', 'team', 'sprint', 'reporter'] as const;

export const tasksInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/tasks')) return next(req);

  const p = req.params;
  const pageRaw = p.get('page');
  const sizeRaw = p.get('size');
  const page    = Number(pageRaw ?? '0');
  const size    = sizeRaw != null ? Number(sizeRaw) : null; // null = return all
  const count   = Number(p.get('count') ?? DEFAULT_TASK_COUNT);
  const sortCol = p.get('sort');
  const sortDir = p.get('direction') ?? 'asc';

  let tasks = generateTasks(count);

  // apply column filters — each param is a comma-separated list of selected values
  for (const col of FILTERABLE) {
    const raw = p.get(col);
    if (raw) {
      const keys = new Set(raw.split(','));
      tasks = tasks.filter((t) => keys.has(String(t[col])));
    }
  }

  // sort
  if (sortCol && sortDir) {
    const dir = sortDir === 'asc' ? 1 : -1;
    const key = sortCol as keyof Task;
    tasks = tasks.sort((a, b) => {
      const av = a[key],
        bv = b[key];
      if (av == null) return dir;
      if (bv == null) return -dir;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  const total = tasks.length;
  const data  = size == null ? tasks : tasks.slice(page * size, page * size + size);

  console.log('[tasks-interceptor]', req.urlWithParams, { total, page, size });
  return of(new HttpResponse<TasksResponse>({ status: 200, body: { data, total } })).pipe(
    delay(300),
  );
};

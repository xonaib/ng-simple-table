import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DEFAULT_TASK_COUNT, generateTasks, Task } from './demo-data';

export interface TasksResponse {
  data: Task[];
  total: number;
  offset?: number;
}

const FILTERABLE = ['title', 'assignee', 'status', 'priority', 'team', 'sprint', 'reporter'] as const;

export const tasksInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/tasks')) return next(req);

  const p = req.params;
  const pageRaw = p.get('page');
  const sizeRaw = p.get('size');
  const offsetRaw = p.get('offset');
  const limitRaw = p.get('limit');
  const page    = Number(pageRaw ?? '0');
  const size    = sizeRaw != null ? Number(sizeRaw) : null; // null = return all
  const offset  = offsetRaw != null ? Number(offsetRaw) : null;
  const limit   = limitRaw != null ? Number(limitRaw) : null;
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
  const start = offset ?? page * (size ?? total);
  const take = limit ?? size;
  const data  = take == null ? tasks : tasks.slice(start, start + take);
  const responseDelay = offsetRaw != null || limitRaw != null ? 650 : 300;

  console.log('[tasks-interceptor]', req.urlWithParams, { total, page, size, offset, limit });
  return of(new HttpResponse<TasksResponse>({ status: 200, body: { data, total, offset: start } })).pipe(
    delay(responseDelay),
  );
};

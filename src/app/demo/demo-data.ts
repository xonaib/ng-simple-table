export interface Task {
  id: number;
  title: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  storyPoints: number;
  team: string;
  sprint: string;
  reporter: string;
  estimate: string;
  tags: string;
}

export const DEFAULT_TASK_COUNT = 500;
export const TASK_COUNT_OPTIONS = [50, 100, 500, 1_000, 5_000, 10_000];

const TITLES = [
  'Set up CI pipeline',
  'Design login screen',
  'Implement auth flow',
  'Write API specs',
  'Set up database schema',
  'Create user onboarding flow',
  'Integrate payment gateway',
  'Build notification service',
  'Dashboard charts',
  'Mobile responsive layout',
  'Export to CSV feature',
  'Dark mode support',
  'Accessibility audit',
  'Error boundary handling',
  'Unit tests for auth service',
  'E2E tests for checkout',
  'Performance profiling',
  'Caching layer implementation',
  'Logging and monitoring setup',
  'API rate limiting',
  'Webhook support',
  'Multi-language support',
  'User roles and permissions',
  'Two-factor authentication',
  'Data backup strategy',
  'Search feature',
  'File upload component',
  'Real-time updates via WebSocket',
  'Admin panel layout',
  'Report generation module',
  'Bulk import via CSV',
  'Audit trail logging',
  'Custom email templates',
  'Subscription billing module',
  'Coupon and discount system',
  'Analytics events tracking',
  'Lazy loading optimizations',
  'PWA support',
  'Image compression pipeline',
  'Social login integration',
  'API versioning strategy',
  'Content moderation queue',
  'Geo-based content delivery',
  'GDPR compliance checklist',
  'Security penetration testing',
  'Load testing with k6',
  'Documentation site',
  'Storybook setup',
  'A/B testing framework',
  'Post-launch retrospective',
];

const ASSIGNEES = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Hannah', 'Iris', 'Jamal'];
const REPORTERS = ['Eve', 'Frank', 'Grace', 'Hannah', 'Iris', 'Jamal'];
const STATUSES: Task['status'][] = ['todo', 'in-progress', 'done'];
const PRIORITIES: Task['priority'][] = ['low', 'medium', 'high'];
const STORY_POINTS = [1, 2, 3, 5, 8, 13];
const TEAMS = ['Platform', 'Frontend', 'Backend', 'QA', 'Design', 'Data', 'All'];
const TAG_SETS = [
  'devops, ci',
  'ui, auth',
  'auth, security',
  'docs, api',
  'db, schema',
  'ux, onboarding',
  'payments, api',
  'email, push',
  'charts, ui',
  'mobile, css',
  'export, data',
  'ui, theme',
  'a11y, audit',
  'errors, ux',
  'tests, auth',
  'e2e, checkout',
  'perf, profiling',
  'cache, redis',
  'logging, ops',
  'api, security',
  'webhooks, api',
  'i18n, ux',
  'rbac, auth',
  'backup, db',
  'search, ux',
  'upload, ui',
  'websocket, realtime',
  'admin, ui',
  'reports, data',
  'import, csv',
  'audit, logging',
  'email, templates',
  'billing, payments',
  'discounts, billing',
  'analytics, events',
  'perf, lazy',
  'pwa, mobile',
  'images, perf',
  'oauth, auth',
  'api, versioning',
  'moderation, queue',
  'cdn, geo',
  'gdpr, compliance',
  'security, pentest',
  'load, k6',
  'docs, site',
  'storybook, ui',
  'ab-test, analytics',
  'retro, planning',
];

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function dueDateFor(index: number): string {
  const date = new Date(Date.UTC(2025, 1, 10 + index * 2));
  return date.toISOString().slice(0, 10);
}

export function generateTasks(total = DEFAULT_TASK_COUNT): Task[] {
  return Array.from({ length: total }, (_, index): Task => {
    const id = index + 1;
    const title = pick(TITLES, index);
    const status = pick(STATUSES, Math.floor(index / 5));
    const priority = pick(PRIORITIES, index * 2);
    const storyPoints = pick(STORY_POINTS, index * 3);

    return {
      id,
      title: id <= TITLES.length ? title : `${title} ${id}`,
      assignee: pick(ASSIGNEES, index * 5),
      status,
      priority,
      dueDate: dueDateFor(index),
      storyPoints,
      team: pick(TEAMS, index * 7),
      sprint: `Sprint ${Math.floor(index / 5) + 1}`,
      reporter: pick(REPORTERS, index * 3),
      estimate: `${Math.max(1, storyPoints)}h`,
      tags: pick(TAG_SETS, index * 11),
    };
  });
}

export const TASKS: Task[] = generateTasks();

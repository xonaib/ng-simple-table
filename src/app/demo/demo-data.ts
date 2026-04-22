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

export const TASKS: Task[] = [
  { id: 1,  title: 'Set up CI pipeline',              assignee: 'Alice',  status: 'done',        priority: 'high',   dueDate: '2025-02-10', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 1', reporter: 'Eve',   estimate: '4h',  tags: 'devops, ci' },
  { id: 2,  title: 'Design login screen',             assignee: 'Bob',    status: 'done',        priority: 'medium', dueDate: '2025-02-15', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 1', reporter: 'Frank', estimate: '2h',  tags: 'ui, auth' },
  { id: 3,  title: 'Implement auth flow',             assignee: 'Alice',  status: 'done',        priority: 'high',   dueDate: '2025-02-20', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 1', reporter: 'Eve',   estimate: '6h',  tags: 'auth, security' },
  { id: 4,  title: 'Write API specs',                 assignee: 'Carol',  status: 'done',        priority: 'medium', dueDate: '2025-02-22', storyPoints: 3,  team: 'Backend',   sprint: 'Sprint 1', reporter: 'Grace', estimate: '3h',  tags: 'docs, api' },
  { id: 5,  title: 'Set up database schema',          assignee: 'Dan',    status: 'done',        priority: 'high',   dueDate: '2025-02-28', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 1', reporter: 'Frank', estimate: '5h',  tags: 'db, schema' },
  { id: 6,  title: 'Create user onboarding flow',     assignee: 'Bob',    status: 'in-progress', priority: 'high',   dueDate: '2025-03-05', storyPoints: 8,  team: 'Frontend',  sprint: 'Sprint 2', reporter: 'Eve',   estimate: '8h',  tags: 'ux, onboarding' },
  { id: 7,  title: 'Integrate payment gateway',       assignee: 'Alice',  status: 'in-progress', priority: 'high',   dueDate: '2025-03-08', storyPoints: 13, team: 'Backend',   sprint: 'Sprint 2', reporter: 'Grace', estimate: '12h', tags: 'payments, api' },
  { id: 8,  title: 'Build notification service',      assignee: 'Carol',  status: 'in-progress', priority: 'medium', dueDate: '2025-03-10', storyPoints: 5,  team: 'Backend',   sprint: 'Sprint 2', reporter: 'Frank', estimate: '5h',  tags: 'email, push' },
  { id: 9,  title: 'Dashboard charts',                assignee: 'Dan',    status: 'in-progress', priority: 'medium', dueDate: '2025-03-12', storyPoints: 5,  team: 'Frontend',  sprint: 'Sprint 2', reporter: 'Eve',   estimate: '6h',  tags: 'charts, ui' },
  { id: 10, title: 'Mobile responsive layout',        assignee: 'Bob',    status: 'in-progress', priority: 'low',    dueDate: '2025-03-15', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 2', reporter: 'Grace', estimate: '4h',  tags: 'mobile, css' },
  { id: 11, title: 'Export to CSV feature',           assignee: 'Alice',  status: 'todo',        priority: 'low',    dueDate: '2025-03-20', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 3', reporter: 'Frank', estimate: '3h',  tags: 'export, data' },
  { id: 12, title: 'Dark mode support',               assignee: 'Carol',  status: 'todo',        priority: 'low',    dueDate: '2025-03-25', storyPoints: 5,  team: 'Frontend',  sprint: 'Sprint 3', reporter: 'Eve',   estimate: '5h',  tags: 'ui, theme' },
  { id: 13, title: 'Accessibility audit',             assignee: 'Dan',    status: 'todo',        priority: 'high',   dueDate: '2025-03-28', storyPoints: 5,  team: 'QA',        sprint: 'Sprint 3', reporter: 'Grace', estimate: '6h',  tags: 'a11y, audit' },
  { id: 14, title: 'Error boundary handling',         assignee: 'Alice',  status: 'todo',        priority: 'medium', dueDate: '2025-04-02', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 3', reporter: 'Frank', estimate: '2h',  tags: 'errors, ux' },
  { id: 15, title: 'Unit tests for auth service',     assignee: 'Bob',    status: 'todo',        priority: 'high',   dueDate: '2025-04-05', storyPoints: 5,  team: 'QA',        sprint: 'Sprint 3', reporter: 'Eve',   estimate: '5h',  tags: 'tests, auth' },
  { id: 16, title: 'E2E tests for checkout',          assignee: 'Carol',  status: 'todo',        priority: 'high',   dueDate: '2025-04-08', storyPoints: 8,  team: 'QA',        sprint: 'Sprint 4', reporter: 'Grace', estimate: '8h',  tags: 'e2e, checkout' },
  { id: 17, title: 'Performance profiling',           assignee: 'Dan',    status: 'todo',        priority: 'medium', dueDate: '2025-04-10', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 4', reporter: 'Frank', estimate: '5h',  tags: 'perf, profiling' },
  { id: 18, title: 'Caching layer implementation',    assignee: 'Alice',  status: 'todo',        priority: 'medium', dueDate: '2025-04-15', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 4', reporter: 'Eve',   estimate: '8h',  tags: 'cache, redis' },
  { id: 19, title: 'Logging and monitoring setup',    assignee: 'Bob',    status: 'todo',        priority: 'high',   dueDate: '2025-04-18', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 4', reporter: 'Grace', estimate: '5h',  tags: 'logging, ops' },
  { id: 20, title: 'API rate limiting',               assignee: 'Carol',  status: 'todo',        priority: 'medium', dueDate: '2025-04-20', storyPoints: 3,  team: 'Backend',   sprint: 'Sprint 4', reporter: 'Frank', estimate: '3h',  tags: 'api, security' },
  { id: 21, title: 'Webhook support',                 assignee: 'Dan',    status: 'todo',        priority: 'low',    dueDate: '2025-04-25', storyPoints: 5,  team: 'Backend',   sprint: 'Sprint 5', reporter: 'Eve',   estimate: '6h',  tags: 'webhooks, api' },
  { id: 22, title: 'Multi-language support',          assignee: 'Alice',  status: 'todo',        priority: 'low',    dueDate: '2025-05-01', storyPoints: 13, team: 'Frontend',  sprint: 'Sprint 5', reporter: 'Grace', estimate: '12h', tags: 'i18n, ux' },
  { id: 23, title: 'User roles and permissions',      assignee: 'Bob',    status: 'todo',        priority: 'high',   dueDate: '2025-05-05', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 5', reporter: 'Frank', estimate: '8h',  tags: 'rbac, auth' },
  { id: 24, title: 'Two-factor authentication',       assignee: 'Carol',  status: 'todo',        priority: 'high',   dueDate: '2025-05-08', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 5', reporter: 'Eve',   estimate: '8h',  tags: 'auth, security' },
  { id: 25, title: 'Data backup strategy',            assignee: 'Dan',    status: 'todo',        priority: 'medium', dueDate: '2025-05-10', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 5', reporter: 'Grace', estimate: '5h',  tags: 'backup, db' },
  { id: 26, title: 'Search feature',                  assignee: 'Alice',  status: 'todo',        priority: 'medium', dueDate: '2025-05-15', storyPoints: 8,  team: 'Frontend',  sprint: 'Sprint 6', reporter: 'Frank', estimate: '8h',  tags: 'search, ux' },
  { id: 27, title: 'File upload component',           assignee: 'Bob',    status: 'todo',        priority: 'medium', dueDate: '2025-05-18', storyPoints: 5,  team: 'Frontend',  sprint: 'Sprint 6', reporter: 'Eve',   estimate: '5h',  tags: 'upload, ui' },
  { id: 28, title: 'Real-time updates via WebSocket', assignee: 'Carol',  status: 'todo',        priority: 'low',    dueDate: '2025-05-20', storyPoints: 13, team: 'Backend',   sprint: 'Sprint 6', reporter: 'Grace', estimate: '12h', tags: 'websocket, realtime' },
  { id: 29, title: 'Admin panel layout',              assignee: 'Dan',    status: 'todo',        priority: 'low',    dueDate: '2025-05-25', storyPoints: 5,  team: 'Frontend',  sprint: 'Sprint 6', reporter: 'Frank', estimate: '5h',  tags: 'admin, ui' },
  { id: 30, title: 'Report generation module',        assignee: 'Alice',  status: 'todo',        priority: 'medium', dueDate: '2025-06-01', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 6', reporter: 'Eve',   estimate: '8h',  tags: 'reports, data' },
  { id: 31, title: 'Bulk import via CSV',             assignee: 'Bob',    status: 'todo',        priority: 'low',    dueDate: '2025-06-05', storyPoints: 5,  team: 'Backend',   sprint: 'Sprint 7', reporter: 'Grace', estimate: '5h',  tags: 'import, csv' },
  { id: 32, title: 'Audit trail logging',             assignee: 'Carol',  status: 'todo',        priority: 'medium', dueDate: '2025-06-08', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 7', reporter: 'Frank', estimate: '5h',  tags: 'audit, logging' },
  { id: 33, title: 'Custom email templates',          assignee: 'Dan',    status: 'todo',        priority: 'low',    dueDate: '2025-06-12', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 7', reporter: 'Eve',   estimate: '3h',  tags: 'email, templates' },
  { id: 34, title: 'Subscription billing module',     assignee: 'Alice',  status: 'todo',        priority: 'high',   dueDate: '2025-06-15', storyPoints: 13, team: 'Backend',   sprint: 'Sprint 7', reporter: 'Grace', estimate: '12h', tags: 'billing, payments' },
  { id: 35, title: 'Coupon and discount system',      assignee: 'Bob',    status: 'todo',        priority: 'medium', dueDate: '2025-06-18', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 7', reporter: 'Frank', estimate: '8h',  tags: 'discounts, billing' },
  { id: 36, title: 'Analytics events tracking',       assignee: 'Carol',  status: 'todo',        priority: 'medium', dueDate: '2025-06-20', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 8', reporter: 'Eve',   estimate: '5h',  tags: 'analytics, events' },
  { id: 37, title: 'Lazy loading optimizations',      assignee: 'Dan',    status: 'todo',        priority: 'low',    dueDate: '2025-06-25', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 8', reporter: 'Grace', estimate: '3h',  tags: 'perf, lazy' },
  { id: 38, title: 'PWA support',                     assignee: 'Alice',  status: 'todo',        priority: 'low',    dueDate: '2025-07-01', storyPoints: 8,  team: 'Frontend',  sprint: 'Sprint 8', reporter: 'Frank', estimate: '8h',  tags: 'pwa, mobile' },
  { id: 39, title: 'Image compression pipeline',      assignee: 'Bob',    status: 'todo',        priority: 'low',    dueDate: '2025-07-05', storyPoints: 3,  team: 'Platform',  sprint: 'Sprint 8', reporter: 'Eve',   estimate: '3h',  tags: 'images, perf' },
  { id: 40, title: 'Social login integration',        assignee: 'Carol',  status: 'todo',        priority: 'medium', dueDate: '2025-07-08', storyPoints: 5,  team: 'Backend',   sprint: 'Sprint 8', reporter: 'Grace', estimate: '5h',  tags: 'oauth, auth' },
  { id: 41, title: 'API versioning strategy',         assignee: 'Dan',    status: 'todo',        priority: 'medium', dueDate: '2025-07-12', storyPoints: 5,  team: 'Backend',   sprint: 'Sprint 9', reporter: 'Frank', estimate: '5h',  tags: 'api, versioning' },
  { id: 42, title: 'Content moderation queue',        assignee: 'Alice',  status: 'todo',        priority: 'high',   dueDate: '2025-07-15', storyPoints: 8,  team: 'Backend',   sprint: 'Sprint 9', reporter: 'Eve',   estimate: '8h',  tags: 'moderation, queue' },
  { id: 43, title: 'Geo-based content delivery',      assignee: 'Bob',    status: 'todo',        priority: 'low',    dueDate: '2025-07-18', storyPoints: 5,  team: 'Platform',  sprint: 'Sprint 9', reporter: 'Grace', estimate: '5h',  tags: 'cdn, geo' },
  { id: 44, title: 'GDPR compliance checklist',       assignee: 'Carol',  status: 'todo',        priority: 'high',   dueDate: '2025-07-20', storyPoints: 8,  team: 'QA',        sprint: 'Sprint 9', reporter: 'Frank', estimate: '8h',  tags: 'gdpr, compliance' },
  { id: 45, title: 'Security penetration testing',    assignee: 'Dan',    status: 'todo',        priority: 'high',   dueDate: '2025-07-25', storyPoints: 8,  team: 'QA',        sprint: 'Sprint 9', reporter: 'Eve',   estimate: '8h',  tags: 'security, pentest' },
  { id: 46, title: 'Load testing with k6',            assignee: 'Alice',  status: 'todo',        priority: 'medium', dueDate: '2025-08-01', storyPoints: 5,  team: 'QA',        sprint: 'Sprint 10', reporter: 'Grace', estimate: '5h', tags: 'load, k6' },
  { id: 47, title: 'Documentation site',              assignee: 'Bob',    status: 'todo',        priority: 'low',    dueDate: '2025-08-05', storyPoints: 5,  team: 'Frontend',  sprint: 'Sprint 10', reporter: 'Frank', estimate: '5h', tags: 'docs, site' },
  { id: 48, title: 'Storybook setup',                 assignee: 'Carol',  status: 'todo',        priority: 'low',    dueDate: '2025-08-08', storyPoints: 3,  team: 'Frontend',  sprint: 'Sprint 10', reporter: 'Eve',   estimate: '3h', tags: 'storybook, ui' },
  { id: 49, title: 'A/B testing framework',           assignee: 'Dan',    status: 'todo',        priority: 'low',    dueDate: '2025-08-12', storyPoints: 8,  team: 'Platform',  sprint: 'Sprint 10', reporter: 'Grace', estimate: '8h', tags: 'ab-test, analytics' },
  { id: 50, title: 'Post-launch retrospective',       assignee: 'Alice',  status: 'todo',        priority: 'low',    dueDate: '2025-08-15', storyPoints: 1,  team: 'All',       sprint: 'Sprint 10', reporter: 'Frank', estimate: '1h', tags: 'retro, planning' },
];

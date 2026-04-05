export interface Task {
  id: number;
  title: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  storyPoints: number;
}

export const TASKS: Task[] = [
  { id: 1,  title: 'Set up CI pipeline',             assignee: 'Alice',   status: 'done',        priority: 'high',   dueDate: '2025-02-10', storyPoints: 5 },
  { id: 2,  title: 'Design login screen',            assignee: 'Bob',     status: 'done',        priority: 'medium', dueDate: '2025-02-15', storyPoints: 3 },
  { id: 3,  title: 'Implement auth flow',            assignee: 'Alice',   status: 'done',        priority: 'high',   dueDate: '2025-02-20', storyPoints: 8 },
  { id: 4,  title: 'Write API specs',                assignee: 'Carol',   status: 'done',        priority: 'medium', dueDate: '2025-02-22', storyPoints: 3 },
  { id: 5,  title: 'Set up database schema',         assignee: 'Dan',     status: 'done',        priority: 'high',   dueDate: '2025-02-28', storyPoints: 5 },
  { id: 6,  title: 'Create user onboarding flow',    assignee: 'Bob',     status: 'in-progress', priority: 'high',   dueDate: '2025-03-05', storyPoints: 8 },
  { id: 7,  title: 'Integrate payment gateway',      assignee: 'Alice',   status: 'in-progress', priority: 'high',   dueDate: '2025-03-08', storyPoints: 13 },
  { id: 8,  title: 'Build notification service',     assignee: 'Carol',   status: 'in-progress', priority: 'medium', dueDate: '2025-03-10', storyPoints: 5 },
  { id: 9,  title: 'Dashboard charts',               assignee: 'Dan',     status: 'in-progress', priority: 'medium', dueDate: '2025-03-12', storyPoints: 5 },
  { id: 10, title: 'Mobile responsive layout',       assignee: 'Bob',     status: 'in-progress', priority: 'low',    dueDate: '2025-03-15', storyPoints: 3 },
  { id: 11, title: 'Export to CSV feature',          assignee: 'Alice',   status: 'todo',        priority: 'low',    dueDate: '2025-03-20', storyPoints: 3 },
  { id: 12, title: 'Dark mode support',              assignee: 'Carol',   status: 'todo',        priority: 'low',    dueDate: '2025-03-25', storyPoints: 5 },
  { id: 13, title: 'Accessibility audit',            assignee: 'Dan',     status: 'todo',        priority: 'high',   dueDate: '2025-03-28', storyPoints: 5 },
  { id: 14, title: 'Error boundary handling',        assignee: 'Alice',   status: 'todo',        priority: 'medium', dueDate: '2025-04-02', storyPoints: 3 },
  { id: 15, title: 'Unit tests for auth service',    assignee: 'Bob',     status: 'todo',        priority: 'high',   dueDate: '2025-04-05', storyPoints: 5 },
  { id: 16, title: 'E2E tests for checkout',         assignee: 'Carol',   status: 'todo',        priority: 'high',   dueDate: '2025-04-08', storyPoints: 8 },
  { id: 17, title: 'Performance profiling',          assignee: 'Dan',     status: 'todo',        priority: 'medium', dueDate: '2025-04-10', storyPoints: 5 },
  { id: 18, title: 'Caching layer implementation',   assignee: 'Alice',   status: 'todo',        priority: 'medium', dueDate: '2025-04-15', storyPoints: 8 },
  { id: 19, title: 'Logging and monitoring setup',   assignee: 'Bob',     status: 'todo',        priority: 'high',   dueDate: '2025-04-18', storyPoints: 5 },
  { id: 20, title: 'API rate limiting',              assignee: 'Carol',   status: 'todo',        priority: 'medium', dueDate: '2025-04-20', storyPoints: 3 },
  { id: 21, title: 'Webhook support',                assignee: 'Dan',     status: 'todo',        priority: 'low',    dueDate: '2025-04-25', storyPoints: 5 },
  { id: 22, title: 'Multi-language support',         assignee: 'Alice',   status: 'todo',        priority: 'low',    dueDate: '2025-05-01', storyPoints: 13 },
  { id: 23, title: 'User roles and permissions',     assignee: 'Bob',     status: 'todo',        priority: 'high',   dueDate: '2025-05-05', storyPoints: 8 },
  { id: 24, title: 'Two-factor authentication',      assignee: 'Carol',   status: 'todo',        priority: 'high',   dueDate: '2025-05-08', storyPoints: 8 },
  { id: 25, title: 'Data backup strategy',           assignee: 'Dan',     status: 'todo',        priority: 'medium', dueDate: '2025-05-10', storyPoints: 5 },
  { id: 26, title: 'Search feature',                 assignee: 'Alice',   status: 'todo',        priority: 'medium', dueDate: '2025-05-15', storyPoints: 8 },
  { id: 27, title: 'File upload component',          assignee: 'Bob',     status: 'todo',        priority: 'medium', dueDate: '2025-05-18', storyPoints: 5 },
  { id: 28, title: 'Real-time updates via WebSocket',assignee: 'Carol',   status: 'todo',        priority: 'low',    dueDate: '2025-05-20', storyPoints: 13 },
  { id: 29, title: 'Admin panel layout',             assignee: 'Dan',     status: 'todo',        priority: 'low',    dueDate: '2025-05-25', storyPoints: 5 },
  { id: 30, title: 'Report generation module',       assignee: 'Alice',   status: 'todo',        priority: 'medium', dueDate: '2025-06-01', storyPoints: 8 },
  { id: 31, title: 'Bulk import via CSV',            assignee: 'Bob',     status: 'todo',        priority: 'low',    dueDate: '2025-06-05', storyPoints: 5 },
  { id: 32, title: 'Audit trail logging',            assignee: 'Carol',   status: 'todo',        priority: 'medium', dueDate: '2025-06-08', storyPoints: 5 },
  { id: 33, title: 'Custom email templates',         assignee: 'Dan',     status: 'todo',        priority: 'low',    dueDate: '2025-06-12', storyPoints: 3 },
  { id: 34, title: 'Subscription billing module',    assignee: 'Alice',   status: 'todo',        priority: 'high',   dueDate: '2025-06-15', storyPoints: 13 },
  { id: 35, title: 'Coupon and discount system',     assignee: 'Bob',     status: 'todo',        priority: 'medium', dueDate: '2025-06-18', storyPoints: 8 },
  { id: 36, title: 'Analytics events tracking',      assignee: 'Carol',   status: 'todo',        priority: 'medium', dueDate: '2025-06-20', storyPoints: 5 },
  { id: 37, title: 'Lazy loading optimizations',     assignee: 'Dan',     status: 'todo',        priority: 'low',    dueDate: '2025-06-25', storyPoints: 3 },
  { id: 38, title: 'PWA support',                    assignee: 'Alice',   status: 'todo',        priority: 'low',    dueDate: '2025-07-01', storyPoints: 8 },
  { id: 39, title: 'Image compression pipeline',     assignee: 'Bob',     status: 'todo',        priority: 'low',    dueDate: '2025-07-05', storyPoints: 3 },
  { id: 40, title: 'Social login integration',       assignee: 'Carol',   status: 'todo',        priority: 'medium', dueDate: '2025-07-08', storyPoints: 5 },
  { id: 41, title: 'API versioning strategy',        assignee: 'Dan',     status: 'todo',        priority: 'medium', dueDate: '2025-07-12', storyPoints: 5 },
  { id: 42, title: 'Content moderation queue',       assignee: 'Alice',   status: 'todo',        priority: 'high',   dueDate: '2025-07-15', storyPoints: 8 },
  { id: 43, title: 'Geo-based content delivery',     assignee: 'Bob',     status: 'todo',        priority: 'low',    dueDate: '2025-07-18', storyPoints: 5 },
  { id: 44, title: 'GDPR compliance checklist',      assignee: 'Carol',   status: 'todo',        priority: 'high',   dueDate: '2025-07-20', storyPoints: 8 },
  { id: 45, title: 'Security penetration testing',   assignee: 'Dan',     status: 'todo',        priority: 'high',   dueDate: '2025-07-25', storyPoints: 8 },
  { id: 46, title: 'Load testing with k6',           assignee: 'Alice',   status: 'todo',        priority: 'medium', dueDate: '2025-08-01', storyPoints: 5 },
  { id: 47, title: 'Documentation site',             assignee: 'Bob',     status: 'todo',        priority: 'low',    dueDate: '2025-08-05', storyPoints: 5 },
  { id: 48, title: 'Storybook setup',                assignee: 'Carol',   status: 'todo',        priority: 'low',    dueDate: '2025-08-08', storyPoints: 3 },
  { id: 49, title: 'A/B testing framework',          assignee: 'Dan',     status: 'todo',        priority: 'low',    dueDate: '2025-08-12', storyPoints: 8 },
  { id: 50, title: 'Post-launch retrospective',      assignee: 'Alice',   status: 'todo',        priority: 'low',    dueDate: '2025-08-15', storyPoints: 1 },
];

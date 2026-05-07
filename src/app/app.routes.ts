import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'standard', pathMatch: 'full' },
  {
    path: 'standard',
    loadComponent: () =>
      import('./demo/demo-table-page.component').then(m => m.DemoTablePageComponent),
  },
  {
    path: 'rich-cells',
    loadComponent: () =>
      import('./demo/rich-cells-demo.component').then(m => m.RichCellsDemoComponent),
  },
];

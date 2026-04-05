import { Component } from '@angular/core';
import { DemoTablePageComponent } from './demo/demo-table-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DemoTablePageComponent],
  template: '<app-demo-table-page />',
})
export class App {}

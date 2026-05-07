import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .demo-nav {
      display: flex;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e0e0);
      flex-shrink: 0;
      padding: 0 24px;
      background: var(--mat-sys-surface, #fff);
    }

    .demo-nav a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant, #5f6368);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }

    .demo-nav a:hover {
      color: var(--mat-sys-on-surface, #202124);
    }

    .demo-nav a.active-link {
      color: var(--mat-sys-primary, #1a73e8);
      border-bottom-color: var(--mat-sys-primary, #1a73e8);
    }

    .page-host {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `],
  template: `
    <nav class="demo-nav">
      <a routerLink="/standard" routerLinkActive="active-link">Standard Demo</a>
      <a routerLink="/rich-cells" routerLinkActive="active-link">Rich Cells</a>
    </nav>
    <div class="page-host">
      <router-outlet />
    </div>
  `,
})
export class App {}

import {
  Directive,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { SimpleTableComponent } from './simple-table.component';
import { TableUserSettings } from './table.types';

const STORAGE_PREFIX = 'ngx-mat-st';

@Directive({
  selector: 'st-state-storing',
  standalone: true,
})
export class StStateStoringDirective<T> {
  private readonly _table = inject<SimpleTableComponent<T>>(SimpleTableComponent as any);

  /** Storage backend. 'local' uses localStorage; 'server' delegates to the host via settingsChange. */
  readonly mode = input<'local' | 'server'>('local');

  /**
   * Server mode only — host passes the loaded settings object.
   * The directive applies it on init and whenever the input changes.
   */
  readonly settings = input<TableUserSettings | undefined>(undefined);

  /** Emits the full settings snapshot whenever column order, visibility, or widths change. */
  readonly settingsChange = output<TableUserSettings>();

  private readonly _storageKey: string;

  /**
   * Gate that prevents the persistence effect from firing before the initial
   * settings have been applied (afterNextRender). Without this, the effect
   * would immediately write the un-restored defaults back to storage.
   */
  private _settingsApplied = false;

  constructor() {
    const tableId = this._table.tableId();
    if (!tableId) {
      throw new Error(
        '[ngx-mat-simple-table] StStateStoringDirective requires a tableId on the ' +
        'parent <simple-table>. Add tableId="your-unique-key" to the element.'
      );
    }
    this._storageKey = `${STORAGE_PREFIX}.${tableId}`;

    // Set up the persistence effect in the constructor (injection context).
    // The _settingsApplied gate prevents writes until afterNextRender has
    // applied the saved settings — avoids overwriting storage with defaults.
    effect(() => {
      const columnOrder   = [...this._table._columnOrder()];
      const hiddenColumns = [...this._table._hiddenColumns()];
      const columnWidths  = Object.fromEntries(this._table._columnWidths());

      if (!this._settingsApplied) return;

      const snapshot: TableUserSettings = { columnOrder, hiddenColumns, columnWidths };

      if (this.mode() === 'local') {
        this._saveToStorage(snapshot);
      } else {
        this.settingsChange.emit(snapshot);
      }
    });

    // Apply saved settings after first render so they land AFTER
    // SimpleTableComponent.ngAfterContentInit has set the default _columnOrder.
    afterNextRender(() => {
      if (this.mode() === 'local') {
        const saved = this._loadFromStorage();
        if (saved) this._table.applyUserSettings(saved);
      } else {
        const serverSettings = this.settings();
        if (serverSettings) this._table.applyUserSettings(serverSettings);
      }
      this._settingsApplied = true;
    });
  }

  private _loadFromStorage(): TableUserSettings | null {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as TableUserSettings;
    } catch {
      return null;
    }
  }

  private _saveToStorage(settings: TableUserSettings): void {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(settings));
    } catch {
      // localStorage unavailable (private browsing, SSR quota) — fail silently
    }
  }
}

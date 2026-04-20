import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ColumnDef, FilterType, Item, ItemParent } from '../table.types';

@Component({
  selector: 'column-filter',
  standalone: true,
  imports: [FormsModule, MatCheckboxModule, MatIconModule, MatButtonModule],
  templateUrl: './column-filter.component.html',
  styleUrl: './column-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnFilterComponent {
  readonly column = input.required<ColumnDef>();
  readonly filter = input<ItemParent | undefined>();

  readonly filterApplied = output<ItemParent>();
  readonly filterCleared = output<string>();

  readonly toggleButton = viewChild<ElementRef<HTMLElement>>('toggleButton');
  readonly filterMenu = viewChild<ElementRef<HTMLElement>>('filterMenu');

  readonly FilterType = FilterType;

  readonly isMenuOpen    = signal(false);
  readonly searchTerm    = signal('');
  readonly sortDirection = signal<'asc' | 'desc' | null>(null);
  readonly popupStyle    = signal({ top: '0px', left: '0px' });

  // date range pending state
  readonly _pendingDateStart = signal<string>('');
  readonly _pendingDateEnd   = signal<string>('');

  private readonly _pendingKeys = signal<ReadonlySet<number | string>>(new Set());

  readonly filteredItems = computed((): Item[] => {
    const filter = this.filter();
    if (!filter?.children) return [];
    const term = this.searchTerm().toLowerCase();
    const dir = this.sortDirection();
    let items = term
      ? filter.children.filter((i) => i.value.toLowerCase().includes(term))
      : [...filter.children];
    if (dir === 'asc') items = [...items].sort((a, b) => a.value.localeCompare(b.value));
    if (dir === 'desc') items = [...items].sort((a, b) => b.value.localeCompare(a.value));
    return items;
  });

  readonly isFilterActive = computed(() => (this.filter()?.selectedKeys?.length ?? 0) > 0);

  readonly isDateRangeFilterActive = computed(() => {
    const keys = this.filter()?.selectedKeys ?? [];
    return keys.length > 0 && keys.some(k => !!k);
  });

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!this.isMenuOpen()) return;
    const el = target as Node | null;
    const clickedToggle = this.toggleButton()?.nativeElement?.contains(el);
    const clickedMenu = this.filterMenu()?.nativeElement?.contains(el);
    if (!clickedToggle && !clickedMenu) {
      this.isMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMenuOpen()) this.isMenuOpen.set(false);
  }

  toggleMenu(): void {
    if (!this.isMenuOpen()) {
      const existing = this.filter()?.selectedKeys ?? [];
      if (this.column().filterType === FilterType.DateRange) {
        this._pendingDateStart.set(existing[0] ? String(existing[0]) : '');
        this._pendingDateEnd.set(existing[1]   ? String(existing[1]) : '');
      } else {
        this._pendingKeys.set(new Set(existing));
      }
      const rect = this.toggleButton()!.nativeElement.getBoundingClientRect();
      this.popupStyle.set({ top: `${rect.bottom + 4}px`, left: `${rect.left}px` });
    }
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  isSelected(id: number | string): boolean {
    return this._pendingKeys().has(id);
  }

  toggleItem(id: number | string): void {
    const next = new Set(this._pendingKeys());
    next.has(id) ? next.delete(id) : next.add(id);
    this._pendingKeys.set(next);
  }

  selectAll(): void {
    this._pendingKeys.set(new Set(this.filter()?.children?.map((i) => i.id)));
  }

  clearSelections(): void {
    this._pendingKeys.set(new Set());
  }

  setSortDirection(dir: 'asc' | 'desc'): void {
    this.sortDirection.set(this.sortDirection() === dir ? null : dir);
  }

  applyFilter(): void {
    const f = this.filter();
    if (this.column().filterType === FilterType.DateRange) {
      const start = this._pendingDateStart();
      const end   = this._pendingDateEnd();
      this.filterApplied.emit({
        id: this.column().key,
        selectedKeys: [start, end].filter(v => !!v),
      });
    } else {
      if (!f) return;
      this.filterApplied.emit({ ...f, selectedKeys: [...this._pendingKeys()] });
    }
    this.isMenuOpen.set(false);
  }

  clearFilter(): void {
    this._pendingKeys.set(new Set());
    this._pendingDateStart.set('');
    this._pendingDateEnd.set('');
    this.filterCleared.emit(this.column().key);
    this.isMenuOpen.set(false);
  }
}

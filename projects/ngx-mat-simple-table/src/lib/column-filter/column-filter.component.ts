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

  readonly isMenuOpen = signal(false);
  readonly searchTerm = signal('');
  readonly sortDirection = signal<'asc' | 'desc' | null>(null);
  readonly popupStyle = signal({ top: '0px', left: '0px' });

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
      this._pendingKeys.set(new Set(this.filter()?.selectedKeys ?? []));
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
    if (!f) return;
    this.filterApplied.emit({ ...f, selectedKeys: [...this._pendingKeys()] });
    this.isMenuOpen.set(false);
  }

  clearFilter(): void {
    this._pendingKeys.set(new Set());
    this.filterCleared.emit(this.column().key);
    this.isMenuOpen.set(false);
  }
}

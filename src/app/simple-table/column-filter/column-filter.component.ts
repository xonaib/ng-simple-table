import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
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
  private readonly _cdr = inject(ChangeDetectorRef);

  @ViewChild('toggleButton') toggleButton!: ElementRef<HTMLElement>;
  @ViewChild('filterMenu') filterMenu!: ElementRef<HTMLElement>;

  @Input() column!: ColumnDef;

  @Input()
  get filter(): ItemParent | undefined { return this._filter; }
  set filter(value: ItemParent | undefined) {
    if (value != null && value !== this._filter) {
      this._filter = value;
    }
  }
  private _filter: ItemParent | undefined;

  @Output() readonly filterApplied = new EventEmitter<ItemParent>();
  @Output() readonly filterCleared = new EventEmitter<string>();

  readonly FilterType = FilterType;

  isMenuOpen = false;
  searchTerm = '';
  sortDirection: 'asc' | 'desc' | null = null;
  popupStyle: { top: string; left: string } = { top: '0', left: '0' };

  // local working copy of selectedKeys while the menu is open
  private _pendingKeys = new Set<number | string>();

  get filteredItems(): Item[] {
    if (!this._filter?.children) return [];
    const term = this.searchTerm.toLowerCase();
    let items = term
      ? this._filter.children.filter(i => i.value.toLowerCase().includes(term))
      : [...this._filter.children];
    if (this.sortDirection === 'asc') items = [...items].sort((a, b) => a.value.localeCompare(b.value));
    if (this.sortDirection === 'desc') items = [...items].sort((a, b) => b.value.localeCompare(a.value));
    return items;
  }

  get isFilterActive(): boolean {
    return (this._filter?.selectedKeys?.length ?? 0) > 0;
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!this.isMenuOpen) return;
    const el = target as Node | null;
    const clickedToggle = this.toggleButton?.nativeElement?.contains(el);
    const clickedMenu = this.filterMenu?.nativeElement?.contains(el);
    if (!clickedToggle && !clickedMenu) {
      this.isMenuOpen = false;
      this._cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this._cdr.markForCheck();
  }

  toggleMenu(): void {
    if (!this.isMenuOpen) {
      // copy current applied selection into working set
      this._pendingKeys = new Set(this._filter?.selectedKeys ?? []);
      // position the popup relative to the viewport so it escapes table cell overflow
      const rect = this.toggleButton.nativeElement.getBoundingClientRect();
      this.popupStyle = {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
      };
    }
    this.isMenuOpen = !this.isMenuOpen;
  }

  isSelected(id: number | string): boolean {
    return this._pendingKeys.has(id);
  }

  toggleItem(id: number | string): void {
    if (this._pendingKeys.has(id)) {
      this._pendingKeys.delete(id);
    } else {
      this._pendingKeys.add(id);
    }
  }

  selectAll(): void {
    this._filter?.children?.forEach(i => this._pendingKeys.add(i.id));
  }

  clearSelections(): void {
    this._pendingKeys.clear();
  }

  setSortDirection(dir: 'asc' | 'desc'): void {
    this.sortDirection = this.sortDirection === dir ? null : dir;
  }

  applyFilter(): void {
    if (!this._filter) return;
    const applied: ItemParent = { ...this._filter, selectedKeys: [...this._pendingKeys] };
    this.filterApplied.emit(applied);
    this.isMenuOpen = false;
  }

  clearFilter(): void {
    this._pendingKeys.clear();
    this.filterCleared.emit(this.column.columnDef);
    this.isMenuOpen = false;
  }
}

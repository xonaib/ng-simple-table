# I got tired of rebuilding the same Angular table every project, so I made a library

Every Angular project I've worked on has a table. Usually more than one. And every single time, I end up writing the same boilerplate — `MatTableDataSource`, paginator, sort, filter inputs, loading state, column definitions... it's a lot of setup for something that should be straightforward.

After doing it the fourth time, I decided to just extract it into a library.

It's called **ngx-mat-simple-table**. It wraps Angular Material's `mat-table` in a clean, declarative API so you get sorting, filtering, pagination, multi-select, and more — without writing a wall of template code every time.

---

## The problem with mat-table

Angular Material's table is actually pretty powerful. But it's also very low-level. You define every column manually, wire up your own paginator, create your own filter logic, manage selection state yourself... and most of the time you're just doing the same thing you did in the last project.

Here's roughly what a "basic" table with sorting, pagination, and a search filter looks like out of the box:

```html
<mat-form-field>
  <input matInput (keyup)="applyFilter($event)" placeholder="Search" />
</mat-form-field>

<table mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
  </ng-container>
  <!-- ...repeat for every column... -->
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>

<mat-paginator [pageSizeOptions]="[10, 25, 50]"></mat-paginator>
```

And that's before you add selection, column-level filters, sticky headers, or a loading indicator. It compounds fast.

---

## What simple-table looks like instead

With `ngx-mat-simple-table`, the same table is:

```html
<simple-table
  [dataSource]="tasks"
  [tableColumns]="columns"
  [tableConfig]="config"
>
</simple-table>
```

You define your columns once in the component:

```typescript
columns: ColumnDef[] = [
  { key: 'id',     label: 'ID',     sortable: true },
  { key: 'title',  label: 'Title',  sortable: true, filterable: true },
  { key: 'status', label: 'Status', sortable: true, filterable: true },
  { key: 'priority', label: 'Priority', cellClass: (row) => `priority-${row.priority}` },
];

config: TableConfig = {
  selectable: true,
  pagination: { pageSizeOptions: [10, 25, 50], defaultPageSize: 25 },
};
```

That's it. Sorting, per-column dropdown filters, pagination, and row selection are all wired up automatically.

---

## Custom cells when you need them

The declarative API covers most cases, but sometimes you need custom rendering — a link, a badge, a formatted date. You can drop in a template for any column without losing the auto-generated header (so `mat-sort-header` still works):

```html
<simple-table [dataSource]="tasks" [tableColumns]="columns" [tableConfig]="config">
  <ng-template cellDef="title" let-row>
    <a [routerLink]="['/tasks', row.id]">{{ row.title }}</a>
  </ng-template>
</simple-table>
```

Everything else stays automatic. You only opt in to custom rendering where you actually need it.

---

## Server-side mode

For larger datasets you'll want server-side pagination, sorting, and filtering. The component handles that too — you just provide an observable as the data source and wire up the events:

```typescript
(page)="onPage($event)"
(sortChange)="onSort($event)"
(filterChange)="onFilter($event)"
```

Each event gives you the current state, so you can build your API params and feed the response back in. The component tracks `isLoading` so you can show a progress bar in the meantime.

---

## The theming story

This is the part I'm actually most happy with.

Angular Material 3 uses CSS custom properties (system tokens like `--mat-sys-primary`) for everything. `simple-table` builds on top of that — all the visual properties are exposed as CSS variables you can override per-instance or globally:

```css
simple-table {
  --st-row-bg: #f8fafc;
  --st-row-hover-bg: #e2e8f0;
  --st-header-bg: #1e293b;
  --st-header-color: #f1f5f9;
  --st-border-color: #cbd5e1;
  --st-selected-row-bg: #dbeafe;
}
```

There are about 22 tokens in total — row backgrounds, hover states, selection colours, header, border, sticky column background, cell colour. If you don't set any of them, they fall back to the Material 3 system tokens so they work with whatever theme you're already using.

Dark mode works automatically if you set `color-scheme: dark` on the body. The Material tokens switch, and any `light-dark()` values in your custom cell styles adapt with them. No JavaScript needed for the colour switching — just CSS.

Here's what the demo looks like in dark mode with some colour-coded status cells:

*(screenshot of the table in dark mode with status badges and sticky checkbox column)*

---

## Other bits worth mentioning

- **Column reordering** — drag and drop headers to rearrange columns. CDK-powered.
- **Column resizing** — drag the right edge of any header to resize.
- **State persistence** — drop in `<st-state-storing />` and the component saves column order, widths, and active filters to `localStorage` automatically.
- **Export to Excel** — `<st-export [allDataProvider]="getAllRows" />` adds an export button. Uses `exceljs` (optional peer dep).
- **Sticky headers and columns** — `[stickyHeaders]="true"` and `sticky: true` on a column def.
- **Client-side mode** — pass a plain array and the component handles sort/filter/page internally with `MatTableDataSource`.

---

## Installing it

```bash
npm install ngx-mat-simple-table
```

Peer deps are Angular 21+ and Angular Material 21+. `exceljs` is optional — only needed if you use the export feature.

Then import `SimpleTableComponent` and the directives you need:

```typescript
import { SimpleTableComponent, CellDefDirective, StStateStoringComponent } from 'ngx-mat-simple-table';
```

---

## Where to find it

- **npm**: [npmjs.com/package/ngx-mat-simple-table](https://www.npmjs.com/package/ngx-mat-simple-table)
- **Live demo**: [ng-simple-table.vercel.app](https://ng-simple-table.vercel.app)
- **GitHub**: [github.com/xonaib/ng-simple-table](https://github.com/xonaib/ng-simple-table)

The demo shows both client-side and server-side modes — you can toggle between them and see the filtering and pagination behaviour. The "server-side" mode is all intercepted in the browser with a fake 300ms delay, so no backend required to try it.

---

Feedback and issues welcome on GitHub. I built this to solve my own problem, but if it saves you some boilerplate too, that's the whole point.

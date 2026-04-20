import { Injectable } from '@angular/core';
import { ColumnDef } from './table.types';

/**
 * Handles XLSX and CSV export for SimpleTableComponent.
 * Extracted into a service to keep the component lean — import is tree-shaken
 * when the host never drops <st-export> into the template.
 */
@Injectable({ providedIn: 'root' })
export class SimpleTableExportService {

  /**
   * Triggers an XLSX download. Reads header cell styles from the host element so
   * the exported header row matches the rendered grid header.
   * Returns a Promise that resolves when the download is triggered, or rejects if
   * ExcelJS is not installed (caller should fall back to exportCsv).
   */
  exportXlsx(
    cols:     ColumnDef[],
    rows:     unknown[],
    filename: string,
    hostEl:   HTMLElement,
  ): Promise<void> {
    return import('exceljs').then(m => {
      const wb = new m.Workbook();
      const ws = wb.addWorksheet('Export');

      // ---- header row with styles from the rendered table ----
      const headerStyle = this._readHeaderStyle(hostEl);
      const headerRow   = ws.addRow(cols.map(c => c.label ?? c.key));
      headerRow.eachCell(cell => {
        cell.font   = headerStyle.font   as import('exceljs').Font;
        cell.fill   = headerStyle.fill;
        cell.border = headerStyle.border as import('exceljs').Borders;
      });

      // ---- data rows ----
      const pad = (n: number) => String(n).padStart(2, '0');
      for (const row of rows) {
        const values = cols.map(c => {
          const raw = (row as Record<string, unknown>)[c.key];
          if (c.exportValue)  return c.exportValue(raw, row);
          if (c.displayValue) return c.displayValue(raw, row);
          const v = this._getCellValue(raw);
          if (v instanceof Date && !isNaN(v.getTime())) {
            return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
          }
          return v;
        });
        ws.addRow(values);
      }

      // ---- download ----
      return wb.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${filename}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  /** Triggers a CSV download synchronously. */
  exportCsv(cols: ColumnDef[], rows: unknown[], filename: string): void {
    const formatValue = (v: unknown): string => {
      const resolved = this._getCellValue(v);
      if (resolved instanceof Date) return resolved.toLocaleDateString();
      return String(resolved ?? '');
    };
    const escape = (v: unknown): string => {
      const s = formatValue(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = cols.map(c => escape(c.label ?? c.key)).join(',');
    const body   = rows.map(row =>
      cols.map(c => {
        const raw = (row as Record<string, unknown>)[c.key];
        const val = c.exportValue  ? c.exportValue(raw, row)
                  : c.displayValue ? c.displayValue(raw, row)
                  : raw;
        return escape(val);
      }).join(',')
    );

    const csv  = [header, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- private helpers ----

  private _getCellValue(v: unknown): unknown {
    if (v == null) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof v === 'number' && v > 1_000_000_000_000) return new Date(v);
    return v;
  }

  private _readHeaderStyle(hostEl: HTMLElement): {
    font:   Partial<import('exceljs').Font>;
    fill:   import('exceljs').Fill;
    border: Partial<import('exceljs').Borders>;
  } {
    const fallbackArgb = 'FFEEEEEE';
    const fallbackFg   = 'FF333333';
    const thinBorder: Partial<import('exceljs').Borders> = {
      bottom: { style: 'thin' as import('exceljs').BorderStyle, color: { argb: 'FFCCCCCC' } },
    };
    const fallback = {
      font:   { bold: true, color: { argb: fallbackFg } },
      fill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: fallbackArgb } } as import('exceljs').Fill,
      border: thinBorder,
    };

    try {
      const el = hostEl.querySelector('th.mat-mdc-header-cell') as HTMLElement | null;
      if (!el) return fallback;

      const cs   = window.getComputedStyle(el);
      const bg   = this._cssColorToArgb(cs.backgroundColor);
      const fg   = this._cssColorToArgb(cs.color);
      const bold = parseInt(cs.fontWeight || '400') >= 600;

      return {
        font:   { bold, color: { argb: fg ?? fallbackFg } },
        fill:   bg
                  ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
                  : fallback.fill,
        border: thinBorder,
      };
    } catch {
      return fallback;
    }
  }

  private _cssColorToArgb(css: string): string | undefined {
    const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return undefined;
    const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (alpha === 0) return undefined;
    const aa  = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    const rgb = [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('').toUpperCase();
    return rgb === 'FFFFFF' ? undefined : `${aa}${rgb}`;
  }
}

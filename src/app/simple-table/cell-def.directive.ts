import { Directive, TemplateRef, inject, input } from '@angular/core';

/** marks an ng-template as a custom cell template for a given column */
@Directive({
  selector: '[cellDef]',
  standalone: true,
})
export class CellDefDirective {
  readonly columnDef = input.required<string>({ alias: 'cellDef' });
  readonly template = inject(TemplateRef<{ $implicit: unknown }>);
}

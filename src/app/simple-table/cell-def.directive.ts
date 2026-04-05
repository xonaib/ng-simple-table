import { Directive, Input, TemplateRef } from '@angular/core';

/** marks an ng-template as a custom cell template for a given column */
@Directive({
  selector: '[cellDef]',
  standalone: true,
})
export class CellDefDirective {
  @Input('cellDef') columnDef!: string;
  constructor(public readonly template: TemplateRef<{ $implicit: unknown }>) {}
}

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatSimpleTable } from './ngx-mat-simple-table';

describe('NgxMatSimpleTable', () => {
  let component: NgxMatSimpleTable;
  let fixture: ComponentFixture<NgxMatSimpleTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxMatSimpleTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxMatSimpleTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

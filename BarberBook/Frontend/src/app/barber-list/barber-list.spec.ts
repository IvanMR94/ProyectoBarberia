import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarberList } from './barber-list';

describe('BarberList', () => {
  let component: BarberList;
  let fixture: ComponentFixture<BarberList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberList],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

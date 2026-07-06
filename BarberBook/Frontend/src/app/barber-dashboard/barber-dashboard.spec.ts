import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarberDashboard } from './barber-dashboard';

describe('BarberDashboard', () => {
  let component: BarberDashboard;
  let fixture: ComponentFixture<BarberDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

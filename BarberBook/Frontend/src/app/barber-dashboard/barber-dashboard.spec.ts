import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BarberDashboardComponent } from './barber-dashboard';

describe('BarberDashboardComponent', () => {
  let component: BarberDashboardComponent;
  let fixture: ComponentFixture<BarberDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberDashboardComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

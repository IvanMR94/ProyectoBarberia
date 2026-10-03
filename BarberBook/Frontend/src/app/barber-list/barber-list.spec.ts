import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BarberListComponent } from './barber-list';

describe('BarberListComponent', () => {
  let component: BarberListComponent;
  let fixture: ComponentFixture<BarberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberListComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

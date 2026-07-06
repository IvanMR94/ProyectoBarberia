from django.urls import path
from . import views

urlpatterns = [
    path('barbers/', views.BarberoListView.as_view(), name='barber-list'),
    path('barbers/<int:barbero_id>/availability/', views.DisponibilidadBarberoView.as_view(), name='barbero-availability'),
    path('appointments/', views.CitaCreateView.as_view(), name='cita-create'),
    path('my-appointments/', views.MisCitasListView.as_view(), name='mis-citas'),
    path('appointments/<int:pk>/', views.CitaManageView.as_view(), name='cita-manage'),
    path('barber-dashboard/', views.BarberDashboardView.as_view(), name='barber-dashboard'),
    path('barber-appointments/<int:pk>/', views.BarberCitaUpdateView.as_view(), name='barber-cita-update'),
]
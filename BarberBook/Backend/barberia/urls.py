from django.urls import path
from .views import BarberoListView, DisponibilidadBarberoView, CitaCreateView, CitaUpdateView, MisCitasListView

urlpatterns = [
    path('barbers/', BarberoListView.as_view(), name='barber-list'),
    path('barbers/<int:barbero_id>/availability/', DisponibilidadBarberoView.as_view(), name='barbero-availability'),
    path('appointments/', CitaCreateView.as_view(), name='cita-create'),
    path('appointments/<int:pk>/', CitaUpdateView.as_view(), name='cita-update'),
    path('my-appointments/', MisCitasListView.as_view(), name='mis-citas'),
]
from django.urls import path
from .views import DisponibilidadBarberoView, CitaCreateView, CitaUpdateView

urlpatterns = [
    path('barbers/<int:barbero_id>/availability/', DisponibilidadBarberoView.as_view(), name='disponibilidad-barbero'),
    path('appointments/', CitaCreateView.as_view(), name='crear-cita'),
    # Ruta para actualizar estados 
    path('appointments/<int:pk>/', CitaUpdateView.as_view(), name='actualizar-cita'),
]
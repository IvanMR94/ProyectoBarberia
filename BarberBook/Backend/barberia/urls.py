from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # --- Auth ---
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- Barberos y Disponibilidad ---
    path('barbers/', views.BarberoListView.as_view(), name='barber-list'),
    path('barbers/<int:barbero_id>/availability/', views.DisponibilidadBarberoView.as_view(), name='barbero-availability'),
    
    # --- Citas Cliente ---
    path('appointments/', views.CitaCreateView.as_view(), name='cita-create'),
    path('my-appointments/', views.MisCitasListView.as_view(), name='mis-citas'),
    path('appointments/<int:pk>/', views.CitaManageView.as_view(), name='cita-manage'),
    
    # --- Dashboard Barbero ---
    path('barber-dashboard/', views.BarberDashboardView.as_view(), name='barber-dashboard'),
    path('barber-appointments/<int:pk>/', views.BarberCitaUpdateView.as_view(), name='barber-cita-update'),
]
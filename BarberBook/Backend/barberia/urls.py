from django.urls import path
from . import views
from . import views_dueno
from users.views import TokenRefreshConRevocacionView

urlpatterns = [
    # --- Auth ---
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Refresh con verificación de revocación: rechaza tokens antiguos a un
    # cambio de contraseña (cierra las sesiones abiertas en el servidor).
    path('auth/refresh/', TokenRefreshConRevocacionView.as_view(), name='token_refresh'),
    
    # --- Barberos y Disponibilidad ---
    path('barbers/', views.BarberoListView.as_view(), name='barber-list'),
    path('barbers/<int:barbero_id>/availability/', views.DisponibilidadBarberoView.as_view(), name='barbero-availability'),
    
    # --- Citas Cliente ---
    path('appointments/', views.CitaCreateView.as_view(), name='cita-create'),
    path('my-appointments/', views.MisCitasListView.as_view(), name='mis-citas'),
    path('my-loyalty/', views.MiLealtadView.as_view(), name='mi-lealtad'),
    path('appointments/<int:pk>/', views.CitaManageView.as_view(), name='cita-manage'),
    
    # --- Dashboard Barbero ---
    path('barber-dashboard/', views.BarberDashboardView.as_view(), name='barber-dashboard'),
    path('barber-appointments/<int:pk>/', views.BarberCitaUpdateView.as_view(), name='barber-cita-update'),

    # --- Panel del Dueño ---
    path('owner/stats/', views_dueno.OwnerStatsView.as_view()),
    path('owner/barbers/', views_dueno.OwnerBarberosView.as_view()),
    path('owner/barbers/<int:pk>/', views_dueno.OwnerBarberoDetailView.as_view()),
    path('owner/barbers/<int:pk>/recontratar/',
         views_dueno.OwnerBarberoRecontratarView.as_view()),
    path('owner/clients/', views_dueno.OwnerClientesView.as_view()),
    path('owner/appointments/', views_dueno.OwnerCitasView.as_view()),
    path('owner/services/', views_dueno.OwnerServiciosView.as_view()),
    path('owner/services/<int:pk>/', views_dueno.OwnerServicioDetailView.as_view()),
]
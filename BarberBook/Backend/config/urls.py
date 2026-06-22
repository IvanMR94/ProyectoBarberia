from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rutas de usuarios (registro, perfil, etc.)
    path('api/v1/auth/', include('users.urls')),
    
    # Rutas de autenticación JWT (Login y Refresh)
    path('api/v1/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Rutas de tu app de barbería
    path('api/v1/', include('barberia.urls')),
]
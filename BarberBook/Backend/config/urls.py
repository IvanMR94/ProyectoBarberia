from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rutas de usuarios (registro, perfil, etc.)
    path('api/v1/auth/', include('users.urls')),

    # Rutas de tu app de barbería (incluye login/refresh JWT)
    path('api/v1/', include('barberia.urls')),
]

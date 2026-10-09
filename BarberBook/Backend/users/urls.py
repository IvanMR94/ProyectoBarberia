from django.urls import path
from .views import (
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetValidateView,
    RegisterView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('password-reset/',
         PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('password-reset/validate/',
         PasswordResetValidateView.as_view(),
         name='auth_password_reset_validate'),
    path('password-reset/confirm/',
         PasswordResetConfirmView.as_view(),
         name='auth_password_reset_confirm'),
]

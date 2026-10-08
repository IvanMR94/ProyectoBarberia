from rest_framework.permissions import BasePermission

from users.roles import ROL_DUENO, ROL_SUPER_ADMIN


class EsDueno(BasePermission):
    """Acceso al panel de gestión: dueños de la barbería y super admins."""

    message = 'Se requiere acceso de dueño.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.rol in (ROL_DUENO, ROL_SUPER_ADMIN)
        )

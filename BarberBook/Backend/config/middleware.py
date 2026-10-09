"""Registra en el log de seguridad las respuestas 401/403/429 de la API."""
from config.audit import registrar_evento

ESTADOS = {
    401: 'NO_AUTENTICADO',
    403: 'PERMISO_DENEGADO',
    429: 'THROTTLE_ACTIVO',
}


class RegistroAccesosDenegadosMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        accion = ESTADOS.get(response.status_code)
        if accion and request.path.startswith('/api/'):
            user = getattr(request, 'user', None)
            usuario = (
                user.username
                if user is not None and user.is_authenticated
                else 'anonimo'
            )
            registrar_evento(
                'ACCESO_DENEGADO', accion, request=request, usuario=usuario)
        return response

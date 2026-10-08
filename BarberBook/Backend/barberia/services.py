from django.conf import settings
from django.utils import timezone

from .models import Barbero, Cita, Servicio


def get_disponibilidad_barbero(barbero_id, fecha):
    ahora = timezone.localtime()
    hoy = ahora.date()

    # 1. No se puede consultar un día pasado
    if fecha < hoy:
        return []

    # 2. Rango laboral (configurado en settings)
    hora_inicio = settings.BARBERIA_HORA_INICIO
    hora_fin = settings.BARBERIA_HORA_FIN

    # 3. Obtener citas ocupadas filtrando por barbero Y FECHA EXACTA
    citas_ocupadas = Cita.objects.filter(
        barbero_id=barbero_id,
        fecha_hora_inicio__date=fecha
    ).exclude(estado='CANCELADA').values_list('fecha_hora_inicio__hour', flat=True)

    citas_ocupadas = list(citas_ocupadas)

    # 4. Generar bloques disponibles
    disponibles = []
    for hora in range(hora_inicio, hora_fin):
        # En el día de hoy no se ofrecen horas ya pasadas (ni la actual)
        if fecha == hoy and hora <= ahora.hour:
            continue
        if hora not in citas_ocupadas:
            disponibles.append(f"{hora:02d}:00")

    return disponibles


def crear_usuario_barbero(*, email, password, nombre, apellido):
    """Crea la cuenta de acceso de un barbero (misma convención que el registro:
    username = email, rol BARBERO)."""
    from django.contrib.auth import get_user_model
    from users.roles import ROL_BARBERO

    User = get_user_model()
    return User.objects.create_user(
        username=email,
        email=email,
        password=password,
        nombre=nombre,
        apellido=apellido,
        rol=ROL_BARBERO,
    )


def crear_barbero(*, nombre, apellido, email, password, servicios=()):
    """Alta completa: cuenta de usuario + perfil de barbero + servicios."""
    usuario = crear_usuario_barbero(
        email=email, password=password, nombre=nombre, apellido=apellido)
    barbero = Barbero.objects.create(
        usuario=usuario, nombre=nombre, apellido=apellido)
    if servicios:
        barbero.servicios.set(servicios)
    return barbero

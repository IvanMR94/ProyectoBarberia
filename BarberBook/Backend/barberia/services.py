from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Barbero, Cita, Servicio


def nivel_y_descuento(visitas_historicas, visitas_30d):
    """Regla pura de lealtad: devuelve (pct, nivel).

    Piso de visitas históricas para acceder a cualquier descuento;
    después mide frecuencia en los últimos 30 días. Nunca se acumulan.
    """
    if visitas_historicas < settings.LEALTAD_VISITAS_MINIMAS:
        return 0, None
    if visitas_30d >= settings.LEALTAD_UMBRAL_PREFERENCIAL:
        return settings.LEALTAD_DESCUENTO_PREFERENCIAL_PCT, 'Preferencial'
    if visitas_30d >= settings.LEALTAD_UMBRAL_FRECUENTE:
        return settings.LEALTAD_DESCUENTO_FRECUENTE_PCT, 'Frecuente'
    return 0, None


def calcular_descuento_lealtad(cliente):
    """Cuenta las visitas del cliente y devuelve (pct, nivel)."""
    historicas = Cita.objects.filter(
        cliente=cliente, estado=Cita.ESTADO_COMPLETADA).count()
    desde = timezone.now() - timedelta(days=30)
    ultimas = Cita.objects.filter(
        cliente=cliente,
        estado=Cita.ESTADO_COMPLETADA,
        fecha_hora_inicio__gte=desde,
    ).count()
    return nivel_y_descuento(historicas, ultimas)


def datos_lealtad(cliente):
    """Payload completo de lealtad para el cliente."""
    historicas = Cita.objects.filter(
        cliente=cliente, estado=Cita.ESTADO_COMPLETADA).count()
    desde = timezone.now() - timedelta(days=30)
    ultimas = Cita.objects.filter(
        cliente=cliente,
        estado=Cita.ESTADO_COMPLETADA,
        fecha_hora_inicio__gte=desde,
    ).count()
    pct, nivel = nivel_y_descuento(historicas, ultimas)
    minimo = settings.LEALTAD_VISITAS_MINIMAS
    return {
        'sellos': historicas,
        'visitas_30d': ultimas,
        'nivel': nivel,
        'descuento_pct': pct,
        'desbloqueado': historicas >= minimo,
        'visitas_minimas': minimo,
        'faltan_para_desbloquear': max(0, minimo - historicas),
        'umbral_frecuente': settings.LEALTAD_UMBRAL_FRECUENTE,
        'umbral_preferencial': settings.LEALTAD_UMBRAL_PREFERENCIAL,
    }


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

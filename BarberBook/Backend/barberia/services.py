from django.utils import timezone
from .models import Cita

def get_disponibilidad_barbero(barbero_id, fecha):
    ahora = timezone.localtime()
    hoy = ahora.date()

    # 1. No se puede consultar un día pasado
    if fecha < hoy:
        return []

    # 2. Definir rango laboral
    hora_inicio = 9
    hora_fin = 21

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

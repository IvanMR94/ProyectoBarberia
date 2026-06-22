from datetime import datetime, timedelta, date
from django.core.exceptions import ValidationError
from django.utils import timezone  # Necesario para manejar zonas horarias
from .models import Cita

def get_disponibilidad_barbero(barbero_id, fecha):
    """
    Motor de cálculo de disponibilidad:
    Calcula bloques disponibles restando citas ocupadas.
    """

    # 1. Validar fecha
    if fecha < date.today():
        raise ValidationError("No puedes consultar disponibilidad en fechas pasadas.")
    
    # 2. Definir rango laboral
    inicio_laboral = datetime.combine(fecha, datetime.strptime("09:00", "%H:%M").time())
    fin_laboral = datetime.combine(fecha, datetime.strptime("21:00", "%H:%M").time())

    # 3. Obtener citas ocupadas y convertirlas a 'naive' (sin zona horaria) para comparar
    citas_raw = Cita.objects.filter(
        barbero_id=barbero_id,
        fecha_hora_inicio__date=fecha
    ).exclude(estado='CANCELADA').values_list('fecha_hora_inicio', flat=True)
    
    # Normalizamos las citas de la BD a naive quitando la zona horaria
    citas_ocupadas = [c.replace(tzinfo=None) for c in citas_raw]
    
    # 4. Lógica de cálculo
    disponibles = []
    bloque_actual = inicio_laboral
    
    while bloque_actual < fin_laboral:
        # Ahora ambos están en el mismo formato naive
        if bloque_actual not in citas_ocupadas:
            disponibles.append(bloque_actual.strftime("%H:%M"))
        bloque_actual += timedelta(hours=1)
        
    return disponibles
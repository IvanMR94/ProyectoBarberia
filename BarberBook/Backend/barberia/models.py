from django.db import models
from django.conf import settings
from django.utils import timezone

class Barbero(models.Model):
    nombre = models.CharField(max_length=100)
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.nombre

class Cita(models.Model):
    # Definición de estados para el ciclo de vida de la reserva
    ESTADO_PENDIENTE = 'PENDIENTE'
    ESTADO_CONFIRMADA = 'CONFIRMADA'
    ESTADO_COMPLETADA = 'COMPLETADA'
    ESTADO_CANCELADA = 'CANCELADA'
    
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_CONFIRMADA, 'Confirmada'),
        (ESTADO_COMPLETADA, 'Completada'),
        (ESTADO_CANCELADA, 'Cancelada'),
    ]

    barbero = models.ForeignKey(Barbero, on_delete=models.CASCADE, related_name='citas')
    cliente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    fecha_hora_inicio = models.DateTimeField()
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default=ESTADO_PENDIENTE
    )
    fecha_creacion = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['barbero', 'fecha_hora_inicio'], 
                name='unique_barbero_citas'
            )
        ]

    def __str__(self):
        return f"{self.barbero.nombre} - {self.fecha_hora_inicio} ({self.estado})"
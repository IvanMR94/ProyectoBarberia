from django.db import models
from django.conf import settings
from django.utils import timezone

class Barbero(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, default='')
    # Relación OneToOne correcta con el modelo de usuario de Django
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='perfil_barbero')

    def __str__(self):
        return self.nombre

class Cita(models.Model):
    ESTADO_PENDIENTE, ESTADO_CONFIRMADA, ESTADO_COMPLETADA, ESTADO_CANCELADA = 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'
    
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_CONFIRMADA, 'Confirmada'),
        (ESTADO_COMPLETADA, 'Completada'),
        (ESTADO_CANCELADA, 'Cancelada'),
    ]

    barbero = models.ForeignKey(Barbero, on_delete=models.CASCADE, related_name='citas')
    cliente = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    fecha_hora_inicio = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE)
    fecha_creacion = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['barbero', 'fecha_hora_inicio'], name='unique_barbero_citas')
        ]

    def __str__(self):
        return f"{self.barbero.nombre} - {self.fecha_hora_inicio.strftime('%d/%m %H:%M')} ({self.estado})"
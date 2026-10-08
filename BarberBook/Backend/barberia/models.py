from django.db import models
from django.conf import settings


class Servicio(models.Model):
    nombre = models.CharField(max_length=100)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} (${self.precio})"


class Barbero(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, default='')
    # Relación OneToOne correcta con el modelo de usuario de Django
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='perfil_barbero')
    activo = models.BooleanField(default=True)
    nota_pausa = models.CharField(max_length=200, blank=True, default='')
    servicios = models.ManyToManyField(
        Servicio, related_name='barberos', blank=True)

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
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='citas')
    fecha_hora_inicio = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE)
    servicio = models.ForeignKey(
        Servicio, on_delete=models.PROTECT, null=True, blank=True,
        related_name='citas')
    # Precio al momento de reservar: cambia el catálogo, no la facturación histórica
    precio = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['barbero', 'fecha_hora_inicio'], name='unique_barbero_citas')
        ]
        indexes = [
            models.Index(fields=['estado', 'fecha_hora_inicio'],
                         name='cita_estado_fecha_idx'),
        ]

    def __str__(self):
        return f"{self.barbero.nombre} - {self.fecha_hora_inicio.strftime('%d/%m %H:%M')} ({self.estado})"
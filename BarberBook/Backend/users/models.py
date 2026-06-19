from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('BARBERO', 'Barbero'),
        ('CLIENTE', 'Cliente'),
    )
    
    tenant_id = models.IntegerField(null=True, blank=True)
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENTE')
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} - {self.rol}"
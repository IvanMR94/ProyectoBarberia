from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('BARBERO', 'Barbero'),
        ('CLIENTE', 'Cliente'),
    )
    
    nombre = models.CharField(max_length=100, blank=True, default='')
    apellido = models.CharField(max_length=100, blank=True, default='')
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENTE')

    def __str__(self):
        return f"{self.username} - {self.rol}"
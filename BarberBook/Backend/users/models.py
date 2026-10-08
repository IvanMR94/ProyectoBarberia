from django.contrib.auth.models import AbstractUser
from django.db import models

from .roles import ROL_BARBERO, ROL_CLIENTE, ROL_DUENO, ROL_SUPER_ADMIN

class User(AbstractUser):
    ROLE_CHOICES = (
        (ROL_SUPER_ADMIN, 'Super Admin'),
        (ROL_BARBERO, 'Barbero'),
        (ROL_CLIENTE, 'Cliente'),
        (ROL_DUENO, 'Dueño'),
    )
    
    nombre = models.CharField(max_length=100, blank=True, default='')
    apellido = models.CharField(max_length=100, blank=True, default='')
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENTE')

    def __str__(self):
        return f"{self.username} - {self.rol}"
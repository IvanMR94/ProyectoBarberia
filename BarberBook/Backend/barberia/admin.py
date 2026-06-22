from django.contrib import admin
from .models import Barbero, Cita

# Registramos los modelos para que aparezcan en el panel
@admin.register(Barbero)
class BarberoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario')

@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ('barbero', 'cliente', 'fecha_hora_inicio', 'estado')
    list_filter = ('estado', 'fecha_hora_inicio')
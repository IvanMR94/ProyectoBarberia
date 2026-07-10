from django.contrib import admin
from .models import Barbero, Cita

@admin.register(Barbero)
class BarberoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario')
    search_fields = ('nombre', 'usuario__username', 'usuario__email')

@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ('barbero', 'cliente', 'fecha_hora_inicio', 'estado')
    list_filter = ('estado', 'barbero', 'fecha_hora_inicio')
    date_hierarchy = 'fecha_hora_inicio'
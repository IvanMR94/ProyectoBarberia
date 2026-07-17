from django.contrib import admin
from .models import Barbero, Cita
from django.contrib.auth import get_user_model 

User = get_user_model() 

@admin.register(Barbero)
class BarberoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario')
    search_fields = ('nombre', 'usuario__username', 'usuario__email')

    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "usuario":
            # Filtramos para que solo salgan los usuarios que tienen rol 'BARBERO'
            kwargs["queryset"] = User.objects.filter(rol='BARBERO')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ('barbero', 'cliente', 'fecha_hora_inicio', 'estado')
    list_filter = ('estado', 'barbero', 'fecha_hora_inicio')
    date_hierarchy = 'fecha_hora_inicio'
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class DueñoUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'nombre', 'apellido', 'rol',
                    'is_staff', 'is_active')
    list_filter = ('rol', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'nombre', 'apellido')
    ordering = ('username',)

    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('nombre', 'apellido', 'rol')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'nombre', 'apellido', 'rol')}),
    )

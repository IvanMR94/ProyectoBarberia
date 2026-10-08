from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Barbero, Cita, Servicio
from .services import crear_usuario_barbero

User = get_user_model()


class BarberoAdminForm(forms.ModelForm):
    usuario = forms.ModelChoiceField(
        queryset=User.objects.all(),
        required=False,
        label='Usuario existente',
        help_text='Dejalo vacío si vas a crear una cuenta nueva.',
    )
    email = forms.EmailField(
        required=False,
        label='Email',
        help_text='Se usa como usuario para iniciar sesión.',
    )
    password = forms.CharField(
        widget=forms.PasswordInput(render_value=False),
        required=False,
        label='Contraseña',
    )

    class Meta:
        model = Barbero
        fields = ('nombre', 'apellido', 'usuario')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Solo usuarios que todavía no son barbero (o el actual al editar)
        if self.instance and self.instance.pk:
            self.fields['usuario'].queryset = User.objects.filter(
                Q(perfil_barbero__isnull=True) |
                Q(pk=self.instance.usuario_id)
            ).order_by('username')
        else:
            self.fields['usuario'].queryset = User.objects.filter(
                perfil_barbero__isnull=True).order_by('username')

    def clean(self):
        cleaned = super().clean()
        usuario = cleaned.get('usuario')
        email = cleaned.get('email')
        password = cleaned.get('password')

        if usuario and (email or password):
            raise forms.ValidationError(
                'Elegí un usuario existente o creá una cuenta nueva, '
                'no ambas cosas.')
        if not usuario:
            if not email or not password:
                raise forms.ValidationError(
                    'Elegí un usuario existente o completá email y contraseña '
                    'para crear la cuenta del barbero.')
            if User.objects.filter(username=email).exists():
                raise forms.ValidationError(
                    'Ya existe una cuenta con ese email.')
        return cleaned

    def save(self, commit=True):
        usuario = self.cleaned_data.get('usuario')
        email = self.cleaned_data.get('email')
        password = self.cleaned_data.get('password')

        if not usuario and email and password:
            usuario = crear_usuario_barbero(
                email=email,
                password=password,
                nombre=self.cleaned_data.get('nombre', ''),
                apellido=self.cleaned_data.get('apellido', ''),
            )
            self.cleaned_data['usuario'] = usuario
            self.instance.usuario = usuario
        elif usuario and usuario.rol != 'BARBERO':
            # Quien tiene perfil de barbero queda con rol BARBERO,
            # igual que lo que espera el login del backend.
            usuario.rol = 'BARBERO'
            usuario.save(update_fields=['rol'])

        return super().save(commit=commit)


@admin.register(Barbero)
class BarberoAdmin(admin.ModelAdmin):
    form = BarberoAdminForm
    list_display = ('nombre', 'apellido', 'usuario')
    search_fields = ('nombre', 'usuario__username', 'usuario__email')

    fieldsets = (
        ('Datos del barbero', {
            'fields': ('nombre', 'apellido', 'servicios'),
        }),
        ('Cuenta de acceso', {
            'fields': ('usuario', 'email', 'password'),
            'description': 'Elegí un usuario existente —o dejá el campo vacío— '
                           'y completá email y contraseña para crear una '
                           'cuenta nueva en un solo paso.',
        }),
    )


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ('barbero', 'cliente', 'fecha_hora_inicio', 'estado')
    list_filter = ('estado', 'barbero', 'fecha_hora_inicio')
    date_hierarchy = 'fecha_hora_inicio'

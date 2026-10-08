from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from .models import Cita, Barbero, Servicio
from users.roles import ROL_BARBERO, ROL_CLIENTE, ROL_DUENO, ROL_SUPER_ADMIN


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Los roles directos del modelo se respetan tal cual
        if user.rol in (ROL_BARBERO, ROL_SUPER_ADMIN, ROL_DUENO):
            data['rol'] = user.rol
        else:
            es_barbero = Barbero.objects.filter(usuario_id=user.id).exists()
            data['rol'] = ROL_BARBERO if es_barbero else ROL_CLIENTE

        data['nombre'] = (user.nombre or '').strip() or user.username
        return data


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ['id', 'nombre', 'precio']


class BarberoSerializer(serializers.ModelSerializer):
    servicios = serializers.SerializerMethodField()

    class Meta:
        model = Barbero
        fields = ['id', 'nombre', 'apellido', 'servicios']

    def get_servicios(self, obj):
        activos = [s for s in obj.servicios.all() if s.activo]
        return ServicioSerializer(activos, many=True).data


class CitaSerializer(serializers.ModelSerializer):
    barbero_nombre = serializers.CharField(
        source='barbero.nombre', read_only=True)
    barbero_apellido = serializers.CharField(
        source='barbero.apellido', read_only=True, default='')
    servicio_nombre = serializers.CharField(
        source='servicio.nombre', read_only=True, default=None)

    class Meta:
        model = Cita
        fields = [
            'id', 'barbero', 'servicio', 'fecha_hora_inicio', 'estado',
            'cliente', 'precio', 'barbero_nombre', 'barbero_apellido',
            'servicio_nombre',
        ]
        read_only_fields = ['estado', 'cliente', 'precio']
        extra_kwargs = {
            'servicio': {'required': True},
        }

    def validate(self, attrs):
        barbero = attrs.get(
            'barbero', getattr(self.instance, 'barbero', None))
        servicio = attrs.get(
            'servicio', getattr(self.instance, 'servicio', None))
        if (barbero and servicio
                and not barbero.servicios.filter(pk=servicio.pk).exists()):
            raise serializers.ValidationError(
                {'servicio': 'Este barbero no ofrece ese servicio.'})
        return attrs

    def validate_barbero(self, barbero):
        if not barbero.activo:
            raise serializers.ValidationError(
                'Este barbero no está disponible.')
        return barbero

    def validate_servicio(self, servicio):
        if not servicio.activo:
            raise serializers.ValidationError(
                'Este servicio ya no está disponible.')
        return servicio

    def validate_fecha_hora_inicio(self, value):
        # No se pueden reservar citas en el pasado
        if value < timezone.now():
            raise serializers.ValidationError(
                'No se pueden reservar citas en el pasado.')
        return value

    def create(self, validated_data):
        # Precio al momento de reservar: cambia el catálogo, no la historia
        validated_data['precio'] = validated_data['servicio'].precio
        return super().create(validated_data)


# Ciclo de vida de una cita (según roadmap): PENDIENTE -> CONFIRMADA -> COMPLETADA
# y cancelación desde PENDIENTE o CONFIRMADA. Los estados terminales no cambian.
TRANSICIONES_ESTADO = {
    'PENDIENTE': {'CONFIRMADA', 'CANCELADA'},
    'CONFIRMADA': {'COMPLETADA', 'CANCELADA'},
    'COMPLETADA': set(),
    'CANCELADA': set(),
}


class CitaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['estado']

    def validate_estado(self, nuevo_estado):
        if not self.instance:
            return nuevo_estado
        actual = self.instance.estado
        if nuevo_estado == actual:
            return nuevo_estado
        if nuevo_estado not in TRANSICIONES_ESTADO.get(actual, set()):
            raise serializers.ValidationError(
                f'Ciclo de vida inválido: {actual} → {nuevo_estado}.'
            )
        return nuevo_estado


class CitaClienteUpdateSerializer(CitaUpdateSerializer):
    """El cliente solo puede cancelar: confirmar y completar son del barbero."""

    def validate_estado(self, nuevo_estado):
        if (self.instance and nuevo_estado != self.instance.estado
                and nuevo_estado != 'CANCELADA'):
            raise serializers.ValidationError(
                'Desde tu cuenta solo podés cancelar la cita.')
        return super().validate_estado(nuevo_estado)


class CitaBarberoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    cliente_contacto = serializers.SerializerMethodField()
    servicio_nombre = serializers.CharField(
        source='servicio.nombre', read_only=True, default=None)

    class Meta:
        model = Cita
        fields = [
            'id', 'fecha_hora_inicio', 'estado', 'cliente_nombre',
            'cliente_contacto', 'servicio_nombre', 'precio',
        ]

    def get_cliente_nombre(self, obj):
        completo = f"{obj.cliente.nombre} {obj.cliente.apellido}".strip()
        return completo or obj.cliente.username

    def get_cliente_contacto(self, obj):
        return obj.cliente.email or obj.cliente.username

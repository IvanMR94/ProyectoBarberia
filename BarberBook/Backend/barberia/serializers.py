from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import Cita, Barbero

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Ejecutamos la validación base (comprueba usuario y password)
        data = super().validate(attrs)
        
        # Obtenemos el usuario autenticado
        user = self.user
        
        # FORZAMOS la asignación del rol
        # Los roles directos del modelo se respetan tal cual
        if user.rol in ('BARBERO', 'SUPER_ADMIN'):
            data['rol'] = user.rol
        else:
            # Si no, verificamos si existe en la tabla Barbero
            es_barbero = Barbero.objects.filter(usuario_id=user.id).exists()
            data['rol'] = 'BARBERO' if es_barbero else 'CLIENTE'
            
        return data

class CitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['id', 'barbero', 'fecha_hora_inicio', 'estado', 'cliente']
        read_only_fields = ['estado', 'cliente'] 

    def validate_fecha_hora_inicio(self, value):
        # No se pueden reservar citas en el pasado
        if value < timezone.now():
            raise serializers.ValidationError(
                'No se pueden reservar citas en el pasado.')
        return value

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

class BarberoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barbero
        fields = ['id', 'nombre', 'apellido']
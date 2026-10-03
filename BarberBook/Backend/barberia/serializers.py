from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Cita, Barbero

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Ejecutamos la validación base (comprueba usuario y password)
        data = super().validate(attrs)
        
        # Obtenemos el usuario autenticado
        user = self.user
        
        # FORZAMOS la asignación del rol
        # Si el rol del modelo User es BARBERO, mandamos BARBERO
        if user.rol == 'BARBERO':
            data['rol'] = 'BARBERO'
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

class CitaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['estado']

class BarberoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barbero
        fields = ['id', 'nombre']
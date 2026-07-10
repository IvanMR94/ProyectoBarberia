from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Cita, Barbero

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        
        # Validación: Buscamos si el usuario actual existe en la tabla Barbero
        # Usamos filter(usuario_id=user.id) para asegurar que buscamos por ID
        try:
            es_barbero = Barbero.objects.filter(usuario_id=user.id).exists()
            data['rol'] = 'BARBERO' if es_barbero else 'CLIENTE'
        except Exception as e:
            # Si hay un error en la BD, por seguridad devolvemos CLIENTE
            data['rol'] = 'CLIENTE'
            print(f"Error en la validación del rol: {e}")
            
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
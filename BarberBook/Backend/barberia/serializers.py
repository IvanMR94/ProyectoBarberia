from rest_framework import serializers
from .models import Cita, Barbero

class CitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['id', 'barbero', 'fecha_hora_inicio', 'estado']
        read_only_fields = ['estado']

class CitaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['estado']

class BarberoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barbero
        fields = ['id', 'nombre']
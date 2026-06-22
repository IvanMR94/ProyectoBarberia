from rest_framework import serializers
from .models import Cita

class CitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['id', 'barbero', 'servicio', 'fecha_hora_inicio', 'estado']
        read_only_fields = ['estado'] # El cliente crea en PENDIENTE, no elige el estado

class CitaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['estado'] # El barbero solo modifica el estado
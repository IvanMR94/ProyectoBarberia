from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Barbero, Cita, Servicio
from .services import crear_barbero
from .serializers import ServicioSerializer

User = get_user_model()


class ServicioDuenoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ['id', 'nombre', 'precio', 'activo']

    def validate_precio(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                'El precio debe ser mayor a cero.')
        return valor


class BarberoDuenoSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='usuario.email', read_only=True)
    servicios = ServicioSerializer(many=True, read_only=True)
    cortes = serializers.SerializerMethodField()
    ingresos = serializers.SerializerMethodField()

    class Meta:
        model = Barbero
        fields = [
            'id', 'nombre', 'apellido', 'email', 'activo', 'nota_pausa',
            'despedido', 'servicios', 'cortes', 'ingresos',
        ]

    def get_cortes(self, obj):
        return int(getattr(obj, 'cortes_periodo', 0) or 0)

    def get_ingresos(self, obj):
        valor = getattr(obj, 'ingresos_periodo', None)
        return str(valor) if valor is not None else '0'


class BarberoAltaSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default='')
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    servicios = serializers.PrimaryKeyRelatedField(
        queryset=Servicio.objects.all(), many=True, required=False)

    def validate_email(self, valor):
        if User.objects.filter(username=valor).exists():
            raise serializers.ValidationError(
                'Ya existe una cuenta con ese email.')
        return valor

    def validate_servicios(self, servicios):
        inactivos = [s for s in servicios if not s.activo]
        if inactivos:
            nombres = ', '.join(s.nombre for s in inactivos)
            raise serializers.ValidationError(
                f'Servicios no disponibles: {nombres}.')
        return servicios

    def create(self, validated_data):
        servicios = validated_data.pop('servicios', [])
        return crear_barbero(servicios=servicios, **validated_data)


class BarberoUpdateSerializer(serializers.ModelSerializer):
    servicios = serializers.PrimaryKeyRelatedField(
        queryset=Servicio.objects.all(), many=True, required=False)

    class Meta:
        model = Barbero
        fields = ['nombre', 'apellido', 'activo', 'nota_pausa', 'servicios']

    def update(self, instance, validated_data):
        if validated_data.get('activo'):
            # Reactivar limpia el motivo de la pausa
            instance.nota_pausa = ''
        return super().update(instance, validated_data)


class ClienteDuenoSerializer(serializers.ModelSerializer):
    visitas = serializers.SerializerMethodField()
    gasto = serializers.SerializerMethodField()
    ultima_visita = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'nombre', 'apellido', 'username', 'email',
            'visitas', 'gasto', 'ultima_visita',
        ]

    def get_visitas(self, obj):
        return int(getattr(obj, 'visitas', 0) or 0)

    def get_gasto(self, obj):
        valor = getattr(obj, 'gasto', None)
        return str(valor) if valor is not None else '0'

    def get_ultima_visita(self, obj):
        valor = getattr(obj, 'ultima_visita', None)
        return valor.isoformat() if valor else None


class CorteDuenoSerializer(serializers.ModelSerializer):
    fecha = serializers.DateTimeField(source='fecha_hora_inicio')
    barbero = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    servicio_nombre = serializers.CharField(
        source='servicio.nombre', read_only=True, default=None)

    class Meta:
        model = Cita
        fields = ['id', 'fecha', 'barbero', 'cliente',
                  'servicio_nombre', 'precio']

    def get_barbero(self, obj):
        return f"{obj.barbero.nombre} {obj.barbero.apellido}".strip()

    def get_cliente(self, obj):
        completo = f"{obj.cliente.nombre} {obj.cliente.apellido}".strip()
        return completo or obj.cliente.username

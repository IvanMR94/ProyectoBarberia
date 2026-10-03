from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.throttling import SimpleRateThrottle
from datetime import datetime
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.views import TokenObtainPairView
from .services import get_disponibilidad_barbero
from .models import Cita, Barbero
from .serializers import (
    CitaSerializer, CitaUpdateSerializer, CitaClienteUpdateSerializer,
    BarberoSerializer, MyTokenObtainPairSerializer,
)


class LoginIpRateThrottle(SimpleRateThrottle):
    scope = 'login_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class LoginUsuarioRateThrottle(SimpleRateThrottle):
    scope = 'login_usuario'

    def get_cache_key(self, request, view):
        usuario = str(request.data.get('username') or '').strip().lower()
        if not usuario:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': usuario,
        }


# --- LOGIN SIMPLIFICADO ---
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginIpRateThrottle, LoginUsuarioRateThrottle]

# --- Vistas existentes ---
class BarberoListView(generics.ListAPIView):
    queryset = Barbero.objects.all()
    serializer_class = BarberoSerializer
    permission_classes = [permissions.AllowAny]

class DisponibilidadBarberoView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, barbero_id):
        if not isinstance(barbero_id, int):
            return Response({"error": "Barbero inválido"}, status=status.HTTP_400_BAD_REQUEST)
        fecha_str = request.query_params.get('date')
        if not fecha_str: return Response({"error": "Fecha requerida"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            disponibles = get_disponibilidad_barbero(barbero_id, fecha)
            return Response({"barbero_id": barbero_id, "fecha": fecha_str, "disponibles": disponibles})
        except ValueError:
            return Response({"error": "Formato inválido"}, status=status.HTTP_400_BAD_REQUEST)

class CitaCreateView(generics.CreateAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user)

    def create(self, request, *args, **kwargs):
        # Si otro usuario reservó el mismo hueco (unique barbero+fecha),
        # devolvemos 409 en vez de un 500 por IntegrityError.
        try:
            with transaction.atomic():
                return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'Ese horario ya está reservado para este barbero.'},
                status=status.HTTP_409_CONFLICT,
            )

class CitaManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaClienteUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cita.objects.filter(cliente=self.request.user)

class MisCitasListView(generics.ListAPIView):
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cita.objects.filter(cliente=self.request.user).order_by('-fecha_hora_inicio')

class BarberDashboardView(generics.ListAPIView):
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cita.objects.filter(barbero__usuario=self.request.user).order_by('fecha_hora_inicio')

class BarberCitaUpdateView(generics.UpdateAPIView):
    serializer_class = CitaUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cita.objects.filter(barbero__usuario=self.request.user)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from datetime import datetime
from .services import get_disponibilidad_barbero
from .models import Cita, Barbero
from .serializers import CitaSerializer, CitaUpdateSerializer, BarberoSerializer
from django.contrib.auth import get_user_model

# --- Vista de listado de barberos ---
class BarberoListView(generics.ListAPIView):
    queryset = Barbero.objects.all()
    serializer_class = BarberoSerializer
    permission_classes = [permissions.AllowAny]

# --- Vista de disponibilidad ---
class DisponibilidadBarberoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, barbero_id):
        fecha_str = request.query_params.get('date')
        if not fecha_str:
            return Response({"error": "Debes proporcionar una fecha (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            disponibles = get_disponibilidad_barbero(barbero_id, fecha)
            return Response({
                "barbero_id": barbero_id,
                "fecha": fecha_str,
                "disponibles": disponibles
            }, status=status.HTTP_200_OK)
        except ValueError:
            return Response({"error": "Formato de fecha inválido, usa YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

# --- Vista para crear citas ---
class CitaCreateView(generics.CreateAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Asignamos al usuario logueado como cliente
        serializer.save(cliente=self.request.user)

# --- Vista para actualizar y cancelar ---
class CitaManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Solo permite modificar o borrar citas del usuario logueado
        return Cita.objects.filter(cliente=self.request.user)

# --- NUEVA VISTA: Historial de citas del usuario ---
class MisCitasListView(generics.ListAPIView):
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filtra las citas que pertenecen al usuario que envió el token
        return Cita.objects.filter(cliente=self.request.user).order_by('-fecha_hora_inicio')
    

class BarberDashboardView(generics.ListAPIView):
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filtramos citas donde el 'barbero__usuario' sea el usuario logueado
        return Cita.objects.filter(barbero__usuario=self.request.user).order_by('fecha_hora_inicio')
    
class BarberCitaUpdateView(generics.UpdateAPIView):
    serializer_class = CitaUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # El barbero puede editar CUALQUIER cita que le haya sido asignada a él
        return Cita.objects.filter(barbero__usuario=self.request.user)
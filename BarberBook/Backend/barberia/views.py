from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from datetime import datetime
from .services import get_disponibilidad_barbero
from .models import Cita
from .serializers import CitaSerializer, CitaUpdateSerializer

class DisponibilidadBarberoView(APIView):
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

class CitaCreateView(generics.CreateAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user)

class CitaUpdateView(generics.UpdateAPIView):
    queryset = Cita.objects.all()
    serializer_class = CitaUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
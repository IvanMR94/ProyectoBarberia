from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ParseError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.roles import ROL_CLIENTE

from .models import Barbero, Cita, Servicio
from .permissions import EsDueno
from .serializers import ServicioSerializer
from .serializers_dueno import (
    BarberoAltaSerializer, BarberoDuenoSerializer, BarberoUpdateSerializer,
    ClienteDuenoSerializer, CorteDuenoSerializer,
    ServicioDuenoSerializer,
)

User = get_user_model()


def _parse_fecha(valor):
    if not valor:
        return None
    try:
        return datetime.strptime(valor, '%Y-%m-%d').date()
    except ValueError:
        raise ParseError(f'Fecha inválida: {valor}. Usa el formato YYYY-MM-DD.')


def _rango_periodo(params):
    """Rango desde/hasta con default: mes en curso hasta hoy."""
    hoy = timezone.localdate()
    desde = _parse_fecha(params.get('desde')) or hoy.replace(day=1)
    hasta = _parse_fecha(params.get('hasta')) or hoy
    if desde > hasta:
        raise ParseError('"desde" no puede ser posterior a "hasta".')
    return desde, hasta


def _citas_completadas(desde, hasta, extra=None):
    queryset = Cita.objects.filter(
        estado=Cita.ESTADO_COMPLETADA,
        fecha_hora_inicio__date__gte=desde,
        fecha_hora_inicio__date__lte=hasta,
    )
    if extra:
        queryset = queryset.filter(**extra)
    return queryset


class OwnerStatsView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def get(self, request):
        desde, hasta = _rango_periodo(request.query_params)
        citas = _citas_completadas(desde, hasta)

        totales = citas.aggregate(
            cortes=Count('id'), ingresos=Sum('precio'))

        por_barbero = [
            {
                'barbero': fila['barbero_id'],
                'nombre': (
                    f"{fila['barbero__nombre']} {fila['barbero__apellido']}"
                ).strip(),
                'cortes': fila['cortes'],
                'horas': fila['cortes'],
                'ingresos': str(fila['ingresos'] or 0),
            }
            for fila in citas.values(
                'barbero_id', 'barbero__nombre', 'barbero__apellido',
            ).annotate(
                cortes=Count('id'),
                ingresos=Sum('precio'),
            ).order_by('-cortes')
        ]

        por_servicio = [
            {
                'servicio': fila['servicio_nombre'],
                'cortes': fila['cortes'],
                'ingresos': str(fila['ingresos'] or 0),
            }
            for fila in citas.annotate(
                servicio_nombre=Coalesce(
                    'servicio__nombre', Value('Sin servicio')),
            ).values('servicio_nombre').annotate(
                cortes=Count('id'),
                ingresos=Sum('precio'),
            ).order_by('-cortes')
        ]

        return Response({
            'desde': desde.isoformat(),
            'hasta': hasta.isoformat(),
            'cortes': totales['cortes'] or 0,
            'ingresos': str(totales['ingresos'] or 0),
            'clientes_atendidos': citas.values('cliente_id').distinct().count(),
            'clientes_nuevos': User.objects.filter(
                rol=ROL_CLIENTE,
                date_joined__date__gte=desde,
                date_joined__date__lte=hasta,
            ).count(),
            'por_barbero': por_barbero,
            'por_servicio': por_servicio,
        })


class OwnerBarberosView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def get(self, request):
        desde, hasta = _rango_periodo(request.query_params)
        periodo = Q(
            citas__estado=Cita.ESTADO_COMPLETADA,
            citas__fecha_hora_inicio__date__gte=desde,
            citas__fecha_hora_inicio__date__lte=hasta,
        )
        barberos = (
            Barbero.objects
            .select_related('usuario')
            .prefetch_related('servicios')
            .annotate(
                cortes_periodo=Count('citas', filter=periodo, distinct=True),
                ingresos_periodo=Sum('citas__precio', filter=periodo),
            )
            .order_by('nombre')
        )
        data = BarberoDuenoSerializer(barberos, many=True).data
        return Response({
            'desde': desde.isoformat(),
            'hasta': hasta.isoformat(),
            'barberos': data,
        })

    def post(self, request):
        serializer = BarberoAltaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barbero = serializer.save()
        return Response(
            BarberoDuenoSerializer(barbero).data,
            status=status.HTTP_201_CREATED,
        )


class OwnerBarberoDetailView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def _get(self, pk):
        return Barbero.objects.filter(pk=pk).first()

    def patch(self, request, pk):
        barbero = self._get(pk)
        if not barbero:
            return Response(
                {'error': 'Barbero no encontrado.'},
                status=status.HTTP_404_NOT_FOUND)
        serializer = BarberoUpdateSerializer(
            barbero, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BarberoDuenoSerializer(barbero).data)


class OwnerClientesView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        visitas = Count(
            'citas',
            filter=Q(citas__estado=Cita.ESTADO_COMPLETADA),
        )
        clientes = User.objects.filter(rol=ROL_CLIENTE).annotate(
            visitas=visitas,
            gasto=Sum(
                'citas__precio',
                filter=Q(citas__estado=Cita.ESTADO_COMPLETADA),
            ),
            ultima_visita=Max(
                'citas__fecha_hora_inicio',
                filter=Q(citas__estado=Cita.ESTADO_COMPLETADA),
            ),
        )
        if q:
            clientes = clientes.filter(
                Q(nombre__icontains=q)
                | Q(apellido__icontains=q)
                | Q(username__icontains=q)
                | Q(email__icontains=q)
            )
        clientes = clientes.order_by('-ultima_visita')
        data = ClienteDuenoSerializer(clientes, many=True).data
        return Response({'clientes': data})


class OwnerCitasView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def get(self, request):
        desde, hasta = _rango_periodo(request.query_params)
        citas = _citas_completadas(desde, hasta).select_related(
            'barbero', 'cliente', 'servicio').order_by('-fecha_hora_inicio')

        barbero_id = request.query_params.get('barbero')
        if barbero_id:
            if not barbero_id.isdigit():
                raise ParseError('barbero debe ser un id numérico.')
            citas = citas.filter(barbero_id=int(barbero_id))

        data = CorteDuenoSerializer(citas, many=True).data
        return Response({'cortes': data})


class OwnerServiciosView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def get(self, request):
        servicios = Servicio.objects.all()
        return Response(
            ServicioDuenoSerializer(servicios, many=True).data)

    def post(self, request):
        serializer = ServicioDuenoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        servicio = serializer.save()
        return Response(
            ServicioDuenoSerializer(servicio).data,
            status=status.HTTP_201_CREATED,
        )


class OwnerServicioDetailView(APIView):
    permission_classes = [IsAuthenticated, EsDueno]

    def patch(self, request, pk):
        servicio = Servicio.objects.filter(pk=pk).first()
        if not servicio:
            return Response(
                {'error': 'Servicio no encontrado.'},
                status=status.HTTP_404_NOT_FOUND)
        serializer = ServicioDuenoSerializer(
            servicio, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ServicioDuenoSerializer(servicio).data)

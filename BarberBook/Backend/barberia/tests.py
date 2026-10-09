from datetime import datetime, time, timedelta
import calendar

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .admin import BarberoAdminForm
from .models import Barbero, Cita, Servicio
from users.roles import ROL_DUENO

User = get_user_model()


class BaseApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.barbero_user = User.objects.create_user(
            username='barbero_test', password='barbero123', rol='BARBERO')
        self.barbero = Barbero.objects.create(
            usuario=self.barbero_user, nombre='Omar', apellido='Rios')
        self.cliente = User.objects.create_user(
            username='cliente_test', password='cliente123')
        self.servicio = Servicio.objects.create(
            nombre='Corte', precio=1000)
        self.barbero.servicios.add(self.servicio)
        self.fecha_futura = timezone.localtime().date() + timedelta(days=30)

    def crear_cita(self, hora=10, estado='PENDIENTE', fecha=None,
                   barbero=None, cliente=None, servicio=None):
        servicio = servicio or self.servicio
        return Cita.objects.create(
            barbero=barbero or self.barbero,
            cliente=cliente or self.cliente,
            fecha_hora_inicio=timezone.make_aware(
                datetime.combine(fecha or self.fecha_futura, time(hora, 0))),
            estado=estado,
            servicio=servicio,
            precio=servicio.precio,
        )

    def reservar(self, hora='10:00', barbero=None, servicio=None):
        """POST real de reserva como el cliente autenticado."""
        return self.client.post('/api/v1/appointments/', {
            'barbero': (barbero or self.barbero).id,
            'servicio': (servicio or self.servicio).id,
            'fecha_hora_inicio': (
                f'{self.fecha_futura.isoformat()}T{hora}:00'),
        }, format='json')


class CicloDeVidaCitaTests(BaseApiTest):
    def test_transicion_confirmar_y_completar(self):
        cita = self.crear_cita()
        self.client.force_authenticate(self.barbero_user)

        r1 = self.client.patch(
            f'/api/v1/barber-appointments/{cita.id}/',
            {'estado': 'CONFIRMADA'}, format='json')
        self.assertEqual(r1.status_code, 200)

        r2 = self.client.patch(
            f'/api/v1/barber-appointments/{cita.id}/',
            {'estado': 'COMPLETADA'}, format='json')
        self.assertEqual(r2.status_code, 200)
        cita.refresh_from_db()
        self.assertEqual(cita.estado, 'COMPLETADA')

    def test_pendiente_no_puede_completarse_directamente(self):
        cita = self.crear_cita()
        self.client.force_authenticate(self.barbero_user)
        r = self.client.patch(
            f'/api/v1/barber-appointments/{cita.id}/',
            {'estado': 'COMPLETADA'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_completada_no_vuelve_a_pendiente(self):
        cita = self.crear_cita(estado='COMPLETADA')
        self.client.force_authenticate(self.barbero_user)
        r = self.client.patch(
            f'/api/v1/barber-appointments/{cita.id}/',
            {'estado': 'PENDIENTE'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_hueco_duplicado_no_se_crea(self):
        cita = self.crear_cita(hora=12)
        self.client.force_authenticate(self.cliente)
        r = self.client.post('/api/v1/appointments/', {
            'barbero': self.barbero.id,
            'servicio': self.servicio.id,
            'fecha_hora_inicio': cita.fecha_hora_inicio.isoformat(),
        }, format='json')
        # 400 si lo detecta el validador, 409 si llega al IntegrityError;
        # en cualquier caso nunca duplica el hueco.
        self.assertIn(r.status_code, (400, 409))
        self.assertEqual(
            Cita.objects.filter(
                barbero=self.barbero,
                fecha_hora_inicio=cita.fecha_hora_inicio).count(),
            1)


class PermisosTests(BaseApiTest):
    def test_cliente_no_actualiza_cita_de_su_barbero(self):
        cita = self.crear_cita()
        self.client.force_authenticate(self.cliente)
        r = self.client.patch(
            f'/api/v1/barber-appointments/{cita.id}/',
            {'estado': 'CONFIRMADA'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_cliente_no_autoconfirma_su_cita(self):
        cita = self.crear_cita()
        self.client.force_authenticate(self.cliente)
        r = self.client.patch(
            f'/api/v1/appointments/{cita.id}/',
            {'estado': 'CONFIRMADA'}, format='json')
        self.assertEqual(r.status_code, 400)
        cita.refresh_from_db()
        self.assertEqual(cita.estado, 'PENDIENTE')

    def test_cliente_no_autocompleta_su_cita(self):
        cita = self.crear_cita(estado='CONFIRMADA')
        self.client.force_authenticate(self.cliente)
        r = self.client.patch(
            f'/api/v1/appointments/{cita.id}/',
            {'estado': 'COMPLETADA'}, format='json')
        self.assertEqual(r.status_code, 400)
        cita.refresh_from_db()
        self.assertEqual(cita.estado, 'CONFIRMADA')

    def test_cliente_si_puede_cancelar_su_cita(self):
        cita = self.crear_cita()
        self.client.force_authenticate(self.cliente)
        r = self.client.patch(
            f'/api/v1/appointments/{cita.id}/',
            {'estado': 'CANCELADA'}, format='json')
        self.assertEqual(r.status_code, 200)
        cita.refresh_from_db()
        self.assertEqual(cita.estado, 'CANCELADA')

    def test_cliente_no_modifica_cita_ajena(self):
        ajena = User.objects.create_user(
            username='otro_cliente', password='cliente123')
        cita = self.crear_cita(cliente=ajena)
        self.client.force_authenticate(self.cliente)
        r = self.client.patch(
            f'/api/v1/appointments/{cita.id}/',
            {'estado': 'CANCELADA'}, format='json')
        self.assertEqual(r.status_code, 404)
        cita.refresh_from_db()
        self.assertEqual(cita.estado, 'PENDIENTE')

    def test_dashboard_solo_muestra_las_suyas(self):
        otro_user = User.objects.create_user(
            username='barbero_dos', password='barbero123', rol='BARBERO')
        otro_barbero = Barbero.objects.create(
            usuario=otro_user, nombre='Luis', apellido='Perez')
        self.crear_cita(hora=10)
        self.crear_cita(hora=11, barbero=otro_barbero)

        self.client.force_authenticate(self.barbero_user)
        r = self.client.get('/api/v1/barber-dashboard/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['cliente_nombre'], 'cliente_test')
        self.assertEqual(r.data[0]['servicio_nombre'], 'Corte')


class DisponibilidadTests(BaseApiTest):
    def test_dia_pasado_no_ofrece_horas(self):
        ayer = timezone.localtime().date() - timedelta(days=1)
        r = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={ayer.isoformat()}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['disponibles'], [])

    def test_excluye_la_hora_ocupada(self):
        self.crear_cita(hora=10)
        r = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={self.fecha_futura.isoformat()}')
        horas = r.data['disponibles']
        self.assertNotIn('10:00', horas)
        self.assertIn('11:00', horas)

    def test_cita_cancelada_libera_la_hora(self):
        self.crear_cita(hora=10, estado='CANCELADA')
        r = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={self.fecha_futura.isoformat()}')
        self.assertIn('10:00', r.data['disponibles'])

    def test_hoy_no_ofrece_horas_pasadas(self):
        hoy = timezone.localtime().date()
        hora_actual = timezone.localtime().hour
        r = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={hoy.isoformat()}')
        horas = [int(h[:2]) for h in r.data['disponibles']]
        self.assertTrue(all(h > hora_actual for h in horas))


class BarbersTests(BaseApiTest):
    def test_barbers_incluye_nombre_y_apellido(self):
        r = self.client.get('/api/v1/barbers/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data[0]['nombre'], 'Omar')
        self.assertEqual(r.data[0]['apellido'], 'Rios')


class ReservaTests(BaseApiTest):
    def test_no_se_puede_reservar_en_el_pasado(self):
        self.client.force_authenticate(self.cliente)
        r = self.client.post('/api/v1/appointments/', {
            'barbero': self.barbero.id,
            'servicio': self.servicio.id,
            'fecha_hora_inicio': (
                timezone.now() - timedelta(hours=1)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_se_puede_reservar_un_dia_futuro(self):
        self.client.force_authenticate(self.cliente)
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['fecha_hora_inicio'][:10],
                         self.fecha_futura.isoformat())
        self.assertEqual(r.data['precio'], '1000.00')
        self.assertEqual(r.data['servicio_nombre'], 'Corte')


class BarberoAdminTests(BaseApiTest):
    def test_alta_con_email_y_contrasena_crea_la_cuenta(self):
        form = BarberoAdminForm(data={
            'nombre': 'Pedro', 'apellido': 'Gomez',
            'email': 'pedro@x.com', 'password': 'secreto123',
        })
        self.assertTrue(form.is_valid(), form.errors)
        barbero = form.save()

        user = barbero.usuario
        self.assertEqual(user.username, 'pedro@x.com')
        self.assertEqual(user.email, 'pedro@x.com')
        self.assertEqual(user.rol, 'BARBERO')
        self.assertEqual(user.nombre, 'Pedro')
        self.assertEqual(user.apellido, 'Gomez')
        self.assertTrue(user.check_password('secreto123'))

    def test_alta_sin_usuario_ni_credenciales_es_invalida(self):
        form = BarberoAdminForm(data={
            'nombre': 'Ana', 'apellido': 'Lopez',
        })
        self.assertFalse(form.is_valid())

    def test_no_admite_usuario_existente_y_cuenta_nueva_a_la_vez(self):
        otro = User.objects.create_user(username='otro@x.com', password='x')
        form = BarberoAdminForm(data={
            'nombre': 'Ana', 'apellido': 'Lopez',
            'usuario': otro.pk, 'email': 'nuevo@x.com', 'password': 'x',
        })
        self.assertFalse(form.is_valid())

    def test_no_admite_un_email_ya_registrado(self):
        User.objects.create_user(username='dup@x.com', password='x')
        form = BarberoAdminForm(data={
            'nombre': 'Ana', 'apellido': 'Lopez',
            'email': 'dup@x.com', 'password': 'secreto123',
        })
        self.assertFalse(form.is_valid())

    def test_elegir_un_existente_lo_deja_con_rol_barbero(self):
        form = BarberoAdminForm(data={
            'nombre': 'Cliente', 'apellido': 'Probando',
            'usuario': self.cliente.pk,
        })
        self.assertTrue(form.is_valid(), form.errors)
        barbero = form.save()

        self.cliente.refresh_from_db()
        self.assertEqual(barbero.usuario_id, self.cliente.id)
        self.assertEqual(self.cliente.rol, 'BARBERO')

    def test_pagina_de_alta_renderiza_con_email_y_contrasena(self):
        User.objects.create_superuser(username='rootx', password='root12345')
        self.client.force_login(
            User.objects.get(username='rootx'))

        r = self.client.get('/admin/barberia/barbero/add/')
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, 'name="email"')
        self.assertContains(r, 'name="password"')
        self.assertContains(r, 'name="usuario"')

    def test_pagina_de_edicion_renderiza(self):
        User.objects.create_superuser(username='rooty', password='root12345')
        self.client.force_login(
            User.objects.get(username='rooty'))

        r = self.client.get(f'/admin/barberia/barbero/{self.barbero.id}/change/')
        self.assertEqual(r.status_code, 200)


class PermisosDuenoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_test', password='dueno12345', rol=ROL_DUENO)
        self.superadmin = User.objects.create_user(
            username='super_test', password='super12345', rol='SUPER_ADMIN')

    def test_cliente_no_entra_al_panel(self):
        self.client.force_authenticate(self.cliente)
        r = self.client.get('/api/v1/owner/stats/')
        self.assertEqual(r.status_code, 403)

    def test_barbero_no_entra_al_panel(self):
        self.client.force_authenticate(self.barbero_user)
        r = self.client.get('/api/v1/owner/stats/')
        self.assertEqual(r.status_code, 403)

    def test_dueno_entra_al_panel(self):
        self.client.force_authenticate(self.dueno)
        r = self.client.get('/api/v1/owner/stats/')
        self.assertEqual(r.status_code, 200)

    def test_superadmin_entra_al_panel(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.get('/api/v1/owner/stats/')
        self.assertEqual(r.status_code, 200)


class StatsDuenoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_stats', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(self.dueno)

    def test_stats_del_periodo(self):
        self.crear_cita(hora=10, estado='COMPLETADA')
        self.crear_cita(hora=11, estado='COMPLETADA')
        self.crear_cita(hora=12, estado='CANCELADA')

        r = self.client.get(
            f'/api/v1/owner/stats/?desde={self.fecha_futura}&'
            f'hasta={self.fecha_futura}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['cortes'], 2)
        self.assertEqual(r.data['ingresos'], '2000.00')
        self.assertEqual(r.data['clientes_atendidos'], 1)
        self.assertEqual(len(r.data['por_barbero']), 1)
        self.assertEqual(r.data['por_barbero'][0]['nombre'], 'Omar Rios')
        self.assertEqual(r.data['por_barbero'][0]['cortes'], 2)
        self.assertEqual(r.data['por_barbero'][0]['horas'], 2)

    def test_stats_fuera_del_rango_no_cuentan(self):
        hoy = timezone.localtime().date()
        self.crear_cita(hora=10, estado='COMPLETADA', fecha=hoy)

        r = self.client.get(
            f'/api/v1/owner/stats/?desde={self.fecha_futura}&'
            f'hasta={self.fecha_futura}')
        self.assertEqual(r.data['cortes'], 0)
        self.assertEqual(r.data['ingresos'], '0')

    def test_rango_invalido_devuelve_400(self):
        r = self.client.get('/api/v1/owner/stats/?desde=01-02-2026')
        self.assertEqual(r.status_code, 400)

    def test_el_precio_historico_no_cambia(self):
        self.crear_cita(hora=10, estado='COMPLETADA')
        self.servicio.precio = 9999
        self.servicio.save()

        r = self.client.get(
            f'/api/v1/owner/stats/?desde={self.fecha_futura}&'
            f'hasta={self.fecha_futura}')
        self.assertEqual(r.data['ingresos'], '1000.00')


class AltaBarberoDuenoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_alta', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(self.dueno)

    def test_alta_completa(self):
        r = self.client.post('/api/v1/owner/barbers/', {
            'nombre': 'Pedro', 'apellido': 'Gomez',
            'email': 'pedro@nuevo.com', 'password': 'secreto123',
            'servicios': [self.servicio.id],
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['email'], 'pedro@nuevo.com')
        self.assertTrue(r.data['activo'])
        self.assertEqual([s['nombre'] for s in r.data['servicios']],
                         ['Corte'])

        user = User.objects.get(username='pedro@nuevo.com')
        self.assertEqual(user.rol, 'BARBERO')
        self.assertTrue(user.check_password('secreto123'))

    def test_email_duplicado_devuelve_400(self):
        r = self.client.post('/api/v1/owner/barbers/', {
            'nombre': 'Otro', 'email': 'cliente_test',
            'password': 'secreto123',
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_password_corto_devuelve_400(self):
        r = self.client.post('/api/v1/owner/barbers/', {
            'nombre': 'Corto', 'email': 'corto@nuevo.com', 'password': 'abc',
        }, format='json')
        self.assertEqual(r.status_code, 400)


class PausaBarberoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_pausa', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(self.dueno)

    def test_pausar_y_reactivar(self):
        r = self.client.patch(
            f'/api/v1/owner/barbers/{self.barbero.id}/',
            {'activo': False, 'nota_pausa': 'Vacaciones'},
            format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['activo'])
        self.assertEqual(r.data['nota_pausa'], 'Vacaciones')

        r2 = self.client.patch(
            f'/api/v1/owner/barbers/{self.barbero.id}/',
            {'activo': True}, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.data['activo'])
        self.assertEqual(r2.data['nota_pausa'], '')

    def test_barbero_pausado_desaparece_de_la_lista_publica(self):
        self.client.patch(
            f'/api/v1/owner/barbers/{self.barbero.id}/',
            {'activo': False}, format='json')
        self.client.force_authenticate(user=None)

        r = self.client.get('/api/v1/barbers/')
        nombres = [b['nombre'] for b in r.data]
        self.assertNotIn('Omar', nombres)

    def test_barbero_pausado_no_recibe_reservas(self):
        self.client.patch(
            f'/api/v1/owner/barbers/{self.barbero.id}/',
            {'activo': False}, format='json')

        r = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={self.fecha_futura}')
        self.assertEqual(r.status_code, 400)

        self.client.force_authenticate(self.cliente)
        reserva = self.reservar()
        self.assertEqual(reserva.status_code, 400)

    def test_listado_del_dueno_incluye_pausados(self):
        self.client.patch(
            f'/api/v1/owner/barbers/{self.barbero.id}/',
            {'activo': False, 'nota_pausa': 'Sanción'}, format='json')
        r = self.client.get('/api/v1/owner/barbers/')
        barbero = r.data['barberos'][0]
        self.assertFalse(barbero['activo'])
        self.assertEqual(barbero['nota_pausa'], 'Sanción')


class DespidoBarberoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_despido', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(self.dueno)

    def test_despedir_cancela_las_citas_futuras(self):
        pendiente = self.crear_cita(hora=10, estado='PENDIENTE')
        confirmada = self.crear_cita(hora=11, estado='CONFIRMADA')

        r = self.client.delete(
            f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['citas_canceladas'], 2)

        pendiente.refresh_from_db()
        confirmada.refresh_from_db()
        self.assertEqual(pendiente.estado, 'CANCELADA')
        self.assertEqual(confirmada.estado, 'CANCELADA')

        self.barbero.refresh_from_db()
        self.assertTrue(self.barbero.despedido)
        self.assertFalse(self.barbero.activo)
        self.barbero_user.refresh_from_db()
        self.assertFalse(self.barbero_user.is_active)

    def test_despido_conserva_el_historial(self):
        pasada = self.crear_cita(
            hora=9, estado='COMPLETADA',
            fecha=timezone.localtime().date() - timedelta(days=1))

        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')

        pasada.refresh_from_db()
        self.assertEqual(pasada.estado, 'COMPLETADA')

    def test_despido_conserva_stats_del_periodo(self):
        self.crear_cita(hora=10, estado='COMPLETADA')
        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')

        r = self.client.get(
            f'/api/v1/owner/stats/?desde={self.fecha_futura}&'
            f'hasta={self.fecha_futura}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['cortes'], 1)
        self.assertEqual(r.data['por_barbero'][0]['nombre'], 'Omar Rios')

    def test_barbero_despedido_desaparece_de_la_lista_publica(self):
        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.client.force_authenticate(user=None)

        r = self.client.get('/api/v1/barbers/')
        nombres = [b['nombre'] for b in r.data]
        self.assertNotIn('Omar', nombres)

        r2 = self.client.get(
            f'/api/v1/barbers/{self.barbero.id}/availability/'
            f'?date={self.fecha_futura}')
        self.assertEqual(r2.status_code, 400)

    def test_barbero_despedido_no_puede_loguearse(self):
        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.client.force_authenticate(user=None)

        r = self.client.post('/api/v1/auth/login/', {
            'username': 'barbero_test', 'password': 'barbero123'})
        self.assertEqual(r.status_code, 401)

    def test_listado_del_dueno_lo_marca_como_despedido(self):
        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')
        r = self.client.get('/api/v1/owner/barbers/')
        barbero = r.data['barberos'][0]
        self.assertTrue(barbero['despedido'])
        self.assertFalse(barbero['activo'])

    def test_recontratar_restaura_todo(self):
        self.client.delete(f'/api/v1/owner/barbers/{self.barbero.id}/')

        r = self.client.post(
            f'/api/v1/owner/barbers/{self.barbero.id}/recontratar/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['despedido'])
        self.assertTrue(r.data['activo'])

        self.barbero.refresh_from_db()
        self.barbero_user.refresh_from_db()
        self.assertTrue(self.barbero_user.is_active)

        self.client.force_authenticate(user=None)
        nombres = [
            b['nombre'] for b in self.client.get('/api/v1/barbers/').data]
        self.assertIn('Omar', nombres)
        r2 = self.client.post('/api/v1/auth/login/', {
            'username': 'barbero_test', 'password': 'barbero123'})
        self.assertEqual(r2.status_code, 200)

    def test_despedir_dos_veces_devuelve_404(self):
        r = self.client.delete(
            f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.assertEqual(r.status_code, 200)

        r2 = self.client.delete(
            f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.assertEqual(r2.status_code, 404)

    def test_despedir_barbero_inexistente_devuelve_404(self):
        r = self.client.delete('/api/v1/owner/barbers/9999/')
        self.assertEqual(r.status_code, 404)

    def test_recontratar_un_barbero_activo_devuelve_404(self):
        r = self.client.post(
            f'/api/v1/owner/barbers/{self.barbero.id}/recontratar/')
        self.assertEqual(r.status_code, 404)

    def test_cliente_no_puede_despedir(self):
        self.client.force_authenticate(self.cliente)
        r = self.client.delete(
            f'/api/v1/owner/barbers/{self.barbero.id}/')
        self.assertEqual(r.status_code, 403)

        self.barbero.refresh_from_db()
        self.assertFalse(self.barbero.despedido)


class ServicioReservaTests(BaseApiTest):
    def test_no_se_puede_reservar_sin_servicio(self):
        self.client.force_authenticate(self.cliente)
        r = self.client.post('/api/v1/appointments/', {
            'barbero': self.barbero.id,
            'fecha_hora_inicio': (
                f'{self.fecha_futura.isoformat()}T16:00:00'),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_no_se_puede_reservar_un_servicio_que_el_barbero_no_ofrece(self):
        otro = Servicio.objects.create(nombre='Barba', precio=500)
        self.client.force_authenticate(self.cliente)
        r = self.reservar(hora='16:00', servicio=otro)
        self.assertEqual(r.status_code, 400)

    def test_servicio_inactivo_no_esta_en_la_lista(self):
        self.servicio.activo = False
        self.servicio.save()

        r = self.client.get('/api/v1/barbers/')
        self.assertEqual(r.data[0]['servicios'], [])

    def test_servicio_inactivo_no_se_puede_reservar(self):
        self.servicio.activo = False
        self.servicio.save()
        self.client.force_authenticate(self.cliente)
        r = self.reservar(hora='16:00')
        self.assertEqual(r.status_code, 400)


class ClientesYServiciosDuenoTests(BaseApiTest):
    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_clientes', password='dueno12345', rol=ROL_DUENO)
        self.cliente.nombre = 'Ana'
        self.cliente.apellido = 'Torres'
        self.cliente.save()
        self.crear_cita(hora=10, estado='COMPLETADA')
        self.crear_cita(hora=11, estado='CANCELADA')
        self.client.force_authenticate(self.dueno)

    def test_clientes_con_visitas_y_gasto(self):
        r = self.client.get('/api/v1/owner/clients/')
        self.assertEqual(r.status_code, 200)
        cliente = r.data['clientes'][0]
        self.assertEqual(cliente['nombre'], 'Ana')
        self.assertEqual(cliente['visitas'], 1)
        self.assertEqual(cliente['gasto'], '1000.00')
        self.assertIsNotNone(cliente['ultima_visita'])

    def test_crear_servicio(self):
        r = self.client.post('/api/v1/owner/services/', {
            'nombre': 'Barba', 'precio': '500.00',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['activo'])

    def test_servicio_con_precio_invalido(self):
        r = self.client.post('/api/v1/owner/services/', {
            'nombre': 'Gratis', 'precio': '0',
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_editar_precio_y_baja_logica(self):
        r = self.client.patch(
            f'/api/v1/owner/services/{self.servicio.id}/',
            {'precio': '1500.00', 'activo': False}, format='json')
        self.assertEqual(r.status_code, 200)
        self.servicio.refresh_from_db()
        self.assertEqual(str(self.servicio.precio), '1500.00')
        self.assertFalse(self.servicio.activo)

    def test_cortes_del_periodo(self):
        r = self.client.get(
            f'/api/v1/owner/appointments/?desde={self.fecha_futura}&'
            f'hasta={self.fecha_futura}')
        self.assertEqual(r.status_code, 200)
        # El detalle lista todas las citas del período, con su estado
        self.assertEqual(len(r.data['cortes']), 2)
        estados = {c['id']: c['estado'] for c in r.data['cortes']}
        self.assertEqual(sorted(estados.values()),
                         ['CANCELADA', 'COMPLETADA'])
        completada = next(
            c for c in r.data['cortes'] if c['estado'] == 'COMPLETADA')
        self.assertEqual(completada['barbero'], 'Omar Rios')
        self.assertEqual(completada['cliente'], 'Ana Torres')
        self.assertEqual(completada['servicio_nombre'], 'Corte')
        self.assertEqual(completada['descuento_aplicado'], '0')


class LealtadTests(BaseApiTest):
    """Descuentos por lealtad: piso de 3 visitas + niveles en 30 días."""

    def _completar_visitas(self, cantidad, dias_atras=0, hora_base=8):
        hoy = timezone.localtime().date()
        for i in range(cantidad):
            self.crear_cita(
                hora=hora_base + i, estado='COMPLETADA',
                fecha=hoy - timedelta(days=dias_atras))

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.cliente)

    def test_sin_3_visitas_no_hay_descuento(self):
        self._completar_visitas(2)
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['precio'], '1000.00')
        self.assertEqual(r.data['descuento_aplicado'], '0.00')

    def test_piso_de_3_visitas_bloquea_el_nivel(self):
        # 2 en los últimos 30 días, pero solo 2 históricas: sin desbloqueo
        self._completar_visitas(2)
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['precio'], '1000.00')

    def test_frecuente_2_visitas_en_30_dias_da_5_pct(self):
        self._completar_visitas(1, dias_atras=40)  # fuera de la ventana
        self._completar_visitas(2)                  # dentro de 30 días
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['precio'], '950.00')
        self.assertEqual(r.data['descuento_aplicado'], '50.00')

    def test_preferencial_3_visitas_en_30_dias_da_10_pct(self):
        self._completar_visitas(3)
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['precio'], '900.00')
        self.assertEqual(r.data['descuento_aplicado'], '100.00')

    def test_visitas_viejas_no_cuentan_para_los_30_dias(self):
        self._completar_visitas(4, dias_atras=40)
        r = self.reservar(hora='15:00')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['precio'], '1000.00')
        self.assertEqual(r.data['descuento_aplicado'], '0.00')

    def test_my_loyalty_requiere_token(self):
        self.client.force_authenticate(user=None)
        r = self.client.get('/api/v1/my-loyalty/')
        self.assertEqual(r.status_code, 401)

    def test_my_loyalty_devuelve_el_estado(self):
        self._completar_visitas(2)
        r = self.client.get('/api/v1/my-loyalty/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['sellos'], 2)
        self.assertEqual(r.data['visitas_30d'], 2)
        self.assertFalse(r.data['desbloqueado'])
        self.assertEqual(r.data['faltan_para_desbloquear'], 1)
        self.assertIsNone(r.data['nivel'])

        self._completar_visitas(1, hora_base=11)
        r2 = self.client.get('/api/v1/my-loyalty/')
        self.assertTrue(r2.data['desbloqueado'])
        self.assertEqual(r2.data['faltan_para_desbloquear'], 0)
        self.assertEqual(r2.data['nivel'], 'Preferencial')
        self.assertEqual(r2.data['descuento_pct'], 10)

    def test_el_dueno_ve_el_nivel_de_los_clientes(self):
        self._completar_visitas(3)
        dueno = User.objects.create_user(
            username='dueno_lealtad', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(dueno)

        r = self.client.get('/api/v1/owner/clients/')
        self.assertEqual(r.status_code, 200)
        cliente = r.data['clientes'][0]
        self.assertEqual(cliente['visitas'], 3)
        self.assertEqual(cliente['visitas_30d'], 3)
        self.assertEqual(cliente['nivel'], 'Preferencial')


class DashboardDescuentosTests(BaseApiTest):
    """El dashboard del dueño refleja descuentos, estados y pendientes."""

    def setUp(self):
        super().setUp()
        self.dueno = User.objects.create_user(
            username='dueno_dash', password='dueno12345', rol=ROL_DUENO)
        self.client.force_authenticate(self.dueno)
        self.rango = (
            f'?desde={self.fecha_futura}&hasta={self.fecha_futura}')

    def _cita_con_descuento(self, hora, estado):
        cita = self.crear_cita(hora=hora, estado=estado)
        Cita.objects.filter(pk=cita.pk).update(
            precio=900, descuento_aplicado=100)
        return cita

    def test_stats_refleja_ingresos_finales_y_descuentos(self):
        self._cita_con_descuento(10, 'COMPLETADA')
        self.crear_cita(hora=11, estado='COMPLETADA')
        self.crear_cita(hora=12, estado='PENDIENTE')

        r = self.client.get(f'/api/v1/owner/stats/{self.rango}')
        self.assertEqual(r.status_code, 200)
        # La pendiente no suma facturación ni descuentos
        self.assertEqual(r.data['cortes'], 2)
        self.assertEqual(r.data['ingresos'], '1900.00')
        self.assertEqual(r.data['descuentos'], '100.00')
        self.assertEqual(r.data['por_barbero'][0]['ingresos'], '1900.00')
        self.assertEqual(r.data['por_barbero'][0]['descuentos'], '100.00')
        self.assertEqual(r.data['por_servicio'][0]['descuentos'], '100.00')

    def test_detalle_lista_todas_las_citas_con_estado_y_descuento(self):
        pendiente = self._cita_con_descuento(10, 'PENDIENTE')
        completada = self.crear_cita(hora=11, estado='COMPLETADA')

        r = self.client.get(f'/api/v1/owner/appointments/{self.rango}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['cortes']), 2)

        por_id = {c['id']: c for c in r.data['cortes']}
        self.assertEqual(por_id[pendiente.id]['estado'], 'PENDIENTE')
        self.assertEqual(por_id[pendiente.id]['precio'], '900.00')
        self.assertEqual(por_id[pendiente.id]['descuento_aplicado'], '100.00')
        self.assertEqual(por_id[completada.id]['estado'], 'COMPLETADA')
        self.assertEqual(por_id[completada.id]['descuento_aplicado'], '0')

    def test_cards_de_barberos_incluyen_pendientes_y_descuentos(self):
        self._cita_con_descuento(10, 'PENDIENTE')
        self._cita_con_descuento(11, 'COMPLETADA')
        self._cita_con_descuento(12, 'CONFIRMADA')

        r = self.client.get(f'/api/v1/owner/barbers/{self.rango}')
        self.assertEqual(r.status_code, 200)
        b = r.data['barberos'][0]
        self.assertEqual(b['cortes'], 1)
        self.assertEqual(b['ingresos'], '900.00')
        self.assertEqual(b['descuentos'], '100.00')
        self.assertEqual(b['pendientes'], 2)
        self.assertEqual(len(b['servicios']), 1)

    def test_el_rango_default_incluye_citas_futuras_del_mes(self):
        hoy = timezone.localtime().date()
        ultimo = hoy.replace(day=calendar.monthrange(hoy.year, hoy.month)[1])
        fecha = hoy if hoy >= ultimo else hoy + timedelta(days=1)
        cita = self.crear_cita(
            hora=10, estado='PENDIENTE', fecha=fecha)

        r = self.client.get('/api/v1/owner/appointments/')
        self.assertEqual(r.status_code, 200)
        self.assertIn(cita.id, [c['id'] for c in r.data['cortes']])

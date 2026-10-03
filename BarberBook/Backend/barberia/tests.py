from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .admin import BarberoAdminForm
from .models import Barbero, Cita

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
        self.fecha_futura = timezone.localtime().date() + timedelta(days=30)

    def crear_cita(self, hora=10, estado='PENDIENTE', fecha=None,
                   barbero=None, cliente=None):
        return Cita.objects.create(
            barbero=barbero or self.barbero,
            cliente=cliente or self.cliente,
            fecha_hora_inicio=timezone.make_aware(
                datetime.combine(fecha or self.fecha_futura, time(hora, 0))),
            estado=estado,
        )


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
        self.assertEqual(r.data[0]['barbero'], self.barbero.id)


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
            'fecha_hora_inicio': (
                timezone.now() - timedelta(hours=1)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_se_puede_reservar_un_dia_futuro(self):
        self.client.force_authenticate(self.cliente)
        r = self.client.post('/api/v1/appointments/', {
            'barbero': self.barbero.id,
            'fecha_hora_inicio': timezone.make_aware(
                datetime.combine(self.fecha_futura, time(15, 0))).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['fecha_hora_inicio'][:10],
                         self.fecha_futura.isoformat())


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

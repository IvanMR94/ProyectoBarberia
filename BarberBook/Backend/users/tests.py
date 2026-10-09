from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from barberia.models import Barbero
from users.roles import ROL_DUENO

User = get_user_model()


class RegistroTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registro_guarda_nombre_y_apellido(self):
        r = self.client.post('/api/v1/auth/register/', {
            'username': 'nuevo@mail.com',
            'email': 'nuevo@mail.com',
            'nombre': 'Ana',
            'apellido': 'Torres',
            'password': 'secreto123',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        user = User.objects.get(username='nuevo@mail.com')
        self.assertEqual(user.nombre, 'Ana')
        self.assertEqual(user.apellido, 'Torres')

    def test_registro_ignora_el_rol_enviado(self):
        r = self.client.post('/api/v1/auth/register/', {
            'username': 'tramposo@mail.com',
            'email': 'tramposo@mail.com',
            'password': 'secreto123',
            'rol': 'SUPER_ADMIN',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        user = User.objects.get(username='tramposo@mail.com')
        self.assertEqual(user.rol, 'CLIENTE')

    def test_registro_rechaza_username_con_caracteres_invalidos(self):
        r = self.client.post('/api/v1/auth/register/', {
            'username': '<script>alert(1)</script>',
            'email': 'xss@mail.com',
            'password': 'secreto123',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(
            username='<script>alert(1)</script>').exists())

    def test_registro_rechaza_password_corto(self):
        r = self.client.post('/api/v1/auth/register/', {
            'username': 'corto@mail.com',
            'email': 'corto@mail.com',
            'password': 'abc',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(username='corto@mail.com').exists())


class LoginRolTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def login(self, username, password):
        return self.client.post(
            '/api/v1/auth/login/',
            {'username': username, 'password': password}, format='json')

    def test_super_admin_conserva_su_rol(self):
        User.objects.create_user(
            username='adminx', password='admin12345', rol='SUPER_ADMIN')
        r = self.login('adminx', 'admin12345')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'SUPER_ADMIN')

    def test_cliente_sin_perfil_es_cliente(self):
        User.objects.create_user(
            username='clientx', password='cliente12345')
        r = self.login('clientx', 'cliente12345')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'CLIENTE')

    def test_usuario_con_perfil_barbero_es_barbero(self):
        user = User.objects.create_user(
            username='barberox', password='barbero12345')
        Barbero.objects.create(usuario=user, nombre='Omar', apellido='Rios')
        r = self.login('barberox', 'barbero12345')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'BARBERO')

    def test_dueno_conserva_su_rol(self):
        User.objects.create_user(
            username='duenox', password='dueno12345', rol='Dueño')
        r = self.login('duenox', 'dueno12345')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'Dueño')

    def test_login_incluye_el_nombre(self):
        User.objects.create_user(
            username='nombrer@mail.com', password='nombre1234',
            nombre='Ana', rol='CLIENTE')
        r = self.login('nombrer@mail.com', 'nombre1234')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nombre'], 'Ana')


class RefreshTokenTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='refresca', password='refresca123')
        self.refresh = str(RefreshToken.for_user(self.user))

    def test_reutilizar_el_refresh_lo_revoca(self):
        r1 = self.client.post(
            '/api/v1/auth/refresh/', {'refresh': self.refresh}, format='json')
        self.assertEqual(r1.status_code, 200)

        r2 = self.client.post(
            '/api/v1/auth/refresh/', {'refresh': self.refresh}, format='json')
        self.assertEqual(r2.status_code, 401)


class LoginRateLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_bloquea_tras_10_intentos_sobre_la_misma_cuenta(self):
        datos = {'username': 'bloqueo@mail.com', 'password': 'incorrecta123'}

        for _ in range(10):
            r = self.client.post('/api/v1/auth/login/', datos, format='json')
            self.assertNotEqual(r.status_code, 429)

        r = self.client.post('/api/v1/auth/login/', datos, format='json')
        self.assertEqual(r.status_code, 429)

    def test_ataque_por_cuenta_no_bloquea_a_otra_cuenta(self):
        for _ in range(11):
            self.client.post(
                '/api/v1/auth/login/',
                {'username': 'ataque@mail.com', 'password': 'mala'},
                format='json')

        User.objects.create_user(
            username='tranquilo@mail.com', password='buena1234')
        r = self.client.post('/api/v1/auth/login/', {
            'username': 'tranquilo@mail.com', 'password': 'buena1234',
        }, format='json')
        self.assertEqual(r.status_code, 200)


class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='reset@mail.com', email='reset@mail.com',
            password='ViejaClave123', nombre='Ana')

    def solicitar(self, email):
        return self.client.post(
            '/api/v1/auth/password-reset/', {'email': email}, format='json')

    def enlace_del_correo(self):
        """Devuelve (uid, token) extraídos del correo enviado."""
        self.assertEqual(len(mail.outbox), 1)
        for linea in mail.outbox[0].body.splitlines():
            if '/restablecer/' in linea:
                partes = linea.strip().rstrip('/').split('/')
                return partes[-2], partes[-1]
        self.fail('El correo no contiene el enlace de recuperación')

    def confirmar(self, uid, token, password):
        return self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uidb64': uid, 'token': token, 'password': password,
        }, format='json')

    def test_respuesta_identica_con_y_sin_cuenta(self):
        r1 = self.solicitar('reset@mail.com')
        r2 = self.solicitar('fantasma@mail.com')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r1.data['mensaje'], r2.data['mensaje'])
        # Solo el correo registrado recibió mail
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(DEBUG=True)
    def test_en_desarrollo_devuelve_el_link_para_probar(self):
        r = self.solicitar('reset@mail.com')
        self.assertIn('link', r.data)
        uid, token = r.data['link'].rstrip('/').split('/')[-2:]
        v = self.client.post('/api/v1/auth/password-reset/validate/',
                             {'uidb64': uid, 'token': token}, format='json')
        self.assertEqual(v.status_code, 200)
        self.assertTrue(v.data['valido'])

    def test_enlace_del_correo_es_valido(self):
        self.solicitar('reset@mail.com')
        uid, token = self.enlace_del_correo()
        v = self.client.post('/api/v1/auth/password-reset/validate/',
                             {'uidb64': uid, 'token': token}, format='json')
        self.assertEqual(v.status_code, 200)
        self.assertTrue(v.data['valido'])

    def test_confirm_establece_la_password_nueva(self):
        self.solicitar('reset@mail.com')
        uid, token = self.enlace_del_correo()
        r = self.confirmar(uid, token, 'NuevaClave123')
        self.assertEqual(r.status_code, 200)

        viejo = self.client.post('/api/v1/auth/login/', {
            'username': 'reset@mail.com', 'password': 'ViejaClave123',
        }, format='json')
        self.assertEqual(viejo.status_code, 401)

        nuevo = self.client.post('/api/v1/auth/login/', {
            'username': 'reset@mail.com', 'password': 'NuevaClave123',
        }, format='json')
        self.assertEqual(nuevo.status_code, 200)

    def test_confirm_blanquea_las_sesiones_abiertas(self):
        r_login = self.client.post('/api/v1/auth/login/', {
            'username': 'reset@mail.com', 'password': 'ViejaClave123',
        }, format='json')
        self.assertEqual(r_login.status_code, 200)
        refresh_viejo = r_login.data['refresh']
        access_viejo = r_login.data['access']

        self.solicitar('reset@mail.com')
        uid, token = self.enlace_del_correo()
        r = self.confirmar(uid, token, 'NuevaClave123')
        self.assertEqual(r.status_code, 200)

        # El refresh viejo ya no genera sesión
        r2 = self.client.post('/api/v1/auth/refresh/',
                              {'refresh': refresh_viejo}, format='json')
        self.assertEqual(r2.status_code, 401)

        # El access viejo tampoco autentica
        r3 = self.client.get(
            '/api/v1/my-appointments/',
            HTTP_AUTHORIZATION=f'Bearer {access_viejo}')
        self.assertEqual(r3.status_code, 401)

    def test_token_manipulado_es_rechazado(self):
        self.solicitar('reset@mail.com')
        uid, token = self.enlace_del_correo()
        v = self.client.post('/api/v1/auth/password-reset/validate/',
                             {'uidb64': uid, 'token': token + 'x'},
                             format='json')
        self.assertEqual(v.status_code, 400)
        c = self.confirmar(uid, token + 'x', 'NuevaClave123')
        self.assertEqual(c.status_code, 400)

        # La contraseña no cambió
        r = self.client.post('/api/v1/auth/login/', {
            'username': 'reset@mail.com', 'password': 'ViejaClave123',
        }, format='json')
        self.assertEqual(r.status_code, 200)

    def test_password_debil_es_rechazado(self):
        self.solicitar('reset@mail.com')
        uid, token = self.enlace_del_correo()
        r = self.confirmar(uid, token, '12345678')
        self.assertEqual(r.status_code, 400)

        r2 = self.client.post('/api/v1/auth/login/', {
            'username': 'reset@mail.com', 'password': 'ViejaClave123',
        }, format='json')
        self.assertEqual(r2.status_code, 200)

    def test_barbero_despedido_no_recibe_correo(self):
        self.user.is_active = False
        self.user.save()
        r = self.solicitar('reset@mail.com')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_throttle_limita_las_solicitudes_por_ip(self):
        for i in range(10):
            r = self.solicitar(f'desconocido{i}@mail.com')
            self.assertNotEqual(r.status_code, 429)
        r = self.solicitar('desconocido10@mail.com')
        self.assertEqual(r.status_code, 429)


class LogoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='salida@mail.com', password='Salida12345')
        self.refresh = str(RefreshToken.for_user(self.user))

    def test_logout_blanquea_el_refresh(self):
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/v1/auth/logout/',
                             {'refresh': self.refresh}, format='json')
        self.assertEqual(r.status_code, 204)
        r2 = self.client.post('/api/v1/auth/refresh/',
                              {'refresh': self.refresh}, format='json')
        self.assertEqual(r2.status_code, 401)

    def test_logout_repite_no_da_error_de_servidor(self):
        self.client.force_authenticate(self.user)
        r1 = self.client.post('/api/v1/auth/logout/',
                              {'refresh': self.refresh}, format='json')
        self.assertEqual(r1.status_code, 204)
        r2 = self.client.post('/api/v1/auth/logout/',
                              {'refresh': self.refresh}, format='json')
        self.assertEqual(r2.status_code, 400)

    def test_logout_sin_token_da_400(self):
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/v1/auth/logout/', {}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_logout_sin_autenticar_da_401(self):
        r = self.client.post('/api/v1/auth/logout/',
                             {'refresh': 'x'}, format='json')
        self.assertEqual(r.status_code, 401)


class LogSeguridadTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.dueno = User.objects.create_user(
            username='dueno_log', password='Dueno12345', rol=ROL_DUENO)
        self.cliente = User.objects.create_user(
            username='cliente_log', email='cliente_log@mail.com',
            password='Cliente12345')

    def test_acceso_denegado_queda_registrado(self):
        self.client.force_authenticate(self.cliente)
        with self.assertLogs('seguridad', level='INFO') as logs:
            r = self.client.get('/api/v1/owner/stats/')
        self.assertEqual(r.status_code, 403)
        texto = '\n'.join(logs.output)
        self.assertIn('ACCESO_DENEGADO', texto)
        self.assertIn('PERMISO_DENEGADO', texto)
        self.assertIn('cliente_log', texto)

    def test_login_fallido_queda_registrado(self):
        with self.assertLogs('seguridad', level='INFO') as logs:
            r = self.client.post('/api/v1/auth/login/', {
                'username': 'cliente_log', 'password': 'incorrecta',
            }, format='json')
        self.assertEqual(r.status_code, 401)
        self.assertIn('LOGIN_FALLIDO', '\n'.join(logs.output))

    def test_login_exitoso_queda_registrado(self):
        with self.assertLogs('seguridad', level='INFO') as logs:
            r = self.client.post('/api/v1/auth/login/', {
                'username': 'cliente_log', 'password': 'Cliente12345',
            }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('LOGIN_EXITOSO', '\n'.join(logs.output))

    def test_solicitud_de_reset_queda_registrada(self):
        with self.assertLogs('seguridad', level='INFO') as logs:
            self.client.post('/api/v1/auth/password-reset/',
                             {'email': 'cliente_log@mail.com'},
                             format='json')
        self.assertIn('PASSWORD_RESET_SOLICITADO',
                      '\n'.join(logs.output))

    def test_operacion_sensible_del_dueno_queda_registrada(self):
        self.client.force_authenticate(self.dueno)
        with self.assertLogs('seguridad', level='INFO') as logs:
            r = self.client.post('/api/v1/owner/services/', {
                'nombre': 'Corte Naval', 'precio': '1500',
            }, format='json')
        self.assertEqual(r.status_code, 201)
        texto = '\n'.join(logs.output)
        self.assertIn('OPERACION_SENSIBLE', texto)
        self.assertIn('ALTA_SERVICIO', texto)
        self.assertIn('dueno_log', texto)

    def test_el_log_nunca_contiene_passwords_ni_tokens(self):
        password = 'SuperSecreta123'
        user = User.objects.create_user(
            username='secreta@mail.com', email='secreta@mail.com',
            password=password)
        refresh = str(RefreshToken.for_user(user))

        with self.assertLogs('seguridad', level='INFO') as logs:
            self.client.post('/api/v1/auth/login/', {
                'username': 'secreta@mail.com', 'password': password,
            }, format='json')
            self.client.post('/api/v1/auth/login/', {
                'username': 'secreta@mail.com', 'password': 'otra-mala123',
            }, format='json')
            self.client.force_authenticate(user)
            self.client.post('/api/v1/auth/logout/',
                             {'refresh': refresh}, format='json')

        texto = '\n'.join(logs.output)
        self.assertIn('LOGIN_EXITOSO', texto)
        self.assertNotIn(password, texto)
        self.assertNotIn(refresh, texto)

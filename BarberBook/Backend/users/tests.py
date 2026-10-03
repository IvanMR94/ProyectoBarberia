from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from barberia.models import Barbero

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

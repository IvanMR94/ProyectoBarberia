from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import get_md5_hash_password
from rest_framework_simplejwt.views import TokenRefreshView

from config.audit import registrar_evento
from .models import User
from .serializers import UserSerializer

MENSAJE_RECUPERO_GENERICO = (
    'Si existe una cuenta con ese correo, recibirás un enlace '
    'para restablecer tu contraseña.'
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer


class PasswordResetIpThrottle(SimpleRateThrottle):
    scope = 'password_reset_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class PasswordResetEmailThrottle(SimpleRateThrottle):
    scope = 'password_reset_email'

    def get_cache_key(self, request, view):
        email = str(request.data.get('email') or '').strip().lower()
        if not email:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': email,
        }


def usuario_desde_enlace(uidb64, token):
    """Devuelve el usuario si el enlace de recuperación es válido, si no None."""
    if not uidb64 or not token:
        return None
    try:
        user_id = urlsafe_base64_decode(str(uidb64)).decode()
        user = User.objects.get(pk=user_id, is_active=True)
    except (ValueError, TypeError, OverflowError, UnicodeDecodeError,
            User.DoesNotExist):
        return None
    if not default_token_generator.check_token(user, token):
        return None
    return user


class PasswordResetRequestView(APIView):
    """Solicitud de recuperación: siempre responde igual para no revelar
    si el correo está registrado (protección contra enumeración)."""
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetIpThrottle, PasswordResetEmailThrottle)

    def post(self, request):
        email = str(request.data.get('email') or '').strip()
        respuesta = {'mensaje': MENSAJE_RECUPERO_GENERICO}
        if email:
            user = User.objects.filter(
                email__iexact=email, is_active=True).first()
            if user is not None:
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                enlace = (
                    f'{settings.FRONTEND_URL}/restablecer/{uidb64}/{token}')
                try:
                    send_mail(
                        'BarberBook: restablecé tu contraseña',
                        (
                            f'Hola {user.nombre or user.username}:\n\n'
                            'Alguien (esperamos que vos) pidió restablecer la '
                            'contraseña de tu cuenta BarberBook.\n\n'
                            'Ingresá a este enlace para elegir una nueva '
                            f'contraseña:\n{enlace}\n\n'
                            'El enlace vence en 3 días. Si no pediste este '
                            'cambio, ignorá este correo: tu contraseña no '
                            'cambió.'
                        ),
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                    )
                except Exception:
                    registrar_evento(
                        'PASSWORD_RESET_SOLICITADO', 'CORREO_FALLIDO',
                        request=request, usuario=user.username)
                    return Response(
                        {'mensaje': MENSAJE_RECUPERO_GENERICO},
                        status=status.HTTP_200_OK)
                registrar_evento(
                    'PASSWORD_RESET_SOLICITADO', 'CORREO_ENVIADO',
                    request=request, usuario=user.username)
                if settings.DEBUG:
                    # Solo en desarrollo: permite probar la UI sin SMTP.
                    respuesta['link'] = enlace
            else:
                registrar_evento(
                    'PASSWORD_RESET_SOLICITADO', 'CUENTA_INEXISTENTE',
                    request=request, detalle=email)
        return Response(respuesta, status=status.HTTP_200_OK)


class PasswordResetValidateView(APIView):
    """Comprueba si un enlace de recuperación es válido (lo usa la UI)."""
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetIpThrottle,)

    def post(self, request):
        user = usuario_desde_enlace(
            request.data.get('uidb64') or request.data.get('uid'),
            request.data.get('token'),
        )
        if user is None:
            registrar_evento(
                'PASSWORD_RESET_ENLACE_INVALIDO', 'RECHAZADO',
                request=request)
            return Response(
                {'detail': 'El enlace no es válido o expiró.'},
                status=status.HTTP_400_BAD_REQUEST)
        return Response({'valido': True}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Establece la nueva contraseña validando el enlace emitido."""
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetIpThrottle,)

    def post(self, request):
        user = usuario_desde_enlace(
            request.data.get('uidb64') or request.data.get('uid'),
            request.data.get('token'),
        )
        if user is None:
            registrar_evento(
                'PASSWORD_RESET_ENLACE_INVALIDO', 'RECHAZADO',
                request=request)
            return Response(
                {'detail': 'El enlace no es válido o expiró.'},
                status=status.HTTP_400_BAD_REQUEST)

        password = str(request.data.get('password') or '')
        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response(
                {'detail': ' '.join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        # Cerramos todas las sesiones abiertas con tokens viejos.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        registrar_evento(
            'PASSWORD_RESET_EXITOSO', 'CONTRASENA_ACTUALIZADA',
            request=request, usuario=user.username)
        return Response({
            'mensaje': 'Tu contraseña fue actualizada. Ya podés iniciar '
                       'sesión.'
        })


class LogoutView(APIView):
    """Cierra la sesión invalidando el refresh token en el servidor."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'detail': 'Falta el refresh token.'},
                status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(str(refresh)).blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token inválido o ya cerrado.'},
                status=status.HTTP_400_BAD_REQUEST)
        registrar_evento(
            'LOGOUT', 'SESION_CERRADA', request=request,
            usuario=request.user.username)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TokenRefreshConRevocacionSerializer(TokenRefreshSerializer):
    """Refresh estándar que además rechaza los tokens emitidos antes de un
    cambio/restablecimiento de contraseña: cierra la sesión en el servidor."""

    def validate(self, attrs):
        if jwt_settings.CHECK_REVOKE_TOKEN:
            refresh = self.token_class(attrs['refresh'])
            user_id = refresh.payload.get(jwt_settings.USER_ID_CLAIM)
            if user_id is not None:
                User = get_user_model()
                try:
                    user = User.objects.get(
                        **{jwt_settings.USER_ID_FIELD: user_id})
                except User.DoesNotExist:
                    user = None
                if (user is not None and refresh.payload.get(
                        jwt_settings.REVOKE_TOKEN_CLAIM)
                        != get_md5_hash_password(user.password)):
                    raise AuthenticationFailed(
                        'La sesión fue cerrada por un cambio de contraseña.')
        return super().validate(attrs)


class TokenRefreshConRevocacionView(TokenRefreshView):
    serializer_class = TokenRefreshConRevocacionSerializer

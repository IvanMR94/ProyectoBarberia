import os
import secrets
import sys
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga simple del archivo .env (sin dependencias externas)
_env_file = BASE_DIR / '.env'
if _env_file.exists():
    for _line in _env_file.read_text(encoding='utf-8').splitlines():
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _key, _value = _line.split('=', 1)
            os.environ.setdefault(_key.strip(), _value.strip())


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: don't run with debug turned on in production!
# Seguro por defecto: DEBUG solo si el entorno lo activa explícitamente
# (el .env de desarrollo pone DJANGO_DEBUG=True; producción va sin .env).
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG and 'test' not in sys.argv:
        raise ImproperlyConfigured(
            'Falta DJANGO_SECRET_KEY: es obligatoria cuando DEBUG=False. '
            'Definila en el .env o en las variables de entorno.'
        )
    # Desarrollo sin .env: clave efímera (cambia en cada reinicio).
    SECRET_KEY = secrets.token_urlsafe(50)

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',        # Nuestra API
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Invalidación de refresh tokens rotados
    'corsheaders',
    'users',
    'barberia',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Registra respuestas 401/403/429 de la API en el log de seguridad.
    'config.middleware.RegistroAccesosDenegadosMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# Base de datos: MySQL vía variables de entorno (Docker o .env local).
# Si no hay configuración (DB_HOST vacío), se usa SQLite como fallback de desarrollo.
DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.environ.get('DB_NAME', str(BASE_DIR / 'db.sqlite3')),
        'USER': os.environ.get('DB_USER', ''),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', ''),
        'PORT': os.environ.get('DB_PORT', ''),
    }
}

if DATABASES['default']['HOST']:
    DATABASES['default']['OPTIONS'] = {'charset': 'utf8mb4'}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'es-ar'

TIME_ZONE = 'America/Argentina/Cordoba'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_RATES': {
        # IP generosa: varias personas de una sucursal comparten IP pública.
        # Cuenta estricta: frena fuerza bruta dirigida aunque venga de muchas IPs.
        'login_ip': '60/min',
        'login_usuario': '10/min',
        # Recuperación de contraseña: frena spam de correos por IP y por cuenta.
        'password_reset_ip': '10/h',
        'password_reset_email': '5/h',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    # Tokens firmados con el hash de la contraseña: al cambiarla (reset desde
    # la app o desde el admin) todos los access tokens vigentes quedan inválidos.
    'CHECK_REVOKE_TOKEN': True,
}


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Horario de atención y duración de cada cita (configurables por entorno)
BARBERIA_HORA_INICIO = int(os.environ.get('BARBERIA_HORA_INICIO', '9'))
BARBERIA_HORA_FIN = int(os.environ.get('BARBERIA_HORA_FIN', '21'))
BARBERIA_DURACION_CITA_MINUTOS = int(
    os.environ.get('BARBERIA_DURACION_CITA_MINUTOS', '60'))

# Lealtad / fidelidad: descuentos automáticos por frecuencia de visitas.
# Medición: visitas COMPLETADAS en los últimos 30 días corridos.
LEALTAD_VISITAS_MINIMAS = 3          # piso histórico: sin 3 visitas no hay descuento
LEALTAD_UMBRAL_FRECUENTE = 2         # visitas en 30 días -> Frecuente
LEALTAD_DESCUENTO_FRECUENTE_PCT = 5
LEALTAD_UMBRAL_PREFERENCIAL = 3      # visitas en 30 días -> Preferencial
LEALTAD_DESCUENTO_PREFERENCIAL_PCT = 10

CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]


# --- Correo electrónico (recuperación de contraseñas) ---
# Por defecto: consola -> el correo se imprime en 'docker logs barberbook_api'.
# Para envío real: EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# en el .env junto con EMAIL_HOST/EMAIL_HOST_USER/EMAIL_HOST_PASSWORD.
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get(
    'EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL', 'noreply@barberbook.local')

# URL pública del frontend para armar los enlaces de recuperación
FRONTEND_URL = os.environ.get(
    'FRONTEND_URL', 'http://localhost:4200').rstrip('/')

# Vigencia del enlace de recuperación de contraseña (3 días)
PASSWORD_RESET_TIMEOUT = 60 * 60 * 24 * 3


# --- Log de seguridad ---
# Eventos: logins, accesos denegados (401/403/429), throttles y
# solicitudes/confirmaciones de recuperación de contraseña.
# Los archivos de log jamás se versionan (ver .gitignore).
(BASE_DIR / 'logs').mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'seguridad': {
            'format': '[{asctime}] {levelname} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'archivo_seguridad': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'seguridad.log',
            'formatter': 'seguridad',
            'encoding': 'utf-8',
        },
        'consola_seguridad': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'seguridad',
        },
    },
    'loggers': {
        'seguridad': {
            'handlers': ['archivo_seguridad', 'consola_seguridad'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
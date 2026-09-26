import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------------------------------------------
# Core security settings (override via environment variables in production)
# --------------------------------------------------------------------------
SECRET_KEY = os.getenv('SECRET_KEY', '')

DEBUG = os.getenv('DEBUG', 'true').lower() in ('true', '1', 'yes', 'on')

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-edgen-shop-pos-key-secret-dev-infantary'
    else:
        # Never run production on the hard-coded dev key. Render generates one
        # via `generateValue: true`; this fallback only keeps the boot safe.
        import secrets as _secrets

        SECRET_KEY = _secrets.token_urlsafe(64)
        print('WARNING: SECRET_KEY is not set. Generated a temporary one; '
              'sessions will reset on every restart. Set SECRET_KEY in the '
              'Render environment variables.')

# Hosts: '*' while developing, *.onrender.com by default on Render, or a
# comma-separated ALLOWED_HOSTS environment variable.
_allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['.onrender.com']

# Needed so POSTs (login, API writes) pass Django's CSRF check behind Render's
# HTTPS proxy. Comma-separated, e.g. "https://myapp.onrender.com,https://shop.io"
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
    if o.strip()
]
if not CSRF_TRUSTED_ORIGINS and not DEBUG:
    CSRF_TRUSTED_ORIGINS = ['https://*.onrender.com']

# Render terminates TLS and forwards the original scheme in this header.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ims_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'edgen_shop.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'edgen_shop.wsgi.application'

# --------------------------------------------------------------------------
# Database configuration
#
# Priority:
#   1. DATABASE_URL  (Render injects this when a Postgres DB is attached)
#   2. MySQL         (set USE_MYSQL=true plus the MYSQL_* variables)
#   3. SQLite        (local development fallback)
# --------------------------------------------------------------------------
DATABASE_URL = os.getenv('DATABASE_URL', '').strip()

MYSQL_NAME = os.getenv('MYSQL_DB_NAME', 'edgen_shop_db')
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_PORT = os.getenv('MYSQL_PORT', '3306')

USE_MYSQL = os.getenv('USE_MYSQL', 'true').lower() in ('true', '1', 'yes', 'on')

if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
    USE_MYSQL = False
elif USE_MYSQL:
    try:
        import pymysql
        _conn = pymysql.connect(
            host=MYSQL_HOST,
            port=int(MYSQL_PORT),
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_NAME,
            connect_timeout=2
        )
        _conn.close()
    except Exception as _e:
        if not DEBUG:
            # Never silently fall back to an ephemeral SQLite file in production
            raise RuntimeError(
                f"MySQL is configured but unreachable ({_e}). "
                "Set DATABASE_URL, fix the MYSQL_* variables, or set USE_MYSQL=false."
            )
        print(f"MySQL connection unavailable ({_e}). Falling back to SQLite.")
        USE_MYSQL = False

if not DATABASE_URL and USE_MYSQL:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': MYSQL_NAME,
            'USER': MYSQL_USER,
            'PASSWORD': MYSQL_PASSWORD,
            'HOST': MYSQL_HOST,
            'PORT': MYSQL_PORT,
            'OPTIONS': {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                'charset': 'utf8mb4',
            }
        }
    }
elif not DATABASE_URL:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Karachi'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# In production, gunicorn serves collected statics through WhiteNoise with
# long-lived cache headers and hashed filenames.
if not DEBUG:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

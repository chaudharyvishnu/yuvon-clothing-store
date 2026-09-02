"""
Django settings for yuvon_backend project.
"""

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


# =========================================================
# Base Directory / Environment
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

ENV_FILE = BASE_DIR / ".env"

load_dotenv(
    dotenv_path=ENV_FILE,
    override=False,
)


# =========================================================
# Environment Helpers
# =========================================================

def env_bool(
    name,
    default=False,
):
    value = os.getenv(name)

    if value is None:
        return default

    return (
        value.strip().lower()
        in {
            "1",
            "true",
            "yes",
            "on",
        }
    )


def env_list(
    name,
    default="",
):
    return [
        item.strip()
        for item in os.getenv(
            name,
            default,
        ).split(",")
        if item.strip()
    ]


def env_int(
    name,
    default,
):
    try:
        return int(
            os.getenv(
                name,
                str(default),
            )
        )

    except (
        TypeError,
        ValueError,
    ):
        return int(default)


# =========================================================
# Core Security
# =========================================================

DEBUG = env_bool(
    "DEBUG",
    default=True,
)


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "",
).strip()


if not SECRET_KEY:

    if DEBUG:
        SECRET_KEY = (
            "django-insecure-local-development-key-change-me"
        )

    else:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be configured in production."
        )


ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    (
        "127.0.0.1,"
        "localhost"
    )
    if DEBUG
    else "",
)


if (
    not DEBUG
    and not ALLOWED_HOSTS
):
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS must be configured in production."
    )


# =========================================================
# CSRF Trusted Origins
# =========================================================

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )
    if DEBUG
    else "",
)


# =========================================================
# Production Security
# =========================================================

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SECURE_REFERRER_POLICY = (
    "strict-origin-when-cross-origin"
)


if not DEBUG:

    SECURE_SSL_REDIRECT = env_bool(
        "SECURE_SSL_REDIRECT",
        default=True,
    )

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SESSION_COOKIE_HTTPONLY = True

    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"

    SECURE_HSTS_SECONDS = env_int(
        "SECURE_HSTS_SECONDS",
        31536000,
    )

    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS",
        default=True,
    )

    SECURE_HSTS_PRELOAD = env_bool(
        "SECURE_HSTS_PRELOAD",
        default=True,
    )

    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )


# =========================================================
# Cloudinary Configuration
# =========================================================

CLOUDINARY_CLOUD_NAME = os.getenv(
    "CLOUDINARY_CLOUD_NAME",
    "",
).strip()


CLOUDINARY_API_KEY = os.getenv(
    "CLOUDINARY_API_KEY",
    "",
).strip()


CLOUDINARY_API_SECRET = os.getenv(
    "CLOUDINARY_API_SECRET",
    "",
).strip()


CLOUDINARY_URL = os.getenv(
    "CLOUDINARY_URL",
    "",
).strip()


CLOUDINARY_SEPARATE_CREDENTIALS_CONFIGURED = all(
    [
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET,
    ]
)


CLOUDINARY_CONFIGURED = bool(
    CLOUDINARY_URL
    or CLOUDINARY_SEPARATE_CREDENTIALS_CONFIGURED
)


USE_CLOUDINARY = env_bool(
    "USE_CLOUDINARY",
    default=(
        not DEBUG
        and CLOUDINARY_CONFIGURED
    ),
)


if (
    USE_CLOUDINARY
    and not CLOUDINARY_CONFIGURED
):
    raise ImproperlyConfigured(
        "USE_CLOUDINARY=True but Cloudinary credentials "
        "are not configured."
    )


CLOUDINARY_STORAGE = {
    "SECURE": True,
}


if CLOUDINARY_CLOUD_NAME:
    CLOUDINARY_STORAGE[
        "CLOUD_NAME"
    ] = CLOUDINARY_CLOUD_NAME


if CLOUDINARY_API_KEY:
    CLOUDINARY_STORAGE[
        "API_KEY"
    ] = CLOUDINARY_API_KEY


if CLOUDINARY_API_SECRET:
    CLOUDINARY_STORAGE[
        "API_SECRET"
    ] = CLOUDINARY_API_SECRET


# =========================================================
# Applications
# =========================================================

INSTALLED_APPS = [

    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third Party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",

    # Cloudinary
    "cloudinary_storage",
    "cloudinary",

    # Celery
    "django_celery_results",
    "django_celery_beat",

    # Project
    "accounts",
    "categories",
    "products",
    "cart",
    "wishlist",
    "orders.apps.OrdersConfig",
    "reviews",
    "coupons",
    "inventory",
    "dashboard",
    "core",
]


# =========================================================
# WhiteNoise
# =========================================================

USE_WHITENOISE = env_bool(
    "USE_WHITENOISE",
    default=not DEBUG,
)


# =========================================================
# Middleware
# =========================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
]


if USE_WHITENOISE:
    MIDDLEWARE.append(
        "whitenoise.middleware.WhiteNoiseMiddleware"
    )


MIDDLEWARE += [

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = (
    "yuvon_backend.urls"
)


# =========================================================
# Templates
# =========================================================

TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django.DjangoTemplates"
        ),

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

        "OPTIONS": {

            "context_processors": [

                (
                    "django.template.context_processors."
                    "request"
                ),

                (
                    "django.contrib.auth.context_processors."
                    "auth"
                ),

                (
                    "django.contrib.messages.context_processors."
                    "messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = (
    "yuvon_backend.wsgi.application"
)


# =========================================================
# Database
# =========================================================

DATABASE_ENGINE = os.getenv(
    "DATABASE_ENGINE",
    "sqlite",
).strip().lower()


if DATABASE_ENGINE in {
    "postgres",
    "postgresql",
}:

    DATABASES = {

        "default": {

            "ENGINE":
                "django.db.backends.postgresql",

            "NAME":
                os.getenv(
                    "DB_NAME",
                    "yuvon_db",
                ),

            "USER":
                os.getenv(
                    "DB_USER",
                    "postgres",
                ),

            "PASSWORD":
                os.getenv(
                    "DB_PASSWORD",
                    "",
                ),

            "HOST":
                os.getenv(
                    "DB_HOST",
                    "127.0.0.1",
                ),

            "PORT":
                os.getenv(
                    "DB_PORT",
                    "5432",
                ),

            "CONN_MAX_AGE":
                env_int(
                    "DB_CONN_MAX_AGE",
                    60,
                ),

            "OPTIONS": {

                "connect_timeout":
                    env_int(
                        "DB_CONNECT_TIMEOUT",
                        10,
                    ),
            },
        }
    }


else:

    DATABASES = {

        "default": {

            "ENGINE":
                "django.db.backends.sqlite3",

            "NAME":
                BASE_DIR / "db.sqlite3",
        }
    }


if (
    not DEBUG
    and DATABASE_ENGINE == "sqlite"
    and not env_bool(
        "ALLOW_SQLITE_IN_PRODUCTION",
        default=False,
    )
):
    raise ImproperlyConfigured(
        "SQLite is disabled for production. "
        "Configure PostgreSQL or set "
        "ALLOW_SQLITE_IN_PRODUCTION=True temporarily."
    )


# =========================================================
# Password Validation
# =========================================================

AUTH_PASSWORD_VALIDATORS = [

    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },

    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },

    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },

    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# =========================================================
# Internationalization
# =========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# =========================================================
# Static Files
# =========================================================

STATIC_URL = "/static/"

STATIC_ROOT = (
    BASE_DIR /
    "staticfiles"
)


STATICFILES_STORAGE = (
    "django.contrib.staticfiles.storage."
    "StaticFilesStorage"
)


# =========================================================
# Media Files
# =========================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = (
    BASE_DIR /
    "media"
)


# =========================================================
# Storage Backends
# =========================================================

if USE_CLOUDINARY:

    STORAGES = {

        "default": {

            "BACKEND": (
                "cloudinary_storage.storage."
                "MediaCloudinaryStorage"
            ),
        },

        "staticfiles": {

            "BACKEND": (
                "django.contrib.staticfiles.storage."
                "StaticFilesStorage"
            ),
        },
    }


else:

    STORAGES = {

        "default": {

            "BACKEND": (
                "django.core.files.storage."
                "FileSystemStorage"
            ),
        },

        "staticfiles": {

            "BACKEND": (
                "django.contrib.staticfiles.storage."
                "StaticFilesStorage"
            ),
        },
    }


WHITENOISE_MANIFEST_STRICT = False


# =========================================================
# Local Media Serving
# =========================================================

SERVE_MEDIA_LOCALLY = (
    env_bool(
        "SERVE_MEDIA_LOCALLY",
        default=DEBUG,
    )
    and not USE_CLOUDINARY
)


# =========================================================
# File Upload Limits
# =========================================================

DATA_UPLOAD_MAX_MEMORY_SIZE = env_int(
    "DATA_UPLOAD_MAX_MEMORY_SIZE",
    50 * 1024 * 1024,
)


FILE_UPLOAD_MAX_MEMORY_SIZE = env_int(
    "FILE_UPLOAD_MAX_MEMORY_SIZE",
    10 * 1024 * 1024,
)


# =========================================================
# CORS
# =========================================================

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )
    if DEBUG
    else "",
)


CORS_ALLOW_CREDENTIALS = True


CORS_ALLOW_HEADERS = [

    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]


# =========================================================
# Django REST Framework
# =========================================================

REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (

        (
            "rest_framework_simplejwt."
            "authentication.JWTAuthentication"
        ),
    ),

    "DEFAULT_PERMISSION_CLASSES": (

        "rest_framework.permissions.AllowAny",
    ),

    "DEFAULT_PAGINATION_CLASS": (

        "rest_framework.pagination."
        "PageNumberPagination"
    ),

    "PAGE_SIZE":
        env_int(
            "API_PAGE_SIZE",
            20,
        ),

    "DEFAULT_RENDERER_CLASSES": (

        (
            "rest_framework.renderers."
            "JSONRenderer"
        ),
    )
    if not DEBUG
    else (

        "rest_framework.renderers.JSONRenderer",

        (
            "rest_framework.renderers."
            "BrowsableAPIRenderer"
        ),
    ),
}


# =========================================================
# JWT
# =========================================================

SIMPLE_JWT = {

    "ACCESS_TOKEN_LIFETIME":
        timedelta(
            minutes=env_int(
                "JWT_ACCESS_MINUTES",
                60,
            )
        ),

    "REFRESH_TOKEN_LIFETIME":
        timedelta(
            days=env_int(
                "JWT_REFRESH_DAYS",
                30,
            )
        ),

    "ROTATE_REFRESH_TOKENS":
        True,

    "BLACKLIST_AFTER_ROTATION":
        True,

    "UPDATE_LAST_LOGIN":
        True,

    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),
}


# =========================================================
# Custom User
# =========================================================

AUTH_USER_MODEL = (
    "accounts.User"
)


DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# =========================================================
# Frontend
# =========================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).strip().rstrip("/")


# =========================================================
# Email / SMTP
# =========================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    (
        "django.core.mail.backends.console.EmailBackend"
        if DEBUG
        else
        "django.core.mail.backends.smtp.EmailBackend"
    ),
).strip()


EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "smtp.gmail.com",
).strip()


EMAIL_PORT = env_int(
    "EMAIL_PORT",
    587,
)


EMAIL_USE_TLS = env_bool(
    "EMAIL_USE_TLS",
    default=True,
)


EMAIL_USE_SSL = env_bool(
    "EMAIL_USE_SSL",
    default=False,
)


if (
    EMAIL_USE_TLS
    and EMAIL_USE_SSL
):
    raise ImproperlyConfigured(
        "EMAIL_USE_TLS and EMAIL_USE_SSL "
        "cannot both be True."
    )


EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
).strip()


EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
).strip()


DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    (
        EMAIL_HOST_USER
        or
        "Yuvon <no-reply@yuvon.com>"
    ),
).strip()


SERVER_EMAIL = os.getenv(
    "SERVER_EMAIL",
    DEFAULT_FROM_EMAIL,
).strip()


EMAIL_TIMEOUT = env_int(
    "EMAIL_TIMEOUT",
    20,
)


ADMIN_EMAILS = env_list(
    "ADMIN_EMAILS",
    "",
)


ADMINS = [

    (
        f"Admin {index + 1}",
        email,
    )

    for (
        index,
        email,
    )
    in enumerate(
        ADMIN_EMAILS
    )
]


ORDER_NOTIFICATION_EMAIL = (
    os.getenv(
        "ORDER_NOTIFICATION_EMAIL",
        (
            ADMIN_EMAILS[0]
            if ADMIN_EMAILS
            else ""
        ),
    )
    .strip()
)


# =========================================================
# Cache
# =========================================================

CACHES = {

    "default": {

        "BACKEND": (
            "django.core.cache.backends.locmem."
            "LocMemCache"
        ),

        "LOCATION":
            "yuvon-dashboard-cache",

        "TIMEOUT":
            env_int(
                "CACHE_TIMEOUT",
                300,
            ),
    }
}


# =========================================================
# Redis
# =========================================================

REDIS_HOST = os.getenv(
    "REDIS_HOST",
    "127.0.0.1",
).strip()


REDIS_PORT = env_int(
    "REDIS_PORT",
    6379,
)


REDIS_DB = env_int(
    "REDIS_DB",
    0,
)


REDIS_PASSWORD = os.getenv(
    "REDIS_PASSWORD",
    "",
).strip()


if REDIS_PASSWORD:

    DEFAULT_REDIS_URL = (

        f"redis://:"
        f"{REDIS_PASSWORD}"

        f"@{REDIS_HOST}:"
        f"{REDIS_PORT}/"
        f"{REDIS_DB}"
    )


else:

    DEFAULT_REDIS_URL = (

        f"redis://"

        f"{REDIS_HOST}:"
        f"{REDIS_PORT}/"
        f"{REDIS_DB}"
    )


# =========================================================
# Celery
# =========================================================

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    DEFAULT_REDIS_URL,
).strip()


CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    "django-db",
).strip()


CELERY_CACHE_BACKEND = os.getenv(
    "CELERY_CACHE_BACKEND",
    "django-cache",
).strip()


CELERY_ACCEPT_CONTENT = [
    "json",
]


CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE

CELERY_ENABLE_UTC = True

CELERY_TASK_TRACK_STARTED = True


CELERY_TASK_TIME_LIMIT = env_int(
    "CELERY_TASK_TIME_LIMIT",
    300,
)


CELERY_TASK_SOFT_TIME_LIMIT = env_int(
    "CELERY_TASK_SOFT_TIME_LIMIT",
    240,
)


CELERY_RESULT_EXPIRES = env_int(
    "CELERY_RESULT_EXPIRES",
    86400,
)


CELERY_WORKER_PREFETCH_MULTIPLIER = env_int(
    "CELERY_WORKER_PREFETCH_MULTIPLIER",
    1,
)


CELERY_TASK_ACKS_LATE = env_bool(
    "CELERY_TASK_ACKS_LATE",
    default=True,
)


CELERY_TASK_REJECT_ON_WORKER_LOST = True

CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_BROKER_CONNECTION_RETRY = True


CELERY_BROKER_CONNECTION_MAX_RETRIES = env_int(
    "CELERY_BROKER_CONNECTION_MAX_RETRIES",
    10,
)


CELERY_TASK_DEFAULT_QUEUE = os.getenv(
    "CELERY_TASK_DEFAULT_QUEUE",
    "default",
).strip()


CELERY_TASK_ROUTES = {

    "orders.tasks.*": {

        "queue":
            "orders",
    },
}


CELERY_TASK_ALWAYS_EAGER = env_bool(
    "CELERY_TASK_ALWAYS_EAGER",
    default=False,
)


CELERY_TASK_EAGER_PROPAGATES = env_bool(
    "CELERY_TASK_EAGER_PROPAGATES",
    default=True,
)


# =========================================================
# Razorpay
# =========================================================

RAZORPAY_KEY_ID = os.getenv(
    "RAZORPAY_KEY_ID",
    "",
).strip()


RAZORPAY_KEY_SECRET = os.getenv(
    "RAZORPAY_KEY_SECRET",
    "",
).strip()


# =========================================================
# Shiprocket
# =========================================================
#
# These credentials belong to the Shiprocket API User,
# NOT necessarily the normal dashboard login.
#
# Local:
# backend/.env
#
# Production:
# Railway -> Service -> Variables
#
# Required variables:
#
# SHIPROCKET_EMAIL=...
# SHIPROCKET_PASSWORD=...
#
# =========================================================

SHIPROCKET_EMAIL = os.getenv(
    "SHIPROCKET_EMAIL",
    "",
).strip()


SHIPROCKET_PASSWORD = os.getenv(
    "SHIPROCKET_PASSWORD",
    "",
).strip()


SHIPROCKET_BASE_URL = os.getenv(
    "SHIPROCKET_BASE_URL",
    "https://apiv2.shiprocket.in/v1/external",
).strip().rstrip("/")


SHIPROCKET_TIMEOUT = env_int(
    "SHIPROCKET_TIMEOUT",
    30,
)


SHIPROCKET_CONFIGURED = bool(
    SHIPROCKET_EMAIL
    and SHIPROCKET_PASSWORD
)


# ---------------------------------------------------------
# Pickup configuration
# ---------------------------------------------------------
#
# After adding/verifying the pickup address in Shiprocket,
# put the exact Shiprocket pickup location nickname/code
# in this variable.
#
# Example:
# SHIPROCKET_PICKUP_LOCATION=Primary
#
# ---------------------------------------------------------

SHIPROCKET_PICKUP_LOCATION = os.getenv(
    "SHIPROCKET_PICKUP_LOCATION",
    "",
).strip()


# ---------------------------------------------------------
# Optional shipment defaults
# ---------------------------------------------------------

SHIPROCKET_LENGTH = os.getenv(
    "SHIPROCKET_LENGTH",
    "10",
).strip()


SHIPROCKET_BREADTH = os.getenv(
    "SHIPROCKET_BREADTH",
    "10",
).strip()


SHIPROCKET_HEIGHT = os.getenv(
    "SHIPROCKET_HEIGHT",
    "5",
).strip()


SHIPROCKET_WEIGHT = os.getenv(
    "SHIPROCKET_WEIGHT",
    "0.5",
).strip()


SHIPROCKET_CHANNEL_ID = os.getenv(
    "SHIPROCKET_CHANNEL_ID",
    "",
).strip()


SHIPROCKET_AUTO_CREATE_SHIPMENT = env_bool(
    "SHIPROCKET_AUTO_CREATE_SHIPMENT",
    default=False,
)


# =========================================================
# Logging
# =========================================================

LOG_LEVEL = os.getenv(
    "DJANGO_LOG_LEVEL",
    "INFO",
).upper()


LOGGING = {

    "version":
        1,

    "disable_existing_loggers":
        False,

    "formatters": {

        "verbose": {

            "format": (

                "{levelname} "
                "{asctime} "
                "{name} "
                "{module} "
                "{message}"
            ),

            "style":
                "{",
        },
    },

    "handlers": {

        "console": {

            "class":
                "logging.StreamHandler",

            "formatter":
                "verbose",
        },
    },

    "root": {

        "handlers": [
            "console",
        ],

        "level":
            LOG_LEVEL,
    },

    "loggers": {

        "django": {

            "handlers": [
                "console",
            ],

            "level":
                LOG_LEVEL,

            "propagate":
                False,
        },

        "django.request": {

            "handlers": [
                "console",
            ],

            "level":
                (
                    "WARNING"
                    if not DEBUG
                    else "INFO"
                ),

            "propagate":
                False,
        },
    },
}


# =========================================================
# Optional Local File Logging
# =========================================================

ENABLE_FILE_LOGGING = env_bool(
    "ENABLE_FILE_LOGGING",
    default=DEBUG,
)


if ENABLE_FILE_LOGGING:

    LOG_DIR = (
        BASE_DIR /
        "logs"
    )


    LOG_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )


    LOGGING[
        "handlers"
    ][
        "file"
    ] = {

        "class": (
            "logging.handlers."
            "RotatingFileHandler"
        ),

        "filename":
            str(
                LOG_DIR /
                "django.log"
            ),

        "maxBytes":
            5 *
            1024 *
            1024,

        "backupCount":
            5,

        "formatter":
            "verbose",
    }


    LOGGING[
        "root"
    ][
        "handlers"
    ].append(
        "file"
    )


# =========================================================
# Production Validation
# =========================================================

if not DEBUG:

    if not CORS_ALLOWED_ORIGINS:

        raise ImproperlyConfigured(
            "CORS_ALLOWED_ORIGINS must be configured "
            "for production."
        )


    if not CSRF_TRUSTED_ORIGINS:

        raise ImproperlyConfigured(
            "CSRF_TRUSTED_ORIGINS must be configured "
            "for production."
        )


    if SECRET_KEY.startswith(
        "django-insecure"
    ):

        raise ImproperlyConfigured(
            "A secure DJANGO_SECRET_KEY is required "
            "for production."
        )


# =========================================================
# Development Configuration Output
# =========================================================

if DEBUG:

    print(
        "\n"
        + "=" * 70
    )


    print(
        "YUVON DEVELOPMENT CONFIGURATION"
    )


    print(
        "=" * 70
    )


    print(
        "DEBUG:",
        DEBUG,
    )


    print(
        "ENV FILE:",
        ENV_FILE,
    )


    print(
        "ENV EXISTS:",
        ENV_FILE.exists(),
    )


    print(
        "DATABASE ENGINE:",
        DATABASE_ENGINE,
    )


    print(
        "MEDIA URL:",
        MEDIA_URL,
    )


    print(
        "MEDIA ROOT:",
        MEDIA_ROOT,
    )


    print(
        "USE CLOUDINARY:",
        USE_CLOUDINARY,
    )


    print(
        "CLOUDINARY CONFIGURED:",
        CLOUDINARY_CONFIGURED,
    )


    print(
        "CLOUDINARY CLOUD NAME:",
        (
            CLOUDINARY_CLOUD_NAME
            if CLOUDINARY_CLOUD_NAME
            else "Not configured"
        ),
    )


    print(
        "SERVE MEDIA LOCALLY:",
        SERVE_MEDIA_LOCALLY,
    )


    print(
        "DEFAULT STORAGE:",
        STORAGES[
            "default"
        ][
            "BACKEND"
        ],
    )


    print(
        "STATIC STORAGE:",
        STORAGES[
            "staticfiles"
        ][
            "BACKEND"
        ],
    )


    print(
        "STATICFILES STORAGE COMPATIBILITY:",
        STATICFILES_STORAGE,
    )


    print(
        "WHITENOISE MANIFEST STRICT:",
        WHITENOISE_MANIFEST_STRICT,
    )


    print(
        "EMAIL BACKEND:",
        EMAIL_BACKEND,
    )


    print(
        "EMAIL HOST USER CONFIGURED:",
        bool(
            EMAIL_HOST_USER
        ),
    )


    print(
        "RAZORPAY KEY CONFIGURED:",
        bool(
            RAZORPAY_KEY_ID
            and RAZORPAY_KEY_SECRET
        ),
    )


    print(
        "SHIPROCKET CONFIGURED:",
        SHIPROCKET_CONFIGURED,
    )


    print(
        "SHIPROCKET BASE URL:",
        SHIPROCKET_BASE_URL,
    )


    print(
        "SHIPROCKET PICKUP LOCATION:",
        (
            SHIPROCKET_PICKUP_LOCATION
            if SHIPROCKET_PICKUP_LOCATION
            else "Not configured"
        ),
    )


    print(
        "SHIPROCKET AUTO CREATE SHIPMENT:",
        SHIPROCKET_AUTO_CREATE_SHIPMENT,
    )


    print(
        "CELERY BROKER:",
        CELERY_BROKER_URL,
    )


    print(
        "CELERY RESULT BACKEND:",
        CELERY_RESULT_BACKEND,
    )


    print(
        "CELERY EAGER MODE:",
        CELERY_TASK_ALWAYS_EAGER,
    )


    print(
        "WHITENOISE:",
        USE_WHITENOISE,
    )


    print(
        "FRONTEND URL:",
        FRONTEND_URL,
    )


    print(
        "CORS ALLOWED ORIGINS:",
        CORS_ALLOWED_ORIGINS,
    )


    print(
        "=" * 70
        + "\n"
    )
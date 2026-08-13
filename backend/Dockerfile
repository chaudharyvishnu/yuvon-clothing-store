FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Build static files inside the Docker image.
# Temporary build-only settings avoid requiring Railway
# production secrets/database during image build.
RUN DEBUG=True \
    DJANGO_SECRET_KEY=django-insecure-build-only-key \
    DATABASE_ENGINE=sqlite \
    USE_WHITENOISE=True \
    python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "gunicorn yuvon_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -"]
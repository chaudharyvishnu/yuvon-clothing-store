import os

from celery import Celery

# Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "yuvon_backend.settings")

# Create Celery application
app = Celery("yuvon_backend")

# Read Celery configuration from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
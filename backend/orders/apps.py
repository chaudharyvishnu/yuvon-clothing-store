from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "orders"
    verbose_name = "Orders"

    def ready(self):
        """
        Automatically register Django signals when the app starts.
        """
        import orders.signals  # noqa: F401
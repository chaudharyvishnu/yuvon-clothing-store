from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "mobile",
        "role",
        "is_verified",
        "is_staff",
    )

    list_filter = (
        "role",
        "is_verified",
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "Yuvon Information",
            {
                "fields": (
                    "mobile",
                    "profile_image",
                    "role",
                    "is_verified",
                )
            },
        ),
    )
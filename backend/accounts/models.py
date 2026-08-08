from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = "admin"
    ROLE_CUSTOMER = "customer"
    ROLE_STAFF = "staff"
    ROLE_DELIVERY = "delivery"

    ROLE_CHOICES = (
        (ROLE_ADMIN, "Admin"),
        (ROLE_CUSTOMER, "Customer"),
        (ROLE_STAFF, "Staff"),
        (ROLE_DELIVERY, "Delivery Boy"),
    )

    mobile_validator = RegexValidator(
        regex=r"^\d{10}$",
        message="Enter a valid 10-digit mobile number.",
    )

    email = models.EmailField(
        unique=True,
        null=True,
        blank=True,
    )

    mobile = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True,
        validators=[mobile_validator],
        db_index=True,
    )

    profile_image = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_CUSTOMER,
        db_index=True,
    )

    is_verified = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return (
            self.get_full_name().strip()
            or self.username
            or self.email
            or self.mobile
            or f"User {self.pk}"
        )

    def save(self, *args, **kwargs):
        if self.mobile:
            self.mobile = "".join(
                character
                for character in str(self.mobile)
                if character.isdigit()
            )

        if self.email:
            self.email = self.email.strip().lower()

        if self.role == self.ROLE_ADMIN:
            self.is_staff = True
            self.is_superuser = True

        elif self.role == self.ROLE_STAFF:
            self.is_staff = True

        super().save(*args, **kwargs)

    @property
    def display_name(self):
        return (
            self.get_full_name().strip()
            or self.username
            or self.email
            or self.mobile
            or "Customer"
        )

    @property
    def is_customer(self):
        return self.role == self.ROLE_CUSTOMER

    @property
    def is_delivery_user(self):
        return self.role == self.ROLE_DELIVERY
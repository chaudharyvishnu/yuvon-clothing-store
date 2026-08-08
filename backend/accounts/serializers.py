from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


# =========================================================
# User
# =========================================================

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "email",
            "mobile",
            "role",
            "profile_image",
            "is_verified",

            # Django authorization flags
            "is_active",
            "is_staff",
            "is_superuser",

            "created_at",
        )

        read_only_fields = (
            "id",
            "role",
            "is_verified",
            "is_active",
            "is_staff",
            "is_superuser",
            "created_at",
        )


# =========================================================
# Register
# =========================================================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "mobile",
            "password",
            "confirm_password",
        )

        read_only_fields = (
            "id",
        )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(
            email=email
        ).exists():
            raise serializers.ValidationError(
                "Email already registered."
            )

        return email

    def validate_mobile(self, value):
        mobile = "".join(
            filter(
                str.isdigit,
                value,
            )
        )

        if len(mobile) != 10:
            raise serializers.ValidationError(
                "Enter valid 10 digit mobile number."
            )

        if User.objects.filter(
            mobile=mobile
        ).exists():
            raise serializers.ValidationError(
                "Mobile number already registered."
            )

        return mobile

    def validate(self, attrs):
        if (
            attrs["password"]
            != attrs["confirm_password"]
        ):
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop(
            "confirm_password"
        )

        password = validated_data.pop(
            "password"
        )

        user = User.objects.create_user(
            username=validated_data[
                "username"
            ],
            email=validated_data[
                "email"
            ],
            mobile=validated_data[
                "mobile"
            ],
            first_name=validated_data.get(
                "first_name",
                "",
            ),
            last_name=validated_data.get(
                "last_name",
                "",
            ),
            password=password,
            role=User.ROLE_CUSTOMER,
        )

        return user


# =========================================================
# Login
# =========================================================

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()

    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        username = attrs.get(
            "username"
        )

        password = attrs.get(
            "password"
        )

        user = authenticate(
            username=username,
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid username or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "User account is disabled."
            )

        refresh = RefreshToken.for_user(
            user
        )

        return {
            "user": UserSerializer(
                user,
                context=self.context,
            ).data,
            "refresh": str(
                refresh
            ),
            "access": str(
                refresh.access_token
            ),
        }


# =========================================================
# Profile Update
# =========================================================

class ProfileUpdateSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = User

        fields = (
            "first_name",
            "last_name",
            "email",
            "mobile",
            "profile_image",
        )

    def validate_mobile(self, value):
        mobile = "".join(
            filter(
                str.isdigit,
                value,
            )
        )

        if len(mobile) != 10:
            raise serializers.ValidationError(
                "Enter valid 10 digit mobile number."
            )

        exists = User.objects.filter(
            mobile=mobile
        ).exclude(
            id=self.instance.id
        )

        if exists.exists():
            raise serializers.ValidationError(
                "Mobile already exists."
            )

        return mobile

    def validate_email(self, value):
        email = value.strip().lower()

        exists = User.objects.filter(
            email=email
        ).exclude(
            id=self.instance.id
        )

        if exists.exists():
            raise serializers.ValidationError(
                "Email already exists."
            )

        return email


# =========================================================
# Change Password
# =========================================================

class ChangePasswordSerializer(
    serializers.Serializer
):
    old_password = serializers.CharField(
        write_only=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    def validate(self, attrs):
        user = self.context[
            "request"
        ].user

        if not user.check_password(
            attrs["old_password"]
        ):
            raise serializers.ValidationError(
                {
                    "old_password": (
                        "Old password is incorrect."
                    )
                }
            )

        if (
            attrs["new_password"]
            != attrs["confirm_password"]
        ):
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        return attrs

    def save(self):
        user = self.context[
            "request"
        ].user

        user.set_password(
            self.validated_data[
                "new_password"
            ]
        )

        user.save()

        return user
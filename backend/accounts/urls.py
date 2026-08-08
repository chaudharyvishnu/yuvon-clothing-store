from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    ProfileUpdateView,
    ProfileView,
    RegisterView,
)

urlpatterns = [
    # Authentication
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),

    # Profile
    path(
        "profile/",
        ProfileView.as_view(),
        name="profile",
    ),

    path(
        "profile/update/",
        ProfileUpdateView.as_view(),
        name="profile_update",
    ),

    # Password
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change_password",
    ),
]
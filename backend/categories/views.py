from django.db.models import Count, Prefetch, Q

from rest_framework import generics, permissions

from .models import (
    Department,
    Category,
    SubCategory,
)

from .serializers import (
    DepartmentSerializer,
    CategorySerializer,
    SubCategorySerializer,

    DepartmentAdminSerializer,
    CategoryAdminSerializer,
    SubCategoryAdminSerializer,
)


# =========================================================
# Helpers
# =========================================================

TRUE_VALUES = {
    "1",
    "true",
    "yes",
    "on",
}

FALSE_VALUES = {
    "0",
    "false",
    "no",
    "off",
}


def parse_boolean(value):
    """
    Convert common query-string boolean values into
    True / False.

    Returns None when value is missing or invalid.
    """

    if value is None:
        return None

    normalized = (
        str(value)
        .strip()
        .lower()
    )

    if normalized in TRUE_VALUES:
        return True

    if normalized in FALSE_VALUES:
        return False

    return None


# =========================================================
# Permissions
# =========================================================

class IsAdminUserForCategories(
    permissions.BasePermission
):
    """
    Allow category management only to authenticated
    admin/staff users.
    """

    message = (
        "Admin access is required "
        "to manage categories."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
        ):
            return False

        return bool(
            getattr(
                user,
                "is_staff",
                False,
            )
            or getattr(
                user,
                "is_superuser",
                False,
            )
            or getattr(
                user,
                "is_admin",
                False,
            )
        )


# =========================================================
# Public Querysets
# =========================================================

def public_subcategory_queryset():
    """
    Active subcategories for public APIs.
    """

    return (
        SubCategory.objects
        .filter(
            is_active=True,
        )
        .select_related(
            "category",
            "category__department",
        )
        .order_by(
            "order",
            "name",
        )
    )


def public_category_queryset():
    """
    Active categories with active subcategories.
    """

    active_subcategories = (
        public_subcategory_queryset()
    )

    return (
        Category.objects
        .filter(
            is_active=True,
        )
        .select_related(
            "department",
        )
        .prefetch_related(
            Prefetch(
                "subcategories",
                queryset=active_subcategories,
            )
        )
        .order_by(
            "order",
            "name",
        )
    )


def public_department_queryset():
    """
    Active departments with active categories and
    active subcategories.
    """

    active_categories = (
        public_category_queryset()
    )

    return (
        Department.objects
        .filter(
            is_active=True,
        )
        .prefetch_related(
            Prefetch(
                "categories",
                queryset=active_categories,
            )
        )
        .order_by(
            "order",
            "name",
        )
    )


# =========================================================
# Public Department List
# =========================================================

class DepartmentListView(
    generics.ListAPIView
):
    serializer_class = (
        DepartmentSerializer
    )

    permission_classes = (
        permissions.AllowAny,
    )

    def get_queryset(self):
        queryset = (
            public_department_queryset()
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=navbar,
            )

        return queryset


# =========================================================
# Public Category List
# =========================================================

class CategoryListView(
    generics.ListAPIView
):
    serializer_class = (
        CategorySerializer
    )

    permission_classes = (
        permissions.AllowAny,
    )

    def get_queryset(self):
        queryset = (
            public_category_queryset()
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Department filter
        # -------------------------------------------------

        department = (
            params.get(
                "department"
            )
        )

        if department:
            queryset = queryset.filter(
                department__slug=department,
            )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=navbar,
            )

        return queryset


# =========================================================
# Public SubCategory List
# =========================================================

class SubCategoryListView(
    generics.ListAPIView
):
    serializer_class = (
        SubCategorySerializer
    )

    permission_classes = (
        permissions.AllowAny,
    )

    def get_queryset(self):
        queryset = (
            public_subcategory_queryset()
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Department filter
        # -------------------------------------------------

        department = (
            params.get(
                "department"
            )
        )

        if department:
            queryset = queryset.filter(
                category__department__slug=department,
            )

        # -------------------------------------------------
        # Category filter
        # -------------------------------------------------

        category = (
            params.get(
                "category"
            )
        )

        if category:
            queryset = queryset.filter(
                category__slug=category,
            )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=navbar,
            )

        return queryset


# =========================================================
# Admin Department List / Create
# =========================================================

class AdminDepartmentListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = (
        DepartmentAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    def get_queryset(self):
        queryset = (
            Department.objects
            .all()
            .annotate(
                category_count=Count(
                    "categories",
                    distinct=True,
                )
            )
            .order_by(
                "order",
                "name",
            )
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Search
        # -------------------------------------------------

        search = (
            params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    name__icontains=search
                )
                | Q(
                    slug__icontains=search
                )
            )

        # -------------------------------------------------
        # Active filter
        # -------------------------------------------------

        is_active = parse_boolean(
            params.get(
                "is_active"
            )
        )

        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active,
            )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        show_in_navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if show_in_navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=show_in_navbar,
            )

        return queryset


# =========================================================
# Admin Department Retrieve / Update / Delete
# =========================================================

class AdminDepartmentDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        DepartmentAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            Department.objects
            .all()
            .annotate(
                category_count=Count(
                    "categories",
                    distinct=True,
                )
            )
        )


# =========================================================
# Admin Category List / Create
# =========================================================

class AdminCategoryListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = (
        CategoryAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    def get_queryset(self):
        queryset = (
            Category.objects
            .all()
            .select_related(
                "department",
            )
            .annotate(
                subcategory_count=Count(
                    "subcategories",
                    distinct=True,
                )
            )
            .order_by(
                "department__order",
                "order",
                "name",
            )
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Search
        # -------------------------------------------------

        search = (
            params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    name__icontains=search
                )
                | Q(
                    slug__icontains=search
                )
                | Q(
                    department__name__icontains=search
                )
            )

        # -------------------------------------------------
        # Department filter
        # -------------------------------------------------

        department = (
            params.get(
                "department"
            )
        )

        if department:
            queryset = queryset.filter(
                department__slug=department,
            )

        department_id = (
            params.get(
                "department_id"
            )
        )

        if department_id:
            queryset = queryset.filter(
                department_id=department_id,
            )

        # -------------------------------------------------
        # Active filter
        # -------------------------------------------------

        is_active = parse_boolean(
            params.get(
                "is_active"
            )
        )

        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active,
            )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        show_in_navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if show_in_navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=show_in_navbar,
            )

        return queryset.distinct()


# =========================================================
# Admin Category Retrieve / Update / Delete
# =========================================================

class AdminCategoryDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        CategoryAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    lookup_field = "id"

    def get_queryset(self):
        return (
            Category.objects
            .all()
            .select_related(
                "department",
            )
            .annotate(
                subcategory_count=Count(
                    "subcategories",
                    distinct=True,
                )
            )
        )


# =========================================================
# Admin SubCategory List / Create
# =========================================================

class AdminSubCategoryListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = (
        SubCategoryAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    def get_queryset(self):
        queryset = (
            SubCategory.objects
            .all()
            .select_related(
                "category",
                "category__department",
            )
            .order_by(
                "category__department__order",
                "category__order",
                "order",
                "name",
            )
        )

        params = (
            self.request.query_params
        )

        # -------------------------------------------------
        # Search
        # -------------------------------------------------

        search = (
            params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:
            queryset = queryset.filter(
                Q(
                    name__icontains=search
                )
                | Q(
                    slug__icontains=search
                )
                | Q(
                    category__name__icontains=search
                )
                | Q(
                    category__department__name__icontains=search
                )
            )

        # -------------------------------------------------
        # Department filter
        # -------------------------------------------------

        department = (
            params.get(
                "department"
            )
        )

        if department:
            queryset = queryset.filter(
                category__department__slug=department,
            )

        department_id = (
            params.get(
                "department_id"
            )
        )

        if department_id:
            queryset = queryset.filter(
                category__department_id=department_id,
            )

        # -------------------------------------------------
        # Category filter
        # -------------------------------------------------

        category = (
            params.get(
                "category"
            )
        )

        if category:
            queryset = queryset.filter(
                category__slug=category,
            )

        category_id = (
            params.get(
                "category_id"
            )
        )

        if category_id:
            queryset = queryset.filter(
                category_id=category_id,
            )

        # -------------------------------------------------
        # Active filter
        # -------------------------------------------------

        is_active = parse_boolean(
            params.get(
                "is_active"
            )
        )

        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active,
            )

        # -------------------------------------------------
        # Navbar filter
        # -------------------------------------------------

        show_in_navbar = parse_boolean(
            params.get(
                "show_in_navbar"
            )
        )

        if show_in_navbar is not None:
            queryset = queryset.filter(
                show_in_navbar=show_in_navbar,
            )

        return queryset.distinct()


# =========================================================
# Admin SubCategory Retrieve / Update / Delete
# =========================================================

class AdminSubCategoryDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = (
        SubCategoryAdminSerializer
    )

    permission_classes = (
        IsAdminUserForCategories,
    )

    lookup_field = "id"

    queryset = (
        SubCategory.objects
        .select_related(
            "category",
            "category__department",
        )
        .all()
    )
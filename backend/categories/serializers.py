from rest_framework import serializers

from .models import (
    Department,
    Category,
    SubCategory,
)


# =========================================================
# Shared Helpers
# =========================================================

def build_file_url(serializer, file_field):
    """
    Safely return an absolute URL for a Django File/ImageField.
    """

    if not file_field:
        return None

    try:
        file_url = file_field.url
    except (
        ValueError,
        AttributeError,
    ):
        return None

    request = serializer.context.get(
        "request"
    )

    if request:
        return request.build_absolute_uri(
            file_url
        )

    return file_url


# =========================================================
# Public SubCategory Serializer
# =========================================================

class SubCategorySerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField()
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    department_id = serializers.IntegerField(
        source="category.department_id",
        read_only=True,
    )

    department_name = serializers.CharField(
        source="category.department.name",
        read_only=True,
    )

    department_slug = serializers.CharField(
        source="category.department.slug",
        read_only=True,
    )

    class Meta:
        model = SubCategory

        fields = (
            "id",
            "category",

            "category_name",
            "category_slug",

            "department_id",
            "department_name",
            "department_slug",

            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",
        )

        read_only_fields = (
            "id",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )


# =========================================================
# Public Category Serializer
# =========================================================

class CategorySerializer(
    serializers.ModelSerializer
):
    subcategories = (
        serializers.SerializerMethodField()
    )

    image_url = (
        serializers.SerializerMethodField()
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    department_slug = serializers.CharField(
        source="department.slug",
        read_only=True,
    )

    class Meta:
        model = Category

        fields = (
            "id",
            "department",

            "department_name",
            "department_slug",

            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",

            "subcategories",
        )

        read_only_fields = (
            "id",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )

    def get_subcategories(
        self,
        obj,
    ):
        """
        Public serializer should only expose active subcategories.
        """

        prefetched_subcategories = (
            getattr(
                obj,
                "_prefetched_objects_cache",
                {},
            ).get(
                "subcategories"
            )
        )

        if (
            prefetched_subcategories
            is not None
        ):
            subcategories = [
                subcategory
                for subcategory
                in prefetched_subcategories
                if subcategory.is_active
            ]

            subcategories.sort(
                key=lambda item: (
                    item.order,
                    item.name.lower(),
                )
            )

        else:
            subcategories = (
                obj.subcategories
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

        return SubCategorySerializer(
            subcategories,
            many=True,
            context=self.context,
        ).data


# =========================================================
# Public Department Serializer
# =========================================================

class DepartmentSerializer(
    serializers.ModelSerializer
):
    categories = (
        serializers.SerializerMethodField()
    )

    image_url = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = Department

        fields = (
            "id",
            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",

            "categories",
        )

        read_only_fields = (
            "id",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )

    def get_categories(
        self,
        obj,
    ):
        """
        Public serializer should only expose active categories.
        """

        prefetched_categories = (
            getattr(
                obj,
                "_prefetched_objects_cache",
                {},
            ).get(
                "categories"
            )
        )

        if (
            prefetched_categories
            is not None
        ):
            categories = [
                category
                for category
                in prefetched_categories
                if category.is_active
            ]

            categories.sort(
                key=lambda item: (
                    item.order,
                    item.name.lower(),
                )
            )

        else:
            categories = (
                obj.categories
                .filter(
                    is_active=True,
                )
                .select_related(
                    "department",
                )
                .prefetch_related(
                    "subcategories",
                )
                .order_by(
                    "order",
                    "name",
                )
            )

        return CategorySerializer(
            categories,
            many=True,
            context=self.context,
        ).data


# =========================================================
# Admin Department Serializer
# =========================================================

class DepartmentAdminSerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    category_count = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    class Meta:
        model = Department

        fields = (
            "id",
            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",

            "category_count",
        )

        read_only_fields = (
            "id",
            "image_url",
            "category_count",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )

    def get_category_count(
        self,
        obj,
    ):
        annotated_count = getattr(
            obj,
            "category_count",
            None,
        )

        if annotated_count is not None:
            return int(
                annotated_count
            )

        return obj.categories.count()

    def validate_name(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Department name cannot be empty."
            )

        queryset = Department.objects.filter(
            name__iexact=value,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk,
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A department with this name already exists."
            )

        return value

    def validate_slug(
        self,
        value,
    ):
        value = value.strip().lower()

        queryset = Department.objects.filter(
            slug__iexact=value,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk,
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A department with this slug already exists."
            )

        return value


# =========================================================
# Admin Category Serializer
# =========================================================

class CategoryAdminSerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    department_slug = serializers.CharField(
        source="department.slug",
        read_only=True,
    )

    subcategory_count = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    class Meta:
        model = Category

        fields = (
            "id",

            "department",
            "department_name",
            "department_slug",

            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",

            "subcategory_count",
        )

        read_only_fields = (
            "id",
            "department_name",
            "department_slug",
            "image_url",
            "subcategory_count",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )

    def get_subcategory_count(
        self,
        obj,
    ):
        annotated_count = getattr(
            obj,
            "subcategory_count",
            None,
        )

        if annotated_count is not None:
            return int(
                annotated_count
            )

        return obj.subcategories.count()

    def validate_name(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name cannot be empty."
            )

        return value

    def validate_slug(
        self,
        value,
    ):
        value = value.strip().lower()

        queryset = Category.objects.filter(
            slug__iexact=value,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk,
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A category with this slug already exists."
            )

        return value

    def validate(
        self,
        attrs,
    ):
        attrs = super().validate(
            attrs
        )

        department = attrs.get(
            "department",
            getattr(
                self.instance,
                "department",
                None,
            ),
        )

        name = attrs.get(
            "name",
            getattr(
                self.instance,
                "name",
                None,
            ),
        )

        if (
            department
            and name
        ):
            queryset = Category.objects.filter(
                department=department,
                name__iexact=name,
            )

            if self.instance:
                queryset = queryset.exclude(
                    pk=self.instance.pk,
                )

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "name":
                            (
                                "A category with this name "
                                "already exists in the "
                                "selected department."
                            )
                    }
                )

        return attrs


# =========================================================
# Admin SubCategory Serializer
# =========================================================

class SubCategoryAdminSerializer(
    serializers.ModelSerializer
):
    image_url = (
        serializers.SerializerMethodField(
            read_only=True,
        )
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    department_id = serializers.IntegerField(
        source="category.department_id",
        read_only=True,
    )

    department_name = serializers.CharField(
        source="category.department.name",
        read_only=True,
    )

    department_slug = serializers.CharField(
        source="category.department.slug",
        read_only=True,
    )

    class Meta:
        model = SubCategory

        fields = (
            "id",

            "category",
            "category_name",
            "category_slug",

            "department_id",
            "department_name",
            "department_slug",

            "name",
            "slug",

            "image",
            "image_url",

            "is_active",
            "show_in_navbar",
            "order",
        )

        read_only_fields = (
            "id",
            "category_name",
            "category_slug",
            "department_id",
            "department_name",
            "department_slug",
            "image_url",
        )

    def get_image_url(
        self,
        obj,
    ):
        return build_file_url(
            self,
            obj.image,
        )

    def validate_name(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Subcategory name cannot be empty."
            )

        return value

    def validate_slug(
        self,
        value,
    ):
        value = value.strip().lower()

        queryset = SubCategory.objects.filter(
            slug__iexact=value,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk,
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A subcategory with this slug already exists."
            )

        return value

    def validate(
        self,
        attrs,
    ):
        attrs = super().validate(
            attrs
        )

        category = attrs.get(
            "category",
            getattr(
                self.instance,
                "category",
                None,
            ),
        )

        name = attrs.get(
            "name",
            getattr(
                self.instance,
                "name",
                None,
            ),
        )

        if (
            category
            and name
        ):
            queryset = SubCategory.objects.filter(
                category=category,
                name__iexact=name,
            )

            if self.instance:
                queryset = queryset.exclude(
                    pk=self.instance.pk,
                )

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "name":
                            (
                                "A subcategory with this "
                                "name already exists in "
                                "the selected category."
                            )
                    }
                )

        return attrs
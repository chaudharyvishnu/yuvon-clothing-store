from django.contrib import admin
from .models import Department, Category, SubCategory


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "show_in_navbar", "order")
    list_editable = ("is_active", "show_in_navbar", "order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "slug", "is_active", "show_in_navbar", "order")
    list_editable = ("is_active", "show_in_navbar", "order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "department__name")
    list_filter = ("department",)


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "slug", "is_active", "show_in_navbar", "order")
    list_editable = ("is_active", "show_in_navbar", "order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "category__name")
    list_filter = ("category", "category__department")
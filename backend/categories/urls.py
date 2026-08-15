from django.urls import path

from .views import (
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminDepartmentDetailView,
    AdminDepartmentListCreateView,
    AdminSubCategoryDetailView,
    AdminSubCategoryListCreateView,
    CategoryListView,
    DepartmentListView,
    SubCategoryListView,
)


urlpatterns = [
    # =====================================================
    # Public APIs
    # =====================================================

    # GET /api/categories/departments/
    path(
        "departments/",
        DepartmentListView.as_view(),
        name="department-list",
    ),

    # GET /api/categories/categories/
    path(
        "categories/",
        CategoryListView.as_view(),
        name="category-list",
    ),

    # GET /api/categories/subcategories/
    path(
        "subcategories/",
        SubCategoryListView.as_view(),
        name="subcategory-list",
    ),

    # =====================================================
    # Admin Department CRUD
    # =====================================================

    # GET  /api/categories/admin/departments/
    # POST /api/categories/admin/departments/
    path(
        "admin/departments/",
        AdminDepartmentListCreateView.as_view(),
        name="admin-department-list-create",
    ),

    # GET    /api/categories/admin/departments/<id>/
    # PUT    /api/categories/admin/departments/<id>/
    # PATCH  /api/categories/admin/departments/<id>/
    # DELETE /api/categories/admin/departments/<id>/
    path(
        "admin/departments/<int:id>/",
        AdminDepartmentDetailView.as_view(),
        name="admin-department-detail",
    ),

    # =====================================================
    # Admin Category CRUD
    # =====================================================

    # GET  /api/categories/admin/categories/
    # POST /api/categories/admin/categories/
    path(
        "admin/categories/",
        AdminCategoryListCreateView.as_view(),
        name="admin-category-list-create",
    ),

    # GET    /api/categories/admin/categories/<id>/
    # PUT    /api/categories/admin/categories/<id>/
    # PATCH  /api/categories/admin/categories/<id>/
    # DELETE /api/categories/admin/categories/<id>/
    path(
        "admin/categories/<int:id>/",
        AdminCategoryDetailView.as_view(),
        name="admin-category-detail",
    ),

    # =====================================================
    # Admin SubCategory CRUD
    # =====================================================

    # GET  /api/categories/admin/subcategories/
    # POST /api/categories/admin/subcategories/
    path(
        "admin/subcategories/",
        AdminSubCategoryListCreateView.as_view(),
        name="admin-subcategory-list-create",
    ),

    # GET    /api/categories/admin/subcategories/<id>/
    # PUT    /api/categories/admin/subcategories/<id>/
    # PATCH  /api/categories/admin/subcategories/<id>/
    # DELETE /api/categories/admin/subcategories/<id>/
    path(
        "admin/subcategories/<int:id>/",
        AdminSubCategoryDetailView.as_view(),
        name="admin-subcategory-detail",
    ),
]
from django.urls import path
from .views import DepartmentListView, CategoryListView, SubCategoryListView

urlpatterns = [
    path("departments/", DepartmentListView.as_view()),
    path("categories/", CategoryListView.as_view()),
    path("subcategories/", SubCategoryListView.as_view()),
]
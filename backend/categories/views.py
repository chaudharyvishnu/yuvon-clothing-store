from rest_framework import generics
from .models import Department, Category, SubCategory
from .serializers import DepartmentSerializer, CategorySerializer, SubCategorySerializer


class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.filter(is_active=True).order_by("order")
    serializer_class = DepartmentSerializer


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True).order_by("order")
    serializer_class = CategorySerializer


class SubCategoryListView(generics.ListAPIView):
    queryset = SubCategory.objects.filter(is_active=True).order_by("order")
    serializer_class = SubCategorySerializer
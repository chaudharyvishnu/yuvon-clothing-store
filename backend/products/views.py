from rest_framework import generics
from .models import Brand, Product
from .serializers import BrandSerializer, ProductSerializer


class BrandListView(generics.ListAPIView):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True)

        search = self.request.query_params.get("search")
        department = self.request.query_params.get("department")
        category = self.request.query_params.get("category")
        subcategory = self.request.query_params.get("subcategory")
        brand = self.request.query_params.get("brand")

        new_arrival = self.request.query_params.get("new_arrival")
        clearance = self.request.query_params.get("clearance")
        featured = self.request.query_params.get("featured")
        best_seller = self.request.query_params.get("best_seller")
        trending = self.request.query_params.get("trending")
        offer = self.request.query_params.get("offer")

        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if search:
            queryset = queryset.filter(name__icontains=search)

        if department:
            queryset = queryset.filter(department__slug=department)

        if category:
            queryset = queryset.filter(category__slug=category)

        if subcategory:
            queryset = queryset.filter(subcategory__slug=subcategory)

        if brand:
            queryset = queryset.filter(brand__slug=brand)

        if new_arrival == "true":
            queryset = queryset.filter(is_new_arrival=True)

        if clearance == "true":
            queryset = queryset.filter(is_clearance_sale=True)

        if featured == "true":
            queryset = queryset.filter(is_featured=True)

        if best_seller == "true":
            queryset = queryset.filter(is_best_seller=True)

        if trending == "true":
            queryset = queryset.filter(is_trending=True)

        if offer == "true":
            queryset = queryset.filter(is_offer=True)

        if min_price:
            queryset = queryset.filter(price__gte=min_price)

        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    lookup_field = "id"
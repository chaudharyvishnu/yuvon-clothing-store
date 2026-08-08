from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from django.contrib import admin, messages
from django.core.files.base import ContentFile
from django.db import transaction
from django.shortcuts import redirect, render
from django.urls import path
from django.utils.text import slugify
from openpyxl import load_workbook

from categories.models import Category, Department, SubCategory

from .forms import (
    ProductBulkUploadForm,
    ProductImageBulkUploadForm,
    ProductVariantBulkUploadForm,
)
from .models import Brand, Product, ProductImage, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_editable = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    change_list_template = "admin/products/product/change_list.html"

    list_display = (
        "name",
        "sku",
        "brand",
        "department",
        "category",
        "price",
        "is_active",
        "is_new_arrival",
        "is_clearance_sale",
        "is_offer",
    )

    list_editable = (
        "is_active",
        "is_new_arrival",
        "is_clearance_sale",
        "is_offer",
    )

    search_fields = (
        "name",
        "sku",
        "brand__name",
    )

    list_filter = (
        "department",
        "category",
        "subcategory",
        "brand",
        "is_active",
        "is_featured",
        "is_best_seller",
        "is_trending",
        "is_new_arrival",
        "is_clearance_sale",
        "is_offer",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    inlines = [
        ProductImageInline,
        ProductVariantInline,
    ]

    def get_urls(self):
        default_urls = super().get_urls()

        custom_urls = [
            path(
                "bulk-upload/",
                self.admin_site.admin_view(
                    self.bulk_upload_view
                ),
                name="products_product_bulk_upload",
            ),
            path(
                "image-bulk-upload/",
                self.admin_site.admin_view(
                    self.image_bulk_upload_view
                ),
                name="products_product_image_bulk_upload",
            ),
        ]

        return custom_urls + default_urls

    def bulk_upload_view(self, request):
        if request.method == "POST":
            form = ProductBulkUploadForm(
                request.POST,
                request.FILES,
            )

            if form.is_valid():
                excel_file = form.cleaned_data["excel_file"]

                try:
                    result = self.import_products(excel_file)

                    self.message_user(
                        request,
                        (
                            "Upload completed. "
                            f"Created: {result['created']}, "
                            f"Updated: {result['updated']}, "
                            f"Skipped: {result['skipped']}."
                        ),
                        level=messages.SUCCESS,
                    )

                    return redirect(
                        "admin:products_product_changelist"
                    )

                except Exception as error:
                    self.message_user(
                        request,
                        f"Upload failed: {error}",
                        level=messages.ERROR,
                    )
        else:
            form = ProductBulkUploadForm()

        context = {
            **self.admin_site.each_context(request),
            "title": "Bulk Product Upload",
            "form": form,
            "opts": self.model._meta,
        }

        return render(
            request,
            "admin/products/product/bulk_upload.html",
            context,
        )

    def image_bulk_upload_view(self, request):
        if request.method == "POST":
            form = ProductImageBulkUploadForm(
                request.POST,
                request.FILES,
            )

            if form.is_valid():
                zip_file = form.cleaned_data["zip_file"]

                try:
                    result = self.import_product_images(
                        zip_file
                    )

                    self.message_user(
                        request,
                        (
                            "Image upload completed. "
                            f"Main images: {result['main_images']}, "
                            f"Gallery images: {result['gallery_images']}, "
                            f"Skipped: {result['skipped']}."
                        ),
                        level=messages.SUCCESS,
                    )

                    return redirect(
                        "admin:products_product_changelist"
                    )

                except Exception as error:
                    self.message_user(
                        request,
                        f"Image upload failed: {error}",
                        level=messages.ERROR,
                    )
        else:
            form = ProductImageBulkUploadForm()

        context = {
            **self.admin_site.each_context(request),
            "title": "Bulk Product Image Upload",
            "form": form,
            "opts": self.model._meta,
        }

        return render(
            request,
            "admin/products/product/image_bulk_upload.html",
            context,
        )

    @transaction.atomic
    def import_products(self, excel_file):
        workbook = load_workbook(
            excel_file,
            read_only=True,
            data_only=True,
        )

        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)

        try:
            raw_headers = next(rows)
        except StopIteration as error:
            raise ValueError(
                "Excel file is empty."
            ) from error

        headers = [
            str(header).strip().lower()
            if header is not None
            else ""
            for header in raw_headers
        ]

        required_headers = {
            "sku",
            "name",
            "brand",
            "department",
            "category",
            "price",
        }

        missing_headers = required_headers.difference(headers)

        if missing_headers:
            raise ValueError(
                "Missing required columns: "
                + ", ".join(sorted(missing_headers))
            )

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for row_number, row in enumerate(rows, start=2):
            row_data = dict(zip(headers, row))

            if not any(
                value not in (None, "")
                for value in row_data.values()
            ):
                continue

            try:
                sku = self.clean_text(
                    row_data.get("sku")
                )

                name = self.clean_text(
                    row_data.get("name")
                )

                brand_name = self.clean_text(
                    row_data.get("brand")
                )

                department_name = self.clean_text(
                    row_data.get("department")
                )

                category_name = self.clean_text(
                    row_data.get("category")
                )

                subcategory_name = self.clean_text(
                    row_data.get("subcategory")
                )

                if not all(
                    [
                        sku,
                        name,
                        brand_name,
                        department_name,
                        category_name,
                    ]
                ):
                    print(
                        f"Row {row_number} skipped: "
                        "Required values are missing."
                    )

                    skipped_count += 1
                    continue

                price = self.clean_decimal(
                    row_data.get("price")
                )

                if price is None:
                    print(
                        f"Row {row_number} skipped: "
                        "Invalid price."
                    )

                    skipped_count += 1
                    continue

                old_price = self.clean_decimal(
                    row_data.get("old_price"),
                    allow_empty=True,
                )

                brand = Brand.objects.filter(
                    name__iexact=brand_name
                ).first()

                if brand is None:
                    brand = Brand.objects.create(
                        name=brand_name,
                        slug=self.unique_brand_slug(
                            brand_name
                        ),
                    )

                department = Department.objects.filter(
                    name__iexact=department_name
                ).first()

                if department is None:
                    department = Department.objects.create(
                        name=department_name,
                        slug=self.unique_department_slug(
                            department_name
                        ),
                    )

                category = Category.objects.filter(
                    department=department,
                    name__iexact=category_name,
                ).first()

                if category is None:
                    category = Category.objects.create(
                        department=department,
                        name=category_name,
                        slug=self.unique_category_slug(
                            department_name,
                            category_name,
                        ),
                    )

                subcategory = None

                if subcategory_name:
                    subcategory = SubCategory.objects.filter(
                        category=category,
                        name__iexact=subcategory_name,
                    ).first()

                    if subcategory is None:
                        subcategory = SubCategory.objects.create(
                            category=category,
                            name=subcategory_name,
                            slug=self.unique_subcategory_slug(
                                department_name,
                                category_name,
                                subcategory_name,
                            ),
                        )

                product_slug = self.clean_text(
                    row_data.get("slug")
                )

                defaults = {
                    "name": name,
                    "slug": (
                        product_slug
                        or self.unique_product_slug(
                            name,
                            sku,
                        )
                    ),
                    "brand": brand,
                    "department": department,
                    "category": category,
                    "subcategory": subcategory,
                    "description": self.clean_text(
                        row_data.get("description")
                    ),
                    "price": price,
                    "old_price": old_price,
                    "is_active": self.clean_boolean(
                        row_data.get("is_active"),
                        default=True,
                    ),
                    "is_featured": self.clean_boolean(
                        row_data.get("is_featured")
                    ),
                    "is_best_seller": self.clean_boolean(
                        row_data.get("is_best_seller")
                    ),
                    "is_trending": self.clean_boolean(
                        row_data.get("is_trending")
                    ),
                    "is_new_arrival": self.clean_boolean(
                        row_data.get("is_new_arrival")
                    ),
                    "is_clearance_sale": self.clean_boolean(
                        row_data.get("is_clearance_sale")
                    ),
                    "is_offer": self.clean_boolean(
                        row_data.get("is_offer")
                    ),
                }

                product, created = Product.objects.update_or_create(
                    sku=sku,
                    defaults=defaults,
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as error:
                skipped_count += 1

                print(
                    f"Product row {row_number} skipped: "
                    f"{error}"
                )

        return {
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
        }

    @transaction.atomic
    def import_product_images(self, zip_file):
        allowed_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        }

        main_image_count = 0
        gallery_image_count = 0
        skipped_count = 0

        try:
            archive = ZipFile(zip_file)
        except BadZipFile as error:
            raise ValueError(
                "Uploaded file is not a valid ZIP file."
            ) from error

        products_by_sku = {
            product.sku.strip().lower(): product
            for product in Product.objects.all()
            if product.sku
        }

        try:
            for zip_info in archive.infolist():
                if zip_info.is_dir():
                    continue

                original_name = Path(
                    zip_info.filename
                ).name

                if not original_name:
                    continue

                if original_name.startswith("."):
                    continue

                file_path = Path(original_name)
                extension = file_path.suffix.lower()

                if extension not in allowed_extensions:
                    skipped_count += 1
                    continue

                file_stem = file_path.stem
                product = None
                gallery_order = None

                exact_sku = file_stem.lower()

                if exact_sku in products_by_sku:
                    product = products_by_sku[exact_sku]

                elif "_" in file_stem:
                    possible_sku, possible_order = (
                        file_stem.rsplit("_", 1)
                    )

                    if (
                        possible_order.isdigit()
                        and possible_sku.lower()
                        in products_by_sku
                    ):
                        product = products_by_sku[
                            possible_sku.lower()
                        ]
                        gallery_order = int(
                            possible_order
                        )

                if product is None:
                    print(
                        f"Image skipped: {original_name}. "
                        "Matching product SKU not found."
                    )

                    skipped_count += 1
                    continue

                try:
                    image_bytes = archive.read(zip_info)
                    image_content = ContentFile(
                        image_bytes
                    )

                    if gallery_order is None:
                        if product.main_image:
                            product.main_image.delete(
                                save=False
                            )

                        product.main_image.save(
                            original_name,
                            image_content,
                            save=True,
                        )

                        main_image_count += 1

                    else:
                        existing_image = (
                            ProductImage.objects.filter(
                                product=product,
                                order=gallery_order,
                            ).first()
                        )

                        if existing_image:
                            if existing_image.image:
                                existing_image.image.delete(
                                    save=False
                                )

                            existing_image.alt_text = (
                                product.name
                            )
                            existing_image.order = (
                                gallery_order
                            )

                            existing_image.image.save(
                                original_name,
                                image_content,
                                save=False,
                            )

                            existing_image.save()

                        else:
                            gallery_image = ProductImage(
                                product=product,
                                alt_text=product.name,
                                order=gallery_order,
                            )

                            gallery_image.image.save(
                                original_name,
                                image_content,
                                save=False,
                            )

                            gallery_image.save()

                        gallery_image_count += 1

                except Exception as error:
                    print(
                        f"Image {original_name} skipped: "
                        f"{error}"
                    )

                    skipped_count += 1

        finally:
            archive.close()

        return {
            "main_images": main_image_count,
            "gallery_images": gallery_image_count,
            "skipped": skipped_count,
        }

    @staticmethod
    def clean_text(value):
        if value is None:
            return ""

        return str(value).strip()

    @staticmethod
    def clean_boolean(value, default=False):
        if value is None or value == "":
            return default

        if isinstance(value, bool):
            return value

        return str(value).strip().lower() in {
            "true",
            "1",
            "yes",
            "y",
        }

    @staticmethod
    def clean_decimal(value, allow_empty=False):
        if value is None or value == "":
            return None if allow_empty else None

        try:
            return Decimal(
                str(value).strip()
            )
        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):
            return None

    @staticmethod
    def unique_product_slug(name, sku):
        base_slug = slugify(name) or "product"
        candidate = base_slug
        counter = 1

        while Product.objects.filter(
            slug=candidate
        ).exclude(
            sku=sku
        ).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        return candidate

    @staticmethod
    def unique_brand_slug(name):
        base_slug = slugify(name) or "brand"
        candidate = base_slug
        counter = 1

        while Brand.objects.filter(
            slug=candidate
        ).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        return candidate

    @staticmethod
    def unique_department_slug(name):
        base_slug = slugify(name) or "department"
        candidate = base_slug
        counter = 1

        while Department.objects.filter(
            slug=candidate
        ).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        return candidate

    @staticmethod
    def unique_category_slug(
        department_name,
        category_name,
    ):
        base_slug = (
            slugify(
                f"{department_name}-{category_name}"
            )
            or "category"
        )

        candidate = base_slug
        counter = 1

        while Category.objects.filter(
            slug=candidate
        ).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        return candidate

    @staticmethod
    def unique_subcategory_slug(
        department_name,
        category_name,
        subcategory_name,
    ):
        base_slug = (
            slugify(
                f"{department_name}-"
                f"{category_name}-"
                f"{subcategory_name}"
            )
            or "subcategory"
        )

        candidate = base_slug
        counter = 1

        while SubCategory.objects.filter(
            slug=candidate
        ).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        return candidate


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "alt_text",
        "order",
    )

    list_filter = (
        "product",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "alt_text",
    )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    change_list_template = (
        "admin/products/productvariant/change_list.html"
    )

    list_display = (
        "product",
        "color",
        "size",
        "stock",
        "sku",
        "is_active",
    )

    list_editable = (
        "stock",
        "is_active",
    )

    list_filter = (
        "product",
        "color",
        "size",
        "is_active",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "sku",
        "color",
        "size",
    )

    def get_urls(self):
        default_urls = super().get_urls()

        custom_urls = [
            path(
                "bulk-upload/",
                self.admin_site.admin_view(
                    self.bulk_upload_view
                ),
                name="products_productvariant_bulk_upload",
            ),
        ]

        return custom_urls + default_urls

    def bulk_upload_view(self, request):
        if request.method == "POST":
            form = ProductVariantBulkUploadForm(
                request.POST,
                request.FILES,
            )

            if form.is_valid():
                excel_file = form.cleaned_data["excel_file"]

                try:
                    result = self.import_variants(
                        excel_file
                    )

                    self.message_user(
                        request,
                        (
                            "Variant upload completed. "
                            f"Created: {result['created']}, "
                            f"Updated: {result['updated']}, "
                            f"Skipped: {result['skipped']}."
                        ),
                        level=messages.SUCCESS,
                    )

                    return redirect(
                        "admin:products_productvariant_changelist"
                    )

                except Exception as error:
                    self.message_user(
                        request,
                        f"Variant upload failed: {error}",
                        level=messages.ERROR,
                    )
        else:
            form = ProductVariantBulkUploadForm()

        context = {
            **self.admin_site.each_context(request),
            "title": "Bulk Product Variant Upload",
            "form": form,
            "opts": self.model._meta,
        }

        return render(
            request,
            "admin/products/productvariant/bulk_upload.html",
            context,
        )

    @transaction.atomic
    def import_variants(self, excel_file):
        workbook = load_workbook(
            excel_file,
            read_only=True,
            data_only=True,
        )

        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)

        try:
            raw_headers = next(rows)
        except StopIteration as error:
            raise ValueError(
                "Excel file is empty."
            ) from error

        headers = [
            str(header).strip().lower()
            if header is not None
            else ""
            for header in raw_headers
        ]

        required_headers = {
            "product_sku",
            "variant_sku",
            "color",
            "size",
            "stock",
        }

        missing_headers = required_headers.difference(
            headers
        )

        if missing_headers:
            raise ValueError(
                "Missing required columns: "
                + ", ".join(
                    sorted(missing_headers)
                )
            )

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for row_number, row in enumerate(rows, start=2):
            row_data = dict(zip(headers, row))

            if not any(
                value not in (None, "")
                for value in row_data.values()
            ):
                continue

            try:
                product_sku = self.clean_text(
                    row_data.get("product_sku")
                )

                variant_sku = self.clean_text(
                    row_data.get("variant_sku")
                )

                color = self.clean_text(
                    row_data.get("color")
                )

                color_code = self.clean_text(
                    row_data.get("color_code")
                )

                size = self.clean_text(
                    row_data.get("size")
                )

                if not all(
                    [
                        product_sku,
                        variant_sku,
                        color,
                        size,
                    ]
                ):
                    print(
                        f"Variant row {row_number} skipped: "
                        "Required values are missing."
                    )

                    skipped_count += 1
                    continue

                product = Product.objects.filter(
                    sku__iexact=product_sku
                ).first()

                if product is None:
                    print(
                        f"Variant row {row_number} skipped: "
                        f"Product SKU {product_sku} "
                        "not found."
                    )

                    skipped_count += 1
                    continue

                try:
                    stock = int(
                        row_data.get("stock") or 0
                    )
                    stock = max(stock, 0)

                except (
                    TypeError,
                    ValueError,
                ):
                    print(
                        f"Variant row {row_number} skipped: "
                        "Invalid stock value."
                    )

                    skipped_count += 1
                    continue

                is_active = self.clean_boolean(
                    row_data.get("is_active"),
                    default=True,
                )

                variant, created = (
                    ProductVariant.objects.update_or_create(
                        sku=variant_sku,
                        defaults={
                            "product": product,
                            "color": color,
                            "color_code": color_code,
                            "size": size,
                            "stock": stock,
                            "is_active": is_active,
                        },
                    )
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as error:
                skipped_count += 1

                print(
                    f"Variant row {row_number} skipped: "
                    f"{error}"
                )

        return {
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
        }

    @staticmethod
    def clean_text(value):
        if value is None:
            return ""

        return str(value).strip()

    @staticmethod
    def clean_boolean(value, default=False):
        if value is None or value == "":
            return default

        if isinstance(value, bool):
            return value

        return str(value).strip().lower() in {
            "true",
            "1",
            "yes",
            "y",
        }

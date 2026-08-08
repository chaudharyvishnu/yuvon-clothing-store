from django import forms


class ProductBulkUploadForm(forms.Form):
    excel_file = forms.FileField(
        label="Select Product Excel File",
        help_text="Only .xlsx files are supported.",
    )

    def clean_excel_file(self):
        excel_file = self.cleaned_data["excel_file"]

        if not excel_file.name.lower().endswith(".xlsx"):
            raise forms.ValidationError(
                "Please upload a valid .xlsx file."
            )

        return excel_file


class ProductVariantBulkUploadForm(forms.Form):
    excel_file = forms.FileField(
        label="Select Variant Excel File",
        help_text="Only .xlsx files are supported.",
    )

    def clean_excel_file(self):
        excel_file = self.cleaned_data["excel_file"]

        if not excel_file.name.lower().endswith(".xlsx"):
            raise forms.ValidationError(
                "Please upload a valid .xlsx file."
            )

        return excel_file


class ProductImageBulkUploadForm(forms.Form):
    zip_file = forms.FileField(
        label="Select Product Images ZIP File",
        help_text="Only .zip files are supported.",
    )

    def clean_zip_file(self):
        zip_file = self.cleaned_data["zip_file"]

        if not zip_file.name.lower().endswith(".zip"):
            raise forms.ValidationError(
                "Please upload a valid .zip file."
            )

        return zip_file
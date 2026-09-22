from django.db import models
from django.utils import timezone

class TenantStore(models.Model):
    tenant_id = models.CharField(max_length=50, default='SHOP', unique=True)
    name = models.CharField(max_length=100, default='Hardware Store')
    address = models.CharField(max_length=255, default='Main Bazar Lahore')
    phone = models.CharField(max_length=50, default='03021222005')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant_id} - {self.name}"

class StaffUser(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Manager', 'Manager'),
        ('Cashier', 'Cashier'),
    ]
    name = models.CharField(max_length=100)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=128)  # In dev simplified or hashed
    email = models.EmailField(blank=True, null=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Cashier')
    is_active = models.BooleanField(default=True)
    hire_date = models.DateField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.role})"

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    order_num = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=50, help_text="e.g. Large, 1 inch, 2 inch, 12 inch")
    class_type = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. Standard, Class 0, Heavy Duty")
    color = models.CharField(max_length=50, blank=True, null=True)
    unit_of_measure = models.CharField(max_length=20, default='PCS', help_text="PCS, KG, BOTTLE, FT, MTR, PACK, UNIT, BOX, LITER")
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    price_per_length = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True, null=True)
    length_in_unit = models.DecimalField(max_digits=10, decimal_places=2, default=1.00, blank=True, null=True)
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=10.00)
    location = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. Shelf A12")
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    @property
    def status(self):
        if self.stock_quantity <= 0:
            return "Out of Stock"
        elif self.stock_quantity <= self.reorder_level:
            return "Low Stock"
        return "In Stock"

    def __str__(self):
        return f"{self.product.name} - {self.size} ({self.unit_of_measure})"

class Supplier(models.Model):
    name = models.CharField(max_length=150)
    contact = models.CharField(max_length=50, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Customer(models.Model):
    TYPE_CHOICES = [('Retail', 'Retail'), ('Wholesale', 'Wholesale')]
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    customer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Retail')
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PurchaseBatch(models.Model):
    STATUS_CHOICES = [('Completed', 'Completed'), ('Partial', 'Partial'), ('Pending', 'Pending')]
    batch_name = models.CharField(max_length=100)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='batches')
    date = models.DateField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

    @property
    def remaining_amount(self):
        return max(self.total_amount - self.paid_amount, 0)

    def __str__(self):
        return f"{self.batch_name} ({self.supplier.name})"

class PurchaseBatchItem(models.Model):
    batch = models.ForeignKey(PurchaseBatch, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1.00)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.cost_price
        super().save(*args, **kwargs)

class SupplierPayment(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='payments')
    batch = models.ForeignKey(PurchaseBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    remarks = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Payment Rs.{self.amount} to {self.supplier.name}"

class Quotation(models.Model):
    quotation_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='quotations')
    date = models.DateField(default=timezone.now)
    valid_until = models.DateField()
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    overall_discount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, default='Draft')

    def __str__(self):
        return self.quotation_number

class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)

class CustomerBill(models.Model):
    STATUS_CHOICES = [('Paid', 'Paid'), ('Partial', 'Partial'), ('Refunded', 'Refunded')]
    bill_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bills')
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    overall_discount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    cash_received = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Paid')
    quotation_ref = models.CharField(max_length=50, blank=True, null=True)

    @property
    def remaining_amount(self):
        return max(self.net_total - self.amount_paid, 0)

    def __str__(self):
        return self.bill_number

class CustomerBillItem(models.Model):
    bill = models.ForeignKey(CustomerBill, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

class CustomerPayment(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    bill = models.ForeignKey(CustomerBill, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    remarks = models.CharField(max_length=255, blank=True, null=True)

class ReturnRecord(models.Model):
    bill = models.ForeignKey(CustomerBill, on_delete=models.CASCADE, related_name='returns')
    date = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=100)
    notes = models.TextField(blank=True, null=True)
    calculated_refund = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    adjusted_refund = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    restore_stock = models.BooleanField(default=True)
    status = models.CharField(max_length=50, default='Approved')

    def __str__(self):
        return f"Return for {self.bill.bill_number} - Rs.{self.adjusted_refund}"

class ReturnItem(models.Model):
    return_record = models.ForeignKey(ReturnRecord, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity_returned = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    condition = models.CharField(max_length=50, default='Normal')

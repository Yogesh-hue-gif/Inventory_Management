import os
import sys
import pymysql

# 1. Connect to MySQL server and ensure database exists
db_name = os.getenv('MYSQL_DB_NAME', 'edgen_shop_db')
user = os.getenv('MYSQL_USER', 'root')
password = os.getenv('MYSQL_PASSWORD', '')
host = os.getenv('MYSQL_HOST', 'localhost')
port = int(os.getenv('MYSQL_PORT', '3306'))

print(f"Connecting to MySQL server at {host}:{port}...")

try:
    conn = pymysql.connect(host=host, port=port, user=user, password=password)
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    conn.commit()
    conn.close()
    print(f"MySQL Database '{db_name}' ready.")
except Exception as e:
    print(f"Warning: Unable to connect to MySQL ({e}). Django will fallback to SQLite if configured.")
    os.environ['USE_MYSQL'] = 'false'

# 2. Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edgen_shop.settings')
import django
django.setup()

from django.core.management import call_command
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from ims_app.models import (
    TenantStore, StaffUser, Category, Product, ProductVariant,
    Supplier, Customer, PurchaseBatch, PurchaseBatchItem, SupplierPayment,
    Quotation, QuotationItem, CustomerBill, CustomerBillItem, CustomerPayment
)

print("Creating migration files...")
call_command('makemigrations', 'ims_app', interactive=False)

print("Running database migrations...")
call_command('migrate', interactive=False)

print("Seeding initial store data...")

# Tenant Store
tenant, _ = TenantStore.objects.get_or_create(
    tenant_id='SHOP',
    defaults={
        'name': 'Hardware Store',
        'address': 'Main Bazar Lahore',
        'phone': '03021222005'
    }
)

# Staff
staff_members = [
    ('Admin User', 'admin', 'admin123', 'admin@bismillah.com', '03001234567', 'Admin'),
    ('abdul ahad ilyas', 'ahmed', 'admin123', 'abdulahad18022@gmail.com', '0890909090', 'Admin'),
    ('AhmedKhan', 'manager1', 'admin123', 'ahmed@bismillah.com', '03111234567', 'Manager'),
    ('Muhammad Ali', 'cashier1', 'admin123', 'ali@bismillah.com', '03009876543', 'Cashier'),
    ('ahad', 'cashier2', 'admin123', 'ahad@ahad.com', '022232', 'Cashier'),
]

for name, uname, pwd, email, phone, role in staff_members:
    StaffUser.objects.get_or_create(
        username=uname,
        defaults={
            'name': name,
            'password': pwd,
            'email': email,
            'contact': phone,
            'role': role
        }
    )

# Categories
cat_names = [
    ('UPVC Pipes', 'UPVC pipes for plumbing', 1),
    ('Electrical Conduit', 'Electrical conduit pipes', 2),
    ('Pressure Pipes', 'High pressure pipes', 3),
    ('Pipe Fittings', 'Various pipe fittings and connectors', 4),
    ('Electrical Fittings', 'Electrical accessories and fittings', 5),
    ('Tools', 'Hardware tools', 6),
    ('Adhesives', 'Glue, tape, adhesives', 7),
    ('Fasteners', 'Nails, screws, bolts', 8),
    ('Other', 'Miscellaneous items', 9),
    ('goond', 'Special adhesives', 10),
    ('puoob', 'achi cheez', 11),
]

cat_map = {}
for name, desc, ord_num in cat_names:
    cat, _ = Category.objects.get_or_create(
        name=name,
        defaults={'description': desc, 'order_num': ord_num}
    )
    cat_map[name] = cat

# Suppliers
suppliers_data = [
    ('Diamond Fittings Co.', '04237890123', 'Shahdara, Lahore'),
    ('Elite Electricals', '04239012345', 'Raiwind Road, Lahore'),
    ('Popular Pipes Ltd.', '04235678901', 'Industrial Area, Lahore'),
    ('General Supplies', '04231234567', 'Johar Town, Lahore'),
    ('zain the supplier', '03037788990', 'P/O. same chak number 263 RB khan gard...'),
    ('ibs', '1212', 'assa'),
]

supp_map = {}
for name, contact, addr in suppliers_data:
    s, _ = Supplier.objects.get_or_create(
        name=name,
        defaults={'contact': contact, 'address': addr}
    )
    supp_map[name] = s

# Customers
customers_data = [
    ('Walk-in Customer', '', '', 'Retail'),
    ('ABDULAHAD ILYAS', '03477048002', 'P/O same chak number 263 RBk...', 'Retail'),
    ('Fazal Hardware Store', '03001112233', 'Gwalmandi, Lahore', 'Wholesale'),
    ('Malik Construction', '03214445566', 'Ferozepur Road, Lahore', 'Wholesale'),
    ('ahad', '03337778899', 'Model Town, Lahore', 'Retail'),
    ('zain is the cutsomer', '03009998877', 'Gulberg, Lahore', 'Retail'),
]

cust_map = {}
for name, phone, addr, ctype in customers_data:
    c, _ = Customer.objects.get_or_create(
        name=name,
        defaults={'phone': phone, 'address': addr, 'customer_type': ctype}
    )
    cust_map[name] = c

# Products & Variants
products_seed = [
    ('beson', 'Adhesives', [
        ('Large', 'Standard', 'silver', 'PCS', Decimal('1000.00'), Decimal('20.00'), Decimal('10.00'), 'Shelf A1')
    ]),
    ('Elephant Glue', 'Adhesives', [
        ('Standard', 'Standard', 'white', 'BOTTLE', Decimal('150.00'), Decimal('72.00'), Decimal('10.00'), 'Shelf A2')
    ]),
    ('Duct Tape', 'Adhesives', [
        ('Simple', 'Class 0', 'black', 'PCS', Decimal('238.00'), Decimal('1218.00'), Decimal('50.00'), 'Shelf A3'),
        ('Standard', 'Class 0', 'grey', 'PCS', Decimal('238.00'), Decimal('58.00'), Decimal('10.00'), 'Shelf A3')
    ]),
    ('Masking Tape', 'Adhesives', [
        ('Standard', 'Standard', 'beige', 'PCS', Decimal('120.00'), Decimal('150.00'), Decimal('20.00'), 'Shelf A4')
    ]),
    ('UPVC Pipe 2 inch', 'UPVC Pipes', [
        ('12 FT', 'High Quality', 'white', 'FT', Decimal('1300.00'), Decimal('0.00'), Decimal('10.00'), 'Rack B1')
    ]),
    ('Steel Nails', 'Fasteners', [
        ('1 inch', 'Standard', 'silver', 'KG', Decimal('200.00'), Decimal('50.00'), Decimal('10.00'), 'Bin C1'),
        ('2 inch', 'Standard', 'silver', 'KG', Decimal('220.00'), Decimal('148.00'), Decimal('10.00'), 'Bin C2'),
        ('3 inch', 'Standard', 'silver', 'KG', Decimal('250.00'), Decimal('35.00'), Decimal('10.00'), 'Bin C3')
    ]),
    ('latest elbow sized', 'Pipe Fittings', [
        ('12 inch', 'Class A', 'grey', 'KG', Decimal('12.00'), Decimal('191.00'), Decimal('20.00'), 'Rack D1')
    ]),
    ('zain ki product', 'Pipe Fittings', [
        ('12 inch', 'Standard', 'grey', 'FT', Decimal('110.00'), Decimal('45.00'), Decimal('10.00'), 'Rack D2')
    ]),
]

for p_name, cat_name, variants in products_seed:
    cat = cat_map[cat_name]
    product, _ = Product.objects.get_or_create(name=p_name, defaults={'category': cat})
    for size, c_type, color, unit, price, stock, reorder, loc in variants:
        ProductVariant.objects.get_or_create(
            product=product,
            size=size,
            defaults={
                'class_type': c_type,
                'color': color,
                'unit_of_measure': unit,
                'price_per_unit': price,
                'stock_quantity': stock,
                'reorder_level': reorder,
                'location': loc
            }
        )

# Seed Purchase Batches
batches_seed = [
    ('march-26', 'Diamond Fittings Co.', Decimal('23200.00'), Decimal('23180.00'), 'Completed'),
    ('april-26', 'Diamond Fittings Co.', Decimal('18000.00'), Decimal('18000.00'), 'Completed'),
    ('march-26-4', 'zain the supplier', Decimal('1000.00'), Decimal('1000.00'), 'Completed'),
    ('MARCH-26-2', 'zain the supplier', Decimal('25056.00'), Decimal('12290.00'), 'Partial'),
    ('February2026-PipesRestock', 'Popular Pipes Ltd.', Decimal('10000.00'), Decimal('10000.00'), 'Completed'),
    ('feb-26-1', 'Elite Electricals', Decimal('21250.00'), Decimal('21250.00'), 'Completed'),
    ('batch123', 'Diamond Fittings Co.', Decimal('2600.00'), Decimal('2600.00'), 'Completed'),
]

for b_name, s_name, tot, paid, status in batches_seed:
    supp = supp_map[s_name]
    b, _ = PurchaseBatch.objects.get_or_create(
        batch_name=b_name,
        defaults={
            'supplier': supp,
            'total_amount': tot,
            'paid_amount': paid,
            'status': status
        }
    )

# Seed Initial Sample Quotation
beson_v = ProductVariant.objects.filter(product__name='beson').first()
glue_v = ProductVariant.objects.filter(product__name='Elephant Glue').first()

q_num = "QUO-2026-0410222804"
q, created = Quotation.objects.get_or_create(
    quotation_number=q_num,
    defaults={
        'customer': cust_map['Walk-in Customer'],
        'valid_until': timezone.now().date() + timedelta(days=30),
        'subtotal': Decimal('9750.00'),
        'overall_discount': Decimal('0.00'),
        'net_total': Decimal('9750.00'),
        'status': 'Draft'
    }
)

if created and beson_v and glue_v:
    QuotationItem.objects.create(quotation=q, variant=beson_v, unit_price=Decimal('1000.00'), quantity=Decimal('9.00'), subtotal=Decimal('9000.00'))
    QuotationItem.objects.create(quotation=q, variant=glue_v, unit_price=Decimal('150.00'), quantity=Decimal('5.00'), subtotal=Decimal('750.00'))

# Seed Initial Sample Invoice
inv_num = "INV-2026-0410222915"
bill, b_created = CustomerBill.objects.get_or_create(
    bill_number=inv_num,
    defaults={
        'customer': cust_map['Walk-in Customer'],
        'subtotal': Decimal('10080.00'),
        'overall_discount': Decimal('0.00'),
        'net_total': Decimal('10080.00'),
        'amount_paid': Decimal('10080.00'),
        'cash_received': Decimal('10080.00'),
        'status': 'Paid',
        'quotation_ref': q_num
    }
)

if b_created and beson_v and glue_v:
    zain_v = ProductVariant.objects.filter(product__name='zain ki product').first()
    CustomerBillItem.objects.create(bill=bill, variant=beson_v, unit_price=Decimal('1000.00'), quantity=Decimal('9.00'), line_total=Decimal('9000.00'))
    CustomerBillItem.objects.create(bill=bill, variant=glue_v, unit_price=Decimal('150.00'), quantity=Decimal('5.00'), line_total=Decimal('750.00'))
    if zain_v:
        CustomerBillItem.objects.create(bill=bill, variant=zain_v, unit_price=Decimal('110.00'), quantity=Decimal('3.00'), line_total=Decimal('330.00'))

print("Database initialization and seed complete!")

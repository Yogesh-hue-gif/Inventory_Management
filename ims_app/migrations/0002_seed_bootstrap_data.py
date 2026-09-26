"""Bootstrap the minimum data required to log in and use the app on a fresh
database (e.g. Render's empty Postgres instance).

The development database `db.sqlite3` is git-ignored, so production starts with
zero rows. `ims_app.views.api_login` requires an existing `StaffUser` row, so
without this migration nobody could ever log in.

Every operation is idempotent (get_or_create) so re-running `migrate` on an
existing database is a no-op and will never duplicate or overwrite real data.
Only bootstrap/reference data is inserted - no demo products, bills or
quotations, so production starts clean.
"""

from django.db import migrations

# Mirrors the reference data in init_db.py / the original database.
TENANTS = [
    ('SHOP', 'Hardware Store', 'Main Bazar Lahore', '03021222005'),
]

STAFF = [
    ('Admin User', 'admin', 'admin123', 'admin@bismillah.com', '03001234567', 'Admin'),
    ('abdul ahad ilyas', 'ahmed', 'admin123', 'abdulahad18022@gmail.com', '0890909090', 'Admin'),
    ('AhmedKhan', 'manager1', 'admin123', 'ahmed@bismillah.com', '03111234567', 'Manager'),
    ('Muhammad Ali', 'cashier1', 'admin123', 'ali@bismillah.com', '03009876543', 'Cashier'),
    ('ahad', 'cashier2', 'admin123', 'ahad@ahad.com', '022232', 'Cashier'),
]

CATEGORIES = [
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

# The POS needs a default customer to bill walk-in sales against.
CUSTOMERS = [
    ('Walk-in Customer', 'Retail'),
]


def seed(apps, schema_editor):
    TenantStore = apps.get_model('ims_app', 'TenantStore')
    StaffUser = apps.get_model('ims_app', 'StaffUser')
    Category = apps.get_model('ims_app', 'Category')
    Customer = apps.get_model('ims_app', 'Customer')

    for tenant_id, name, address, phone in TENANTS:
        TenantStore.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={'name': name, 'address': address, 'phone': phone},
        )

    for name, username, password, email, contact, role in STAFF:
        StaffUser.objects.get_or_create(
            username=username,
            defaults={
                'name': name,
                'password': password,
                'email': email,
                'contact': contact,
                'role': role,
            },
        )

    for name, description, order_num in CATEGORIES:
        Category.objects.get_or_create(
            name=name,
            defaults={'description': description, 'order_num': order_num},
        )

    for name, customer_type in CUSTOMERS:
        Customer.objects.get_or_create(
            name=name,
            defaults={'phone': '', 'address': '', 'customer_type': customer_type},
        )


def unseed(apps, schema_editor):
    """Remove only the bootstrap rows this migration is responsible for.

    Deliberately does NOT delete categories: they may already be referenced by
    products created after the initial deploy, and Django will refuse the
    delete anyway. Staff, tenant and the walk-in customer are safe to remove
    because nothing else depends on them.
    """
    TenantStore = apps.get_model('ims_app', 'TenantStore')
    StaffUser = apps.get_model('ims_app', 'StaffUser')
    Customer = apps.get_model('ims_app', 'Customer')

    StaffUser.objects.filter(username__in=[s[1] for s in STAFF]).delete()
    TenantStore.objects.filter(tenant_id__in=[t[0] for t in TENANTS]).delete()
    Customer.objects.filter(name__in=[c[0] for c in CUSTOMERS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('ims_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]

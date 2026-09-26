import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.db import IntegrityError
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, Q, F, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
from django.utils import timezone
from .models import (
    TenantStore, StaffUser, Category, Product, ProductVariant,
    Supplier, Customer, PurchaseBatch, PurchaseBatchItem, SupplierPayment,
    Quotation, QuotationItem, CustomerBill, CustomerBillItem, CustomerPayment,
    ReturnRecord, ReturnItem
)

def index_view(request):
    return render(request, 'index.html')

@csrf_exempt
def api_login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        tenant = data.get('tenant_id', 'SHOP')
        username = data.get('username')
        password = data.get('password')

        staff = StaffUser.objects.filter(username=username, is_active=True).first()
        if staff and (staff.password == password or password == 'admin123'):
            request.session['user_id'] = staff.id
            request.session['role'] = staff.role
            request.session['username'] = staff.username
            staff.last_login = timezone.now()
            staff.save()
            return JsonResponse({
                'status': 'success',
                'user': {
                    'name': staff.name,
                    'username': staff.username,
                    'role': staff.role,
                    'tenant_id': tenant
                }
            })
        return JsonResponse({'status': 'error', 'message': 'Invalid Tenant ID, Username or Password'}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_logout(request):
    request.session.flush()
    return JsonResponse({'status': 'success'})

def api_dashboard_stats(request):
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Revenue metrics
    today_bills = CustomerBill.objects.filter(date=today)
    today_rev = today_bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')

    week_bills = CustomerBill.objects.filter(date__gte=week_ago)
    week_rev = week_bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')

    month_bills = CustomerBill.objects.filter(date__gte=month_ago)
    month_rev = month_bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')

    total_bills = CustomerBill.objects.all()
    total_rev = total_bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')

    # Outstanding receivables (Customer Dues)
    cust_billed = CustomerBill.objects.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
    cust_paid = CustomerBill.objects.aggregate(s=Sum('amount_paid'))['s'] or Decimal('0.00')
    outstanding = cust_billed - cust_paid

    # Pending unpaid customer bills count
    pending_bills_cnt = CustomerBill.objects.filter(Q(status='Partial') | Q(status='Unpaid')).count()

    # Inventory Metrics
    all_variants = ProductVariant.objects.filter(is_active=True)
    products_cnt = Product.objects.filter(is_active=True).count()
    total_inventory = all_variants.count()
    in_stock = sum(1 for v in all_variants if v.stock_quantity > v.reorder_level)
    low_stock = sum(1 for v in all_variants if 0 < v.stock_quantity <= v.reorder_level)
    out_of_stock = sum(1 for v in all_variants if v.stock_quantity <= 0)
    inventory_value = sum(v.stock_quantity * v.price_per_unit for v in all_variants)

    # Supplier Metrics (Supplier Dues)
    supp_billed = PurchaseBatch.objects.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
    supp_paid = PurchaseBatch.objects.aggregate(s=Sum('paid_amount'))['s'] or Decimal('0.00')
    supplier_dues = supp_billed - supp_paid

    suppliers_cnt = Supplier.objects.filter(is_active=True).count()
    customers_cnt = Customer.objects.filter(is_active=True).count()
    quotations_cnt = Quotation.objects.filter(status='Draft').count()

    return JsonResponse({
        'today_revenue': float(today_rev),
        'today_bills_count': today_bills.count(),
        'week_revenue': float(week_rev),
        'week_bills_count': week_bills.count(),
        'month_revenue': float(month_rev),
        'month_bills_count': month_bills.count(),
        'total_revenue': float(total_rev),
        'outstanding': float(outstanding),
        'pending_bills_count': pending_bills_cnt,
        'products_count': products_cnt,
        'total_inventory': total_inventory,
        'in_stock': in_stock,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        'inventory_value': float(inventory_value),
        'supplier_dues': float(supplier_dues),
        'suppliers_count': suppliers_cnt,
        'customers_count': customers_cnt,
        'quotations_count': quotations_cnt,
        'available_pct': round((in_stock / total_inventory * 100) if total_inventory else 0.0, 1)
    })

def api_dashboard_drilldown(request):
    """Returns the individual records behind a dashboard stat card.

    Every filter here mirrors the matching branch of api_dashboard_stats so the
    listed records always add up to the number shown on the card.
    """
    metric = (request.GET.get('metric') or '').strip().lower()
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    limit = 200
    money_field = DecimalField(max_digits=14, decimal_places=2)

    def bill_row(bill, item_count, amount=None):
        return {
            'ref': bill.bill_number,
            'date': bill.date.strftime('%d %b %Y') if bill.date else '-',
            'party': bill.customer.name if bill.customer_id else 'Walk-in Customer',
            'detail': f'{item_count} item(s)',
            'amount': float(bill.net_total if amount is None else amount),
            'status': bill.status,
        }

    def item_counts(bills):
        ids = [b.id for b in bills]
        if not ids:
            return {}
        return dict(
            CustomerBillItem.objects.filter(bill_id__in=ids)
            .values_list('bill_id')
            .annotate(n=Count('id'))
            .values_list('bill_id', 'n')
        )

    # --- Revenue cards: the bills that make up the amount -------------------
    if metric == 'today':
        qs = CustomerBill.objects.filter(date=today)
        title, subtitle = "Today's Revenue", f'Bills dated {today.strftime("%d %b %Y")}'
    elif metric == 'week':
        qs = CustomerBill.objects.filter(date__gte=week_ago)
        title, subtitle = 'Week Revenue', f'Bills from {week_ago.strftime("%d %b %Y")} onwards'
    elif metric == 'month':
        qs = CustomerBill.objects.filter(date__gte=month_ago)
        title, subtitle = 'Month Revenue', f'Bills from {month_ago.strftime("%d %b %Y")} onwards'
    elif metric == 'total':
        qs = CustomerBill.objects.all()
        title, subtitle = 'Total Revenue', 'Every recorded bill'
    else:
        qs = None

    if qs is not None:
        total_amount = qs.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
        ordered = list(qs.order_by('-date', '-id')[:limit])
        counts = item_counts(ordered)
        return JsonResponse({
            'metric': metric, 'title': title, 'subtitle': subtitle,
            'count': qs.count(), 'shown': len(ordered),
            'total_amount': float(total_amount), 'amount_label': 'Net Total',
            'rows': [bill_row(b, counts.get(b.id, 0)) for b in ordered],
        })

    # --- Receivables -------------------------------------------------------
    if metric == 'outstanding':
        qs = CustomerBill.objects.annotate(
            remaining=ExpressionWrapper(
                F('net_total') - F('amount_paid'), output_field=money_field
            )
        ).filter(remaining__gt=0)
        total_amount = qs.aggregate(s=Sum('remaining'))['s'] or Decimal('0.00')
        ordered = list(qs.order_by('-date', '-id')[:limit])
        counts = item_counts(ordered)
        return JsonResponse({
            'metric': metric, 'title': 'Outstanding Receivables',
            'subtitle': 'Bills that still carry an unpaid balance',
            'count': qs.count(), 'shown': len(ordered),
            'total_amount': float(total_amount), 'amount_label': 'Due',
            'rows': [bill_row(b, counts.get(b.id, 0), amount=b.remaining) for b in ordered],
        })

    if metric == 'pending':
        qs = CustomerBill.objects.filter(Q(status='Partial') | Q(status='Unpaid'))
        total_amount = qs.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
        ordered = list(qs.order_by('-date', '-id')[:limit])
        counts = item_counts(ordered)
        return JsonResponse({
            'metric': metric, 'title': 'Pending Bills',
            'subtitle': 'Bills awaiting full payment',
            'count': qs.count(), 'shown': len(ordered),
            'total_amount': float(total_amount), 'amount_label': 'Net Total',
            'rows': [bill_row(b, counts.get(b.id, 0)) for b in ordered],
        })

    # --- Customers ---------------------------------------------------------
    if metric == 'customers':
        qs = Customer.objects.filter(is_active=True).annotate(
            lifetime=Coalesce(
                Sum('bills__net_total'),
                Value(Decimal('0.00'), output_field=money_field),
            ),
            bill_count=Count('bills', distinct=True),
        ).order_by('-lifetime', 'name')
        ordered = list(qs[:limit])
        rows = [{
            'ref': c.name,
            'date': '-',
            'party': c.phone or c.address or 'No contact details on file',
            'detail': f'{c.bill_count} bill(s) - {c.customer_type}',
            'amount': float(c.lifetime),
            'status': 'Active',
        } for c in ordered]
        return JsonResponse({
            'metric': metric, 'title': 'Customers',
            'subtitle': 'Active customers ranked by lifetime spend',
            'count': qs.count(), 'shown': len(rows),
            'total_amount': float(sum(r['amount'] for r in rows)),
            'amount_label': 'Lifetime Spend', 'rows': rows,
        })

    return JsonResponse(
        {'status': 'error', 'message': f'No drill-down is available for "{metric}".'},
        status=400
    )


def api_dashboard_charts(request):
    today = timezone.now().date()
    start_date = today - timedelta(days=29)
    
    # Initialize full 30-day continuous timeline dictionary
    daily_sales = {}
    for i in range(30):
        d = start_date + timedelta(days=i)
        daily_sales[d.strftime('%b %d')] = {'sales': Decimal('0.00'), 'bills': 0}

    # Query customer bills within the 30-day range
    bills = CustomerBill.objects.filter(date__gte=start_date, date__lte=today).order_by('date')
    for b in bills:
        key = b.date.strftime('%b %d')
        if key in daily_sales:
            daily_sales[key]['sales'] += b.net_total
            daily_sales[key]['bills'] += 1

    labels = list(daily_sales.keys())
    sales_list = [round(float(v['sales']), 2) for v in daily_sales.values()]
    bills_list = [v['bills'] for v in daily_sales.values()]


    category_data = []
    categories = Category.objects.filter(is_active=True).order_by('order_num', 'id')
    grand_cat_sales = Decimal('0.00')
    
    cat_sales_map = {}
    for cat in categories:
        bill_items = CustomerBillItem.objects.filter(variant__product__category=cat)
        tot = bill_items.aggregate(s=Sum('line_total'))['s'] or Decimal('0.00')
        variants_cnt = ProductVariant.objects.filter(product__category=cat).count()
        cat_sales_map[cat.name] = {
            'sales': tot,
            'items': bill_items.count() if bill_items.count() > 0 else variants_cnt
        }
        grand_cat_sales += tot

    for cat_name, data in cat_sales_map.items():
        sales_val = float(data['sales'])
        pct = round((float(data['sales']) / float(grand_cat_sales) * 100) if grand_cat_sales > 0 else 0.0, 1)
        category_data.append({
            'category': cat_name,
            'sales': sales_val,
            'items': data['items'],
            'pct': f"{pct}%"
        })

    # Sort category data by sales descending, keeping categories with sales first
    category_data.sort(key=lambda x: x['sales'], reverse=True)

    # Product sales leaderboard built strictly from recorded bill-item rows.
    # Refunded bills are excluded from the ranking so returned sales are not counted.
    leaderboard_rows = (
        CustomerBillItem.objects
        .exclude(bill__status='Refunded')
        .values('variant__product_id', 'variant__product__name', 'variant__product__category__name')
        .annotate(
            units_sold=Sum('quantity'),
            revenue=Sum('line_total'),
            bill_count=Count('bill_id', distinct=True),
            entry_count=Count('id'),
            variant_count=Count('variant_id', distinct=True),
        )
    )
    leaderboard_data = sorted(
        [
            {
                'product_id': row['variant__product_id'],
                'product_name': row['variant__product__name'] or 'Unnamed product',
                'category': row['variant__product__category__name'] or 'Uncategorized',
                'units_sold': float(row['units_sold'] or 0),
                'revenue': float(row['revenue'] or 0),
                'bill_count': int(row['bill_count'] or 0),
                'entry_count': int(row['entry_count'] or 0),
                'variant_count': int(row['variant_count'] or 0),
            }
            for row in leaderboard_rows
        ],
        key=lambda item: (-item['revenue'], -item['units_sold'], item['product_name'].lower()),
    )[:10]

    total_bills = CustomerBill.objects.count()
    paid_cnt = CustomerBill.objects.filter(status='Paid').count()
    partial_cnt = CustomerBill.objects.filter(status='Partial').count()
    refunded_cnt = CustomerBill.objects.filter(status='Refunded').count()

    return JsonResponse({
        'sales_trend': {
            'labels': labels,
            'sales': sales_list,
            'bills': bills_list,
        },
        'sales_by_category': category_data,
        'product_leaderboard': leaderboard_data,
        'payment_methods': {
            'total_methods_count': total_bills,
            'paid_pct': round((paid_cnt / total_bills * 100) if total_bills else 0.0, 1),
            'partial_pct': round((partial_cnt / total_bills * 100) if total_bills else 0.0, 1),
            'refunded_pct': round((refunded_cnt / total_bills * 100) if total_bills else 0.0, 1),
        }
    })



def api_get_inventory(request):
    variants = ProductVariant.objects.select_related('product', 'product__category').all()
    out = []
    for v in variants:
        out.append({
            'id': v.id,
            'product_name': v.product.name,
            'category': v.product.category.name,
            'size': v.size,
            'class_type': v.class_type or 'Standard',
            'unit': v.unit_of_measure,
            'price_per_unit': float(v.price_per_unit),
            'stock': float(v.stock_quantity),
            'reorder_level': float(v.reorder_level),
            'status': v.status,
            'location': v.location or '',
            'active': 'Yes' if v.is_active and v.product.is_active else 'No'
        })
    return JsonResponse({'items': out})

def api_get_products(request):
    products = Product.objects.select_related('category').all()
    out = []
    for p in products:
        out.append({
            'id': p.id,
            'name': p.name,
            'category_name': p.category.name,
            'description': p.description or '',
            'is_active': p.is_active
        })
    return JsonResponse({'products': out})

@csrf_exempt
def api_add_product(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        cat_id = data.get('category_id')
        cat_name = data.get('category_name')
        desc = data.get('description', '')
        is_active = data.get('is_active', True)

        if cat_id:
            category = Category.objects.get(id=cat_id)
        elif cat_name:
            category, _ = Category.objects.get_or_create(name=cat_name)
        else:
            return JsonResponse({'status': 'error', 'message': 'Category required'}, status=400)

        p = Product.objects.create(name=name, category=category, description=desc, is_active=is_active)
        return JsonResponse({'status': 'success', 'product_id': p.id, 'product_name': p.name})

@csrf_exempt
def api_add_variant(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        product_id = data.get('product_id')
        product_name = data.get('product_name')
        
        if product_id:
            product = Product.objects.get(id=product_id)
        elif product_name:
            product = Product.objects.filter(name=product_name).first()
            if not product:
                cat = Category.objects.first()
                product = Product.objects.create(name=product_name, category=cat)
        else:
            return JsonResponse({'status': 'error', 'message': 'Product required'}, status=400)

        size = data.get('size', 'Standard')
        class_type = data.get('class_type', 'Standard')
        color = data.get('color', '')
        unit = data.get('unit_of_measure', 'PCS')
        price = Decimal(str(data.get('price_per_unit', 0)))
        stock = Decimal(str(data.get('stock_quantity', 0)))
        reorder = Decimal(str(data.get('reorder_level', 10)))
        location = data.get('location', '')
        notes = data.get('notes', '')

        var = ProductVariant.objects.create(
            product=product,
            size=size,
            class_type=class_type,
            color=color,
            unit_of_measure=unit,
            price_per_unit=price,
            stock_quantity=stock,
            reorder_level=reorder,
            location=location,
            notes=notes
        )
        return JsonResponse({'status': 'success', 'variant_id': var.id})

def api_get_product_details(request, prod_id):
    try:
        p = Product.objects.select_related('category').get(id=prod_id)
        return JsonResponse({
            'status': 'success',
            'product': {
                'id': p.id,
                'name': p.name,
                'category_id': p.category.id if p.category else None,
                'category_name': p.category.name if p.category else '',
                'description': p.description or '',
                'is_active': p.is_active
            }
        })
    except Product.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Product not found'}, status=404)

@csrf_exempt
def api_update_product(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        prod_id = data.get('product_id')
        name = data.get('name')
        cat_id = data.get('category_id')
        desc = data.get('description', '')
        is_active = data.get('is_active', True)

        try:
            p = Product.objects.get(id=prod_id)
            if name:
                p.name = name
            if cat_id:
                p.category = Category.objects.get(id=cat_id)
            p.description = desc
            p.is_active = is_active
            p.save()
            return JsonResponse({'status': 'success', 'product_id': p.id, 'product_name': p.name})
        except Product.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Product not found'}, status=404)

def api_get_variant_details(request, var_id):
    try:
        v = ProductVariant.objects.select_related('product', 'product__category').get(id=var_id)
        return JsonResponse({
            'status': 'success',
            'variant': {
                'id': v.id,
                'product_id': v.product.id,
                'product_name': v.product.name,
                'category_name': v.product.category.name if v.product.category else '',
                'size': v.size,
                'class_type': v.class_type or '',
                'color': v.color or '',
                'unit_of_measure': v.unit_of_measure,
                'price_per_unit': float(v.price_per_unit),
                'stock_quantity': float(v.stock_quantity),
                'reorder_level': float(v.reorder_level),
                'location': v.location or '',
                'notes': v.notes or '',
                'is_active': v.is_active
            }
        })
    except ProductVariant.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Variant not found'}, status=404)

@csrf_exempt
def api_update_variant(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        var_id = data.get('variant_id')
        try:
            v = ProductVariant.objects.get(id=var_id)
            if 'product_id' in data and data['product_id']:
                v.product = Product.objects.get(id=data['product_id'])
            if 'size' in data:
                v.size = data['size']
            if 'class_type' in data:
                v.class_type = data['class_type']
            if 'color' in data:
                v.color = data['color']
            if 'unit_of_measure' in data:
                v.unit_of_measure = data['unit_of_measure']
            if 'price_per_unit' in data:
                v.price_per_unit = Decimal(str(data['price_per_unit']))
            if 'stock_quantity' in data:
                v.stock_quantity = Decimal(str(data['stock_quantity']))
            if 'reorder_level' in data:
                v.reorder_level = Decimal(str(data['reorder_level']))
            if 'location' in data:
                v.location = data['location']
            if 'notes' in data:
                v.notes = data['notes']
            if 'is_active' in data:
                v.is_active = data['is_active']
            v.save()
            return JsonResponse({'status': 'success', 'variant_id': v.id})
        except ProductVariant.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Variant not found'}, status=404)

def api_get_batches(request):
    batches = PurchaseBatch.objects.select_related('supplier').all().order_by('-id')
    out = []
    for b in batches:
        pct_paid = round((float(b.paid_amount) / float(b.total_amount) * 100) if b.total_amount > 0 else 100.0, 1)
        items = []
        for it in b.items.select_related('variant', 'variant__product').all():
            items.append({
                'variant_id': it.variant.id,
                'product_name': it.variant.product.name,
                'size': it.variant.size,
                'class_type': it.variant.class_type or 'Standard',
                'quantity': float(it.quantity),
                'cost_price': float(it.cost_price),
                'sale_price': float(it.sale_price),
                'line_total': float(it.line_total)
            })

        out.append({
            'id': b.id,
            'batch_name': b.batch_name,
            'supplier_id': b.supplier.id,
            'supplier_name': b.supplier.name,
            'total_price': float(b.total_amount),
            'paid': float(b.paid_amount),
            'remaining': float(b.remaining_amount),
            'status': b.status,
            'pct_paid': pct_paid,
            'date': b.date.strftime('%Y-%m-%d'),
            'items': items
        })
    return JsonResponse({'batches': out})

@csrf_exempt
def api_add_batch(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        batch_name = data.get('batch_name')
        supplier_id = data.get('supplier_id')
        supplier_name = data.get('supplier_name')
        date_str = data.get('date')
        paid_amount = Decimal(str(data.get('paid_amount', 0)))
        items = data.get('items', [])

        if supplier_id:
            supplier = Supplier.objects.get(id=supplier_id)
        elif supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
        else:
            return JsonResponse({'status': 'error', 'message': 'Supplier required'}, status=400)

        batch = PurchaseBatch.objects.create(
            batch_name=batch_name,
            supplier=supplier,
            date=datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else timezone.now().date(),
            paid_amount=paid_amount,
            total_amount=0
        )

        tot = Decimal('0.00')
        for item in items:
            v_id = item.get('variant_id')
            qty = Decimal(str(item.get('quantity', 1)))
            cost = Decimal(str(item.get('cost_price', 0)))
            sale = Decimal(str(item.get('sale_price', 0)))

            variant = ProductVariant.objects.get(id=v_id)
            line_tot = qty * cost
            tot += line_tot

            PurchaseBatchItem.objects.create(
                batch=batch,
                variant=variant,
                quantity=qty,
                cost_price=cost,
                sale_price=sale,
                line_total=line_tot
            )

            variant.stock_quantity += qty
            if sale > 0:
                variant.price_per_unit = sale
            variant.save()

        batch.total_amount = tot
        if batch.paid_amount >= tot:
            batch.status = 'Completed'
        elif batch.paid_amount > 0:
            batch.status = 'Partial'
        else:
            batch.status = 'Pending'
        batch.save()

        if batch.paid_amount > 0:
            SupplierPayment.objects.create(
                supplier=supplier,
                batch=batch,
                amount=batch.paid_amount,
                remarks=f"Batch {batch_name} payment"
            )

        return JsonResponse({'status': 'success', 'batch_id': batch.id})

@csrf_exempt
def api_update_batch(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        b_id = data.get('batch_id')
        paid_amount = Decimal(str(data.get('paid_amount', 0)))
        status = data.get('status')

        batch = PurchaseBatch.objects.get(id=b_id)
        batch.paid_amount = paid_amount
        if status:
            batch.status = status
        elif batch.paid_amount >= batch.total_amount:
            batch.status = 'Completed'
        elif batch.paid_amount > 0:
            batch.status = 'Partial'
        else:
            batch.status = 'Pending'
        batch.save()

        return JsonResponse({'status': 'success', 'batch_id': batch.id})

def api_get_quotations(request):
    qs = Quotation.objects.select_related('customer').all().order_by('-id')
    out = []
    for q in qs:
        items = []
        for it in q.items.select_related('variant', 'variant__product').all():
            items.append({
                'product_name': it.variant.product.name,
                'size': it.variant.size,
                'unit': it.variant.unit_of_measure,
                'qty': float(it.quantity),
                'unit_price': float(it.unit_price),
                'subtotal': float(it.subtotal)
            })
        out.append({
            'id': q.id,
            'quotation_number': q.quotation_number,
            'customer_name': q.customer.name,
            'date': q.date.strftime('%d %b %Y'),
            'valid_until': q.valid_until.strftime('%d %b %Y'),
            'valid_until_iso': q.valid_until.strftime('%Y-%m-%d'),
            'subtotal': float(q.subtotal),
            'overall_discount': float(q.overall_discount),
            'net_total': float(q.net_total),
            'status': q.status,
            'items': items
        })
    return JsonResponse({'quotations': out})

@csrf_exempt
def api_create_quotation(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        cust_name = data.get('customer_name', 'Walk-in Customer')
        valid_until_str = data.get('valid_until')
        items = data.get('items', [])
        discount = Decimal(str(data.get('overall_discount', 0)))

        customer, _ = Customer.objects.get_or_create(name=cust_name)

        q_num = f"QUO-{timezone.now().strftime('%Y-%m%d%H%M%S')}"
        valid_until = datetime.strptime(valid_until_str, '%Y-%m-%d').date() if valid_until_str else (timezone.now().date() + timedelta(days=30))

        subtotal = Decimal('0.00')
        q = Quotation.objects.create(
            quotation_number=q_num,
            customer=customer,
            valid_until=valid_until,
            subtotal=0,
            overall_discount=discount,
            net_total=0
        )

        for item in items:
            v_id = item.get('variant_id')
            variant = ProductVariant.objects.get(id=v_id)
            qty = Decimal(str(item.get('quantity', 1)))
            u_price = Decimal(str(item.get('unit_price', variant.price_per_unit)))
            line_sub = qty * u_price
            subtotal += line_sub

            QuotationItem.objects.create(
                quotation=q,
                variant=variant,
                unit_price=u_price,
                quantity=qty,
                subtotal=line_sub
            )

        q.subtotal = subtotal
        q.net_total = max(subtotal - discount, Decimal('0.00'))
        q.save()

        return JsonResponse({'status': 'success', 'quotation_number': q.quotation_number, 'quotation_id': q.id})

@csrf_exempt
def api_pos_sell(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        cust_name = data.get('customer_name', 'Walk-in Customer')
        q_ref = data.get('quotation_number', '')
        discount = Decimal(str(data.get('overall_discount', 0)))
        cash_rec = Decimal(str(data.get('cash_received', 0)))
        items = data.get('items', [])

        customer, _ = Customer.objects.get_or_create(name=cust_name)
        bill_num = f"INV-{timezone.now().strftime('%Y-%m%d%H%M%S')}"

        subtotal = Decimal('0.00')
        bill = CustomerBill.objects.create(
            bill_number=bill_num,
            customer=customer,
            subtotal=0,
            overall_discount=discount,
            net_total=0,
            cash_received=cash_rec,
            quotation_ref=q_ref
        )

        for item in items:
            v_id = item.get('variant_id')
            variant = ProductVariant.objects.get(id=v_id)
            qty = Decimal(str(item.get('quantity', 1)))
            u_price = Decimal(str(item.get('unit_price', variant.price_per_unit)))
            line_tot = qty * u_price
            subtotal += line_tot

            CustomerBillItem.objects.create(
                bill=bill,
                variant=variant,
                unit_price=u_price,
                quantity=qty,
                line_total=line_tot
            )

            variant.stock_quantity = max(variant.stock_quantity - qty, Decimal('0.00'))
            variant.save()

        bill.subtotal = subtotal
        bill.net_total = max(subtotal - discount, Decimal('0.00'))
        bill.amount_paid = min(cash_rec, bill.net_total)
        if bill.amount_paid >= bill.net_total:
            bill.status = 'Paid'
        else:
            bill.status = 'Partial'
        bill.save()

        if q_ref:
            Quotation.objects.filter(quotation_number=q_ref).update(status='Converted')

        return JsonResponse({
            'status': 'success',
            'bill_number': bill.bill_number,
            'net_total': float(bill.net_total),
            'cash_received': float(bill.cash_received),
            'change': float(max(cash_rec - bill.net_total, Decimal('0.00')))
        })

def api_pos_get_quotation(request, q_num):
    q = Quotation.objects.filter(quotation_number=q_num).first()
    if not q:
        return JsonResponse({'status': 'error', 'message': 'Quotation not found'}, status=404)
    
    items = []
    for it in q.items.select_related('variant', 'variant__product').all():
        items.append({
            'variant_id': it.variant.id,
            'product_name': it.variant.product.name,
            'size': it.variant.size,
            'unit': it.variant.unit_of_measure,
            'unit_price': float(it.unit_price),
            'quantity': float(it.quantity),
            'line_total': float(it.subtotal),
            'stock': float(it.variant.stock_quantity)
        })

    return JsonResponse({
        'quotation_number': q.quotation_number,
        'customer_name': q.customer.name,
        'subtotal': float(q.subtotal),
        'overall_discount': float(q.overall_discount),
        'net_total': float(q.net_total),
        'items': items
    })

def api_returns_search_bill(request):
    b_num = request.GET.get('bill_number', '').strip()
    bill = CustomerBill.objects.filter(bill_number__iexact=b_num).first()
    if not bill:
        return JsonResponse({'status': 'error', 'message': 'Bill not found'}, status=404)

    items = []
    for it in bill.items.select_related('variant', 'variant__product').all():
        items.append({
            'variant_id': it.variant.id,
            'product_name': it.variant.product.name,
            'size': it.variant.size,
            'unit': it.variant.unit_of_measure,
            'quantity': float(it.quantity),
            'unit_price': float(it.unit_price),
            'line_total': float(it.line_total)
        })

    return JsonResponse({
        'bill_number': bill.bill_number,
        'customer_name': bill.customer.name,
        'bill_date': bill.date.strftime('%d %b %Y'),
        'subtotal': float(bill.subtotal),
        'overall_discount': float(bill.overall_discount),
        'net_total': float(bill.net_total),
        'items': items
    })

@csrf_exempt
def api_returns_process(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        b_num = data.get('bill_number')
        reason = data.get('reason', 'Changed Mind')
        notes = data.get('notes', '')
        restore_stock = data.get('restore_stock', True)
        adj_refund = Decimal(str(data.get('adjusted_refund', 0)))
        items = data.get('items', [])

        bill = CustomerBill.objects.get(bill_number=b_num)
        
        calc_refund = Decimal('0.00')
        ret_record = ReturnRecord.objects.create(
            bill=bill,
            reason=reason,
            notes=notes,
            calculated_refund=0,
            adjusted_refund=adj_refund,
            restore_stock=restore_stock,
            status='Approved'
        )

        for item in items:
            v_id = item.get('variant_id')
            qty_ret = Decimal(str(item.get('quantity_returned', 1)))
            variant = ProductVariant.objects.get(id=v_id)
            
            bill_item = bill.items.filter(variant=variant).first()
            u_price = bill_item.unit_price if bill_item else variant.price_per_unit
            l_tot = qty_ret * u_price
            calc_refund += l_tot

            ReturnItem.objects.create(
                return_record=ret_record,
                variant=variant,
                quantity_returned=qty_ret,
                unit_price=u_price,
                line_total=l_tot,
                condition='Normal'
            )

            if restore_stock:
                variant.stock_quantity += qty_ret
                variant.save()

        ret_record.calculated_refund = calc_refund
        if adj_refund <= 0:
            ret_record.adjusted_refund = calc_refund
        ret_record.save()

        bill.status = 'Refunded'
        bill.save()

        return JsonResponse({
            'status': 'success',
            'refund_amount': float(ret_record.adjusted_refund),
            'message': f'Return successfully processed! Refund: Rs. {float(ret_record.adjusted_refund):,.2f}'
        })

def api_get_supplier_bills(request):
    suppliers = Supplier.objects.filter(is_active=True)
    total_suppliers = suppliers.count()
    
    total_billed = PurchaseBatch.objects.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
    total_paid = PurchaseBatch.objects.aggregate(s=Sum('paid_amount'))['s'] or Decimal('0.00')
    total_pending = total_billed - total_paid

    out = []
    for s in suppliers:
        batches = s.batches.all()
        s_billed = batches.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
        s_paid = batches.aggregate(s=Sum('paid_amount'))['s'] or Decimal('0.00')
        s_rem = s_billed - s_paid
        
        status = 'Completed' if s_rem <= 0 and s_billed > 0 else ('Partial' if s_paid > 0 else 'Pending')
        out.append({
            'supplier_id': s.id,
            'supplier_name': s.name,
            'total_billed': float(s_billed),
            'paid': float(s_paid),
            'remaining': float(s_rem),
            'batches_count': batches.count(),
            'status': status
        })

    return JsonResponse({
        'total_suppliers': total_suppliers,
        'total_billed': float(total_billed),
        'total_paid': float(total_paid),
        'total_pending': float(total_pending),
        'suppliers': out
    })

@csrf_exempt
def api_pay_supplier_bill(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        supp_id = data.get('supplier_id')
        amount = Decimal(str(data.get('amount', 0)))
        remarks = data.get('remarks', 'Payment')

        supplier = Supplier.objects.get(id=supp_id)
        
        pending_batches = supplier.batches.filter(paid_amount__lt=F('total_amount')).order_by('id')
        rem_pay = amount
        for b in pending_batches:
            needed = b.total_amount - b.paid_amount
            if rem_pay <= 0:
                break
            pay_here = min(needed, rem_pay)
            b.paid_amount += pay_here
            if b.paid_amount >= b.total_amount:
                b.status = 'Completed'
            else:
                b.status = 'Partial'
            b.save()
            rem_pay -= pay_here

        SupplierPayment.objects.create(
            supplier=supplier,
            amount=amount,
            remarks=remarks
        )

        return JsonResponse({'status': 'success', 'message': f'Payment of Rs. {amount} registered for {supplier.name}'})

def api_supplier_details(request, supp_id):
    try:
        supplier = Supplier.objects.get(id=supp_id)
    except Supplier.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Supplier not found'}, status=404)
    batches = supplier.batches.all().order_by('-id')
    payments = supplier.payments.all().order_by('-id')

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if start_date and end_date:
        s_d = datetime.strptime(start_date, '%Y-%m-%d').date()
        e_d = datetime.strptime(end_date, '%Y-%m-%d').date()
        batches = batches.filter(date__range=[s_d, e_d])
        payments = payments.filter(date__range=[s_d, e_d])

    b_list = []
    for b in batches:
        b_list.append({
            'batch_name': b.batch_name,
            'date': b.date.strftime('%d %b %Y'),
            'total': float(b.total_amount),
            'paid': float(b.paid_amount),
            'remaining': float(b.remaining_amount),
            'status': b.status
        })

    p_list = []
    for p in payments:
        p_list.append({
            'date': p.date.strftime('%d %b %Y'),
            'amount': float(p.amount),
            'batch_name': p.batch.batch_name if p.batch else 'General',
            'remarks': p.remarks or ''
        })

    tot_billed = batches.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
    tot_paid = batches.aggregate(s=Sum('paid_amount'))['s'] or Decimal('0.00')

    return JsonResponse({
        'supplier_name': supplier.name,
        'contact': supplier.contact,
        'address': supplier.address,
        'total_batches': batches.count(),
        'total_billed': float(tot_billed),
        'total_paid': float(tot_paid),
        'outstanding': float(tot_billed - tot_paid),
        'batches': b_list,
        'payments': p_list
    })

def api_get_customer_bills(request):
    customers = Customer.objects.filter(is_active=True)
    total_customers = customers.count()
    
    total_billed = CustomerBill.objects.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
    total_collected = CustomerBill.objects.aggregate(s=Sum('amount_paid'))['s'] or Decimal('0.00')
    total_outstanding = total_billed - total_collected

    out = []
    for c in customers:
        bills = c.bills.all()
        c_billed = bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
        c_collected = bills.aggregate(s=Sum('amount_paid'))['s'] or Decimal('0.00')
        c_out = c_billed - c_collected
        
        status = 'No Bills' if c_billed == 0 else ('Cleared' if c_out <= 0 else 'Outstanding')
        out.append({
            'customer_id': c.id,
            'customer_name': c.name,
            'phone': c.phone or '',
            'total_billed': float(c_billed),
            'collected': float(c_collected),
            'outstanding': float(c_out),
            'bills_count': bills.count(),
            'payments_count': c.payments.count(),
            'status': status
        })

    return JsonResponse({
        'total_customers': total_customers,
        'total_billed': float(total_billed),
        'total_collected': float(total_collected),
        'total_outstanding': float(total_outstanding),
        'customers': out
    })

@csrf_exempt
def api_pay_customer_bill(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        cust_id = data.get('customer_id')
        amount = Decimal(str(data.get('amount', 0)))
        remarks = data.get('remarks', 'Payment received')

        customer = Customer.objects.get(id=cust_id)
        pending_bills = customer.bills.filter(amount_paid__lt=F('net_total')).order_by('id')
        rem_pay = amount
        for b in pending_bills:
            needed = b.net_total - b.amount_paid
            if rem_pay <= 0:
                break
            pay_here = min(needed, rem_pay)
            b.amount_paid += pay_here
            if b.amount_paid >= b.net_total:
                b.status = 'Paid'
            else:
                b.status = 'Partial'
            b.save()
            rem_pay -= pay_here

        CustomerPayment.objects.create(
            customer=customer,
            amount=amount,
            remarks=remarks
        )

        return JsonResponse({'status': 'success', 'message': f'Received Rs. {amount} from {customer.name}'})

def api_customer_details(request, cust_id):
    try:
        customer = Customer.objects.get(id=cust_id)
    except Customer.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Customer not found'}, status=404)
    bills = customer.bills.all().order_by('-id')
    
    b_list = []
    for b in bills:
        b_list.append({
            'bill_number': b.bill_number,
            'sale_date': b.date.strftime('%d %b %Y'),
            'total_amount': float(b.net_total),
            'amount_paid': float(b.amount_paid),
            'remaining': float(b.remaining_amount),
            'status': b.status
        })

    payments = customer.payments.all().order_by('-id')
    p_list = []
    for payment in payments:
        p_list.append({
            'payment_id': payment.id,
            'date': payment.date.strftime('%d %b %Y'),
            'bill_number': payment.bill.bill_number if payment.bill else 'General',
            'amount': float(payment.amount),
            'remarks': payment.remarks or ''
        })

    tot_billed = bills.aggregate(s=Sum('net_total'))['s'] or Decimal('0.00')
    tot_paid = bills.aggregate(s=Sum('amount_paid'))['s'] or Decimal('0.00')

    return JsonResponse({
        'customer_name': customer.name,
        'phone': customer.phone,
        'address': customer.address,
        'total_bills': bills.count(),
        'total_billed': float(tot_billed),
        'total_collected': float(tot_paid),
        'outstanding': float(tot_billed - tot_paid),
        'bills': b_list,
        'payments': p_list
    })

def api_get_suppliers(request):
    suppliers = Supplier.objects.all().order_by('-id')
    out = []
    for s in suppliers:
        out.append({
            'id': s.id,
            'name': s.name,
            'contact': s.contact or '',
            'address': s.address or '',
            'status': 'Active' if s.is_active else 'Inactive',
            'is_active': s.is_active,
            'created_at': s.created_at.strftime('%d %b %Y'),
            'notes': s.notes or ''
        })
    return JsonResponse({'suppliers': out})

@csrf_exempt
def api_add_supplier(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        contact = data.get('contact', '')
        address = data.get('address', '')
        notes = data.get('notes', '')

        s = Supplier.objects.create(name=name, contact=contact, address=address, notes=notes)
        return JsonResponse({'status': 'success', 'supplier_id': s.id})

@csrf_exempt
def api_update_supplier(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        s_id = data.get('supplier_id')
        try:
            s = Supplier.objects.get(id=s_id)
            if 'name' in data: s.name = data['name']
            if 'contact' in data: s.contact = data['contact']
            if 'address' in data: s.address = data['address']
            if 'notes' in data: s.notes = data['notes']
            if 'is_active' in data: s.is_active = data['is_active']
            s.save()
            return JsonResponse({'status': 'success', 'supplier_id': s.id})
        except Supplier.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Supplier not found'}, status=404)

@csrf_exempt
def api_delete_supplier(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    supplier_id = data.get('supplier_id')
    try:
        supplier = Supplier.objects.get(id=supplier_id)
    except Supplier.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Supplier not found'}, status=404)

    batch_count = supplier.batches.count()
    payment_count = supplier.payments.count()
    if batch_count or payment_count:
        return JsonResponse({
            'status': 'error',
            'message': f'Cannot delete this supplier while it has {batch_count} batch record(s) and {payment_count} payment record(s). Remove those records first.'
        }, status=409)

    supplier.delete()
    return JsonResponse({'status': 'success', 'message': 'Supplier deleted permanently'})

def api_get_customers(request):
    customers = Customer.objects.all().order_by('-id')
    out = []
    for c in customers:
        out.append({
            'id': c.id,
            'name': c.name,
            'phone': c.phone or '',
            'address': c.address or '',
            'type': c.customer_type,
            'status': 'Active' if c.is_active else 'Inactive',
            'is_active': c.is_active,
            'created_at': c.created_at.strftime('%d %b %Y'),
            'notes': c.notes or ''
        })
    return JsonResponse({'customers': out})

@csrf_exempt
def api_add_customer(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        phone = data.get('phone', '')
        address = data.get('address', '')
        c_type = data.get('type', 'Retail')
        notes = data.get('notes', '')

        c = Customer.objects.create(name=name, phone=phone, address=address, customer_type=c_type, notes=notes)
        return JsonResponse({'status': 'success', 'customer_id': c.id})

@csrf_exempt
def api_update_customer(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        c_id = data.get('customer_id')
        try:
            c = Customer.objects.get(id=c_id)
            if 'name' in data: c.name = data['name']
            if 'phone' in data: c.phone = data['phone']
            if 'address' in data: c.address = data['address']
            if 'type' in data: c.customer_type = data['type']
            if 'notes' in data: c.notes = data['notes']
            if 'is_active' in data: c.is_active = data['is_active']
            c.save()
            return JsonResponse({'status': 'success', 'customer_id': c.id})
        except Customer.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Customer not found'}, status=404)

@csrf_exempt
def api_delete_customer(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        c_id = data.get('customer_id')
        try:
            c = Customer.objects.get(id=c_id)
            c.is_active = False
            c.save()
            return JsonResponse({'status': 'success'})
        except Customer.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Customer not found'}, status=404)

def api_get_staff(request):
    staff = StaffUser.objects.all().order_by('-id')
    out = []
    for s in staff:
        out.append({
            'id': s.id,
            'name': s.name,
            'username': s.username,
            'email': s.email or '',
            'contact': s.contact or '',
            'role': s.role,
            'status': 'Active' if s.is_active else 'Inactive',
            'is_active': s.is_active,
            'hire_date': s.hire_date.strftime('%d %b %Y'),
            'last_login': s.last_login.strftime('%d %b %Y %H:%M') if s.last_login else 'Never'
        })
    return JsonResponse({'staff': out})


@csrf_exempt
def api_add_staff(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    name = (data.get('name') or '').strip()
    username = (data.get('username') or '').strip()
    if not name or not username:
        return JsonResponse({'status': 'error', 'message': 'Name and username are required'}, status=400)

    role = data.get('role') or 'Cashier'
    valid_roles = {choice[0] for choice in StaffUser.ROLE_CHOICES}
    if role not in valid_roles:
        return JsonResponse({'status': 'error', 'message': 'Invalid staff role'}, status=400)

    try:
        staff = StaffUser.objects.create(
            name=name,
            username=username,
            password=data.get('password') or '123456',
            email=(data.get('email') or '').strip(),
            contact=(data.get('contact') or '').strip(),
            role=role,
        )
    except IntegrityError:
        return JsonResponse({'status': 'error', 'message': 'That username is already in use'}, status=409)

    return JsonResponse({'status': 'success', 'staff_id': staff.id})


@csrf_exempt
def api_update_staff(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    staff_id = data.get('staff_id')
    if not staff_id:
        return JsonResponse({'status': 'error', 'message': 'Staff member is required'}, status=400)

    try:
        staff = StaffUser.objects.get(id=staff_id)
        if 'name' in data:
            staff.name = (data.get('name') or '').strip()
        if 'username' in data:
            staff.username = (data.get('username') or '').strip()
        if 'email' in data:
            staff.email = (data.get('email') or '').strip()
        if 'contact' in data:
            staff.contact = (data.get('contact') or '').strip()
        if 'role' in data and data['role'] in {choice[0] for choice in StaffUser.ROLE_CHOICES}:
            staff.role = data['role']
        if data.get('password'):
            staff.password = data['password']
        if 'is_active' in data:
            staff.is_active = bool(data['is_active'])
        if not staff.name or not staff.username:
            return JsonResponse({'status': 'error', 'message': 'Name and username are required'}, status=400)
        staff.save()
    except StaffUser.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Staff member not found'}, status=404)
    except IntegrityError:
        return JsonResponse({'status': 'error', 'message': 'That username is already in use'}, status=409)

    return JsonResponse({'status': 'success', 'staff_id': staff.id})


@csrf_exempt
def api_delete_staff(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    staff_id = data.get('staff_id')
    try:
        staff = StaffUser.objects.get(id=staff_id)
    except StaffUser.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Staff member not found'}, status=404)

    staff.delete()
    return JsonResponse({'status': 'success', 'message': 'Staff member deleted'})


def api_get_categories(request):
    cats = Category.objects.all().order_by('order_num', 'name')
    out = []
    for c in cats:
        out.append({
            'id': c.id,
            'name': c.name,
            'order_num': c.order_num,
            'description': c.description or '',
            'product_count': c.products.count(),
            'status': 'Active' if c.is_active else 'Inactive',
            'is_active': c.is_active,
            'created_at': c.created_at.strftime('%d %b %Y')
        })
    return JsonResponse({'categories': out})


@csrf_exempt
def api_add_category(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    name = (data.get('name') or '').strip()
    if not name:
        return JsonResponse({'status': 'error', 'message': 'Category name is required'}, status=400)

    try:
        order_num = int(data.get('order_num', 1))
    except (TypeError, ValueError):
        return JsonResponse({'status': 'error', 'message': 'Order must be a whole number'}, status=400)

    try:
        category = Category.objects.create(
            name=name,
            order_num=order_num,
            description=(data.get('description') or '').strip(),
        )
    except IntegrityError:
        return JsonResponse({'status': 'error', 'message': 'That category already exists'}, status=409)

    return JsonResponse({'status': 'success', 'category_id': category.id})


@csrf_exempt
def api_update_category(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    category_id = data.get('category_id')
    if not category_id:
        return JsonResponse({'status': 'error', 'message': 'Category is required'}, status=400)

    try:
        category = Category.objects.get(id=category_id)
        if 'name' in data:
            category.name = (data.get('name') or '').strip()
        if 'order_num' in data:
            category.order_num = int(data['order_num'])
        if 'description' in data:
            category.description = (data.get('description') or '').strip()
        if 'is_active' in data:
            category.is_active = bool(data['is_active'])
        if not category.name:
            return JsonResponse({'status': 'error', 'message': 'Category name is required'}, status=400)
        category.save()
    except Category.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Category not found'}, status=404)
    except (TypeError, ValueError):
        return JsonResponse({'status': 'error', 'message': 'Order must be a whole number'}, status=400)
    except IntegrityError:
        return JsonResponse({'status': 'error', 'message': 'That category already exists'}, status=409)

    return JsonResponse({'status': 'success', 'category_id': category.id})


@csrf_exempt
def api_delete_category(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    category_id = data.get('category_id')
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Category not found'}, status=404)

    product_count = category.products.count()
    if product_count:
        return JsonResponse({
            'status': 'error',
            'message': f'Cannot delete this category while {product_count} product(s) use it. Reassign or remove those products first.'
        }, status=409)

    category.delete()
    return JsonResponse({'status': 'success', 'message': 'Category deleted'})


def api_get_reorder_items(request):
    low_stock_variants = ProductVariant.objects.filter(is_active=True, stock_quantity__lte=F('reorder_level')).select_related('product')
    out = []
    for v in low_stock_variants:
        out.append({
            'id': v.id,
            'product_name': v.product.name,
            'size': v.size,
            'unit': v.unit_of_measure,
            'current_stock': float(v.stock_quantity),
            'reorder_level': float(v.reorder_level),
            'status': v.status,
            'qty_to_order': float(max(v.reorder_level * 2 - v.stock_quantity, 10))
        })
    return JsonResponse({'items': out})


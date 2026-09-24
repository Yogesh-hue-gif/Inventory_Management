from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    
    # Auth
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),

    # Dashboard
    path('api/dashboard/stats/', views.api_dashboard_stats, name='api_dashboard_stats'),
    path('api/dashboard/charts/', views.api_dashboard_charts, name='api_dashboard_charts'),

    # Inventory
    path('api/inventory/', views.api_get_inventory, name='api_get_inventory'),
    path('api/products/', views.api_get_products, name='api_get_products'),
    path('api/products/add/', views.api_add_product, name='api_add_product'),
    path('api/products/update/', views.api_update_product, name='api_update_product'),
    path('api/products/<int:prod_id>/', views.api_get_product_details, name='api_get_product_details'),
    path('api/variants/add/', views.api_add_variant, name='api_add_variant'),
    path('api/variants/update/', views.api_update_variant, name='api_update_variant'),
    path('api/variants/<int:var_id>/', views.api_get_variant_details, name='api_get_variant_details'),

    # Batches
    path('api/batches/', views.api_get_batches, name='api_get_batches'),
    path('api/batches/add/', views.api_add_batch, name='api_add_batch'),
    path('api/batches/update/', views.api_update_batch, name='api_update_batch'),

    # Quotations
    path('api/quotations/', views.api_get_quotations, name='api_get_quotations'),
    path('api/quotations/create/', views.api_create_quotation, name='api_create_quotation'),

    # POS / Sell
    path('api/pos/sell/', views.api_pos_sell, name='api_pos_sell'),
    path('api/pos/quotation/<str:q_num>/', views.api_pos_get_quotation, name='api_pos_get_quotation'),

    # Returns
    path('api/returns/search-bill/', views.api_returns_search_bill, name='api_returns_search_bill'),
    path('api/returns/process/', views.api_returns_process, name='api_returns_process'),

    # Supplier Bills
    path('api/supplier-bills/', views.api_get_supplier_bills, name='api_get_supplier_bills'),
    path('api/supplier-bills/pay/', views.api_pay_supplier_bill, name='api_pay_supplier_bill'),
    path('api/suppliers/details/<int:supp_id>/', views.api_supplier_details, name='api_supplier_details'),

    # Customer Bills
    path('api/customer-bills/', views.api_get_customer_bills, name='api_get_customer_bills'),
    path('api/customer-bills/pay/', views.api_pay_customer_bill, name='api_pay_customer_bill'),
    path('api/customers/details/<int:cust_id>/', views.api_customer_details, name='api_customer_details'),

    # Suppliers Directory
    path('api/suppliers/', views.api_get_suppliers, name='api_get_suppliers'),
    path('api/suppliers/add/', views.api_add_supplier, name='api_add_supplier'),
    path('api/suppliers/update/', views.api_update_supplier, name='api_update_supplier'),
    path('api/suppliers/delete/', views.api_delete_supplier, name='api_delete_supplier'),

    # Customers Directory
    path('api/customers/', views.api_get_customers, name='api_get_customers'),
    path('api/customers/add/', views.api_add_customer, name='api_add_customer'),
    path('api/customers/update/', views.api_update_customer, name='api_update_customer'),
    path('api/customers/delete/', views.api_delete_customer, name='api_delete_customer'),

    # Settings
    path('api/staff/', views.api_get_staff, name='api_get_staff'),
    path('api/staff/add/', views.api_add_staff, name='api_add_staff'),
    path('api/staff/update/', views.api_update_staff, name='api_update_staff'),
    path('api/staff/delete/', views.api_delete_staff, name='api_delete_staff'),
    path('api/categories/', views.api_get_categories, name='api_get_categories'),
    path('api/categories/add/', views.api_add_category, name='api_add_category'),
    path('api/categories/update/', views.api_update_category, name='api_update_category'),
    path('api/categories/delete/', views.api_delete_category, name='api_delete_category'),
    path('api/reorder/', views.api_get_reorder_items, name='api_get_reorder_items'),
]


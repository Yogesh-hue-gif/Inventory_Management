/* DevInfantary POS & IMS Application JavaScript Controller */

let currentUser = null;
let currentView = 'dashboard';
let inventoryItems = [];
let posCart = [];
let quotationCart = [];
let batchCart = [];
let salesChart = null;
let currentSupplierDetailsId = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  checkAuth();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
}

function checkAuth() {
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

function setupEventListeners() {
  // Login Form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tenant = document.getElementById('login-tenant').value;
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant, username: user, password: pass })
      });
      const data = await res.json();
      if (data.status === 'success') {
        currentUser = data.user;
        document.getElementById('user-display-name').innerText = currentUser.name;
        document.getElementById('user-role-badge').innerText = currentUser.role;
        hideLoginScreen();
        navigate('dashboard');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend');
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/logout/');
    currentUser = null;
    showLoginScreen();
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-view');
      navigate(target);
    });
  });

  // Top Refresh
  document.getElementById('btn-top-refresh').addEventListener('click', () => {
    loadViewData(currentView);
  });
}

function navigate(viewName) {
  currentView = viewName;

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  document.querySelectorAll('.page-view').forEach(page => {
    page.classList.remove('active');
  });

  const activePage = document.getElementById(`view-${viewName}`);
  if (activePage) {
    activePage.classList.add('active');
  }

  const titles = {
    'dashboard': 'Main Dashboard Overview',
    'inventory': 'Inventory Management',
    'batches': 'Purchase Batches',
    'quotations': 'Customer Quotations',
    'pos': 'Point of Sale (POS) - Sell Product',
    'returns': 'Customer Returns',
    'supplier-bills': 'Supplier Bills & Accounts',
    'customer-bills': 'Customer Bills & Accounts',
    'suppliers': 'Suppliers Directory',
    'customers': 'Customers Directory',
    'settings': 'Settings & Administration'
  };

  document.getElementById('page-title').innerText = titles[viewName] || 'DevInfantary POS';
  loadViewData(viewName);
}

function loadViewData(viewName) {
  switch (viewName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'inventory':
      loadInventory();
      break;
    case 'batches':
      loadBatches();
      break;
    case 'quotations':
      loadQuotations();
      break;
    case 'pos':
      initPOS();
      break;
    case 'returns':
      initReturns();
      break;
    case 'supplier-bills':
      loadSupplierBills();
      break;
    case 'customer-bills':
      loadCustomerBills();
      break;
    case 'suppliers':
      loadSuppliers();
      break;
    case 'customers':
      loadCustomers();
      break;
    case 'settings':
      loadSettingsTab('staff');
      break;
  }
}

/* =========================================================
   DASHBOARD VIEW (Matching image2.png - image5.png)
========================================================= */
async function loadDashboard() {
  try {
    const resStats = await fetch('/api/dashboard/stats/');
    const stats = await resStats.json();

    document.getElementById('stat-today-rev').innerText = `Rs. ${stats.today_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('stat-today-bills').innerText = `${stats.today_bills_count} bills today`;

    document.getElementById('stat-week-rev').innerText = `Rs. ${stats.week_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('stat-week-bills').innerText = `${stats.week_bills_count} bills`;

    document.getElementById('stat-month-rev').innerText = `Rs. ${stats.month_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('stat-month-bills').innerText = `${stats.month_bills_count} bills`;

    document.getElementById('stat-total-rev').innerText = `Rs. ${stats.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    document.getElementById('stat-outstanding').innerText = `Rs. ${stats.outstanding.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('stat-inventory-val').innerText = `Rs. ${stats.inventory_value.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    document.getElementById('stat-total-inv').innerText = `${stats.total_inventory} items`;
    document.getElementById('stat-low-stock').innerText = `${stats.low_stock}`;
    document.getElementById('stat-out-stock').innerText = `${stats.out_of_stock}`;

    document.getElementById('stat-pending-supplier').innerText = `Rs. ${stats.pending_supplier_bills.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    // Inventory Health Widget
    document.getElementById('inv-health-instock').innerText = stats.in_stock;
    document.getElementById('inv-health-lowstock').innerText = stats.low_stock;
    document.getElementById('inv-health-outstock').innerText = stats.out_of_stock;
    document.getElementById('inv-health-avail-pct').innerText = `${stats.available_pct}%`;
    document.getElementById('inv-health-progress-fill').style.width = `${stats.available_pct}%`;

    // Load Charts
    const resCharts = await fetch('/api/dashboard/charts/');
    const chartData = await resCharts.json();

    renderSalesTrendChart(chartData.sales_trend);
    renderCategorySalesChart(chartData.sales_by_category);
    renderPaymentMethodsBreakdown(chartData.payment_methods);

  } catch (err) {
    console.error(err);
  }
}

function renderSalesTrendChart(trendData) {
  const ctx = document.getElementById('salesTrendChart').getContext('2d');
  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: trendData.labels,
      datasets: [{
        label: 'Sales (Rs.)',
        data: trendData.sales,
        backgroundColor: '#0ea5e9',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderCategorySalesChart(catData) {
  const container = document.getElementById('category-sales-list');
  container.innerHTML = '';

  catData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.category}</td>
      <td style="text-align: right; font-weight: 600;">Rs. ${item.sales.toLocaleString()}</td>
      <td style="text-align: right; color: var(--text-muted);">${item.items} items</td>
    `;
    container.appendChild(row);
  });
}

function renderPaymentMethodsBreakdown(pmData) {
  document.getElementById('pm-paid-pct').innerText = `${pmData.paid_pct}%`;
  document.getElementById('pm-partial-pct').innerText = `${pmData.partial_pct}%`;
  document.getElementById('pm-refunded-pct').innerText = `${pmData.refunded_pct}%`;
}

/* =========================================================
   INVENTORY VIEW
========================================================= */
async function loadInventory() {
  try {
    const res = await fetch('/api/inventory/');
    const data = await res.json();
    inventoryItems = data.items;

    renderInventoryTable(inventoryItems);

    document.getElementById('inv-total-cnt').innerText = inventoryItems.length;
    const lowCnt = inventoryItems.filter(i => i.status === 'Low Stock').length;
    const outCnt = inventoryItems.filter(i => i.status === 'Out of Stock').length;
    document.getElementById('inv-low-cnt').innerText = lowCnt;
    document.getElementById('inv-out-cnt').innerText = outCnt;

    const totVal = inventoryItems.reduce((acc, i) => acc + (i.stock * i.price_per_unit), 0);
    document.getElementById('inv-val-cnt').innerText = `Rs. ${totVal.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

  } catch (err) {
    console.error(err);
  }
}

function renderInventoryTable(items) {
  const tbody = document.getElementById('inventory-table-body');
  tbody.innerHTML = '';

  items.forEach(item => {
    let badgeClass = 'badge-success';
    if (item.status === 'Low Stock') badgeClass = 'badge-warning';
    if (item.status === 'Out of Stock') badgeClass = 'badge-danger';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: var(--text-main);">${item.product_name}</td>
      <td>${item.size}</td>
      <td>${item.class_type}</td>
      <td>${item.unit}</td>
      <td>Rs. ${item.price_per_unit.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="font-weight: 700;">${item.stock}</td>
      <td>${item.reorder_level}</td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td>${item.active}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterInventory(filterType) {
  if (filterType === 'all') renderInventoryTable(inventoryItems);
  else if (filterType === 'low') renderInventoryTable(inventoryItems.filter(i => i.status === 'Low Stock'));
  else if (filterType === 'out') renderInventoryTable(inventoryItems.filter(i => i.status === 'Out of Stock'));
}

function filterInventorySearch(query) {
  const q = query.toLowerCase();
  const filtered = inventoryItems.filter(i => 
    i.product_name.toLowerCase().includes(q) ||
    i.category.toLowerCase().includes(q) ||
    i.size.toLowerCase().includes(q)
  );
  renderInventoryTable(filtered);
}

function openAddProductModal() {
  fetchCategoriesForDropdown('product-category-select');
  document.getElementById('modal-add-product').classList.add('active');
}
function closeAddProductModal() {
  document.getElementById('modal-add-product').classList.remove('active');
}
async function submitAddProduct() {
  const name = document.getElementById('product-name-input').value;
  const catId = document.getElementById('product-category-select').value;
  const desc = document.getElementById('product-desc-input').value;
  const active = document.getElementById('product-active-chk').checked;

  if (!name || !catId) { alert('Please enter name and category'); return; }

  const res = await fetch('/api/products/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, category_id: catId, description: desc, is_active: active })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddProductModal();
    loadInventory();
  }
}

function openAddVariantModal() {
  fetchProductsForDropdown('variant-product-select');
  document.getElementById('modal-add-variant').classList.add('active');
}
function closeAddVariantModal() {
  document.getElementById('modal-add-variant').classList.remove('active');
}
async function submitAddVariant() {
  const productId = document.getElementById('variant-product-select').value;
  const size = document.getElementById('variant-size-input').value;
  const classType = document.getElementById('variant-class-input').value;
  const unit = document.getElementById('variant-unit-select').value;
  const price = document.getElementById('variant-price-input').value;
  const stock = document.getElementById('variant-stock-input').value;
  const reorder = document.getElementById('variant-reorder-input').value;
  const loc = document.getElementById('variant-location-input').value;

  const res = await fetch('/api/variants/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      size: size,
      class_type: classType,
      unit_of_measure: unit,
      price_per_unit: price,
      stock_quantity: stock,
      reorder_level: reorder,
      location: loc
    })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddVariantModal();
    loadInventory();
  }
}

/* Helper Dropdown Loaders */
async function fetchCategoriesForDropdown(elementId) {
  const res = await fetch('/api/categories/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">Select Category</option>';
  data.categories.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

async function fetchProductsForDropdown(elementId) {
  const res = await fetch('/api/products/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">Select Product</option>';
  data.products.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.name} (${p.category_name})</option>`;
  });
}

/* =========================================================
   PURCHASE BATCHES VIEW (Matching image14.png - image18.png)
========================================================= */
let allBatchesData = [];

async function loadBatches() {
  try {
    const res = await fetch('/api/batches/');
    const data = await res.json();
    allBatchesData = data.batches;
    
    const tbody = document.getElementById('batches-table-body');
    tbody.innerHTML = '';

    allBatchesData.forEach(b => {
      let badgeClass = 'badge-success';
      if (b.status === 'Partial') badgeClass = 'badge-warning';
      if (b.status === 'Pending') badgeClass = 'badge-danger';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-main);">${b.batch_name}</td>
        <td>${b.supplier_name}</td>
        <td style="font-weight: 600;">Rs. ${b.total_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td>Rs. ${b.paid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td style="color: var(--accent-rose);">Rs. ${b.remaining.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td><span class="badge ${badgeClass}">${b.status}</span></td>
        <td>
          <button onclick="openEditBatchModal(${b.id})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

function openNewBatchModal() {
  batchCart = [];
  renderBatchCart();
  fetchSuppliersForDropdown('batch-supplier-select');
  fetchVariantsForDropdown('batch-variant-select');
  document.getElementById('modal-new-batch').classList.add('active');
}
function closeNewBatchModal() {
  document.getElementById('modal-new-batch').classList.remove('active');
}

function openEditBatchModal(batchId) {
  const batch = allBatchesData.find(b => b.id === batchId);
  if (batch) {
    document.getElementById('edit-batch-id').value = batch.id;
    document.getElementById('edit-batch-name').value = batch.batch_name;
    document.getElementById('edit-batch-paid').value = batch.paid;
    document.getElementById('edit-batch-status').value = batch.status;
    document.getElementById('modal-edit-batch').classList.add('active');
  }
}
function closeEditBatchModal() {
  document.getElementById('modal-edit-batch').classList.remove('active');
}

async function submitUpdateBatch() {
  const bId = document.getElementById('edit-batch-id').value;
  const paid = document.getElementById('edit-batch-paid').value;
  const status = document.getElementById('edit-batch-status').value;

  const res = await fetch('/api/batches/update/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch_id: bId, paid_amount: paid, status: status })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeEditBatchModal();
    loadBatches();
    loadDashboard();
  }
}

async function fetchSuppliersForDropdown(elementId) {
  const res = await fetch('/api/suppliers/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">Select Supplier</option>';
  data.suppliers.forEach(s => {
    select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
}

async function fetchVariantsForDropdown(elementId) {
  const res = await fetch('/api/inventory/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">Select Product/Variant Search...</option>';
  data.items.forEach(i => {
    select.innerHTML += `<option value="${i.id}">${i.product_name} - ${i.size} (${i.unit}) - Rs. ${i.price_per_unit} (${i.stock} in stock)</option>`;
  });
}

function addVariantToBatch() {
  const select = document.getElementById('batch-variant-select');
  const variantId = select.value;
  if (!variantId) { alert('Please select a product variant'); return; }

  const itemData = inventoryItems.find(i => i.id == variantId);

  const qty = parseFloat(document.getElementById('batch-qty-input').value) || 1;
  const cost = parseFloat(document.getElementById('batch-cost-input').value) || 0;
  const sale = parseFloat(document.getElementById('batch-sale-input').value) || (itemData ? itemData.price_per_unit : 0);

  batchCart.push({
    variant_id: variantId,
    product_name: itemData ? itemData.product_name : 'Product',
    size: itemData ? itemData.size : 'Standard',
    class_type: itemData ? itemData.class_type : 'Standard',
    quantity: qty,
    cost_price: cost,
    sale_price: sale,
    line_total: qty * cost
  });

  renderBatchCart();
}

function renderBatchCart() {
  const tbody = document.getElementById('batch-items-body');
  tbody.innerHTML = '';
  let grandTot = 0;

  batchCart.forEach((item, idx) => {
    grandTot += item.line_total;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.product_name}</td>
      <td>${item.size}</td>
      <td>${item.class_type}</td>
      <td>${item.quantity}</td>
      <td>Rs. ${item.cost_price.toFixed(2)}</td>
      <td>Rs. ${item.sale_price.toFixed(2)}</td>
      <td style="font-weight:600;">Rs. ${item.line_total.toFixed(2)}</td>
      <td><button onclick="removeBatchItem(${idx})" class="btn btn-secondary" style="padding:2px 6px; font-size:10px;">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('batch-summary-total').innerText = `Rs. ${grandTot.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  updateBatchPaymentSummary();
}

function updateBatchPaymentSummary() {
  const total = batchCart.reduce((acc, i) => acc + i.line_total, 0);
  const paid = parseFloat(document.getElementById('batch-paid-input').value) || 0;
  const remaining = Math.max(total - paid, 0);

  document.getElementById('batch-summary-remaining').innerText = `Rs. ${remaining.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

  const pct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
  document.getElementById('batch-paid-pct-badge').innerText = `${pct}% paid`;
  document.getElementById('batch-paid-progress-fill').style.width = `${pct}%`;
}

function removeBatchItem(idx) {
  batchCart.splice(idx, 1);
  renderBatchCart();
}

async function submitSaveBatch() {
  const name = document.getElementById('batch-name-input').value;
  const suppId = document.getElementById('batch-supplier-select').value;
  const date = document.getElementById('batch-date-input').value;
  const paid = document.getElementById('batch-paid-input').value;

  if (!name || !suppId || batchCart.length === 0) {
    alert('Please enter batch name, select supplier, and add at least one item');
    return;
  }

  const res = await fetch('/api/batches/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_name: name,
      supplier_id: suppId,
      date: date,
      paid_amount: paid,
      items: batchCart
    })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeNewBatchModal();
    loadBatches();
    loadDashboard();
  }
}

/* =========================================================
   QUOTATIONS VIEW (Matching image19.png - image28.png)
========================================================= */
let allQuotationsData = [];

async function loadQuotations() {
  try {
    const res = await fetch('/api/quotations/');
    const data = await res.json();
    allQuotationsData = data.quotations;

    const container = document.getElementById('quotations-list');
    container.innerHTML = '';

    allQuotationsData.forEach(q => {
      const card = document.createElement('div');
      card.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; cursor: pointer;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; color:#38bdf8;">${q.quotation_number}</span>
          <span class="badge badge-info">${q.status}</span>
        </div>
        <div style="margin-top:6px; font-size:14px; color: var(--text-main);">${q.customer_name}</div>
        <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12px; color:var(--text-muted);">
          <span>Valid: ${q.valid_until}</span>
          <span style="font-weight:700; color: var(--text-main);">Rs. ${q.net_total.toLocaleString()}</span>
        </div>
      `;
      card.addEventListener('click', () => showQuotationDetails(q));
      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
  }
}

function showQuotationDetails(q) {
  const printSheet = document.getElementById('printable-receipt');
  printSheet.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <h2 style="margin:0; font-size:22px;">Hardware Store</h2>
      <p style="margin:2px 0;">Main Bazar Lahore | Phone: 03021222005</p>
      <h3 style="margin-top:10px; border-bottom:1px solid #ccc; padding-bottom:6px;">QUOTATION</h3>
    </div>
    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:15px;">
      <div>
        <strong>Customer:</strong> ${q.customer_name}<br>
        <strong>Quotation #:</strong> ${q.quotation_number}
      </div>
      <div>
        <strong>Date:</strong> ${q.date}<br>
        <strong>Valid Until:</strong> ${q.valid_until}
      </div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
      <thead>
        <tr style="background:#eee; text-align:left;">
          <th style="padding:6px;">Product</th>
          <th style="padding:6px;">Qty</th>
          <th style="padding:6px;">Price</th>
          <th style="padding:6px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${q.items.map(it => `
          <tr>
            <td style="padding:6px;">${it.product_name} (${it.size})</td>
            <td style="padding:6px;">${it.qty} ${it.unit}</td>
            <td style="padding:6px;">Rs. ${it.unit_price}</td>
            <td style="padding:6px;">Rs. ${it.subtotal}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="text-align:right; font-size:13px; line-height:1.6;">
      <div>Subtotal: Rs. ${q.subtotal.toLocaleString()}</div>
      <div>Discount: Rs. ${q.overall_discount.toLocaleString()}</div>
      <div style="font-weight:bold; font-size:15px;">TOTAL: Rs. ${q.net_total.toLocaleString()}</div>
    </div>
    <p style="text-align:center; font-size:11px; margin-top:30px; font-style:italic;">This is a quotation, not an invoice.</p>
  `;
  document.getElementById('modal-print-preview').classList.add('active');
}

function openNewQuotationModal() {
  quotationCart = [];
  renderQuotationCart();
  fetchVariantsForDropdown('quo-product-search-select');
  document.getElementById('modal-new-quotation').classList.add('active');
}
function closeNewQuotationModal() {
  document.getElementById('modal-new-quotation').classList.remove('active');
}

function addVariantToQuotation() {
  const select = document.getElementById('quo-product-search-select');
  const variantId = select.value;
  if (!variantId) return;

  const itemData = inventoryItems.find(i => i.id == variantId);
  if (itemData) {
    const existing = quotationCart.find(c => c.variant_id == variantId);
    if (existing) {
      existing.quantity += 1;
    } else {
      quotationCart.push({
        variant_id: itemData.id,
        product_name: itemData.product_name,
        size: itemData.size,
        unit: itemData.unit,
        unit_price: itemData.price_per_unit,
        quantity: 1
      });
    }
    renderQuotationCart();
  }
}

function renderQuotationCart() {
  const tbody = document.getElementById('quo-items-body');
  tbody.innerHTML = '';
  let subtotal = 0;

  quotationCart.forEach((item, idx) => {
    const lineSub = item.quantity * item.unit_price;
    subtotal += lineSub;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.product_name} (${item.size})</td>
      <td>
        <input type="number" min="1" value="${item.quantity}" onchange="updateQuotationQty(${idx}, this.value)" class="form-control" style="width:70px;">
      </td>
      <td>Rs. ${item.unit_price.toFixed(2)}</td>
      <td style="font-weight:600;">Rs. ${lineSub.toFixed(2)}</td>
      <td><button onclick="removeQuotationItem(${idx})" class="btn btn-secondary" style="padding:2px 6px; font-size:10px;">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('quo-subtotal').innerText = `Rs. ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  const discount = parseFloat(document.getElementById('quo-discount-input').value) || 0;
  const netTotal = Math.max(subtotal - discount, 0);
  document.getElementById('quo-net-total').innerText = `Rs. ${netTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function updateQuotationQty(idx, val) {
  quotationCart[idx].quantity = parseFloat(val) || 1;
  renderQuotationCart();
}

function removeQuotationItem(idx) {
  quotationCart.splice(idx, 1);
  renderQuotationCart();
}

async function submitSaveQuotation() {
  const custName = document.getElementById('quo-customer-input').value || 'Walk-in Customer';
  const validUntil = document.getElementById('quo-valid-until-input').value;
  const discount = parseFloat(document.getElementById('quo-discount-input').value) || 0;

  if (quotationCart.length === 0) { alert('Please add at least one item'); return; }

  const res = await fetch('/api/quotations/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: custName,
      valid_until: validUntil,
      overall_discount: discount,
      items: quotationCart
    })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeNewQuotationModal();
    loadQuotations();
  }
}

/* =========================================================
   POS / SELL PRODUCT VIEW (Matching image29.png - image33.png)
========================================================= */
function initPOS() {
  posCart = [];
  renderPOSCart();
  fetchVariantsForDropdown('pos-product-search-select');
}

function addProductToPOSCart() {
  const select = document.getElementById('pos-product-search-select');
  const variantId = select.value;
  if (!variantId) return;

  const itemData = inventoryItems.find(i => i.id == variantId);

  if (itemData) {
    const existing = posCart.find(c => c.variant_id == variantId);
    if (existing) {
      existing.quantity += 1;
    } else {
      posCart.push({
        variant_id: itemData.id,
        product_name: itemData.product_name,
        size: itemData.size,
        unit: itemData.unit,
        unit_price: itemData.price_per_unit,
        quantity: 1
      });
    }
    renderPOSCart();
  }
}

function setDiscountPreset(pct) {
  const subtotal = posCart.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);
  const discountVal = (subtotal * pct) / 100;
  document.getElementById('pos-discount-input').value = discountVal;

  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  renderPOSCart();
}

function renderPOSCart() {
  const container = document.getElementById('pos-cart-items');
  container.innerHTML = '';
  let subtotal = 0;

  if (posCart.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">Cart is empty. Search a product above or load a quotation.</div>`;
    updatePOSTotals(0);
    return;
  }

  posCart.forEach((item, idx) => {
    const itemTotal = item.quantity * item.unit_price;
    subtotal += itemTotal;

    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:12px; border-radius:var(--radius-md); margin-bottom:8px;';
    div.innerHTML = `
      <div>
        <div style="font-weight:600; color: var(--text-main);">${item.product_name}</div>
        <div style="font-size:12px; color:var(--text-muted);">${item.size} · Rs. ${item.unit_price} / ${item.unit}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button onclick="changePOSQty(${idx}, -1)" class="btn btn-secondary" style="padding:2px 8px;">-</button>
        <span style="font-weight:700; width:24px; text-align:center;">${item.quantity}</span>
        <button onclick="changePOSQty(${idx}, 1)" class="btn btn-secondary" style="padding:2px 8px;">+</button>
        <span style="font-weight:700; min-width:70px; text-align:right;">Rs. ${itemTotal.toLocaleString()}</span>
        <button onclick="removePOSItem(${idx})" style="background:none; border:none; color:var(--accent-rose); cursor:pointer; font-size:16px;">&times;</button>
      </div>
    `;
    container.appendChild(div);
  });

  updatePOSTotals(subtotal);
}

function changePOSQty(idx, delta) {
  posCart[idx].quantity += delta;
  if (posCart[idx].quantity <= 0) {
    posCart.splice(idx, 1);
  }
  renderPOSCart();
}

function removePOSItem(idx) {
  posCart.splice(idx, 1);
  renderPOSCart();
}

function updatePOSTotals(subtotal) {
  document.getElementById('pos-subtotal').innerText = `Rs. ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
  
  const discountInput = parseFloat(document.getElementById('pos-discount-input').value) || 0;
  const netTotal = Math.max(subtotal - discountInput, 0);
  
  document.getElementById('pos-net-total').innerText = `Rs. ${netTotal.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

  const cashRec = parseFloat(document.getElementById('pos-cash-input').value) || 0;
  const change = Math.max(cashRec - netTotal, 0);
  document.getElementById('pos-change-display').innerText = `Rs. ${change.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

  if (cashRec > 0 && cashRec === netTotal) {
    document.getElementById('exact-amount-badge').style.display = 'block';
  } else {
    document.getElementById('exact-amount-badge').style.display = 'none';
  }
}

async function loadQuotationIntoPOS() {
  const qNum = document.getElementById('pos-quotation-input').value.trim();
  if (!qNum) return;

  try {
    const res = await fetch(`/api/pos/quotation/${qNum}/`);
    const data = await res.json();
    if (data.quotation_number) {
      document.getElementById('pos-customer-input').value = data.customer_name;
      posCart = data.items.map(it => ({
        variant_id: it.variant_id,
        product_name: it.product_name,
        size: it.size,
        unit: it.unit,
        unit_price: it.unit_price,
        quantity: it.quantity
      }));
      renderPOSCart();
      alert(`Loaded Quotation ${qNum} successfully!`);
    } else {
      alert(data.message || 'Quotation not found');
    }
  } catch (err) {
    console.error(err);
    alert('Error loading quotation');
  }
}

async function submitCreatePOSBill() {
  if (posCart.length === 0) { alert('Cart is empty'); return; }

  const custName = document.getElementById('pos-customer-input').value || 'Walk-in Customer';
  const qRef = document.getElementById('pos-quotation-input').value;
  const discount = parseFloat(document.getElementById('pos-discount-input').value) || 0;
  const cashRec = parseFloat(document.getElementById('pos-cash-input').value) || 0;

  const res = await fetch('/api/pos/sell/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: custName,
      quotation_number: qRef,
      overall_discount: discount,
      cash_received: cashRec,
      items: posCart
    })
  });
  const data = await res.json();
  if (data.status === 'success') {
    showInvoicePrintModal(data);
    posCart = [];
    renderPOSCart();
    loadDashboard();
  }
}

function showInvoicePrintModal(saleData) {
  const printSheet = document.getElementById('printable-receipt');
  printSheet.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <h2 style="margin:0; font-size:22px;">Hardware Store</h2>
      <p style="margin:2px 0;">Main Bazar Lahore | Phone: 03021222005</p>
      <h3 style="margin-top:10px; border-bottom:1px solid #ccc; padding-bottom:6px;">TAX INVOICE / RECEIPT</h3>
    </div>
    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:15px;">
      <div>
        <strong>Invoice #:</strong> ${saleData.bill_number}<br>
        <strong>Customer:</strong> Walk-in Customer
      </div>
      <div>
        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
        <strong>Time:</strong> ${new Date().toLocaleTimeString()}
      </div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
      <thead>
        <tr style="background:#eee; text-align:left;">
          <th style="padding:6px;">Item</th>
          <th style="padding:6px;">Qty</th>
          <th style="padding:6px;">Price</th>
          <th style="padding:6px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${posCart.map(it => `
          <tr>
            <td style="padding:6px;">${it.product_name} (${it.size})</td>
            <td style="padding:6px;">${it.quantity} ${it.unit}</td>
            <td style="padding:6px;">Rs. ${it.unit_price}</td>
            <td style="padding:6px;">Rs. ${it.quantity * it.unit_price}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="text-align:right; font-size:13px; line-height:1.6;">
      <div>Total Amount: Rs. ${saleData.net_total.toLocaleString()}</div>
      <div>Cash Received: Rs. ${saleData.cash_received.toLocaleString()}</div>
      <div style="font-weight:bold; font-size:15px; color:green;">Change / Balance: Rs. ${saleData.change.toLocaleString()}</div>
    </div>
    <p style="text-align:center; font-size:11px; margin-top:30px;">Thank you for shopping with us!</p>
  `;
  document.getElementById('modal-print-preview').classList.add('active');
}

function closePrintPreviewModal() {
  document.getElementById('modal-print-preview').classList.remove('active');
}
function printReceipt() {
  window.print();
}

/* =========================================================
   RETURNS VIEW
========================================================= */
let currentReturnBill = null;

function initReturns() {}

async function searchReturnBill() {
  const bNum = document.getElementById('return-bill-search-input').value.trim();
  if (!bNum) return;

  try {
    const res = await fetch(`/api/returns/search-bill/?bill_number=${bNum}`);
    const data = await res.json();
    if (data.bill_number) {
      currentReturnBill = data;
      renderReturnItemsTable(data);
    } else {
      alert('Bill not found');
    }
  } catch (err) {
    console.error(err);
    alert('Bill not found');
  }
}

function renderReturnItemsTable(billData) {
  const tbody = document.getElementById('return-items-body');
  tbody.innerHTML = '';

  billData.items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="return-chk" data-idx="${idx}"></td>
      <td>${item.product_name}</td>
      <td>${item.size}</td>
      <td>${item.unit}</td>
      <td><input type="number" min="1" max="${item.quantity}" value="${item.quantity}" class="form-control return-qty" data-idx="${idx}" style="width:70px;"></td>
      <td>Rs. ${item.unit_price}</td>
      <td style="font-weight:600;">Rs. ${item.line_total}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function submitProcessReturn() {
  if (!currentReturnBill) return;

  const chks = document.querySelectorAll('.return-chk:checked');
  if (chks.length === 0) { alert('Select at least one item to return'); return; }

  const returnItems = [];
  chks.forEach(chk => {
    const idx = chk.getAttribute('data-idx');
    const item = currentReturnBill.items[idx];
    const qtyInput = document.querySelector(`.return-qty[data-idx="${idx}"]`);
    returnItems.push({
      variant_id: item.variant_id,
      quantity_returned: parseFloat(qtyInput.value) || 1
    });
  });

  const reason = document.getElementById('return-reason-select').value;
  const notes = document.getElementById('return-notes-input').value;
  const restoreStock = document.getElementById('return-restore-stock').checked;
  const adjRefund = parseFloat(document.getElementById('return-adj-refund-input').value) || 0;

  const res = await fetch('/api/returns/process/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bill_number: currentReturnBill.bill_number,
      reason: reason,
      notes: notes,
      restore_stock: restoreStock,
      adjusted_refund: adjRefund,
      items: returnItems
    })
  });
  const data = await res.json();
  if (data.status === 'success') {
    alert(data.message);
    document.getElementById('return-items-body').innerHTML = '';
    currentReturnBill = null;
    loadDashboard();
  }
}

/* =========================================================
   SUPPLIER BILLS & ACCOUNTS VIEW (Matching image39.png - image44.png)
========================================================= */
async function loadSupplierBills() {
  try {
    const res = await fetch('/api/supplier-bills/');
    const data = await res.json();

    document.getElementById('supp-tot-suppliers').innerText = data.total_suppliers;
    document.getElementById('supp-tot-billed').innerText = `Rs. ${data.total_billed.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('supp-tot-paid').innerText = `Rs. ${data.total_paid.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('supp-tot-pending').innerText = `Rs. ${data.total_pending.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    const tbody = document.getElementById('supplier-bills-body');
    tbody.innerHTML = '';

    data.suppliers.forEach(s => {
      let badgeClass = 'badge-success';
      if (s.status === 'Partial') badgeClass = 'badge-warning';
      if (s.status === 'Pending') badgeClass = 'badge-danger';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color: var(--text-main);">${s.supplier_name}</td>
        <td>Rs. ${s.total_billed.toLocaleString()}</td>
        <td>Rs. ${s.paid.toLocaleString()}</td>
        <td style="color:var(--accent-rose); font-weight:700;">Rs. ${s.remaining.toLocaleString()}</td>
        <td>${s.batches_count} batches</td>
        <td><span class="badge ${badgeClass}">${s.status}</span></td>
        <td>
          <button onclick="openSupplierDetailsModal(${s.supplier_id}, '${s.supplier_name}')" class="btn btn-secondary" style="padding:4px 8px; font-size:11px;">Details</button>
          <button onclick="openSupplierPayModal(${s.supplier_id}, '${s.supplier_name}', ${s.remaining})" class="btn btn-primary" style="padding:4px 8px; font-size:11px;">Pay</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

async function openSupplierDetailsModal(suppId, suppName) {
  currentSupplierDetailsId = suppId;
  document.getElementById('supp-details-title').innerText = `${suppName} - Batch & Payment Details`;
  fetchSupplierDetailsData(suppId);
  document.getElementById('modal-supplier-details').classList.add('active');
}
function closeSupplierDetailsModal() {
  document.getElementById('modal-supplier-details').classList.remove('active');
}

async function fetchSupplierDetailsData(suppId, startDate = '', endDate = '') {
  let url = `/api/suppliers/details/${suppId}/`;
  if (startDate && endDate) url += `?start_date=${startDate}&end_date=${endDate}`;

  const res = await fetch(url);
  const data = await res.json();

  document.getElementById('sd-tot-batches').innerText = data.total_batches;
  document.getElementById('sd-tot-billed').innerText = `Rs. ${data.total_billed.toLocaleString()}`;
  document.getElementById('sd-tot-paid').innerText = `Rs. ${data.total_paid.toLocaleString()}`;
  document.getElementById('sd-outstanding').innerText = `Rs. ${data.outstanding.toLocaleString()}`;

  const tbody = document.getElementById('sd-batches-body');
  tbody.innerHTML = '';

  data.batches.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.batch_name}</td>
      <td>${b.date}</td>
      <td>Rs. ${b.total.toLocaleString()}</td>
      <td>Rs. ${b.paid.toLocaleString()}</td>
      <td>Rs. ${b.remaining.toLocaleString()}</td>
      <td><span class="badge badge-info">${b.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterSupplierDetailsDate(range) {
  if (!currentSupplierDetailsId) return;

  const today = new Date();
  let start = '', end = today.toISOString().split('T')[0];

  if (range === 'today') {
    start = end;
  } else if (range === 'week') {
    const w = new Date(today);
    w.setDate(today.getDate() - 7);
    start = w.toISOString().split('T')[0];
  } else if (range === 'month') {
    const m = new Date(today);
    m.setDate(today.getDate() - 30);
    start = m.toISOString().split('T')[0];
  }

  fetchSupplierDetailsData(currentSupplierDetailsId, start, end);
}

function openSupplierPayModal(suppId, suppName, remaining) {
  document.getElementById('pay-supplier-id').value = suppId;
  document.getElementById('pay-supplier-title').innerText = `Payment for ${suppName}`;
  document.getElementById('pay-supplier-amount').value = remaining;
  document.getElementById('modal-pay-supplier').classList.add('active');
}
function closeSupplierPayModal() {
  document.getElementById('modal-pay-supplier').classList.remove('active');
}

async function submitSupplierPayment() {
  const suppId = document.getElementById('pay-supplier-id').value;
  const amt = document.getElementById('pay-supplier-amount').value;
  const remarks = document.getElementById('pay-supplier-remarks').value;

  const res = await fetch('/api/supplier-bills/pay/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplier_id: suppId, amount: amt, remarks: remarks })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeSupplierPayModal();
    loadSupplierBills();
    loadDashboard();
  }
}

/* =========================================================
   CUSTOMER BILLS VIEW
========================================================= */
async function loadCustomerBills() {
  try {
    const res = await fetch('/api/customer-bills/');
    const data = await res.json();

    document.getElementById('cust-tot-count').innerText = data.total_customers;
    document.getElementById('cust-tot-billed').innerText = `Rs. ${data.total_billed.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('cust-tot-collected').innerText = `Rs. ${data.total_collected.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    document.getElementById('cust-tot-outstanding').innerText = `Rs. ${data.total_outstanding.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    const tbody = document.getElementById('customer-bills-body');
    tbody.innerHTML = '';

    data.customers.forEach(c => {
      let badgeClass = c.status === 'Cleared' ? 'badge-success' : 'badge-warning';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color: var(--text-main);">${c.customer_name}</td>
        <td>Rs. ${c.total_billed.toLocaleString()}</td>
        <td>Rs. ${c.collected.toLocaleString()}</td>
        <td style="color:var(--accent-amber); font-weight:700;">Rs. ${c.outstanding.toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${c.status}</span></td>
        <td>
          <button onclick="openCustomerPayModal(${c.customer_id}, '${c.customer_name}', ${c.outstanding})" class="btn btn-primary" style="padding:4px 10px; font-size:11px;">Pay</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

function openCustomerPayModal(custId, custName, outstanding) {
  document.getElementById('pay-customer-id').value = custId;
  document.getElementById('pay-customer-title').innerText = `Payment from ${custName}`;
  document.getElementById('pay-customer-amount').value = outstanding;
  document.getElementById('modal-pay-customer').classList.add('active');
}
function closeCustomerPayModal() {
  document.getElementById('modal-pay-customer').classList.remove('active');
}

async function submitCustomerPayment() {
  const custId = document.getElementById('pay-customer-id').value;
  const amt = document.getElementById('pay-customer-amount').value;
  const remarks = document.getElementById('pay-customer-remarks').value;

  const res = await fetch('/api/customer-bills/pay/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: custId, amount: amt, remarks: remarks })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeCustomerPayModal();
    loadCustomerBills();
    loadDashboard();
  }
}

/* =========================================================
   SUPPLIERS DIRECTORY VIEW
========================================================= */
async function loadSuppliers() {
  const res = await fetch('/api/suppliers/');
  const data = await res.json();

  const tbody = document.getElementById('suppliers-directory-body');
  tbody.innerHTML = '';

  data.suppliers.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color: var(--text-main);">${s.name}</td>
      <td>${s.contact}</td>
      <td>${s.address}</td>
      <td><span class="badge badge-success">${s.status}</span></td>
      <td>${s.created_at}</td>
      <td>
        <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddSupplierModal() {
  document.getElementById('modal-add-supplier').classList.add('active');
}
function closeAddSupplierModal() {
  document.getElementById('modal-add-supplier').classList.remove('active');
}
async function submitAddSupplier() {
  const name = document.getElementById('supp-name-input').value;
  const contact = document.getElementById('supp-contact-input').value;
  const addr = document.getElementById('supp-address-input').value;

  const res = await fetch('/api/suppliers/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, contact: contact, address: addr })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddSupplierModal();
    loadSuppliers();
  }
}

/* =========================================================
   CUSTOMERS DIRECTORY VIEW
========================================================= */
async function loadCustomers() {
  const res = await fetch('/api/customers/');
  const data = await res.json();

  const tbody = document.getElementById('customers-directory-body');
  tbody.innerHTML = '';

  data.customers.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color: var(--text-main);">${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.address}</td>
      <td><span class="badge badge-info">${c.type}</span></td>
      <td><span class="badge badge-success">${c.status}</span></td>
      <td>${c.created_at}</td>
      <td>
        <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddCustomerModal() {
  document.getElementById('modal-add-customer').classList.add('active');
}
function closeAddCustomerModal() {
  document.getElementById('modal-add-customer').classList.remove('active');
}
async function submitAddCustomer() {
  const name = document.getElementById('cust-name-input').value;
  const phone = document.getElementById('cust-phone-input').value;
  const addr = document.getElementById('cust-address-input').value;
  const ctype = document.getElementById('cust-type-select').value;

  const res = await fetch('/api/customers/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, phone: phone, address: addr, type: ctype })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddCustomerModal();
    loadCustomers();
  }
}

/* =========================================================
   SETTINGS TAB MANAGEMENT
========================================================= */
function switchSettingsTab(tabName) {
  document.getElementById('settings-tab-staff').style.display = 'none';
  document.getElementById('settings-tab-categories').style.display = 'none';
  document.getElementById('settings-tab-reorder').style.display = 'none';

  document.getElementById('tab-btn-staff').classList.remove('active');
  document.getElementById('tab-btn-categories').classList.remove('active');
  document.getElementById('tab-btn-reorder').classList.remove('active');

  document.getElementById(`settings-tab-${tabName}`).style.display = 'block';
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');

  loadSettingsTab(tabName);
}

function loadSettingsTab(tabName) {
  if (tabName === 'staff') loadStaff();
  if (tabName === 'categories') loadCategories();
  if (tabName === 'reorder') loadReorder();
}

async function loadStaff() {
  const res = await fetch('/api/staff/');
  const data = await res.json();

  const tbody = document.getElementById('staff-table-body');
  tbody.innerHTML = '';

  data.staff.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color: var(--text-main);">${s.name}</td>
      <td>${s.username}</td>
      <td><span class="badge badge-info">${s.role}</span></td>
      <td>${s.contact}</td>
      <td><span class="badge badge-success">${s.status}</span></td>
      <td>${s.hire_date}</td>
      <td>
        <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddStaffModal() {
  document.getElementById('modal-add-staff').classList.add('active');
}
function closeAddStaffModal() {
  document.getElementById('modal-add-staff').classList.remove('active');
}
async function submitAddStaff() {
  const name = document.getElementById('staff-name-input').value;
  const uname = document.getElementById('staff-username-input').value;
  const pass = document.getElementById('staff-password-input').value;
  const role = document.getElementById('staff-role-select').value;

  const res = await fetch('/api/staff/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, username: uname, password: pass, role: role })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddStaffModal();
    loadStaff();
  }
}

async function loadCategories() {
  const res = await fetch('/api/categories/');
  const data = await res.json();

  const tbody = document.getElementById('categories-table-body');
  tbody.innerHTML = '';

  data.categories.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color: var(--text-main);">${c.name}</td>
      <td>#${c.order_num}</td>
      <td>${c.description}</td>
      <td><span class="badge badge-success">${c.status}</span></td>
      <td>${c.created_at}</td>
      <td>
        <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddCategoryModal() {
  document.getElementById('modal-add-category').classList.add('active');
}
function closeAddCategoryModal() {
  document.getElementById('modal-add-category').classList.remove('active');
}
async function submitAddCategory() {
  const name = document.getElementById('cat-name-input').value;
  const order = document.getElementById('cat-order-input').value;
  const desc = document.getElementById('cat-desc-input').value;

  const res = await fetch('/api/categories/add/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, order_num: order, description: desc })
  });
  const data = await res.json();
  if (data.status === 'success') {
    closeAddCategoryModal();
    loadCategories();
  }
}

let reorderItems = [];

async function loadReorder() {
  const res = await fetch('/api/reorder/');
  const data = await res.json();
  reorderItems = data.items;

  const tbody = document.getElementById('reorder-table-body');
  tbody.innerHTML = '';

  data.items.forEach((item, idx) => {
    let badgeClass = item.status === 'Out of Stock' ? 'badge-danger' : 'badge-warning';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" checked class="reorder-chk" data-idx="${idx}"></td>
      <td style="font-weight:600; color: var(--text-main);">${item.product_name} (${item.size})</td>
      <td>${item.current_stock} ${item.unit}</td>
      <td>${item.reorder_level}</td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td><input type="number" value="${item.qty_to_order}" class="form-control reorder-qty" data-idx="${idx}" style="width:90px;"></td>
      <td><input type="text" placeholder="e.g. Urgent" class="form-control reorder-notes" data-idx="${idx}"></td>
    `;
    tbody.appendChild(tr);
  });
}

function generateReorderPDF() {
  const chks = document.querySelectorAll('.reorder-chk:checked');
  if (chks.length === 0) { alert('Select at least one item'); return; }

  const printSheet = document.getElementById('printable-receipt');
  printSheet.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <h2 style="margin:0; font-size:22px;">Hardware Store</h2>
      <p style="margin:2px 0;">Main Bazar Lahore | Phone: 03021222005</p>
      <h3 style="margin-top:10px; border-bottom:1px solid #ccc; padding-bottom:6px;">SUPPLIER DEMAND SLIP (REORDER)</h3>
    </div>
    <div style="margin-bottom:15px; font-size:12px;">
      <strong>Date Generated:</strong> ${new Date().toLocaleDateString()}<br>
      <strong>Generated By:</strong> Hardware Store Inventory Management
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
      <thead>
        <tr style="background:#eee; text-align:left;">
          <th style="padding:6px;">Product / Variant</th>
          <th style="padding:6px;">Current Stock</th>
          <th style="padding:6px;">Order Qty</th>
          <th style="padding:6px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from(chks).map(chk => {
          const idx = chk.getAttribute('data-idx');
          const item = reorderItems[idx];
          const qty = document.querySelector(`.reorder-qty[data-idx="${idx}"]`).value;
          const notes = document.querySelector(`.reorder-notes[data-idx="${idx}"]`).value;
          return `
            <tr>
              <td style="padding:6px;">${item.product_name} (${item.size})</td>
              <td style="padding:6px;">${item.current_stock} ${item.unit}</td>
              <td style="padding:6px; font-weight:bold;">${qty} ${item.unit}</td>
              <td style="padding:6px;">${notes || '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <p style="text-align:center; font-size:11px; margin-top:30px;">Authorized Signature: _______________________</p>
  `;
  document.getElementById('modal-print-preview').classList.add('active');
}

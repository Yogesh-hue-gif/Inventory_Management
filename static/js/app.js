/* DevInfantary POS & IMS Application JavaScript Controller - Replica of project_IVM.pdf */

let currentUser = null;
let currentView = 'dashboard';
let inventoryItems = [];
let posCart = [];
let quotationCart = [];
let batchCart = [];
let returnSelectedItems = [];
let currentReturnBill = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  checkAuth();
}

function checkAuth() {
  // Hide login screen and enter main app
  hideLoginScreen();
  navigate('dashboard');
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
  // Login Form submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      hideLoginScreen();
      navigate('dashboard');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLoginScreen();
    });
  }

  // Sidebar navigation links
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-view');
      if (target === 'settings') {
        toggleSettingsSubmenu();
      } else {
        navigate(target);
      }
    });
  });

  // Top Refresh button
  const topRefreshBtn = document.getElementById('btn-top-refresh');
  if (topRefreshBtn) {
    topRefreshBtn.addEventListener('click', () => {
      const icon = topRefreshBtn.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      loadViewData(currentView);
      setTimeout(() => {
        if (icon) icon.classList.remove('fa-spin');
      }, 500);
    });
  }

  // Global Keydown Listeners (Enter for modal submit, Esc to close modal, Alt Shortcuts)
  document.addEventListener('keydown', (e) => {
    // 1. Esc Key -> close any active overlay modal
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
      });
      return;
    }

    // 2. Alt Keyboard Shortcuts
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'p') {
        e.preventDefault();
        openAddProductModal();
      } else if (k === 'v') {
        e.preventDefault();
        openAddVariantModal();
      } else if (k === 'b') {
        e.preventDefault();
        openNewBatchModal();
      }
      return;
    }

    // 3. Enter Key inside modal inputs
    if (e.key === 'Enter') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal && e.target.tagName !== 'TEXTAREA') {
        const primaryBtn = activeModal.querySelector('.modal-footer .btn-primary');
        if (primaryBtn) {
          e.preventDefault();
          primaryBtn.click();
        }
      }
    }
  });

  // Sidebar Collapse Arrow Toggle near DevInfantary POS
  const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarCollapse();
    });
  }
}

function toggleSidebarCollapse() {
  const app = document.getElementById('app');
  const icon = document.getElementById('sidebar-toggle-icon');
  if (!app) return;
  app.classList.toggle('sidebar-collapsed');
  const isCollapsed = app.classList.contains('sidebar-collapsed');
  if (icon) {
    icon.className = isCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
  }
}

function toggleSettingsSubmenu() {
  const submenu = document.getElementById('settings-submenu');
  const arrowIcon = document.getElementById('settings-arrow-icon');
  if (submenu) {
    const isHidden = submenu.style.display === 'none';
    submenu.style.display = isHidden ? 'block' : 'none';
    if (arrowIcon) {
      arrowIcon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
    if (isHidden) {
      navigate('settings');
      navigateSettingsTab('staff');
    }
  }
}


function navigateSettingsTab(tabName) {
  navigate('settings');
  const submenu = document.getElementById('settings-submenu');
  if (submenu) submenu.style.display = 'block';

  document.getElementById('settings-tab-staff').style.display = tabName === 'staff' ? 'block' : 'none';
  document.getElementById('settings-tab-categories').style.display = tabName === 'categories' ? 'block' : 'none';
  document.getElementById('settings-tab-reorder').style.display = tabName === 'reorder' ? 'block' : 'none';

  if (tabName === 'staff') loadStaff();
  if (tabName === 'categories') loadCategories();
  if (tabName === 'reorder') loadReorderItems();
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
    'dashboard': 'Dashboard',
    'inventory': 'Inventory',
    'batches': 'Purchase Batches',
    'quotations': 'Quotations',
    'pos': 'Point of Sale',
    'returns': 'Return Items',
    'supplier-bills': 'Supplier Bills',
    'customer-bills': 'Customer Bills',
    'suppliers': 'Suppliers',
    'customers': 'Customers',
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
      navigateSettingsTab('staff');
      break;
  }
}

let salesTrendChartInstance = null;
let paymentMethodsChartInstance = null;

function togglePasswordVisibility() {
  const passInput = document.getElementById('login-password');
  const eyeIcon = document.getElementById('pass-eye-icon');
  if (!passInput || !eyeIcon) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    eyeIcon.className = 'fa-solid fa-eye';
  } else {
    passInput.type = 'password';
    eyeIcon.className = 'fa-solid fa-eye-slash';
  }
}

/* =========================================================
   1. DASHBOARD VIEW (Matching project_IVM.pdf Page 1 & 2)
========================================================= */
async function loadDashboard() {
  try {
    const resStats = await fetch('/api/dashboard/stats/');
    const stats = await resStats.json();

    // 1. Update Stat Cards Row 1
    const tRev = document.getElementById('stat-today-rev');
    if (tRev) tRev.innerText = `Rs. ${stats.today_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const tBills = document.getElementById('stat-today-bills');
    if (tBills) tBills.innerText = `${stats.today_bills_count} bills today`;

    const wRev = document.getElementById('stat-week-rev');
    if (wRev) wRev.innerText = `Rs. ${stats.week_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const wBills = document.getElementById('stat-week-bills');
    if (wBills) wBills.innerText = `${stats.week_bills_count} bills`;

    const mRev = document.getElementById('stat-month-rev');
    if (mRev) mRev.innerText = `Rs. ${stats.month_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const mBills = document.getElementById('stat-month-bills');
    if (mBills) mBills.innerText = `${stats.month_bills_count} bills`;

    const totRev = document.getElementById('stat-total-rev');
    if (totRev) totRev.innerText = `Rs. ${stats.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const custCnt = document.getElementById('stat-cust-cnt');
    if (custCnt) custCnt.innerText = stats.customers_count;
    const outVal = document.getElementById('stat-outstanding');
    if (outVal) outVal.innerText = `Rs. ${stats.outstanding.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    // 2. Update Stat Cards Row 2
    const pendBills = document.getElementById('stat-pending-bills');
    if (pendBills) pendBills.innerText = stats.pending_bills_count || 0;
    const prodCnt = document.getElementById('stat-products-cnt');
    if (prodCnt) prodCnt.innerText = stats.products_count || 0;
    const lowStk = document.getElementById('stat-low-stock');
    if (lowStk) lowStk.innerText = stats.low_stock;
    const outStk = document.getElementById('stat-out-stock');
    if (outStk) outStk.innerText = stats.out_of_stock;
    const invVal = document.getElementById('stat-inventory-val');
    if (invVal) invVal.innerText = `Rs. ${stats.inventory_value.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const suppCnt = document.getElementById('stat-suppliers-cnt');
    if (suppCnt) suppCnt.innerText = stats.suppliers_count;

    // 3. Update Stat Cards Row 3
    const suppDues = document.getElementById('stat-supplier-dues');
    if (suppDues) suppDues.innerText = `Rs. ${stats.supplier_dues.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const quoCnt = document.getElementById('stat-quo-cnt');
    if (quoCnt) quoCnt.innerText = stats.quotations_count || 0;

    // 4. Update Inventory Health Widget
    const hIn = document.getElementById('inv-health-instock');
    if (hIn) hIn.innerText = stats.in_stock;
    const hLow = document.getElementById('inv-health-lowstock');
    if (hLow) hLow.innerText = stats.low_stock;
    const hOut = document.getElementById('inv-health-outstock');
    if (hOut) hOut.innerText = stats.out_of_stock;
    const hVal = document.getElementById('inv-health-stock-val');
    if (hVal) hVal.innerText = `Rs. ${stats.inventory_value.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const hGauge = document.getElementById('inv-health-avail-gauge');
    if (hGauge) hGauge.innerText = `${stats.available_pct}%`;
    const hTotProd = document.getElementById('inv-health-total-products');
    if (hTotProd) hTotProd.innerText = stats.products_count || 0;

    // Update Inventory Health variation line bar
    const totInv = stats.total_inventory || 1;
    const inPct = Math.round((stats.in_stock / totInv) * 100);
    const lowPct = Math.round((stats.low_stock / totInv) * 100);
    const outPct = Math.round((stats.out_of_stock / totInv) * 100);

    const lineIn = document.getElementById('inv-line-instock');
    if (lineIn) lineIn.style.width = `${inPct}%`;
    const lineLow = document.getElementById('inv-line-lowstock');
    if (lineLow) lineLow.style.width = `${lowPct}%`;
    const lineOut = document.getElementById('inv-line-outstock');
    if (lineOut) lineOut.style.width = `${outPct}%`;


    // 5. Update Revenue Summary Widget
    const rToday = document.getElementById('rev-sum-today-val');
    if (rToday) rToday.innerText = `Rs. ${stats.today_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const rTodaySub = document.getElementById('rev-sum-today-sub');
    if (rTodaySub) rTodaySub.innerText = `${stats.today_bills_count} bills`;

    const rWeek = document.getElementById('rev-sum-week-val');
    if (rWeek) rWeek.innerText = `Rs. ${stats.week_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const rWeekSub = document.getElementById('rev-sum-week-sub');
    if (rWeekSub) rWeekSub.innerText = `${stats.week_bills_count} bills`;

    const rMonth = document.getElementById('rev-sum-month-val');
    if (rMonth) rMonth.innerText = `Rs. ${stats.month_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;
    const rMonthSub = document.getElementById('rev-sum-month-sub');
    if (rMonthSub) rMonthSub.innerText = `${stats.month_bills_count} bills`;

    const rTotal = document.getElementById('rev-sum-total-val');
    if (rTotal) rTotal.innerText = `Rs. ${stats.total_revenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`;

    // Load Charts Data
    const resCharts = await fetch('/api/dashboard/charts/');
    const chartData = await resCharts.json();

    renderSalesTrendChart(chartData.sales_trend);
    renderCategorySalesList(chartData.sales_by_category);
    renderPaymentMethodsChart(chartData.payment_methods);

  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

function renderSalesTrendChart(trendData) {
  const canvas = document.getElementById('salesTrendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (salesTrendChartInstance) {
    salesTrendChartInstance.destroy();
  }

  const labels = trendData.labels || [];
  const sales = trendData.sales || [];
  const bills = trendData.bills || [];

  salesTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sales (Rs.)',
        data: sales,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const val = context.parsed.y || 0;
              const bCount = bills[idx] || 0;
              return ` Sales: Rs. ${val.toLocaleString()} (${bCount} ${bCount === 1 ? 'bill' : 'bills'})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: { font: { size: 11, weight: '500' }, color: '#64748b' }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: {
            font: { size: 11 },
            color: '#64748b',
            callback: function(value) {
              return 'Rs. ' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  const tbody = document.getElementById('sales-trend-table-body');
  if (tbody) {
    tbody.innerHTML = '';

    if (labels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 16px;">No sales recorded in the last 30 days</td></tr>';
      return;
    }

    let hasRows = false;
    labels.forEach((label, idx) => {
      const saleVal = sales[idx] || 0;
      const billCnt = bills[idx] || 0;

      if (saleVal > 0 || billCnt > 0) {
        hasRows = true;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 500; color: #334155;">${label}</td>
          <td style="font-weight: 600; color: #0f172a;">Rs. ${saleVal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
          <td><span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">${billCnt}</span></td>
        `;
        tbody.appendChild(tr);
      }
    });

    if (!hasRows) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 16px;">No sales recorded in the last 30 days</td></tr>';
    }
  }
}



function renderCategorySalesList(categories) {
  const tbody = document.getElementById('category-sales-list');
  const barsContainer = document.getElementById('category-sales-progress-bars');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (barsContainer) barsContainer.innerHTML = '';

  if (!categories || categories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No category sales data recorded</td></tr>';
    if (barsContainer) barsContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">No category sales data recorded</div>';
    return;
  }

  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#6366f1'];
  const maxSales = Math.max(...categories.map(c => c.sales), 1);

  categories.forEach((cat, idx) => {
    const color = colors[idx % colors.length];
    const pctVal = parseFloat(cat.pct) || 0;
    const barWidthPct = cat.sales > 0 ? Math.max((cat.sales / maxSales) * 100, 4) : 0;

    // 1. Populate Numerical Summary Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: #1e293b;">${cat.category}</td>
      <td style="font-weight: 600;">Rs. ${cat.sales.toLocaleString()}</td>
      <td>${cat.items}</td>
      <td><span class="badge" style="background: ${color}20; color: ${color}; font-weight: 700;">${cat.pct || '0%'}</span></td>
    `;
    tbody.appendChild(tr);

    // 2. Populate Graphical Bar Chart Progress Item (Exact Relation to Numerical Table)
    if (barsContainer) {
      const barDiv = document.createElement('div');
      barDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">
          <span>${cat.category}</span>
          <span style="font-weight: 700; color: #0f172a;">Rs. ${cat.sales.toLocaleString()} <span style="color: ${color}; font-weight: 700; margin-left: 4px;">(${cat.pct || '0%'})</span></span>
        </div>
        <div style="height: 8px; width: 100%; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${barWidthPct}%; background: ${color}; border-radius: 4px; transition: width 0.4s ease;"></div>
        </div>
      `;
      barsContainer.appendChild(barDiv);
    }
  });
}



function renderPaymentMethodsChart(pmData) {
  const pPaid = document.getElementById('pm-paid-pct');
  if (pPaid) pPaid.innerText = `${pmData.paid_pct}%`;
  const pPart = document.getElementById('pm-partial-pct');
  if (pPart) pPart.innerText = `${pmData.partial_pct}%`;
  const pRef = document.getElementById('pm-refunded-pct');
  if (pRef) pRef.innerText = `${pmData.refunded_pct}%`;
  const pTot = document.getElementById('pm-total-methods-cnt');
  if (pTot) pTot.innerText = `Total ${pmData.total_methods_count || 0} bills`;

  const canvas = document.getElementById('paymentMethodsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (paymentMethodsChartInstance) {
    paymentMethodsChartInstance.destroy();
  }

  paymentMethodsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Paid', 'Partial', 'Refunded'],
      datasets: [{
        data: [pmData.paid_pct || 0, pmData.partial_pct || 0, pmData.refunded_pct || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '70%'
    }
  });
}


/* =========================================================
   2. INVENTORY VIEW (Matching project_IVM.pdf Page 3)
========================================================= */
async function loadInventory(isManualRefresh = false) {
  const icon = document.getElementById('inv-refresh-icon');
  if (icon && isManualRefresh) icon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/inventory/');
    const data = await res.json();
    inventoryItems = data.items;

    renderInventoryTable(inventoryItems);

    const totalEl = document.getElementById('inv-total-cnt');
    if (totalEl) totalEl.innerText = inventoryItems.length;
    const labelEl = document.getElementById('inv-item-count-label');
    if (labelEl) labelEl.innerText = `${inventoryItems.length} items`;
    
    const lowCnt = inventoryItems.filter(i => i.status === 'Low Stock').length;
    const outCnt = inventoryItems.filter(i => i.status === 'Out of Stock').length;
    const lowEl = document.getElementById('inv-low-cnt');
    if (lowEl) lowEl.innerText = lowCnt;
    const outEl = document.getElementById('inv-out-cnt');
    if (outEl) outEl.innerText = outCnt;

    const totVal = inventoryItems.reduce((acc, i) => acc + (i.stock * i.price_per_unit), 0);
    const valEl = document.getElementById('inv-val-cnt');
    if (valEl) valEl.innerText = `Rs ${totVal.toLocaleString()}`;

  } catch (err) {
    console.error('Error loading inventory:', err);
  } finally {
    if (icon && isManualRefresh) {
      setTimeout(() => icon.classList.remove('fa-spin'), 400);
    }
  }
}


function renderInventoryTable(items) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  items.forEach(item => {
    let badgeClass = 'badge-in-stock';
    let rowStyle = '';
    if (item.status === 'Low Stock') {
      badgeClass = 'badge-low-stock';
      rowStyle = 'background: #fffdf5;';
    } else if (item.status === 'Out of Stock') {
      badgeClass = 'badge-out-stock';
      rowStyle = 'background: #fff5f5;';
    }

    const tr = document.createElement('tr');
    if (rowStyle) tr.setAttribute('style', rowStyle);
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: #111827;">${item.product_name}</div>
        <div style="font-size: 11px; color: #9ca3af;">${item.category || 'General'}</div>
      </td>
      <td>${item.size || '-'}</td>
      <td>${item.class_type || '-'}</td>
      <td>${item.unit || 'PCS'}</td>
      <td style="font-weight: 600;">Rs. ${item.price_per_unit.toLocaleString()}</td>
      <td style="font-weight: 700; color: #10b981;">${item.stock}</td>
      <td>${item.reorder_level}</td>
      <td><span class="badge ${badgeClass}">● ${item.status}</span></td>
      <td><span class="badge badge-in-stock">Yes</span></td>
      <td>
        <div style="display: flex; gap: 4px;">
          <button onclick="openEditProductModalByVariant(${item.id})" class="btn btn-action-edit">Product</button>
          <button onclick="openEditVariantModal(${item.id})" class="btn btn-action-variant">(+) Variant</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


function filterInventory(filterType) {
  document.querySelectorAll('[id^="filter-pill-"]').forEach(p => p.classList.remove('active'));
  const pill = document.getElementById(`filter-pill-${filterType}`);
  if (pill) pill.classList.add('active');

  if (filterType === 'all') renderInventoryTable(inventoryItems);
  else if (filterType === 'low') renderInventoryTable(inventoryItems.filter(i => i.status === 'Low Stock'));
  else if (filterType === 'out') renderInventoryTable(inventoryItems.filter(i => i.status === 'Out of Stock'));
}

function filterInventorySearch(query) {
  const q = query.toLowerCase();
  const filtered = inventoryItems.filter(i => 
    i.product_name.toLowerCase().includes(q) ||
    i.size.toLowerCase().includes(q)
  );
  renderInventoryTable(filtered);
}

function openAddProductModal() {
  const hiddenId = document.getElementById('product-id-hidden');
  if (hiddenId) hiddenId.value = '';
  
  const title = document.getElementById('modal-product-title');
  if (title) title.innerHTML = '<i class="fa-solid fa-box"></i> Add New Product';

  const btn = document.getElementById('btn-save-product');
  if (btn) btn.innerText = 'Save Product';

  const nameInput = document.getElementById('product-name-input');
  if (nameInput) nameInput.value = '';
  const descInput = document.getElementById('product-desc-input');
  if (descInput) descInput.value = '';
  const activeChk = document.getElementById('product-active-chk');
  if (activeChk) activeChk.checked = true;

  fetchCategoriesForDropdown('product-category-select');
  document.getElementById('modal-add-product').classList.add('active');
  setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
}

function closeAddProductModal() {
  document.getElementById('modal-add-product').classList.remove('active');
}

async function openEditProductModalByVariant(variantId) {
  const item = inventoryItems.find(i => i.id == variantId);
  if (!item) return;

  try {
    const res = await fetch('/api/products/');
    const data = await res.json();
    const prod = data.products.find(p => p.name === item.product_name);
    if (prod) {
      openEditProductModal(prod.id);
    } else {
      alert('Product details not found');
    }
  } catch (err) {
    console.error(err);
  }
}

async function openEditProductModal(productId) {
  try {
    const res = await fetch(`/api/products/${productId}/`);
    const data = await res.json();
    if (data.status === 'success') {
      const p = data.product;
      const hiddenId = document.getElementById('product-id-hidden');
      if (hiddenId) hiddenId.value = p.id;

      const title = document.getElementById('modal-product-title');
      if (title) title.innerHTML = `<i class="fa-solid fa-box"></i> Edit Product (#${p.id})`;

      const btn = document.getElementById('btn-save-product');
      if (btn) btn.innerText = 'Update Product';

      const nameInput = document.getElementById('product-name-input');
      if (nameInput) nameInput.value = p.name;
      const descInput = document.getElementById('product-desc-input');
      if (descInput) descInput.value = p.description || '';
      const activeChk = document.getElementById('product-active-chk');
      if (activeChk) activeChk.checked = p.is_active;

      await fetchCategoriesForDropdown('product-category-select');
      const catSelect = document.getElementById('product-category-select');
      if (catSelect && p.category_id) catSelect.value = p.category_id;

      document.getElementById('modal-add-product').classList.add('active');
      setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
    } else {
      alert('Product not found');
    }
  } catch (err) {
    console.error(err);
  }
}

async function submitSaveProduct() {
  const hiddenId = document.getElementById('product-id-hidden');
  const prodId = hiddenId ? hiddenId.value : '';

  const nameInput = document.getElementById('product-name-input');
  const catSelect = document.getElementById('product-category-select');
  const descInput = document.getElementById('product-desc-input');
  const activeChk = document.getElementById('product-active-chk');

  const name = nameInput ? nameInput.value.trim() : '';
  const catId = catSelect ? catSelect.value : '';
  if (!name || !catId) {
    alert('Please enter product name and select a category');
    return;
  }

  const endpoint = prodId ? '/api/products/update/' : '/api/products/add/';
  const payload = {
    product_id: prodId,
    name: name,
    category_id: catId,
    description: descInput ? descInput.value : '',
    is_active: activeChk ? activeChk.checked : true
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddProductModal();
      loadInventory();
      alert(`Product "${data.product_name}" ${prodId ? 'updated' : 'added'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save product'));
    }
  } catch (err) {
    console.error('Error saving product:', err);
    alert('Failed to connect to server');
  }
}

function openAddVariantModal(presetVariantId) {
  const hiddenId = document.getElementById('variant-id-hidden');
  if (hiddenId) hiddenId.value = '';

  const title = document.getElementById('modal-variant-title');
  if (title) title.innerHTML = '<i class="fa-solid fa-tags"></i> Add New Variant';

  const btn = document.getElementById('btn-save-variant');
  if (btn) btn.innerText = 'Save Variant';

  ['variant-size-input', 'variant-class-input', 'variant-color-input', 'variant-location-input', 'variant-notes-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const pInput = document.getElementById('variant-price-input');
  if (pInput) pInput.value = '0';
  const sInput = document.getElementById('variant-stock-input');
  if (sInput) sInput.value = '0';
  const rInput = document.getElementById('variant-reorder-input');
  if (rInput) rInput.value = '10';

  fetchProductsForDropdown('variant-product-select');
  document.getElementById('modal-add-variant').classList.add('active');

  if (presetVariantId) {
    const item = inventoryItems.find(i => i.id === presetVariantId);
    if (item) {
      setTimeout(() => {
        const sel = document.getElementById('variant-product-select');
        if (sel) {
          for (let opt of sel.options) {
            if (opt.text === item.product_name) {
              sel.value = opt.value;
              break;
            }
          }
        }
      }, 300);
    }
  }
  setTimeout(() => {
    const sizeIn = document.getElementById('variant-size-input');
    if (sizeIn) sizeIn.focus();
  }, 100);
}

function closeAddVariantModal() {
  document.getElementById('modal-add-variant').classList.remove('active');
}

async function openEditVariantModal(variantId) {
  try {
    const res = await fetch(`/api/variants/${variantId}/`);
    const data = await res.json();
    if (data.status === 'success') {
      const v = data.variant;
      const hiddenId = document.getElementById('variant-id-hidden');
      if (hiddenId) hiddenId.value = v.id;

      const title = document.getElementById('modal-variant-title');
      if (title) title.innerHTML = `<i class="fa-solid fa-tags"></i> Get / Edit Variant (#${v.id})`;

      const btn = document.getElementById('btn-save-variant');
      if (btn) btn.innerText = 'Update Variant';

      document.getElementById('variant-size-input').value = v.size || '';
      document.getElementById('variant-class-input').value = v.class_type || '';
      document.getElementById('variant-color-input').value = v.color || '';
      document.getElementById('variant-unit-select').value = v.unit_of_measure || 'PCS';
      document.getElementById('variant-price-input').value = v.price_per_unit;
      document.getElementById('variant-stock-input').value = v.stock_quantity;
      document.getElementById('variant-reorder-input').value = v.reorder_level;
      document.getElementById('variant-location-input').value = v.location || '';
      document.getElementById('variant-notes-input').value = v.notes || '';

      await fetchProductsForDropdown('variant-product-select');
      const prodSel = document.getElementById('variant-product-select');
      if (prodSel && v.product_id) prodSel.value = v.product_id;

      document.getElementById('modal-add-variant').classList.add('active');
      setTimeout(() => {
        const sizeIn = document.getElementById('variant-size-input');
        if (sizeIn) sizeIn.focus();
      }, 100);
    } else {
      alert('Variant not found');
    }
  } catch (err) {
    console.error(err);
  }
}

async function submitSaveVariant() {
  const hiddenId = document.getElementById('variant-id-hidden');
  const varId = hiddenId ? hiddenId.value : '';

  const prodSelect = document.getElementById('variant-product-select');
  const sizeInput = document.getElementById('variant-size-input');
  const classInput = document.getElementById('variant-class-input');
  const colorInput = document.getElementById('variant-color-input');
  const unitSelect = document.getElementById('variant-unit-select');
  const priceInput = document.getElementById('variant-price-input');
  const stockInput = document.getElementById('variant-stock-input');
  const reorderInput = document.getElementById('variant-reorder-input');
  const locationInput = document.getElementById('variant-location-input');
  const notesInput = document.getElementById('variant-notes-input');

  const prodId = prodSelect ? prodSelect.value : '';
  const size = sizeInput ? sizeInput.value.trim() : '';
  const price = priceInput ? parseFloat(priceInput.value) : 0;

  if (!prodId || !size) {
    alert('Please select a Product and enter a Size');
    return;
  }

  const endpoint = varId ? '/api/variants/update/' : '/api/variants/add/';
  const payload = {
    variant_id: varId,
    product_id: prodId,
    size: size,
    class_type: classInput ? classInput.value : 'Standard',
    color: colorInput ? colorInput.value : '',
    unit_of_measure: unitSelect ? unitSelect.value : 'PCS',
    price_per_unit: price,
    stock_quantity: stockInput ? parseFloat(stockInput.value) || 0 : 0,
    reorder_level: reorderInput ? parseFloat(reorderInput.value) || 10 : 10,
    location: locationInput ? locationInput.value : '',
    notes: notesInput ? notesInput.value : ''
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddVariantModal();
      loadInventory();
      alert(`Product Variant ${varId ? 'updated' : 'saved'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save variant'));
    }
  } catch (err) {
    console.error('Error saving variant:', err);
    alert('Failed to connect to server');
  }
}

async function fetchCategoriesForDropdown(elementId) {
  const res = await fetch('/api/categories/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  if (!select) return;
  select.disabled = false;
  select.innerHTML = '<option value="">Select category</option>';
  data.categories.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

async function fetchProductsForDropdown(elementId) {
  const res = await fetch('/api/products/');
  const data = await res.json();
  const select = document.getElementById(elementId);
  if (!select) return;
  select.disabled = false;
  select.innerHTML = '<option value="">Select product</option>';
  data.products.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

/* =========================================================
   3. PURCHASE BATCHES VIEW (Matching project_IVM.pdf Page 5 & 6)
========================================================= */
let allBatchesData = [];

async function loadBatches() {
  try {
    const res = await fetch('/api/batches/');
    const data = await res.json();
    allBatchesData = data.batches;
    renderBatchesTable(allBatchesData);
  } catch (err) {
    console.error(err);
  }
}

function renderBatchesTable(batches) {
  const tbody = document.getElementById('batches-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('batches-count-label').innerText = `${batches.length} batches`;

  batches.forEach(b => {
    let badgeClass = 'badge-success';
    if (b.status === 'Partial') badgeClass = 'badge-warning';
    if (b.status === 'Pending') badgeClass = 'badge-danger';

    const firstChar = b.supplier_name ? b.supplier_name.charAt(0).toUpperCase() : 'S';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: #111827;">● ${b.batch_name}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span>${b.supplier_name}</span>
        </div>
      </td>
      <td style="font-weight: 600;">Rs ${b.total_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td>Rs ${b.paid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="color: var(--accent-rose); font-weight: 600;">Rs ${b.remaining.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td><span class="badge ${badgeClass}">● ${b.status}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="openEditBatchModal(${b.id})" class="btn btn-action-edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button onclick="openBatchDetailsModal(${b.id})" class="btn btn-action-details"><i class="fa-solid fa-eye"></i> Details</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterBatchesSearch(query) {
  const q = query.toLowerCase();
  const filtered = allBatchesData.filter(b => 
    b.batch_name.toLowerCase().includes(q) ||
    b.supplier_name.toLowerCase().includes(q)
  );
  renderBatchesTable(filtered);
}

function onBatchQtyOrCostChange() {
  const qtyInput = document.getElementById('batch-qty-input');
  const costInput = document.getElementById('batch-cost-input');
  const lineInput = document.getElementById('batch-linetotal-input');

  const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;
  const cost = costInput ? parseFloat(costInput.value) || 0 : 0;
  const total = qty * cost;

  if (lineInput) {
    lineInput.value = total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
}

async function openNewBatchModal() {
  batchCart = [];
  
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('batch-date-input');
  if (dateInput) dateInput.value = today;

  const nameInput = document.getElementById('batch-name-input');
  if (nameInput) nameInput.value = `Batch-${today}`;

  const paidInput = document.getElementById('batch-paid-input');
  if (paidInput) paidInput.value = '0';

  const nextId = (allBatchesData.length > 0 ? Math.max(...allBatchesData.map(b => b.id)) + 1 : 1);
  const tagEl = document.getElementById('new-batch-id-tag');
  if (tagEl) tagEl.innerText = `Batch ID: #${nextId}`;

  const lineInput = document.getElementById('batch-linetotal-input');
  if (lineInput) lineInput.value = '0.00';
  const qtyInput = document.getElementById('batch-qty-input');
  if (qtyInput) qtyInput.value = '0';
  const costInput = document.getElementById('batch-cost-input');
  if (costInput) costInput.value = '0';
  const saleInput = document.getElementById('batch-sale-input');
  if (saleInput) saleInput.value = '0';

  await fetchSuppliersForBatchDropdown();
  await fetchVariantsForBatchDropdown();

  renderBatchItemsTable();
  updateBatchPaymentSummary();

  document.getElementById('modal-new-batch').classList.add('active');
  setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
}

function closeNewBatchModal() {
  document.getElementById('modal-new-batch').classList.remove('active');
}

async function fetchSuppliersForBatchDropdown() {
  try {
    const res = await fetch('/api/suppliers/');
    const data = await res.json();
    const select = document.getElementById('batch-supplier-select');
    if (!select) return;
    select.innerHTML = '<option value="">Search supplier...</option>';
    data.suppliers.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

async function fetchVariantsForBatchDropdown() {
  try {
    const res = await fetch('/api/inventory/');
    const data = await res.json();
    inventoryItems = data.items;

    const select = document.getElementById('batch-variant-select');
    if (!select) return;
    select.innerHTML = '<option value="">Type product name...</option>';
    inventoryItems.forEach(v => {
      select.innerHTML += `<option value="${v.id}">${v.product_name} - ${v.size} (${v.unit})</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

function onBatchVariantSelectChange() {
  const select = document.getElementById('batch-variant-select');
  const varId = select ? select.value : '';
  const item = inventoryItems.find(i => i.id == varId);

  const sizeInput = document.getElementById('batch-size-input');
  const classInput = document.getElementById('batch-class-input');
  const costInput = document.getElementById('batch-cost-input');
  const saleInput = document.getElementById('batch-sale-input');
  const qtyInput = document.getElementById('batch-qty-input');

  if (item) {
    if (sizeInput) sizeInput.value = item.size || '';
    if (classInput) classInput.value = item.class_type || '';
    if (costInput && (costInput.value == '0' || !costInput.value)) costInput.value = item.price_per_unit || '0';
    if (saleInput && (saleInput.value == '0' || !saleInput.value)) saleInput.value = item.price_per_unit || '0';
    if (qtyInput && (qtyInput.value == '0' || !qtyInput.value)) qtyInput.value = '1';
    onBatchQtyOrCostChange();
  } else {
    if (sizeInput) sizeInput.value = '';
    if (classInput) classInput.value = '';
    onBatchQtyOrCostChange();
  }
}

function addVariantToBatch() {
  const select = document.getElementById('batch-variant-select');
  const varId = select ? select.value : '';
  if (!varId) {
    alert('Please select a product variant');
    return;
  }

  const item = inventoryItems.find(i => i.id == varId);
  if (!item) return;

  const qtyInput = document.getElementById('batch-qty-input');
  const costInput = document.getElementById('batch-cost-input');
  const saleInput = document.getElementById('batch-sale-input');

  const qty = qtyInput ? parseFloat(qtyInput.value) || 1 : 1;
  const cost = costInput ? parseFloat(costInput.value) || 0 : 0;
  const sale = saleInput ? parseFloat(saleInput.value) || 0 : 0;

  if (qty <= 0) {
    alert('Quantity must be greater than 0');
    return;
  }

  const lineTotal = qty * cost;

  batchCart.push({
    variant_id: item.id,
    product_name: item.product_name,
    size: item.size,
    class_type: item.class_type || 'Standard',
    quantity: qty,
    cost_price: cost,
    sale_price: sale,
    line_total: lineTotal
  });

  renderBatchItemsTable();
  updateBatchPaymentSummary();

  select.value = '';
  if (document.getElementById('batch-size-input')) document.getElementById('batch-size-input').value = '';
  if (document.getElementById('batch-class-input')) document.getElementById('batch-class-input').value = '';
  if (qtyInput) qtyInput.value = '0';
  if (costInput) costInput.value = '0';
  if (saleInput) saleInput.value = '0';
  onBatchQtyOrCostChange();
}

function removeBatchItem(index) {
  batchCart.splice(index, 1);
  renderBatchItemsTable();
  updateBatchPaymentSummary();
}

function renderBatchItemsTable() {
  const tbody = document.getElementById('batch-items-body');
  const badgeCnt = document.getElementById('batch-items-badge-cnt');
  const grandTotEl = document.getElementById('batch-table-grand-total');

  if (badgeCnt) badgeCnt.innerText = batchCart.length;

  if (!tbody) return;

  if (batchCart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <i class="fa-regular fa-folder-open" style="font-size: 28px; color: #cbd5e1;"></i>
            <span>No items added yet</span>
          </div>
        </td>
      </tr>
    `;
    if (grandTotEl) grandTotEl.innerText = '0.00';
    return;
  }

  tbody.innerHTML = '';
  let grandTotal = 0;
  batchCart.forEach((item, idx) => {
    grandTotal += item.line_total;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 500; color: #64748b;">${idx + 1}</td>
      <td style="font-weight: 700; color: #0f172a;">${item.product_name}</td>
      <td>${item.size || '-'}</td>
      <td>${item.class_type || 'Standard'}</td>
      <td style="font-weight: 600;">${item.quantity}</td>
      <td>Rs. ${item.cost_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td>Rs. ${item.sale_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="font-weight: 700; color: #0f172a;">Rs. ${item.line_total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="text-align: center;">
        <button onclick="removeBatchItem(${idx})" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
          <i class="fa-solid fa-trash-can"></i> Remove
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (grandTotEl) grandTotEl.innerText = grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2});
}

function updateBatchPaymentSummary() {
  const totalAmount = batchCart.reduce((sum, item) => sum + item.line_total, 0);
  const paidInput = document.getElementById('batch-paid-input');
  const paidAmount = paidInput ? parseFloat(paidInput.value) || 0 : 0;
  const remaining = Math.max(totalAmount - paidAmount, 0);

  const totalEl = document.getElementById('batch-summary-total');
  if (totalEl) totalEl.innerText = `${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

  const remEl = document.getElementById('batch-summary-remaining');
  if (remEl) {
    remEl.innerText = `${remaining.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    remEl.style.color = remaining > 0 ? '#ef4444' : '#10b981';
  }

  const pct = totalAmount > 0 ? Math.min(Math.round((paidAmount / totalAmount) * 100), 100) : 0;

  const badge = document.getElementById('batch-paid-pct-badge');
  if (badge) badge.innerText = `${pct}% paid`;

  const fill = document.getElementById('batch-paid-progress-fill');
  if (fill) fill.style.width = `${pct}%`;
}

async function submitSaveBatch() {
  const nameInput = document.getElementById('batch-name-input');
  const suppSelect = document.getElementById('batch-supplier-select');
  const dateInput = document.getElementById('batch-date-input');
  const paidInput = document.getElementById('batch-paid-input');

  const batchName = nameInput ? nameInput.value.trim() : '';
  const supplierId = suppSelect ? suppSelect.value : '';
  const dateStr = dateInput ? dateInput.value : '';
  const paidAmount = paidInput ? parseFloat(paidInput.value) || 0 : 0;

  if (!batchName || !supplierId) {
    alert('Please enter a Batch Name and select a Supplier');
    return;
  }

  if (batchCart.length === 0) {
    alert('Please add at least one product variant to the batch');
    return;
  }

  try {
    const res = await fetch('/api/batches/add/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_name: batchName,
        supplier_id: supplierId,
        date: dateStr,
        paid_amount: paidAmount,
        items: batchCart
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeNewBatchModal();
      loadBatches();
      loadInventory();
      alert(`Purchase Batch "${batchName}" saved successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save batch'));
    }
  } catch (err) {
    console.error('Error saving batch:', err);
    alert('Failed to connect to server');
  }
}

function openEditBatchModal(batchId) {
  const b = allBatchesData.find(item => item.id == batchId);
  if (!b) return;

  document.getElementById('edit-batch-id').value = b.id;
  document.getElementById('edit-batch-name').value = b.batch_name;
  document.getElementById('edit-batch-paid').value = b.paid;
  document.getElementById('edit-batch-status').value = b.status;

  document.getElementById('modal-edit-batch').classList.add('active');
}

function closeEditBatchModal() {
  document.getElementById('modal-edit-batch').classList.remove('active');
}

async function submitUpdateBatch() {
  const bId = document.getElementById('edit-batch-id').value;
  const paid = parseFloat(document.getElementById('edit-batch-paid').value) || 0;
  const status = document.getElementById('edit-batch-status').value;

  try {
    const res = await fetch('/api/batches/update/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: bId,
        paid_amount: paid,
        status: status
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeEditBatchModal();
      loadBatches();
      alert('Batch updated successfully!');
    } else {
      alert('Error: ' + (data.message || 'Could not update batch'));
    }
  } catch (err) {
    console.error('Error updating batch:', err);
    alert('Failed to connect to server');
  }
}

function openBatchDetailsModal(batchId) {
  const b = allBatchesData.find(item => item.id == batchId);
  if (!b) return;

  document.getElementById('batch-detail-title').innerText = `Batch: ${b.batch_name}`;
  document.getElementById('batch-detail-subtitle').innerText = `Batch #${b.id} • Date: ${b.date || 'N/A'}`;
  document.getElementById('batch-detail-name').innerText = b.batch_name;
  document.getElementById('batch-detail-supplier').innerText = b.supplier_name;
  document.getElementById('batch-detail-date').innerText = b.date || 'N/A';

  const badgeEl = document.getElementById('batch-detail-status-badge');
  if (badgeEl) {
    badgeEl.innerText = `● ${b.status}`;
    if (b.status === 'Completed') badgeEl.className = 'badge badge-success';
    else if (b.status === 'Partial') badgeEl.className = 'badge badge-warning';
    else badgeEl.className = 'badge badge-danger';
  }

  const tot = parseFloat(b.total_price) || 0;
  const paid = parseFloat(b.paid) || 0;
  const rem = parseFloat(b.remaining) || 0;
  const pct = b.pct_paid || (tot > 0 ? Math.min(Math.round((paid / tot) * 100), 100) : 100);

  document.getElementById('batch-detail-total').innerText = `Rs. ${tot.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  document.getElementById('batch-detail-paid').innerText = `Rs. ${paid.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  document.getElementById('batch-detail-remaining').innerText = `Rs. ${rem.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  document.getElementById('batch-detail-pct-text').innerText = `${pct}% Paid`;
  
  const pBar = document.getElementById('batch-detail-progress-bar');
  if (pBar) pBar.style.width = `${pct}%`;

  const tbody = document.getElementById('batch-detail-items-body');
  const itemsCnt = document.getElementById('batch-detail-items-cnt');
  const grandTotEl = document.getElementById('batch-detail-grand-total');

  const items = b.items || [];
  if (itemsCnt) itemsCnt.innerText = items.length;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No items recorded in this batch</td></tr>';
    if (grandTotEl) grandTotEl.innerText = `Rs. ${tot.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  } else {
    tbody.innerHTML = '';
    let calcGrandTot = 0;
    items.forEach((it, idx) => {
      const lineTot = parseFloat(it.line_total) || (it.quantity * it.cost_price);
      calcGrandTot += lineTot;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500; color: #64748b;">${idx + 1}</td>
        <td style="font-weight: 700; color: #0f172a;">${it.product_name}</td>
        <td>${it.size || '-'}</td>
        <td>${it.class_type || 'Standard'}</td>
        <td style="font-weight: 600;">${it.quantity}</td>
        <td>Rs. ${parseFloat(it.cost_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td>Rs. ${parseFloat(it.sale_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">Rs. ${lineTot.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      `;
      tbody.appendChild(tr);
    });

    if (grandTotEl) grandTotEl.innerText = `Rs. ${calcGrandTot.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  }

  const editBtn = document.getElementById('batch-detail-edit-btn');
  if (editBtn) {
    editBtn.onclick = function() {
      closeBatchDetailsModal();
      openEditBatchModal(b.id);
    };
  }

  document.getElementById('modal-batch-details').classList.add('active');
}

function closeBatchDetailsModal() {
  document.getElementById('modal-batch-details').classList.remove('active');
}

/* =========================================================
   4. QUOTATIONS VIEW (Matching project_IVM.pdf Page 7, 8, 9)
========================================================= */
let allQuotationsData = [];
let currentQuotationCustType = 'walkin';

async function loadQuotations() {
  try {
    const res = await fetch('/api/quotations/');
    const data = await res.json();
    allQuotationsData = data.quotations;
    renderQuotationsList(allQuotationsData);
  } catch (err) {
    console.error(err);
  }
}


function renderQuotationsList(quotations) {
  const container = document.getElementById('quotations-list');
  if (!container) return;
  container.innerHTML = '';
  document.getElementById('quo-all-cnt').innerText = quotations.length;

  quotations.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quotation-card-item';
    card.style.cssText = 'background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s;';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; color: #111827; font-size: 13px;">${q.quotation_number}</span>
        <span class="badge badge-secondary" style="font-size: 11px;">● ${q.status}</span>
      </div>
      <div style="margin-top: 4px; font-size: 12px; color: #6b7280;"><i class="fa-regular fa-user" style="margin-right: 4px;"></i> ${q.customer_name}</div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px;">
        <span style="color: #2563eb; font-weight: 700;">Rs. ${q.net_total.toLocaleString()}</span>
        <span style="color: #9ca3af; font-size: 11px;">${q.date}</span>
      </div>
    `;
    card.addEventListener('click', () => selectQuotationPreview(q));
    container.appendChild(card);
  });
}

function selectQuotationPreview(q) {
  const detailBox = document.getElementById('quo-detail-preview');
  if (!detailBox) return;

  detailBox.style.display = 'block';
  detailBox.style.alignItems = 'stretch';
  detailBox.style.justifyContent = 'flex-start';
  detailBox.style.textAlign = 'left';
  detailBox.style.padding = '20px';

  detailBox.innerHTML = `
    <div style="width: 100%;">
      <!-- Card Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">${q.quotation_number}</h3>
            <span class="badge badge-info" style="font-size: 11px;">● ${q.status}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
            Created: <strong>${q.date}</strong> | Valid Until: <strong>${q.valid_until}</strong>
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="printQuotationByNumber('${q.quotation_number}')" class="btn" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-print"></i> Print
          </button>
          <button onclick="loadQuotationIntoPOS('${q.quotation_number}')" class="btn btn-primary" style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-cart-shopping"></i> Convert to Invoice
          </button>
        </div>
      </div>

      <!-- Customer Details Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Customer Name</span>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${q.customer_name}</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Items</span>
          <div style="font-size: 14px; font-weight: 700; color: #2563eb; margin-top: 2px;">${q.items.length} items</div>
        </div>
      </div>

      <!-- Quotation Items Table -->
      <div class="table-container" style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <table class="data-table" style="margin: 0;">
          <thead>
            <tr style="background: #1e3a8a; color: #ffffff;">
              <th style="color: #ffffff;">PRODUCT</th>
              <th style="color: #ffffff;">SIZE / UNIT</th>
              <th style="color: #ffffff; text-align: center;">QTY</th>
              <th style="color: #ffffff; text-align: right;">UNIT PRICE</th>
              <th style="color: #ffffff; text-align: right;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${q.items.map(it => `
              <tr>
                <td style="font-weight: 700; color: #0f172a;">${it.product_name}</td>
                <td style="color: #64748b;">${it.size || '-'} (${it.unit})</td>
                <td style="text-align: center; font-weight: 600;">${it.qty}</td>
                <td style="text-align: right;">Rs. ${it.unit_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">Rs. ${it.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Summary Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: right; line-height: 1.8;">
        <div style="font-size: 13px; color: #64748b;">Subtotal: <strong style="color: #0f172a;">Rs. ${q.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></div>
        <div style="font-size: 13px; color: #64748b;">Discount: <strong style="color: #ef4444;">Rs. ${q.overall_discount.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></div>
        <div style="font-size: 18px; font-weight: 700; color: #2563eb; margin-top: 6px; padding-top: 6px; border-top: 1px solid #cbd5e1;">
          NET TOTAL: Rs. ${q.net_total.toLocaleString('en-US', {minimumFractionDigits: 2})}
        </div>
      </div>
    </div>
  `;
}

function searchQuotations() {
  const query = document.getElementById('quo-search-input').value.toLowerCase();
  const filtered = allQuotationsData.filter(q => 
    q.quotation_number.toLowerCase().includes(query) ||
    q.customer_name.toLowerCase().includes(query)
  );
  renderQuotationsList(filtered);
}

async function openNewQuotationModal() {
  quotationCart = [];
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const subtitleEl = document.getElementById('quo-modal-date-subtitle');
  if (subtitleEl) subtitleEl.innerText = dateStr;

  const validDate = new Date();
  validDate.setDate(validDate.getDate() + 30);
  const validUntilInput = document.getElementById('quo-valid-until-input');
  if (validUntilInput) validUntilInput.value = validDate.toISOString().split('T')[0];

  const discInput = document.getElementById('quo-discount-input');
  if (discInput) discInput.value = '0';
  const discSlider = document.getElementById('quo-discount-slider');
  if (discSlider) discSlider.value = '0';

  toggleQuotationCustomerType('walkin');

  await fetchVariantsForQuotationDropdown();
  await fetchCustomersForQuotationDropdown();

  renderQuotationCart();

  document.getElementById('modal-new-quotation').classList.add('active');
}

function closeNewQuotationModal() {
  document.getElementById('modal-new-quotation').classList.remove('active');
}

function toggleQuotationCustomerType(type) {
  currentQuotationCustType = type;
  const btnWalkin = document.getElementById('quo-cust-btn-walkin');
  const btnRegular = document.getElementById('quo-cust-btn-regular');
  const boxWalkin = document.getElementById('quo-cust-walkin-box');
  const boxRegular = document.getElementById('quo-cust-regular-box');

  if (type === 'walkin') {
    if (btnWalkin) { btnWalkin.style.background = '#2563eb'; btnWalkin.style.color = '#ffffff'; }
    if (btnRegular) { btnRegular.style.background = 'transparent'; btnRegular.style.color = '#94a3b8'; }
    if (boxWalkin) boxWalkin.style.display = 'block';
    if (boxRegular) boxRegular.style.display = 'none';
  } else {
    if (btnWalkin) { btnWalkin.style.background = 'transparent'; btnWalkin.style.color = '#94a3b8'; }
    if (btnRegular) { btnRegular.style.background = '#2563eb'; btnRegular.style.color = '#ffffff'; }
    if (boxWalkin) boxWalkin.style.display = 'none';
    if (boxRegular) boxRegular.style.display = 'block';
  }
}

async function fetchVariantsForQuotationDropdown() {
  try {
    const res = await fetch('/api/inventory/');
    const data = await res.json();
    inventoryItems = data.items;

    const select = document.getElementById('quo-product-search-select');
    if (!select) return;
    select.innerHTML = '<option value="">Search & add product...</option>';
    inventoryItems.forEach(i => {
      select.innerHTML += `<option value="${i.id}">${i.product_name} - ${i.size} (${i.unit}) - Rs ${i.price_per_unit} (${i.stock} in stock)</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

async function fetchCustomersForQuotationDropdown() {
  try {
    const res = await fetch('/api/customers/');
    const data = await res.json();
    const select = document.getElementById('quo-customer-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select customer...</option>';
    data.customers.forEach(c => {
      select.innerHTML += `<option value="${c.name}">${c.name} (${c.customer_type})</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

function addVariantToQuotation() {
  const select = document.getElementById('quo-product-search-select');
  if (!select) return;
  const variantId = select.value;
  if (!variantId) return;

  const item = inventoryItems.find(i => i.id == variantId);
  if (item) {
    const existing = quotationCart.find(c => c.variant_id == item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      quotationCart.push({
        variant_id: item.id,
        name: item.product_name,
        size: item.size,
        unit: item.unit,
        price: item.price_per_unit,
        qty: 1
      });
    }
    renderQuotationCart();
    select.value = '';
  }
}

function updateQuotationItemQty(index, newQty) {
  if (newQty <= 0) {
    removeQuotationItem(index);
    return;
  }
  quotationCart[index].qty = newQty;
  renderQuotationCart();
}

function removeQuotationItem(index) {
  quotationCart.splice(index, 1);
  renderQuotationCart();
}

function onQuotationSliderChange(val) {
  const discInput = document.getElementById('quo-discount-input');
  if (discInput) discInput.value = val;
  renderQuotationCart();
}

function renderQuotationCart() {
  const tbody = document.getElementById('quo-items-body');
  if (!tbody) return;

  if (quotationCart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 40px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <i class="fa-solid fa-file-lines" style="font-size: 36px; color: #cbd5e1;"></i>
            <span style="font-weight: 600; color: #475569;">No items added</span>
            <span style="font-size: 12px; color: #94a3b8;">Search a product above to add items</span>
          </div>
        </td>
      </tr>
    `;
    updateQuotationSummary(0, 0, 0);
    return;
  }

  tbody.innerHTML = '';
  let subtotal = 0;
  let totalQty = 0;

  quotationCart.forEach((item, idx) => {
    const lineSub = item.qty * item.price;
    subtotal += lineSub;
    totalQty += item.qty;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;"><input type="checkbox" checked style="accent-color: #2563eb;"></td>
      <td>
        <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
        <div style="font-size: 11px; color: #64748b;">${item.size} • ${item.unit}</div>
      </td>
      <td style="text-align: center; font-weight: 600;">Rs ${item.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="text-align: center;">
        <div class="qty-stepper" style="display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff;">
          <button onclick="updateQuotationItemQty(${idx}, ${item.qty - 1})" style="border: none; background: #f1f5f9; padding: 2px 8px; cursor: pointer; font-weight: 700;">-</button>
          <input type="text" value="${item.qty}" readonly style="width: 32px; text-align: center; border: none; outline: none; font-weight: 600; font-size: 12px;">
          <button onclick="updateQuotationItemQty(${idx}, ${item.qty + 1})" style="border: none; background: #f1f5f9; padding: 2px 8px; cursor: pointer; font-weight: 700;">+</button>
        </div>
      </td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;">Rs ${lineSub.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
      <td style="text-align: center;">
        <button onclick="removeQuotationItem(${idx})" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;" onmouseover="this.style.color='#ef4444';" onmouseout="this.style.color='#94a3b8';">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateQuotationSummary(quotationCart.length, totalQty, subtotal);
}

function updateQuotationSummary(itemsCnt, totalQty, subtotal) {
  const itemsEl = document.getElementById('quo-summary-items-cnt');
  if (itemsEl) itemsEl.innerText = itemsCnt;

  const qtyEl = document.getElementById('quo-summary-qty-cnt');
  if (qtyEl) qtyEl.innerText = totalQty;

  const subEl = document.getElementById('quo-subtotal');
  if (subEl) subEl.innerText = `Rs ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

  const discInput = document.getElementById('quo-discount-input');
  const discountPct = discInput ? parseFloat(discInput.value) || 0 : 0;
  
  const discSlider = document.getElementById('quo-discount-slider');
  if (discSlider && discSlider.value != discountPct) discSlider.value = discountPct;

  const discountVal = (subtotal * discountPct) / 100;
  const netTotal = Math.max(subtotal - discountVal, 0);

  const netEl = document.getElementById('quo-net-total');
  if (netEl) netEl.innerText = `Rs ${netTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

  const grandTotEl = document.getElementById('quo-table-grand-total');
  if (grandTotEl) grandTotEl.innerText = `Rs ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

async function submitSaveQuotation() {
  if (quotationCart.length === 0) {
    alert('Please add at least one product to the quotation');
    return;
  }

  let custName = 'Walk-in Customer';
  if (currentQuotationCustType === 'walkin') {
    const input = document.getElementById('quo-customer-input');
    custName = input ? input.value.trim() || 'Walk-in Customer' : 'Walk-in Customer';
  } else {
    const select = document.getElementById('quo-customer-select');
    custName = select ? select.value || 'Walk-in Customer' : 'Walk-in Customer';
  }

  const validUntilInput = document.getElementById('quo-valid-until-input');
  const validUntilStr = validUntilInput ? validUntilInput.value : '';

  const discInput = document.getElementById('quo-discount-input');
  const discountPct = discInput ? parseFloat(discInput.value) || 0 : 0;
  const subtotal = quotationCart.reduce((acc, i) => acc + (i.qty * i.price), 0);
  const discountAmount = (subtotal * discountPct) / 100;

  const payload = {
    customer_name: custName,
    valid_until: validUntilStr,
    overall_discount: discountAmount,
    items: quotationCart.map(i => ({
      variant_id: i.variant_id,
      quantity: i.qty,
      unit_price: i.price
    }))
  };

  try {
    const res = await fetch('/api/quotations/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeNewQuotationModal();
      await loadQuotations();
      alert(`Quotation ${data.quotation_number} saved successfully! Printing PDF...`);
      printQuotationByNumber(data.quotation_number);
    } else {
      alert('Error: ' + (data.message || 'Could not save quotation'));
    }
  } catch (err) {
    console.error('Error saving quotation:', err);
    alert('Failed to connect to server');
  }
}

function printQuotationByNumber(qNum) {
  const q = allQuotationsData.find(item => item.quotation_number === qNum);
  if (!q) return;

  const content = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; max-width: 800px; margin: auto; background: #fff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0; color: #0f172a;">Hardware Store</h1>
        <p style="margin: 4px 0; color: #475569; font-size: 14px;">Main Bazar Lahore</p>
        <p style="margin: 2px 0; color: #475569; font-size: 14px;">Phone: 03021222005</p>
      </div>

      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 24px; font-size: 13px;">
        <div>
          <p style="margin: 3px 0;">Customer: <strong>${q.customer_name}</strong></p>
          <p style="margin: 3px 0;">Quotation #: <strong>${q.quotation_number}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 3px 0;">Date: <strong>${q.date}</strong></p>
          <p style="margin: 3px 0;">Time: <strong>05:28 PM</strong></p>
          <p style="margin: 3px 0; color: #dc2626;">Valid Until: <strong>${q.valid_until}</strong></p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #0f172a; text-align: left;">
            <th style="padding: 8px 4px;">Product</th>
            <th style="padding: 8px 4px; text-align: center;">Size</th>
            <th style="padding: 8px 4px; text-align: center;">Unit</th>
            <th style="padding: 8px 4px; text-align: center;">Qty</th>
            <th style="padding: 8px 4px; text-align: right;">Price</th>
            <th style="padding: 8px 4px; text-align: right;">Discount</th>
            <th style="padding: 8px 4px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${q.items.map(it => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 4px; font-weight: 600;">${it.product_name}</td>
              <td style="padding: 10px 4px; text-align: center;">${it.size || '-'}</td>
              <td style="padding: 10px 4px; text-align: center;">${it.unit || 'PCS'}</td>
              <td style="padding: 10px 4px; text-align: center;">${parseFloat(it.qty).toFixed(2)}</td>
              <td style="padding: 10px 4px; text-align: right;">Rs. ${parseFloat(it.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
              <td style="padding: 10px 4px; text-align: right;">Rs. 0.00</td>
              <td style="padding: 10px 4px; text-align: right; font-weight: 700;">Rs. ${parseFloat(it.subtotal).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="width: 240px; font-size: 13px; line-height: 2;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Subtotal:</span>
            <strong>Rs. ${parseFloat(q.subtotal).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid #0f172a; padding-top: 4px; margin-top: 4px;">
            <span>TOTAL:</span>
            <span style="color: #0f172a;">Rs. ${parseFloat(q.net_total).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #475569; font-size: 13px;">
        <p style="font-weight: 700; margin: 0 0 4px 0;">Thank you for your interest!</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is a quotation, not an invoice</p>
      </div>
    </div>
  `;

  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>${q.quotation_number}</title></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}


function printCurrentQuotationDraft() {
  if (quotationCart.length === 0) {
    alert('Please add items to print');
    return;
  }

  let custName = currentQuotationCustType === 'walkin' ? (document.getElementById('quo-customer-input').value || 'Walk-in Customer') : (document.getElementById('quo-customer-select').value || 'Walk-in Customer');
  const subtotal = quotationCart.reduce((acc, i) => acc + (i.qty * i.price), 0);
  const discInput = document.getElementById('quo-discount-input');
  const discountPct = discInput ? parseFloat(discInput.value) || 0 : 0;
  const discountVal = (subtotal * discountPct) / 100;
  const netTotal = Math.max(subtotal - discountVal, 0);

  const mockQ = {
    quotation_number: 'QUO-DRAFT-' + Math.floor(Math.random() * 10000),
    customer_name: custName,
    date: new Date().toLocaleDateString(),
    valid_until: document.getElementById('quo-valid-until-input').value || '30 Days',
    subtotal: subtotal,
    overall_discount: discountVal,
    net_total: netTotal,
    items: quotationCart.map(i => ({
      product_name: i.name,
      size: i.size,
      qty: i.qty,
      unit: i.unit,
      unit_price: i.price,
      subtotal: i.qty * i.price
    }))
  };

  printQuotationByNumber(mockQ.quotation_number);
}

async function loadQuotationIntoPOS(qNum) {
  try {
    const res = await fetch(`/api/pos/quotation/${qNum}/`);
    const data = await res.json();
    if (data.quotation_number) {
      navigate('pos');
      posCart = [];
      data.items.forEach(it => {
        posCart.push({
          id: it.variant_id,
          name: it.product_name,
          size: it.size,
          unit: it.unit,
          price: it.unit_price,
          qty: it.quantity
        });
      });
      
      const qRefInput = document.getElementById('pos-quotation-ref-input');
      if (qRefInput) qRefInput.value = data.quotation_number;
      
      const custInput = document.getElementById('pos-customer-input');
      if (custInput) custInput.value = data.customer_name;

      renderPOSCart();
      alert(`Quotation ${qNum} loaded into POS! Click "Complete Sale & Print Bill" to finalize.`);
    } else {
      alert('Quotation not found');
    }
  } catch (err) {
    console.error(err);
  }
}

/* =========================================================
   5. POS / SELL PRODUCT VIEW (Matching project_IVM.pdf Page 10 & 11)
========================================================= */
function initPOS() {
  fetchProductsForPOSDropdown();
  renderPOSCart();
}

async function fetchProductsForPOSDropdown() {
  try {
    const res = await fetch('/api/inventory/');
    const data = await res.json();
    inventoryItems = data.items;

    const select = document.getElementById('pos-product-search-select');
    if (!select) return;
    select.innerHTML = '<option value="">Search & add product...</option>';
    inventoryItems.forEach(i => {
      select.innerHTML += `<option value="${i.id}">${i.product_name} - ${i.size} (${i.unit}) - Rs ${i.price_per_unit} (${i.stock} in stock)</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

function addProductToPOSCart() {
  const select = document.getElementById('pos-product-search-select');
  const variantId = select.value;
  if (!variantId) return;

  const item = inventoryItems.find(i => i.id == variantId);
  if (item) {
    const existing = posCart.find(c => c.id == item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      posCart.push({
        id: item.id,
        name: item.product_name,
        size: item.size,
        unit: item.unit,
        price: item.price_per_unit,
        qty: 1
      });
    }
    renderPOSCart();
    select.value = '';
  }
}

function renderPOSCart() {
  const tbody = document.getElementById('pos-cart-items-body');
  const emptyMsg = document.getElementById('pos-empty-cart-msg');
  if (!tbody) return;

  if (posCart.length === 0) {
    tbody.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
    tbody.innerHTML = '';

    let subtotal = 0;
    posCart.forEach((item, idx) => {
      const lineSub = item.qty * item.price;
      subtotal += lineSub;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" checked style="accent-color: #2563eb;"></td>
        <td>
          <div style="font-weight: 700; color: #111827;">${item.name}</div>
          <div style="font-size: 11px; color: #6b7280;">${item.size} • ${item.unit}</div>
        </td>
        <td style="font-weight: 600;">Rs ${item.price.toLocaleString()}</td>
        <td>
          <div class="qty-stepper">
            <button onclick="updatePOSQty(${idx}, ${item.qty - 1})">-</button>
            <input type="text" value="${item.qty}" readonly>
            <button onclick="updatePOSQty(${idx}, ${item.qty + 1})">+</button>
          </div>
        </td>
        <td style="font-weight: 700; color: #111827;">Rs ${lineSub.toLocaleString()}</td>
        <td>
          <button onclick="removePOSItem(${idx})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 14px;">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('pos-summary-items-cnt').innerText = posCart.length;
    document.getElementById('pos-summary-subtotal').innerText = `Rs ${subtotal.toLocaleString()}`;

    const discountPct = parseFloat(document.getElementById('pos-discount-input').value) || 0;
    const discountAmt = (subtotal * discountPct) / 100;
    const netTotal = Math.max(subtotal - discountAmt, 0);

    document.getElementById('pos-grand-total-label').innerText = `Rs. ${netTotal.toLocaleString()}`;
    document.getElementById('pos-summary-net-total').innerText = `Rs ${netTotal.toLocaleString()}`;
  }
}

function updatePOSQty(idx, newQty) {
  if (newQty <= 0) {
    posCart.splice(idx, 1);
  } else {
    posCart[idx].qty = newQty;
  }
  renderPOSCart();
}

function removePOSItem(idx) {
  posCart.splice(idx, 1);
  renderPOSCart();
}

function setPOSCustomerType(type) {
  document.getElementById('pos-type-walkin').classList.toggle('active', type === 'walkin');
  document.getElementById('pos-type-regular').classList.toggle('active', type === 'regular');
}

function setPOSDiscountPreset(pct) {
  document.getElementById('pos-discount-input').value = pct;
  renderPOSCart();
}

function setPOSExactAmount() {
  const subtotal = posCart.reduce((acc, i) => acc + (i.qty * i.price), 0);
  const discountPct = parseFloat(document.getElementById('pos-discount-input').value) || 0;
  const netTotal = subtotal - ((subtotal * discountPct) / 100);
  document.getElementById('pos-cash-input').value = netTotal;
}

function loadQuotationIntoPOS() {
  const quoNo = document.getElementById('pos-quotation-input').value.trim();
  if (!quoNo) return;

  const banner = document.getElementById('pos-loaded-quo-banner');
  document.getElementById('pos-loaded-quo-text').innerText = `✓ ${quoNo} — Walk-In Customer`;
  if (banner) banner.style.display = 'flex';
}

function clearLoadedQuotationInPOS() {
  const banner = document.getElementById('pos-loaded-quo-banner');
  if (banner) banner.style.display = 'none';
  document.getElementById('pos-quotation-input').value = '';
}

function submitCreatePOSBill() {
  if (posCart.length === 0) {
    alert('Cart is empty! Add products first.');
    return;
  }
  const custName = document.getElementById('pos-customer-input') ? document.getElementById('pos-customer-input').value.trim() || 'Walk-in Customer' : 'Walk-in Customer';
  const qRef = document.getElementById('pos-quotation-ref-input') ? document.getElementById('pos-quotation-ref-input').value.trim() : '';
  const discountPct = parseFloat(document.getElementById('pos-discount-input').value) || 0;
  const cashRec = parseFloat(document.getElementById('pos-cash-input').value) || 0;

  const subtotal = posCart.reduce((s, i) => s + (i.qty * i.price), 0);
  const discountAmt = (subtotal * discountPct) / 100;

  fetch('/api/pos/sell/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: custName,
      quotation_number: qRef,
      overall_discount: discountAmt,
      cash_received: cashRec,
      items: posCart.map(i => ({ variant_id: i.id, quantity: i.qty, unit_price: i.price }))
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      const msg = `✓ Bill ${data.bill_number} ban gaya! Ab Print Bill dabao.`;
      const alertEl = document.getElementById('pos-success-alert-text');
      if (alertEl) alertEl.innerText = msg;
      const alertBanner = document.getElementById('pos-success-alert-banner');
      if (alertBanner) alertBanner.style.display = 'flex';

      const lastBillRef = document.getElementById('pos-last-bill-ref');
      if (lastBillRef) {
        lastBillRef.innerHTML = `✓ Last Bill: <strong>${data.bill_number}</strong>`;
        lastBillRef.style.display = 'block';
      }

      alert(msg);
      posCart = [];
      renderPOSCart();
    } else {
      alert('Error: ' + (data.message || 'Could not create bill'));
    }
  })
  .catch(err => {
    console.error('Error creating POS bill:', err);
    alert('Failed to connect to server');
  });
}

function printPOSBill() {
  window.print();
}

/* =========================================================
   6. RETURN ITEMS VIEW (Matching project_IVM.pdf Page 12 & 13)
========================================================= */
function initReturns() {
  currentReturnBill = null;
  const card = document.getElementById('return-bill-info-card');
  if (card) card.style.display = 'none';
  const tbody = document.getElementById('return-items-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
          <i class="fa-solid fa-rotate-left" style="font-size: 36px; margin-bottom: 8px; color: #cbd5e1;"></i>
          <div style="font-weight: 600; color: #475569;">Search a bill number above to load items</div>
        </td>
      </tr>
    `;
  }
  const warn = document.getElementById('return-reason-warning');
  if (warn) warn.style.display = 'none';
}

async function searchReturnBill() {
  const billNo = document.getElementById('return-bill-search-input').value.trim();
  if (!billNo) {
    alert('Please enter a bill number (e.g. INV-2026-041022915)');
    return;
  }

  try {
    const res = await fetch(`/api/returns/search-bill/?bill_number=${encodeURIComponent(billNo)}`);
    const data = await res.json();
    if (data.bill_number) {
      document.getElementById('return-bill-info-card').style.display = 'block';
      document.getElementById('ret-info-billno').innerText = data.bill_number;
      document.getElementById('ret-info-cust').innerText = data.customer_name;
      document.getElementById('ret-info-date').innerText = data.bill_date;
      document.getElementById('ret-info-total').innerText = `Rs ${data.net_total.toLocaleString()}`;

      currentReturnBill = {
        billNo: data.bill_number,
        items: data.items.map(it => ({
          variant_id: it.variant_id,
          name: it.product_name,
          size: it.size,
          unit: it.unit,
          maxQty: it.quantity,
          qty: it.quantity,
          price: it.unit_price
        }))
      };

      renderReturnItemsTable();
    } else {
      alert('Bill not found: ' + (data.message || 'Invalid bill number'));
    }
  } catch (err) {
    console.error(err);
    alert('Error searching for bill');
  }
}

function renderReturnItemsTable() {
  const tbody = document.getElementById('return-items-body');
  if (!tbody || !currentReturnBill) return;
  tbody.innerHTML = '';

  let totalRefund = 0;
  let totalQty = 0;

  currentReturnBill.items.forEach((item, idx) => {
    const lineTotal = item.qty * item.price;
    totalRefund += lineTotal;
    totalQty += item.qty;

    const firstChar = item.name.charAt(0).toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" checked style="accent-color: #2563eb;" onchange="updateReturnRefundCalc()"></td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 22px; height: 22px; background: #d97706; color: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span style="font-weight: 700; color: #111827;">${item.name}</span>
        </div>
      </td>
      <td>${item.size}</td>
      <td>${item.unit}</td>
      <td>
        <div>
          <div class="qty-stepper">
            <button onclick="updateReturnQty(${idx}, ${item.qty - 1})">-</button>
            <input type="text" value="${item.qty}" readonly>
            <button onclick="updateReturnQty(${idx}, ${item.qty + 1})">+</button>
          </div>
          <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">max: ${item.maxQty}</div>
        </div>
      </td>
      <td style="font-weight: 600;">Rs ${item.price.toLocaleString()}</td>
      <td style="font-weight: 700; color: #111827;">Rs ${lineTotal.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('ret-selected-cnt-badge').innerText = `${currentReturnBill.items.length} selected`;
  document.getElementById('ret-selected-qty-badge').innerText = `Qty: ${totalQty}`;
  document.getElementById('ret-total-refund-display').innerText = `Rs ${totalRefund.toLocaleString()}`;
  document.getElementById('ret-sum-selected').innerText = currentReturnBill.items.length;
  document.getElementById('ret-sum-qty').innerText = totalQty;
  document.getElementById('ret-sum-calc-refund').innerText = `Rs ${totalRefund.toLocaleString()}`;
  document.getElementById('return-adj-refund-input').value = totalRefund;
}

function updateReturnQty(idx, newQty) {
  if (newQty < 0 || newQty > currentReturnBill.items[idx].maxQty) return;
  currentReturnBill.items[idx].qty = newQty;
  renderReturnItemsTable();
}

function clearReturnSelection() {
  if (currentReturnBill) {
    currentReturnBill.items.forEach(i => i.qty = 0);
    renderReturnItemsTable();
  }
}

function submitProcessReturn() {
  if (!currentReturnBill || !currentReturnBill.items || currentReturnBill.items.length === 0) {
    alert('Please search and load a bill first');
    return;
  }

  const reason = document.getElementById('return-reason-select').value;
  if (!reason) {
    document.getElementById('return-reason-warning').style.display = 'block';
    alert('Return reason select karna zaroori hai — Return Reason section mein jakar select karo');
    return;
  }
  document.getElementById('return-reason-warning').style.display = 'none';

  const notes = document.getElementById('return-notes-input') ? document.getElementById('return-notes-input').value : '';
  const restore = document.getElementById('return-restore-stock') ? document.getElementById('return-restore-stock').checked : true;
  const adjRefund = parseFloat(document.getElementById('return-adj-refund-input').value) || 0;

  const returnItems = currentReturnBill.items.filter(i => i.qty > 0).map(i => ({
    variant_id: i.variant_id,
    quantity_returned: i.qty,
    unit_price: i.price
  }));

  if (returnItems.length === 0) {
    alert('Please select at least one item quantity to return');
    return;
  }

  fetch('/api/returns/process/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bill_number: currentReturnBill.billNo,
      reason: reason,
      notes: notes,
      restore_stock: restore,
      adjusted_refund: adjRefund,
      items: returnItems
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      alert(`✓ Return successfully process ho gaya! Refund: Rs ${data.refund_amount.toLocaleString()}`);
      initReturns();
    } else {
      alert('Error: ' + (data.message || 'Could not process return'));
    }
  })
  .catch(err => {
    console.error(err);
    alert('Failed to connect to server');
  });
}

/* =========================================================
   7. SUPPLIER BILLS VIEW (Matching project_IVM.pdf Page 13-15)
========================================================= */
let allSupplierBillsData = [];

async function loadSupplierBills() {
  try {
    const res = await fetch('/api/supplier-bills/');
    const data = await res.json();
    allSupplierBillsData = data.suppliers;
    renderSupplierBillsTable(allSupplierBillsData);
  } catch (err) {
    console.error(err);
  }
}

function renderSupplierBillsTable(suppliers) {
  const tbody = document.getElementById('supplier-bills-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('supp-bills-count-label').innerText = `${suppliers.length} suppliers`;

  suppliers.forEach(s => {
    let badgeClass = 'badge-success';
    if (s.status === 'Partial') badgeClass = 'badge-warning';
    if (s.status === 'Pending') badgeClass = 'badge-danger';

    const firstChar = s.supplier_name.charAt(0).toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span style="font-weight: 700; color: #111827;">${s.supplier_name}</span>
        </div>
      </td>
      <td style="font-weight: 600;">Rs ${s.total_billed.toLocaleString()}</td>
      <td>Rs ${s.paid.toLocaleString()}</td>
      <td style="color: var(--accent-rose); font-weight: 600;">Rs ${s.remaining.toLocaleString()}</td>
      <td>${s.batches_count || 4}</td>
      <td><span class="badge ${badgeClass}">● ${s.status}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="showSupplierDetails('${s.supplier_name}')" class="btn btn-action-details"><i class="fa-solid fa-eye"></i> Details</button>
          <button onclick="openPaySupplierModal('${s.supplier_name}', ${s.remaining})" class="btn btn-action-edit" style="background: #d1fae5; border-color: #6ee7b7; color: #047857;"><i class="fa-solid fa-credit-card"></i> Pay</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function showSupplierDetails(name) {
  document.getElementById('supplier-bills-main-container').style.display = 'none';
  document.getElementById('supplier-details-container').style.display = 'block';
  document.getElementById('supp-det-name').innerText = name;
  document.getElementById('supp-det-avatar').innerText = name.charAt(0).toUpperCase();
}

function hideSupplierDetails() {
  document.getElementById('supplier-details-container').style.display = 'none';
  document.getElementById('supplier-bills-main-container').style.display = 'block';
}

function switchSupplierDetTab(tab) {
  document.getElementById('supp-tab-btn-batches').className = tab === 'batches' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('supp-tab-btn-payments').className = tab === 'payments' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('supp-det-tab-batches').style.display = tab === 'batches' ? 'block' : 'none';
  document.getElementById('supp-det-tab-payments').style.display = tab === 'payments' ? 'block' : 'none';
}

function openPaySupplierModal(name, remaining) {
  document.getElementById('pay-supp-name').innerText = name;
  document.getElementById('pay-supp-remaining').innerText = `Rs ${remaining.toLocaleString()}`;
  document.getElementById('pay-supp-amount-input').value = remaining;
  updatePaySuppRemainingCalc();
  document.getElementById('modal-pay-supplier').classList.add('active');
}

function closePaySupplierModal() {
  document.getElementById('modal-pay-supplier').classList.remove('active');
}

function setPaySuppAmountPreset(preset) {
  const remEl = document.getElementById('pay-supp-remaining');
  if (!remEl) return;
  const remVal = parseFloat(remEl.innerText.replace(/[^\d.]/g, '')) || 0;
  let val = remVal;
  if (preset === '50') val = remVal * 0.5;
  if (preset === '25') val = remVal * 0.25;
  
  const input = document.getElementById('pay-supp-amount-input');
  if (input) {
    input.value = Math.round(val);
    updatePaySuppRemainingCalc();
  }
}

function updatePaySuppRemainingCalc() {
  const remEl = document.getElementById('pay-supp-remaining');
  const remVal = remEl ? parseFloat(remEl.innerText.replace(/[^\d.]/g, '')) || 0 : 0;
  const payVal = parseFloat(document.getElementById('pay-supp-amount-input').value) || 0;
  const diff = Math.max(remVal - payVal, 0);
  const calcEl = document.getElementById('pay-supp-calc-remaining');
  if (calcEl) calcEl.innerText = `After payment: Rs ${diff.toLocaleString()} remaining`;
}

function submitPaySupplier() {
  closePaySupplierModal();
  loadSupplierBills();
}

/* =========================================================
   8. CUSTOMER BILLS VIEW (Matching project_IVM.pdf Page 15 & 16)
========================================================= */
let allCustomerBillsData = [];

async function loadCustomerBills() {
  try {
    const res = await fetch('/api/customer-bills/');
    const data = await res.json();
    allCustomerBillsData = data.customers;
    renderCustomerBillsTable(allCustomerBillsData);
  } catch (err) {
    console.error(err);
  }
}

function renderCustomerBillsTable(customers) {
  const tbody = document.getElementById('customer-bills-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('cust-bills-count-label').innerText = `${customers.length} customers`;

  customers.forEach(c => {
    let badgeClass = 'badge-danger';
    if (c.status === 'Cleared') badgeClass = 'badge-success';

    const firstChar = c.customer_name.charAt(0).toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span style="font-weight: 700; color: #111827;">${c.customer_name}</span>
        </div>
      </td>
      <td style="font-weight: 600;">Rs ${c.total_billed.toLocaleString()}</td>
      <td>Rs ${c.collected.toLocaleString()}</td>
      <td style="color: var(--accent-rose); font-weight: 600;">Rs ${c.outstanding.toLocaleString()}</td>
      <td>${c.bills_count || 1}</td>
      <td><span class="badge ${badgeClass}">● ${c.status}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="showCustomerDetails('${c.customer_name}')" class="btn btn-action-details"><i class="fa-solid fa-eye"></i> Details</button>
          <button onclick="openPayCustomerModal('${c.customer_name}')" class="btn btn-action-edit" style="background: #d1fae5; border-color: #6ee7b7; color: #047857;"><i class="fa-solid fa-credit-card"></i> Pay</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function showCustomerDetails(name) {
  document.getElementById('customer-bills-main-container').style.display = 'none';
  document.getElementById('customer-details-container').style.display = 'block';
  document.getElementById('cust-det-name').innerText = name;
  document.getElementById('cust-det-avatar').innerText = name.charAt(0).toUpperCase();
}

function hideCustomerDetails() {
  document.getElementById('customer-details-container').style.display = 'none';
  document.getElementById('customer-bills-main-container').style.display = 'block';
}

function switchCustomerDetTab(tab) {
  document.getElementById('cust-tab-btn-bills').className = tab === 'bills' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('cust-tab-btn-payments').className = tab === 'payments' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('cust-det-tab-bills').style.display = tab === 'bills' ? 'block' : 'none';
  document.getElementById('cust-det-tab-payments').style.display = tab === 'payments' ? 'block' : 'none';
}

/* =========================================================
   9. SUPPLIERS & CUSTOMERS DIRECTORIES
========================================================= */
let suppliersData = [];
async function loadSuppliers() {
  try {
    const res = await fetch('/api/suppliers/');
    const data = await res.json();
    suppliersData = data.suppliers;
    renderSuppliersDirectoryTable(suppliersData);
  } catch (err) {
    console.error(err);
  }
}

function filterSuppliersDirectorySearch(q) {
  const query = q.toLowerCase();
  const showInactive = document.getElementById('supp-dir-toggle-inactive') ? document.getElementById('supp-dir-toggle-inactive').checked : true;
  const filtered = suppliersData.filter(s => 
    (s.is_active || showInactive) &&
    (s.name.toLowerCase().includes(query) || (s.contact && s.contact.toLowerCase().includes(query)) || (s.address && s.address.toLowerCase().includes(query)))
  );
  renderSuppliersDirectoryTable(filtered);
}

function renderSuppliersDirectoryTable(suppliers) {
  const tbody = document.getElementById('suppliers-directory-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('supp-dir-count-label').innerText = `${suppliers.length} suppliers`;

  suppliers.forEach(s => {
    const firstChar = s.name.charAt(0).toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span style="font-weight: 700; color: #111827;">${s.name}</span>
        </div>
      </td>
      <td>${s.contact || '-'}</td>
      <td>${s.address || '-'}</td>
      <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">● ${s.status}</span></td>
      <td>${s.created_at || '14 Feb 2026'}</td>
      <td>${s.notes || '-'}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="openEditSupplierModal(${s.id})" class="btn btn-action-edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button onclick="deleteSupplier(${s.id})" class="btn btn-action-edit" style="background: #fee2e2; border-color: #fca5a5; color: #b91c1c;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddSupplierModal() {
  document.getElementById('supplier-id-hidden').value = '';
  document.getElementById('modal-supplier-title').innerText = 'Add Supplier';
  document.getElementById('supp-name-input').value = '';
  document.getElementById('supp-contact-input').value = '';
  document.getElementById('supp-address-input').value = '';
  document.getElementById('modal-add-supplier').classList.add('active');
}

function openEditSupplierModal(sId) {
  const s = suppliersData.find(item => item.id == sId);
  if (!s) return;
  document.getElementById('supplier-id-hidden').value = s.id;
  document.getElementById('modal-supplier-title').innerText = `Edit Supplier (#${s.id})`;
  document.getElementById('supp-name-input').value = s.name;
  document.getElementById('supp-contact-input').value = s.contact || '';
  document.getElementById('supp-address-input').value = s.address || '';
  document.getElementById('modal-add-supplier').classList.add('active');
}

function closeAddSupplierModal() {
  document.getElementById('modal-add-supplier').classList.remove('active');
}

async function submitSaveSupplier() {
  const sId = document.getElementById('supplier-id-hidden').value;
  const name = document.getElementById('supp-name-input').value.trim();
  const contact = document.getElementById('supp-contact-input').value.trim();
  const address = document.getElementById('supp-address-input').value.trim();

  if (!name) {
    alert('Supplier name is required');
    return;
  }

  const endpoint = sId ? '/api/suppliers/update/' : '/api/suppliers/add/';
  const payload = { supplier_id: sId, name, contact, address };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddSupplierModal();
      loadSuppliers();
      alert(`Supplier "${name}" ${sId ? 'updated' : 'added'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save supplier'));
    }
  } catch (err) {
    console.error(err);
    alert('Failed to connect to server');
  }
}

async function deleteSupplier(sId) {
  if (!confirm('Are you sure you want to delete this supplier?')) return;
  try {
    const res = await fetch('/api/suppliers/delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_id: sId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      loadSuppliers();
      alert('Supplier deleted successfully!');
    }
  } catch (err) {
    console.error(err);
  }
}

let customersData = [];
async function loadCustomers() {
  try {
    const res = await fetch('/api/customers/');
    const data = await res.json();
    customersData = data.customers;
    renderCustomersDirectoryTable(customersData);
  } catch (err) {
    console.error(err);
  }
}

function filterCustomersDirectorySearch(q) {
  const query = q.toLowerCase();
  const showInactive = document.getElementById('cust-dir-toggle-inactive') ? document.getElementById('cust-dir-toggle-inactive').checked : true;
  const filtered = customersData.filter(c => 
    (c.is_active || showInactive) &&
    (c.name.toLowerCase().includes(query) || (c.phone && c.phone.toLowerCase().includes(query)) || (c.address && c.address.toLowerCase().includes(query)))
  );
  renderCustomersDirectoryTable(filtered);
}

function renderCustomersDirectoryTable(customers) {
  const tbody = document.getElementById('customers-directory-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('cust-dir-count-label').innerText = `${customers.length} customers`;

  customers.forEach(c => {
    const firstChar = c.name.charAt(0).toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${firstChar}</div>
          <span style="font-weight: 700; color: #111827;">${c.name}</span>
        </div>
      </td>
      <td>${c.phone || '-'}</td>
      <td>${c.address || '-'}</td>
      <td><span class="badge badge-info">${c.type || 'Retail'}</span></td>
      <td><span class="badge ${c.is_active ? 'badge-success' : 'badge-danger'}">● ${c.status}</span></td>
      <td>${c.created_at || '22 Feb 2026'}</td>
      <td>${c.notes || '-'}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="openEditCustomerModal(${c.id})" class="btn btn-action-edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button onclick="deleteCustomer(${c.id})" class="btn btn-action-edit" style="background: #fee2e2; border-color: #fca5a5; color: #b91c1c;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddCustomerModal() {
  document.getElementById('customer-id-hidden').value = '';
  document.getElementById('modal-customer-title').innerText = 'Add Customer';
  document.getElementById('cust-name-input').value = '';
  document.getElementById('cust-phone-input').value = '';
  document.getElementById('cust-address-input').value = '';
  document.getElementById('cust-type-select').value = 'Retail';
  document.getElementById('modal-add-customer').classList.add('active');
}

function openEditCustomerModal(cId) {
  const c = customersData.find(item => item.id == cId);
  if (!c) return;
  document.getElementById('customer-id-hidden').value = c.id;
  document.getElementById('modal-customer-title').innerText = `Edit Customer (#${c.id})`;
  document.getElementById('cust-name-input').value = c.name;
  document.getElementById('cust-phone-input').value = c.phone || '';
  document.getElementById('cust-address-input').value = c.address || '';
  document.getElementById('cust-type-select').value = c.type || 'Retail';
  document.getElementById('modal-add-customer').classList.add('active');
}

function closeAddCustomerModal() {
  document.getElementById('modal-add-customer').classList.remove('active');
}

async function submitSaveCustomer() {
  const cId = document.getElementById('customer-id-hidden').value;
  const name = document.getElementById('cust-name-input').value.trim();
  const phone = document.getElementById('cust-phone-input').value.trim();
  const address = document.getElementById('cust-address-input').value.trim();
  const type = document.getElementById('cust-type-select').value;

  if (!name) {
    alert('Customer name is required');
    return;
  }

  const endpoint = cId ? '/api/customers/update/' : '/api/customers/add/';
  const payload = { customer_id: cId, name, phone, address, type };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddCustomerModal();
      loadCustomers();
      alert(`Customer "${name}" ${cId ? 'updated' : 'added'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save customer'));
    }
  } catch (err) {
    console.error(err);
    alert('Failed to connect to server');
  }
}

async function deleteCustomer(cId) {
  if (!confirm('Are you sure you want to delete this customer?')) return;
  try {
    const res = await fetch('/api/customers/delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: cId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      loadCustomers();
      alert('Customer deleted successfully!');
    }
  } catch (err) {
    console.error(err);
  }
}

/* =========================================================
   10. SETTINGS SUB-VIEWS (Staff, Lookup, Reorder)
========================================================= */
let staffData = [];
async function loadStaff() {
  try {
    const res = await fetch('/api/staff/');
    const data = await res.json();
    staffData = data.staff;
    renderStaffTable(staffData);
  } catch (err) {
    console.error(err);
  }
}

function filterStaffSearch(query) {
  const q = query.toLowerCase();
  const showInactive = document.getElementById('staff-toggle-inactive') ? document.getElementById('staff-toggle-inactive').checked : true;
  const filtered = staffData.filter(s => 
    (s.is_active || showInactive) &&
    (s.name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q)) || s.role.toLowerCase().includes(q))
  );
  renderStaffTable(filtered);
}

function renderStaffTable(staff) {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('staff-count-label').innerText = `${staff.length} records`;

  staff.forEach((s, idx) => {
    const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:28px; height:28px; background:#2563eb; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${initials}</div>
          <div><strong style="color: #0f172a;">${s.name}</strong><br><span style="font-size:11px; color:#6b7280;">${s.email || '-'}</span></div>
        </div>
      </td>
      <td><span class="badge ${s.role === 'Admin' ? 'badge-purple' : 'badge-info'}" style="${s.role === 'Admin' ? 'background:#f3e8ff; color:#7c3aed;' : ''}">${s.role}</span></td>
      <td>${s.contact || '-'}</td>
      <td>${s.username}</td>
      <td>${s.hire_date || '-'}</td>
      <td>${s.last_login || 'Never'}</td>
      <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">● ${s.status}</span></td>
      <td>
        <div style="display:flex; gap:4px;">
          <button onclick="openEditStaffModal(${s.id})" class="btn btn-action-edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button onclick="deleteStaff(${s.id})" class="btn btn-action-edit" style="background:#fee2e2; color:#b91c1c;"><i class="fa-solid fa-trash"></i> Del</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddStaffModal() {
  document.getElementById('staff-id-hidden').value = '';
  document.getElementById('modal-staff-title').innerText = 'Add Staff Member';
  document.getElementById('staff-name-input').value = '';
  document.getElementById('staff-username-input').value = '';
  document.getElementById('staff-password-input').value = '';
  document.getElementById('staff-role-select').value = 'Cashier';
  document.getElementById('modal-add-staff').classList.add('active');
}

function openEditStaffModal(sId) {
  const s = staffData.find(item => item.id == sId);
  if (!s) return;
  document.getElementById('staff-id-hidden').value = s.id;
  document.getElementById('modal-staff-title').innerText = `Edit Staff Member (#${s.id})`;
  document.getElementById('staff-name-input').value = s.name;
  document.getElementById('staff-username-input').value = s.username;
  document.getElementById('staff-password-input').value = '';
  document.getElementById('staff-role-select').value = s.role;
  document.getElementById('modal-add-staff').classList.add('active');
}

function closeAddStaffModal() {
  document.getElementById('modal-add-staff').classList.remove('active');
}

async function submitSaveStaff() {
  const sId = document.getElementById('staff-id-hidden').value;
  const name = document.getElementById('staff-name-input').value.trim();
  const username = document.getElementById('staff-username-input').value.trim();
  const password = document.getElementById('staff-password-input').value;
  const role = document.getElementById('staff-role-select').value;

  if (!name || !username) {
    alert('Name and Username are required');
    return;
  }

  const endpoint = sId ? '/api/staff/update/' : '/api/staff/add/';
  const payload = { staff_id: sId, name, username, password, role };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddStaffModal();
      loadStaff();
      alert(`Staff member "${name}" ${sId ? 'updated' : 'added'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save staff member'));
    }
  } catch (err) {
    console.error(err);
    alert('Failed to connect to server');
  }
}

async function deleteStaff(sId) {
  if (!confirm('Are you sure you want to delete this staff member?')) return;
  try {
    const res = await fetch('/api/staff/delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: sId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      loadStaff();
      alert('Staff member deleted successfully!');
    }
  } catch (err) {
    console.error(err);
  }
}

let categoriesData = [];
async function loadCategories() {
  try {
    const res = await fetch('/api/categories/');
    const data = await res.json();
    categoriesData = data.categories;
    renderCategoriesTable(categoriesData);
  } catch (err) {
    console.error(err);
  }
}

function filterCategoriesSearch(query) {
  const q = query.toLowerCase();
  const showInactive = document.getElementById('cat-toggle-inactive') ? document.getElementById('cat-toggle-inactive').checked : true;
  const filtered = categoriesData.filter(c => 
    (c.is_active || showInactive) &&
    (c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)))
  );
  renderCategoriesTable(filtered);
}

function renderCategoriesTable(categories) {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('cat-count-label').innerText = `${categories.length} entries`;

  categories.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><span class="badge badge-info" style="font-weight: 700;">${c.name}</span></td>
      <td style="color: #64748b;">${c.description || '-'}</td>
      <td>#${c.order_num}</td>
      <td><span class="badge ${c.is_active ? 'badge-success' : 'badge-danger'}">● ${c.status}</span></td>
      <td>${c.created_at || '-'}</td>
      <td>
        <div style="display:flex; gap:4px;">
          <button onclick="openEditCategoryModal(${c.id})" class="btn btn-action-edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button onclick="deleteCategory(${c.id})" class="btn btn-action-edit" style="background:#fee2e2; color:#b91c1c;"><i class="fa-solid fa-trash"></i> Del</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddCategoryModal() {
  document.getElementById('category-id-hidden').value = '';
  document.getElementById('modal-category-title').innerText = 'Add Category';
  document.getElementById('cat-name-input').value = '';
  document.getElementById('cat-order-input').value = '1';
  document.getElementById('cat-desc-input').value = '';
  document.getElementById('modal-add-category').classList.add('active');
}

function openEditCategoryModal(cId) {
  const c = categoriesData.find(item => item.id == cId);
  if (!c) return;
  document.getElementById('category-id-hidden').value = c.id;
  document.getElementById('modal-category-title').innerText = `Edit Category (#${c.id})`;
  document.getElementById('cat-name-input').value = c.name;
  document.getElementById('cat-order-input').value = c.order_num;
  document.getElementById('cat-desc-input').value = c.description || '';
  document.getElementById('modal-add-category').classList.add('active');
}

function closeAddCategoryModal() {
  document.getElementById('modal-add-category').classList.remove('active');
}

async function submitSaveCategory() {
  const cId = document.getElementById('category-id-hidden').value;
  const name = document.getElementById('cat-name-input').value.trim();
  const orderNum = document.getElementById('cat-order-input').value;
  const desc = document.getElementById('cat-desc-input').value.trim();

  if (!name) {
    alert('Category name is required');
    return;
  }

  const endpoint = cId ? '/api/categories/update/' : '/api/categories/add/';
  const payload = { category_id: cId, name, order_num: orderNum, description: desc };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      closeAddCategoryModal();
      loadCategories();
      alert(`Category "${name}" ${cId ? 'updated' : 'added'} successfully!`);
    } else {
      alert('Error: ' + (data.message || 'Could not save category'));
    }
  } catch (err) {
    console.error(err);
    alert('Failed to connect to server');
  }
}

async function deleteCategory(cId) {
  if (!confirm('Are you sure you want to delete this category?')) return;
  try {
    const res = await fetch('/api/categories/delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: cId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      loadCategories();
      alert('Category deleted successfully!');
    }
  } catch (err) {
    console.error(err);
  }
}

let reorderData = [];
async function loadReorderItems() {
  try {
    const res = await fetch('/api/reorder/');
    const data = await res.json();
    reorderData = data.items;
    renderReorderTable(reorderData);
  } catch (err) {
    console.error(err);
  }
}

function renderReorderTable(items) {
  const tbody = document.getElementById('reorder-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">No low stock reorder items found</td></tr>';
    return;
  }

  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" checked class="reorder-item-chk" data-id="${it.id}" style="accent-color:#2563eb;"></td>
      <td><strong style="color: #0f172a;">${it.product_name}</strong><br><span style="font-size:11px; color:#6b7280;">${it.size} • ${it.unit}</span></td>
      <td style="font-weight: 700; color: ${it.current_stock <= 0 ? '#ef4444' : '#d97706'};">${it.current_stock}</td>
      <td>${it.reorder_level}</td>
      <td><span class="badge ${it.current_stock <= 0 ? 'badge-out-stock' : 'badge-low-stock'}">● ${it.status}</span></td>
      <td><input type="number" id="reorder-qty-${it.id}" class="form-control" value="${it.qty_to_order}" style="width:80px;"></td>
      <td><input type="text" id="reorder-notes-${it.id}" class="form-control" placeholder="e.g. urgent, specific brand"></td>
    `;
    tbody.appendChild(tr);
  });
}

function generateReorderPDF() {
  const selectedRows = document.querySelectorAll('.reorder-item-chk:checked');
  if (selectedRows.length === 0) {
    alert('Please select at least one item to generate reorder slip');
    return;
  }

  const items = [];
  selectedRows.forEach(chk => {
    const id = chk.getAttribute('data-id');
    const item = reorderData.find(i => i.id == id);
    if (item) {
      const qtyIn = document.getElementById(`reorder-qty-${id}`);
      const notesIn = document.getElementById(`reorder-notes-${id}`);
      items.push({
        name: item.product_name,
        size: item.size,
        unit: item.unit,
        current: item.current_stock,
        reorderLvl: item.reorder_level,
        orderQty: qtyIn ? qtyIn.value : item.qty_to_order,
        notes: notesIn ? notesIn.value : ''
      });
    }
  });

  const content = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 800px; margin: auto;">
      <h2 style="text-align: center; margin-bottom: 2px;">Hardware Store</h2>
      <p style="text-align: center; color: #666; margin: 0 0 16px 0;">SUPPLIER REORDER DEMAND SLIP</p>
      <p style="text-align: right; font-size: 12px; color: #666;">Date: ${new Date().toLocaleDateString()}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
        <thead>
          <tr style="background: #1e3a8a; color: #fff;">
            <th style="padding: 8px; border: 1px solid #1e3a8a;">Product / Variant</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">Current Stock</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">Reorder Level</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: center;">Qty To Order</th>
            <th style="padding: 8px; border: 1px solid #1e3a8a;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>${it.name}</strong> (${it.size} - ${it.unit})</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${it.current}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${it.reorderLvl}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 700;">${it.orderQty}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${it.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Reorder Demand Slip</title></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

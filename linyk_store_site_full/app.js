const SALES_KEY = "linyk_sales_v2";
const PURCHASES_KEY = "linyk_purchases_v2";

function getSales(){
  return JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
}
function setSales(data){
  localStorage.setItem(SALES_KEY, JSON.stringify(data));
}
function getPurchases(){
  return JSON.parse(localStorage.getItem(PURCHASES_KEY) || "[]");
}
function setPurchases(data){
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(data));
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}
function formatMoney(n){
  return new Intl.NumberFormat("uk-UA").format(Number(n || 0));
}
function currentMonthValue(){
  const stored = localStorage.getItem("linyk_selected_month");
  if (stored) return stored;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function setCurrentMonthValue(value){
  localStorage.setItem("linyk_selected_month", value);
}
function monthLabel(value){
  if(!value) return "усі місяці";
  const [y,m] = value.split("-");
  const names = ["січень","лютий","березень","квітень","травень","червень","липень","серпень","вересень","жовтень","листопад","грудень"];
  return `${names[Number(m)-1]} ${y}`;
}
function inMonth(dateStr, monthStr){
  if(!monthStr) return true;
  return (dateStr || "").startsWith(monthStr);
}
function parseNum(v){
  return Number(v || 0);
}
function saleProfit(s){
  return parseNum(s.salePrice) - parseNum(s.purchasePrice);
}
function pageMarketplace(){
  return document.body.dataset.marketplace || "";
}
function pageType(){
  return document.body.dataset.page || "";
}
function fillCommonHeader(){
  const titleMonth = document.querySelector("[data-month-title]");
  if(titleMonth){
    titleMonth.textContent = monthLabel(currentMonthValue());
  }
  const monthInputs = document.querySelectorAll(".monthFilter");
  monthInputs.forEach(input=>{
    input.value = currentMonthValue();
    input.addEventListener("change", () => {
      setCurrentMonthValue(input.value);
      document.querySelectorAll(".monthFilter").forEach(el => el.value = input.value);
      reloadPage();
    });
  });
  document.querySelectorAll("[data-export]").forEach(btn=>{
    btn.addEventListener("click", () => handleExport(btn.dataset.export));
  });
}
function reloadPage(){
  fillCommonHeader();
  const type = pageType();
  if(type === "dashboard") renderDashboard();
  if(type === "sales") renderSalesPage();
  if(type === "purchases") renderPurchasesPage();
  if(type === "reports") renderReportsPage();
}
function handleExport(kind){
  const month = currentMonthValue();
  if(kind === "dashboard" || kind === "sales"){
    const market = pageMarketplace();
    exportSalesCsv(month, market);
  } else if(kind === "purchases"){
    exportPurchasesCsv(month);
  } else if(kind === "reports"){
    exportSummaryCsv(month);
  }
}
function exportSalesCsv(month, marketplace=""){
  const sales = getSales().filter(s => inMonth(s.saleDate, month) && (!marketplace || s.marketplace === marketplace));
  let csv = "Назва товару,Маркетплейс,Дата продажу,Ціна продажу,Ціна закупки,Чистий прибуток\n";
  sales.forEach(s=>{
    csv += csvRow([s.productName, s.marketplace, s.saleDate, s.salePrice, s.purchasePrice, saleProfit(s)]);
  });
  downloadCsv(csv, marketplace ? `${marketplace}_${month}.csv` : `sales_${month}.csv`);
}
function exportPurchasesCsv(month){
  const rows = getPurchases().filter(p => inMonth(p.date, month));
  let csv = "Назва товару,Дата,Джерело закупки,Ціна\n";
  rows.forEach(p=>{
    csv += csvRow([p.productName, p.date, p.source, p.price]);
  });
  downloadCsv(csv, `purchases_${month}.csv`);
}
function exportSummaryCsv(month){
  const sales = getSales().filter(s => inMonth(s.saleDate, month));
  const purchases = getPurchases().filter(p => inMonth(p.date, month));
  const stats = calcStats(sales, purchases);
  let csv = "Показник,Значення\n";
  [
    ["Продажів", stats.salesCount],
    ["Виручка", stats.revenue],
    ["Прибуток", stats.profit],
    ["Вкладено в закупку", stats.purchaseInvestment],
    ["Instagram", stats.byMarketplace.Instagram || 0],
    ["Vinted", stats.byMarketplace.Vinted || 0],
    ["Grailed", stats.byMarketplace.Grailed || 0]
  ].forEach(r => csv += csvRow(r));
  downloadCsv(csv, `report_${month}.csv`);
}
function csvRow(cells){
  return cells.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",") + "\n";
}
function downloadCsv(content, filename){
  const blob = new Blob(["\uFEFF" + content], {type:"text/csv;charset=utf-8;"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
function calcStats(sales, purchases){
  const stats = {
    salesCount: sales.length,
    revenue: sales.reduce((a,b)=>a+parseNum(b.salePrice),0),
    profit: sales.reduce((a,b)=>a+saleProfit(b),0),
    purchaseInvestment: purchases.reduce((a,b)=>a+parseNum(b.price),0),
    byMarketplace: {}
  };
  sales.forEach(s=>{
    stats.byMarketplace[s.marketplace] = (stats.byMarketplace[s.marketplace] || 0) + parseNum(s.salePrice);
  });
  return stats;
}
function mountNav(){
  const page = pageType();
  const market = pageMarketplace();
  document.querySelectorAll(".nav a").forEach(a=>{
    const href = a.getAttribute("href");
    if((page==="dashboard" && href==="index.html") ||
       (page==="sales" && market==="Instagram" && href==="instagram.html") ||
       (page==="sales" && market==="Vinted" && href==="vinted.html") ||
       (page==="sales" && market==="Grailed" && href==="grailed.html") ||
       (page==="purchases" && href==="purchases.html") ||
       (page==="reports" && href==="reports.html")){
      a.classList.add("active");
    }
  });
}
function renderDashboard(){
  const month = currentMonthValue();
  const sales = getSales().filter(s => inMonth(s.saleDate, month));
  const purchases = getPurchases().filter(p => inMonth(p.date, month));
  const stats = calcStats(sales, purchases);

  setText("salesCount", stats.salesCount);
  setText("revenue", formatMoney(stats.revenue));
  setText("profit", formatMoney(stats.profit));
  setText("investment", formatMoney(stats.purchaseInvestment));

  const marketList = document.getElementById("marketOverview");
  if(marketList){
    marketList.innerHTML = "";
    ["Instagram","Vinted","Grailed"].forEach(m=>{
      const row = document.createElement("div");
      row.className = "kpi-row";
      row.innerHTML = `<div>${m}</div><div>${formatMoney(stats.byMarketplace[m] || 0)}</div>`;
      marketList.appendChild(row);
    });
  }

  const recentBody = document.getElementById("recentSalesBody");
  if(recentBody){
    const rows = [...sales].sort((a,b)=> String(b.saleDate).localeCompare(String(a.saleDate))).slice(0,8);
    recentBody.innerHTML = rows.length ? rows.map(s => `
      <tr>
        <td>${escapeHtml(s.productName)}</td>
        <td><span class="badge">${escapeHtml(s.marketplace)}</span></td>
        <td>${escapeHtml(s.saleDate)}</td>
        <td>${formatMoney(s.salePrice)}</td>
        <td>${formatMoney(s.purchasePrice)}</td>
        <td>${formatMoney(saleProfit(s))}</td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">За цей місяць ще немає продажів.</td></tr>`;
  }
}
function renderSalesPage(){
  const market = pageMarketplace();
  const month = currentMonthValue();
  const filter = document.getElementById("searchInput")?.value?.toLowerCase() || "";
  const sales = getSales()
    .filter(s => s.marketplace === market && inMonth(s.saleDate, month))
    .filter(s => !filter || s.productName.toLowerCase().includes(filter));

  const stats = calcStats(sales, []);
  setText("salesCount", stats.salesCount);
  setText("revenue", formatMoney(stats.revenue));
  setText("profit", formatMoney(stats.profit));

  const tbody = document.getElementById("salesBody");
  tbody.innerHTML = sales.length ? sales
    .sort((a,b)=> String(b.saleDate).localeCompare(String(a.saleDate)))
    .map(s => `
      <tr>
        <td>${escapeHtml(s.productName)}</td>
        <td>${escapeHtml(s.saleDate)}</td>
        <td>${formatMoney(s.salePrice)}</td>
        <td>${formatMoney(s.purchasePrice)}</td>
        <td>${formatMoney(saleProfit(s))}</td>
        <td>
          <div class="actions">
            <button class="secondary" onclick="editSale('${s.id}')">Редагувати</button>
            <button class="danger" onclick="deleteSale('${s.id}')">Видалити</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">Немає записів за вибраний місяць.</td></tr>`;

  const form = document.getElementById("saleForm");
  if(form && !form.dataset.bound){
    form.dataset.bound = "1";
    form.addEventListener("submit", saveSale);
    document.getElementById("searchInput").addEventListener("input", renderSalesPage);
    document.getElementById("cancelEditSale").addEventListener("click", resetSaleForm);
    document.getElementById("marketplaceFixed").value = market;
  }
}
function saveSale(e){
  e.preventDefault();
  const id = document.getElementById("saleId").value.trim();
  const market = pageMarketplace();
  const payload = {
    id: id || uid(),
    productName: document.getElementById("productName").value.trim(),
    marketplace: market,
    saleDate: document.getElementById("saleDate").value,
    salePrice: parseNum(document.getElementById("salePrice").value),
    purchasePrice: parseNum(document.getElementById("purchasePrice").value),
  };
  if(!payload.productName || !payload.saleDate){
    alert("Заповни назву товару та дату.");
    return;
  }
  let sales = getSales();
  const idx = sales.findIndex(s => s.id === payload.id);
  if(idx >= 0) sales[idx] = payload;
  else sales.push(payload);
  setSales(sales);
  resetSaleForm();
  renderSalesPage();
}
function editSale(id){
  const s = getSales().find(x => x.id === id);
  if(!s) return;
  document.getElementById("saleId").value = s.id;
  document.getElementById("productName").value = s.productName;
  document.getElementById("saleDate").value = s.saleDate;
  document.getElementById("salePrice").value = s.salePrice;
  document.getElementById("purchasePrice").value = s.purchasePrice;
  document.getElementById("formTitle").textContent = "Редагувати продаж";
  window.scrollTo({top:0, behavior:"smooth"});
}
function resetSaleForm(){
  document.getElementById("saleForm").reset();
  document.getElementById("saleId").value = "";
  document.getElementById("marketplaceFixed").value = pageMarketplace();
  document.getElementById("formTitle").textContent = "Додати продаж";
}
function deleteSale(id){
  if(!confirm("Видалити цей продаж?")) return;
  setSales(getSales().filter(s => s.id !== id));
  renderSalesPage();
}
function renderPurchasesPage(){
  const month = currentMonthValue();
  const filter = document.getElementById("purchaseSearch")?.value?.toLowerCase() || "";
  const rows = getPurchases()
    .filter(p => inMonth(p.date, month))
    .filter(p => !filter || p.productName.toLowerCase().includes(filter) || p.source.toLowerCase().includes(filter));
  setText("purchaseCount", rows.length);
  setText("purchaseTotal", formatMoney(rows.reduce((a,b)=>a+parseNum(b.price),0)));

  const tbody = document.getElementById("purchaseBody");
  tbody.innerHTML = rows.length ? rows
    .sort((a,b)=> String(b.date).localeCompare(String(a.date)))
    .map(p => `
      <tr>
        <td>${escapeHtml(p.productName)}</td>
        <td>${escapeHtml(p.date)}</td>
        <td>${escapeHtml(p.source)}</td>
        <td>${formatMoney(p.price)}</td>
        <td>
          <div class="actions">
            <button class="secondary" onclick="editPurchase('${p.id}')">Редагувати</button>
            <button class="danger" onclick="deletePurchase('${p.id}')">Видалити</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty">Немає закупок за вибраний місяць.</td></tr>`;

  const form = document.getElementById("purchaseForm");
  if(form && !form.dataset.bound){
    form.dataset.bound = "1";
    form.addEventListener("submit", savePurchase);
    document.getElementById("purchaseSearch").addEventListener("input", renderPurchasesPage);
    document.getElementById("cancelEditPurchase").addEventListener("click", resetPurchaseForm);
  }
}
function savePurchase(e){
  e.preventDefault();
  const id = document.getElementById("purchaseId").value.trim();
  const payload = {
    id: id || uid(),
    productName: document.getElementById("purchaseProductName").value.trim(),
    date: document.getElementById("purchaseDate").value,
    source: document.getElementById("purchaseSource").value.trim(),
    price: parseNum(document.getElementById("purchasePrice").value),
  };
  if(!payload.productName || !payload.date){
    alert("Заповни назву товару та дату.");
    return;
  }
  let rows = getPurchases();
  const idx = rows.findIndex(p => p.id === payload.id);
  if(idx >= 0) rows[idx] = payload;
  else rows.push(payload);
  setPurchases(rows);
  resetPurchaseForm();
  renderPurchasesPage();
}
function editPurchase(id){
  const p = getPurchases().find(x => x.id === id);
  if(!p) return;
  document.getElementById("purchaseId").value = p.id;
  document.getElementById("purchaseProductName").value = p.productName;
  document.getElementById("purchaseDate").value = p.date;
  document.getElementById("purchaseSource").value = p.source;
  document.getElementById("purchasePrice").value = p.price;
  document.getElementById("purchaseFormTitle").textContent = "Редагувати закупку";
  window.scrollTo({top:0, behavior:"smooth"});
}
function resetPurchaseForm(){
  document.getElementById("purchaseForm").reset();
  document.getElementById("purchaseId").value = "";
  document.getElementById("purchaseFormTitle").textContent = "Додати закупку";
}
function deletePurchase(id){
  if(!confirm("Видалити цю закупку?")) return;
  setPurchases(getPurchases().filter(p => p.id !== id));
  renderPurchasesPage();
}
function renderReportsPage(){
  const month = currentMonthValue();
  const allSales = getSales();
  const allPurchases = getPurchases();
  const monthSales = allSales.filter(s => inMonth(s.saleDate, month));
  const monthPurchases = allPurchases.filter(p => inMonth(p.date, month));
  const stats = calcStats(monthSales, monthPurchases);

  setText("reportProfit", formatMoney(stats.profit));
  setText("reportRevenue", formatMoney(stats.revenue));
  setText("reportInvestment", formatMoney(stats.purchaseInvestment));

  const mpBody = document.getElementById("marketReportBody");
  mpBody.innerHTML = ["Instagram","Vinted","Grailed"].map(m=>{
    const marketSales = monthSales.filter(s => s.marketplace === m);
    const revenue = marketSales.reduce((a,b)=>a+parseNum(b.salePrice),0);
    const profit = marketSales.reduce((a,b)=>a+saleProfit(b),0);
    return `<tr><td>${m}</td><td>${marketSales.length}</td><td>${formatMoney(revenue)}</td><td>${formatMoney(profit)}</td></tr>`;
  }).join("");

  const productMap = {};
  monthSales.forEach(s=>{
    if(!productMap[s.productName]) productMap[s.productName] = {count:0, profit:0, revenue:0};
    productMap[s.productName].count += 1;
    productMap[s.productName].profit += saleProfit(s);
    productMap[s.productName].revenue += parseNum(s.salePrice);
  });
  const topProducts = Object.entries(productMap).sort((a,b)=>b[1].profit-a[1].profit).slice(0,10);
  const topBody = document.getElementById("topProductsBody");
  topBody.innerHTML = topProducts.length ? topProducts.map(([name,info]) =>
    `<tr><td>${escapeHtml(name)}</td><td>${info.count}</td><td>${formatMoney(info.revenue)}</td><td>${formatMoney(info.profit)}</td></tr>`
  ).join("") : `<tr><td colspan="4" class="empty">За цей місяць ще немає продажів.</td></tr>`;

  const monthly = buildMonthlyProfit(allSales);
  const chart = document.getElementById("profitChart");
  if(chart){
    chart.innerHTML = "";
    const max = Math.max(1, ...monthly.map(x => x.profit));
    monthly.slice(-8).forEach(item=>{
      const h = Math.max(16, Math.round(item.profit / max * 180));
      const wrap = document.createElement("div");
      wrap.className = "bar-wrap";
      wrap.innerHTML = `<div class="bar" style="height:${h}px"></div>
                        <div class="bar-label">${item.label}</div>
                        <div class="bar-value">${formatMoney(item.profit)}</div>`;
      chart.appendChild(wrap);
    });
  }
}
function buildMonthlyProfit(sales){
  const map = {};
  sales.forEach(s=>{
    const key = String(s.saleDate).slice(0,7);
    if(!key) return;
    map[key] = (map[key] || 0) + saleProfit(s);
  });
  return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([key,profit]) => ({
    key,
    profit,
    label: key.slice(5) + "." + key.slice(2,4)
  }));
}
function setText(id, val){
  const el = document.getElementById(id);
  if(el) el.textContent = val;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
function seedDemoOnce(){
  if(localStorage.getItem("linyk_seed_v2")) return;
  const sales = [
    {id:uid(), productName:"Stone Island світшот", marketplace:"Instagram", saleDate:"2026-03-05", salePrice:2600, purchasePrice:1400},
    {id:uid(), productName:"Nike hoodie", marketplace:"Vinted", saleDate:"2026-03-08", salePrice:1800, purchasePrice:900},
    {id:uid(), productName:"Carhartt jacket", marketplace:"Grailed", saleDate:"2026-03-12", salePrice:3400, purchasePrice:2000},
    {id:uid(), productName:"Levis jeans", marketplace:"Instagram", saleDate:"2026-02-16", salePrice:1500, purchasePrice:700},
    {id:uid(), productName:"Stussy tee", marketplace:"Vinted", saleDate:"2026-02-22", salePrice:1200, purchasePrice:500},
    {id:uid(), productName:"Alpha jacket", marketplace:"Grailed", saleDate:"2026-01-25", salePrice:2900, purchasePrice:1600}
  ];
  const purchases = [
    {id:uid(), productName:"Stone Island світшот", date:"2026-03-01", source:"секонд", price:1400},
    {id:uid(), productName:"Nike hoodie", date:"2026-03-02", source:"Instagram seller", price:900},
    {id:uid(), productName:"Carhartt jacket", date:"2026-03-05", source:"секонд", price:2000},
    {id:uid(), productName:"Levis jeans", date:"2026-02-10", source:"секонд", price:700}
  ];
  if(!getSales().length) setSales(sales);
  if(!getPurchases().length) setPurchases(purchases);
  if(!localStorage.getItem("linyk_selected_month")) localStorage.setItem("linyk_selected_month", "2026-03");
  localStorage.setItem("linyk_seed_v2", "1");
}
document.addEventListener("DOMContentLoaded", ()=>{
  seedDemoOnce();
  mountNav();
  fillCommonHeader();
  reloadPage();
});

// Aegis Trade Finance Aggregator - Logic Core

// 1. IN-MEMORY DATABASE SEED DATA
let deals = [
  {
    id: "DEAL-781",
    exporter: "Apex Electronics Ltd",
    exporterCountry: "China",
    importer: "Deutsche Trading AG",
    importerCountry: "Germany",
    importerRating: "AAA",
    invoiceAmount: 250000,
    paymentTerms: "60",
    originPort: "Shenzhen (SZX)",
    destPort: "Hamburg (HAM)",
    transitRoute: "suez",
    cargoDesc: "High-grade Microprocessors & PCB Assemblies",
    status: "Offers Received",
    riskScore: 28,
    docs: {
      invoice: {
        fileName: "invoice_781_signed.pdf",
        scannedText: "COMMERCIAL INVOICE #INV-781\nDate: 2026-05-12\nSeller: Apex Electronics Ltd (China)\nBuyer: Deutsche Trading AG (Germany)\nTotal Amount: USD 250,000\nPayment Terms: Net 60\nGoods: High-grade Microprocessors & PCB Assemblies\n[Authorized Signature Included]",
        checks: { amountMatch: true, nameMatch: true, signed: true }
      },
      bol: {
        fileName: "bol_shanghai_hamburg.pdf",
        scannedText: "BILL OF LADING\nCarrier: OceanBridge Shipping\nVessel: Sea Voyager v102\nShipper: Apex Electronics Ltd\nConsignee: Deutsche Trading AG\nPort of Loading: Shenzhen Port, China\nPort of Discharge: Hamburg Port, Germany\nGross Weight: 8,420 kg\nDescription: Electronics",
        checks: { portsMatch: true, partyMatch: true, signed: true }
      }
    },
    offers: [
      {
        id: "OFF-301",
        factorId: "horizon",
        factorName: "Horizon Liquidity",
        advanceRate: 85,
        feeRate: 2.1,
        apr: 6.5,
        recourse: "recourse",
        validDays: 14,
        remarks: "Premium terms issued based on exporter AAA credit rating and clear document audit results."
      }
    ]
  },
  {
    id: "DEAL-904",
    exporter: "Gulf Energy Products",
    exporterCountry: "UAE",
    importer: "Hellenic Power Corp",
    importerCountry: "Greece",
    importerRating: "B-",
    invoiceAmount: 500000,
    paymentTerms: "120",
    originPort: "Jebel Ali (DXB)",
    destPort: "Piraeus (PIR)",
    transitRoute: "suez",
    cargoDesc: "Refined Fuel Oils & Additives",
    status: "Awaiting Offers",
    riskScore: 78,
    docs: {
      invoice: {
        fileName: "gulf_petro_invoice.pdf",
        scannedText: "COMMERCIAL INVOICE #GP-1092\nSeller: Gulf Energy Products (UAE)\nBuyer: Hellenic Power Corp (Greece)\nAmount: USD 500,000\nTerms: Net 120 Days\n[Signature Pending Underwriter Review]",
        checks: { amountMatch: true, nameMatch: true, signed: false }
      }
    },
    offers: []
  }
];

// Active global events that impact risk calculations
let globalEvents = {
  suezCongestion: false,
  panamaDrought: false,
  laxStrikes: false,
  currencyVolatility: false
};

// Simulated News Alert Ticker
const newsTickerList = [
  "Suez Canal transit times increase by 8 hours as marine security protocols tighten.",
  "Panama Canal daily transits restricted due to lingering low water levels in Gatun Lake.",
  "Port of Los Angeles cargo backlog peaks; labor contract negotiations remain ongoing.",
  "USD/EUR currency spreads fluctuate by 1.2% following recent central bank briefings.",
  "Global factoring volumes hit record highs in Q1 2026; supply chain resilience remains top priority.",
  "Rotterdam port clears cargo queue; European shipping routes return to normal operations."
];
let currentNewsIndex = 0;

// Setup Live Ticker
function initTicker() {
  const ticker = document.getElementById("global-ticker");
  if (!ticker) return;
  
  function updateTickerText() {
    let text = " |  CORE NEWS ALERTS:  ::  ";
    text += newsTickerList.join("  ::  ");
    // Add active events indicators
    let activeAlerts = [];
    if (globalEvents.suezCongestion) activeAlerts.push("RED SEA CHOKEPOINT ALERT ACTIVE");
    if (globalEvents.panamaDrought) activeAlerts.push("PANAMA CANAL DRAFT RESTRICTIONS DETECTED");
    if (globalEvents.laxStrikes) activeAlerts.push("US WEST COAST PORT LABOR NEGOTIATIONS ACTIVE");
    if (globalEvents.currencyVolatility) activeAlerts.push("HIGH CURRENCY MARKET VOLATILITY");
    
    if (activeAlerts.length > 0) {
      text = "⚠️ [ALERT ACTIVE] " + activeAlerts.join(" | ") + " :: " + text;
    }
    ticker.textContent = text;
  }
  
  updateTickerText();
  setInterval(() => {
    updateTickerText();
  }, 10000);
}

// 2. PORTAL & VIEW SWITCHERS
document.addEventListener("DOMContentLoaded", () => {
  initTicker();
  setupPortals();
  setupViews();
  setupTemplates();
  setupDocumentUploadSimulation();
  setupDealSubmissionForm();
  setupCalculators();
  renderPartnerDeals();
  renderFactorDealsQueue();
  renderFactorSentOffers();
});

function setupPortals() {
  const btnPartner = document.getElementById("toggle-partner");
  const btnFactor = document.getElementById("toggle-factor");
  
  const portalPartner = document.getElementById("portal-partner");
  const portalFactor = document.getElementById("portal-factor");
  
  const navPartner = document.getElementById("partner-nav");
  const navFactor = document.getElementById("factor-nav");

  btnPartner.addEventListener("click", () => {
    btnPartner.classList.add("active");
    btnPartner.setAttribute("aria-checked", "true");
    btnFactor.classList.remove("active");
    btnFactor.setAttribute("aria-checked", "false");
    
    portalPartner.classList.remove("hidden");
    portalFactor.classList.add("hidden");
    
    navPartner.classList.remove("hidden");
    navFactor.classList.add("hidden");
    
    renderPartnerDeals();
  });

  btnFactor.addEventListener("click", () => {
    btnFactor.classList.add("active");
    btnFactor.setAttribute("aria-checked", "true");
    btnPartner.classList.remove("active");
    btnPartner.setAttribute("aria-checked", "false");
    
    portalFactor.classList.remove("hidden");
    portalPartner.classList.add("hidden");
    
    navFactor.classList.remove("hidden");
    navPartner.classList.add("hidden");
    
    renderFactorDealsQueue();
    renderFactorSentOffers();
  });
  
  // Watch Representing Factor select to refresh sent table
  document.getElementById("active-factor-select").addEventListener("change", () => {
    renderFactorSentOffers();
    // If a deal is currently viewed in evaluator, reload it to reflect potential changes
    const activeEvalId = document.querySelector(".factor-deal-item.active")?.dataset.id;
    if (activeEvalId) {
      loadDealIntoEvaluator(activeEvalId);
    }
  });
}

function setupViews() {
  // Sidebar tab clicking within active portal
  document.querySelectorAll(".sidebar-nav").forEach(nav => {
    nav.addEventListener("click", e => {
      const btn = e.target.closest(".nav-item");
      if (!btn) return;
      
      const navList = nav.querySelectorAll(".nav-item");
      navList.forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      
      const viewId = btn.dataset.view;
      const portalId = nav.id === "partner-nav" ? "portal-partner" : "portal-factor";
      const portalDiv = document.getElementById(portalId);
      
      portalDiv.querySelectorAll(".workspace-view").forEach(view => {
        view.classList.remove("active");
      });
      
      const targetView = document.getElementById("view-" + viewId);
      if (targetView) targetView.classList.add("active");
    });
  });
}

// Allows switching sidebar view programmatically
function switchSidebarView(viewId) {
  const activePortalId = viewId.startsWith("partner-") ? "partner-nav" : "factor-nav";
  const nav = document.getElementById(activePortalId);
  const btn = nav.querySelector(`[data-view="${viewId}"]`);
  if (btn) {
    btn.click();
  }
}

// 3. RISK ENGINE LOGIC
function calculateRiskScore(deal) {
  let score = 10; // Base risk
  
  // Importer rating credit risk (AAA - CCC)
  const ratingMap = {
    "AAA": 5, "AA": 10, "A": 18, "BBB": 30, "BB": 45, "B": 65, "CCC": 85
  };
  score += ratingMap[deal.importerRating] || 30;

  // Payment terms duration risk
  const termMap = {
    "30": 5, "60": 12, "90": 22, "120": 35
  };
  score += termMap[deal.paymentTerms] || 15;

  // Shipping route hazards & global events impact
  if (deal.transitRoute === "suez") {
    score += 15; // Suez Canal has base geopolitical tension
    if (globalEvents.suezCongestion) {
      score += 25; // Massive escalation if active
    }
  } else if (deal.transitRoute === "panama") {
    score += 10; // Panama Canal has drought risks
    if (globalEvents.panamaDrought) {
      score += 20; // Critical backlog
    }
  } else if (deal.transitRoute === "transpacific") {
    score += 5; // Safe sea lane, but West Coast port strikes can bottleneck
    if (globalEvents.laxStrikes) {
      score += 20;
    }
  } else if (deal.transitRoute === "transatlantic") {
    score += 5;
  } else if (deal.transitRoute === "cape") {
    score += 8; // High safety, but transit times are massive
  }

  // Document audits impact
  if (deal.docs) {
    if (deal.docs.invoice) {
      if (!deal.docs.invoice.checks.signed) score += 10; // Unsigned invoice
      if (!deal.docs.invoice.checks.amountMatch) score += 20; // Critical mismatch
    } else {
      score += 15; // Missing invoice entirely
    }

    if (deal.docs.bol) {
      if (!deal.docs.bol.checks.portsMatch) score += 15; // Route compliance error
    } else {
      score += 12; // Missing B/L
    }
  } else {
    score += 25; // No docs submitted
  }

  // Currency volatility impact
  if (globalEvents.currencyVolatility) {
    score += 8;
  }

  // Clamp score between 5 and 99
  return Math.max(5, Math.min(99, score));
}

// Get qualitative rating
function getRiskTier(score) {
  if (score < 35) return { text: "Low Risk", class: "badge-success", color: "var(--color-success)" };
  if (score < 65) return { text: "Medium Risk", class: "badge-warning", color: "var(--color-warning)" };
  return { text: "High Risk", class: "badge-danger", color: "var(--color-danger)" };
}

// 4. MOCK DATA TEMPLATE POPULATION
const templates = {
  tech: {
    exporter: "TechFlow Shenzhen Ltd",
    exporterCountry: "China",
    importer: "EuroRetail GmbH",
    importerCountry: "Germany",
    importerRating: "AAA",
    invoiceAmount: 250000,
    paymentTerms: "60",
    originPort: "Shenzhen (SZX)",
    destPort: "Hamburg (HAM)",
    cargoDesc: "High-end consumer electronics & silicon parts",
    transitRoute: "suez",
    docs: {
      invoice: {
        fileName: "invoice_sh_250k.pdf",
        scannedText: "COMMERCIAL INVOICE #TFS-991\nDate: 2026-06-01\nExporter: TechFlow Shenzhen Ltd (China)\nImporter: EuroRetail GmbH (Germany)\nInvoice Total: USD 250,000.00\nPayment Due: Net 60 Days\nGoods: Consumer Electronics Batch A\n[Electronically Signed]",
        checks: { amountMatch: true, nameMatch: true, signed: true }
      },
      bol: {
        fileName: "bill_of_lading_szx_ham.pdf",
        scannedText: "BILL OF LADING\nCarrier: Hapag-Lloyd\nShipper: TechFlow Shenzhen Ltd\nConsignee: EuroRetail GmbH\nOrigin: Shenzhen Port, China\nDestination: Hamburg Port, Germany\nCargo: 20ft container (Electronics)\nStatus: Clean on Board",
        checks: { portsMatch: true, partyMatch: true, signed: true }
      }
    }
  },
  spice: {
    exporter: "AquaCrop Vietnam",
    exporterCountry: "Vietnam",
    importer: "GlobalFoods Inc",
    importerCountry: "United States",
    importerRating: "BB",
    invoiceAmount: 120000,
    paymentTerms: "90",
    originPort: "Ho Chi Minh (SGN)",
    destPort: "Los Angeles (LAX)",
    cargoDesc: "Premium Organic Pepper & Dried Spices",
    transitRoute: "transpacific",
    docs: {
      invoice: {
        fileName: "vietnam_spices_inv.pdf",
        scannedText: "COMMERCIAL INVOICE #AQ-302\nExporter: AquaCrop Vietnam (Vietnam)\nImporter: GlobalFoods Inc (USA)\nTotal Sum: USD 120,000.00\nTerms: Net 90\n[Signature Affixed]",
        checks: { amountMatch: true, nameMatch: true, signed: true }
      },
      bol: {
        fileName: "bol_vietnam_lax_draft.pdf",
        scannedText: "MOCK BILL OF LADING\nShipper: AquaCrop Vietnam\nConsignee: GlobalFoods Inc\nPort of Loading: Ho Chi Minh (SGN)\nPort of Discharge: Seattle Port, USA\nWARNING: Discharge Port discrepancy detected ( Seattle vs form Los Angeles).",
        checks: { portsMatch: false, partyMatch: true, signed: true }
      }
    }
  },
  petro: {
    exporter: "Gulf Energy Products",
    exporterCountry: "UAE",
    importer: "Hellenic Power Corp",
    importerCountry: "Greece",
    importerRating: "B-",
    invoiceAmount: 500000,
    paymentTerms: "120",
    originPort: "Jebel Ali (DXB)",
    destPort: "Piraeus (PIR)",
    cargoDesc: "Refined Fuel Oils & Additives",
    transitRoute: "suez",
    docs: {
      invoice: {
        fileName: "gulf_petro_invoice_draft.pdf",
        scannedText: "PRO-FORMA INVOICE #GP-1092-DRAFT\nSeller: Gulf Energy Products (UAE)\nBuyer: Hellenic Power Ltd (Mismatch: Form says Corp)\nAmount: USD 495,000 (Mismatch: Form says 500k)\nTerms: Net 120 Days\n[Draft Copy - Signature Missing]",
        checks: { amountMatch: false, nameMatch: false, signed: false }
      }
    }
  }
};

let currentFormDocs = null;

function setupTemplates() {
  document.getElementById("btn-load-tech-temp").addEventListener("click", () => loadTemplateForm("tech"));
  document.getElementById("btn-load-spice-temp").addEventListener("click", () => loadTemplateForm("spice"));
  document.getElementById("btn-load-petro-temp").addEventListener("click", () => loadTemplateForm("petro"));
}

function loadTemplateForm(key) {
  const data = templates[key];
  if (!data) return;

  document.getElementById("exporter-name").value = data.exporter;
  document.getElementById("exporter-country").value = data.exporterCountry;
  document.getElementById("importer-name").value = data.importer;
  document.getElementById("importer-rating").value = data.importerRating;
  document.getElementById("invoice-amount").value = data.invoiceAmount;
  document.getElementById("payment-terms").value = data.paymentTerms;
  document.getElementById("origin-port").value = data.originPort;
  document.getElementById("dest-port").value = data.destPort;
  document.getElementById("cargo-desc").value = data.cargoDesc;
  document.getElementById("transit-route").value = data.transitRoute;

  // Set local state files
  currentFormDocs = JSON.parse(JSON.stringify(data.docs || {}));
  
  // Highlight upload UI as mock loaded
  const invStatus = document.getElementById("invoice-upload-status");
  const bolStatus = document.getElementById("bol-upload-status");

  if (currentFormDocs.invoice) {
    invStatus.textContent = `Attached: ${currentFormDocs.invoice.fileName}`;
    invStatus.parentElement.parentElement.classList.add("active");
  } else {
    invStatus.textContent = "Not provided";
    invStatus.parentElement.parentElement.classList.remove("active");
  }

  if (currentFormDocs.bol) {
    bolStatus.textContent = `Attached: ${currentFormDocs.bol.fileName}`;
    bolStatus.parentElement.parentElement.classList.add("active");
  } else {
    bolStatus.textContent = "Not provided";
    bolStatus.parentElement.parentElement.classList.remove("active");
  }
}

// 5. DOCUMENT UPLOAD SIMULATOR ACTIONS
function setupDocumentUploadSimulation() {
  const invZone = document.getElementById("upload-invoice-zone");
  const bolZone = document.getElementById("upload-bol-zone");

  invZone.addEventListener("click", () => {
    if (!currentFormDocs) currentFormDocs = {};
    simulateUploadProgress("invoice", (fileName, text) => {
      currentFormDocs.invoice = {
        fileName: fileName,
        scannedText: text,
        checks: { amountMatch: true, nameMatch: true, signed: true }
      };
      document.getElementById("invoice-upload-status").textContent = `Attached: ${fileName}`;
      invZone.classList.add("active");
    });
  });

  bolZone.addEventListener("click", () => {
    if (!currentFormDocs) currentFormDocs = {};
    simulateUploadProgress("bol", (fileName, text) => {
      currentFormDocs.bol = {
        fileName: fileName,
        scannedText: text,
        checks: { portsMatch: true, partyMatch: true, signed: true }
      };
      document.getElementById("bol-upload-status").textContent = `Attached: ${fileName}`;
      bolZone.classList.add("active");
    });
  });
}

function simulateUploadProgress(type, callback) {
  const statusEl = document.getElementById(type === "invoice" ? "invoice-upload-status" : "bol-upload-status");
  let progress = 0;
  
  statusEl.textContent = "Analyzing document [0%]...";
  
  const timer = setInterval(() => {
    progress += 25;
    statusEl.textContent = `Running OCR & Integrity checks [${progress}%]...`;
    
    if (progress >= 100) {
      clearInterval(timer);
      const isInvoice = type === "invoice";
      const fileName = isInvoice ? "user_invoice_uploaded.pdf" : "user_bill_of_lading.pdf";
      const text = isInvoice ? 
        "COMMERCIAL INVOICE #CUSTOM-UPL\nAmount: USD [User Form Value]\nExporter: [User Exporter]\nImporter: [User Importer]\nDocument scan verified successfully." :
        "BILL OF LADING\nCarrier: Standard Ocean Line\nShipper: [User Exporter]\nPort of Loading: [User Origin]\nPort of Discharge: [User Destination]\nDocument integrity verified.";
      
      callback(fileName, text);
    }
  }, 300);
}

// 6. DEAL SUBMISSION LOGIC
function setupDealSubmissionForm() {
  const form = document.getElementById("new-deal-form");
  form.addEventListener("submit", e => {
    e.preventDefault();

    const invoiceAmt = parseFloat(document.getElementById("invoice-amount").value);
    
    // Check constraints if using user uploaded files, force amount checks
    if (currentFormDocs && currentFormDocs.invoice) {
      // If we uploaded our own custom files (not template), make matching details
      if (currentFormDocs.invoice.fileName === "user_invoice_uploaded.pdf") {
        const expName = document.getElementById("exporter-name").value;
        const impName = document.getElementById("importer-name").value;
        currentFormDocs.invoice.scannedText = currentFormDocs.invoice.scannedText
          .replace("[User Form Value]", invoiceAmt.toLocaleString())
          .replace("[User Exporter]", expName)
          .replace("[User Importer]", impName);
      }
    }

    const newDeal = {
      id: "DEAL-" + Math.floor(100 + Math.random() * 900),
      exporter: document.getElementById("exporter-name").value,
      exporterCountry: document.getElementById("exporter-country").value,
      importer: document.getElementById("importer-name").value,
      importerCountry: document.getElementById("importer-country").value,
      importerRating: document.getElementById("importer-rating").value,
      invoiceAmount: invoiceAmt,
      paymentTerms: document.getElementById("payment-terms").value,
      originPort: document.getElementById("origin-port").value,
      destPort: document.getElementById("dest-port").value,
      transitRoute: document.getElementById("transit-route").value,
      cargoDesc: document.getElementById("cargo-desc").value,
      status: "Awaiting Offers",
      docs: currentFormDocs || {},
      offers: []
    };

    // Calculate initial risk score
    newDeal.riskScore = calculateRiskScore(newDeal);
    
    // Add to shared collection
    deals.unshift(newDeal);
    
    // Reset form states
    form.reset();
    currentFormDocs = null;
    document.getElementById("invoice-upload-status").textContent = "Click to browse or drop template";
    document.getElementById("bol-upload-status").textContent = "Click to browse or drop template";
    document.getElementById("upload-invoice-zone").classList.remove("active");
    document.getElementById("upload-bol-zone").classList.remove("active");

    // Route to deals tab
    switchSidebarView("partner-deals");
    renderPartnerDeals();
  });
}

// 7. RENDER TRADING PARTNER DEALS
function renderPartnerDeals() {
  const container = document.getElementById("partner-deals-list");
  if (!container) return;

  if (deals.length === 0) {
    container.innerHTML = `
      <div class="no-deals-placeholder">
        <p>No trade deals submitted yet.</p>
        <button class="btn btn-primary" onclick="switchSidebarView('partner-new-deal')" type="button">Submit First Deal</button>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  deals.forEach(deal => {
    const risk = getRiskTier(deal.riskScore);
    const offerCount = deal.offers.length;
    let statusClass = "badge-info";
    
    if (deal.status === "Offers Received") statusClass = "badge-warning";
    if (deal.status === "Accepted") statusClass = "badge-success";

    const card = document.createElement("article");
    card.className = "deal-card glass-panel";
    card.innerHTML = `
      <div class="deal-card-header">
        <span class="deal-id">${deal.id}</span>
        <span class="badge ${statusClass}">${deal.status}</span>
      </div>
      <div>
        <h3 class="deal-card-title">${deal.exporter} ➔ ${deal.importer}</h3>
        <div class="deal-route-span">
          <span>🚢 ${deal.originPort} to ${deal.destPort}</span>
        </div>
        <p class="small-text text-dim" style="margin-bottom:0.75rem;">Cargo: ${deal.cargoDesc}</p>
        
        <div class="deal-financials">
          <div>
            <span class="lbl">Invoice Value</span>
            <span class="val">$${deal.invoiceAmount.toLocaleString()}</span>
          </div>
          <div>
            <span class="lbl">Terms</span>
            <span class="val">Net ${deal.paymentTerms} Days</span>
          </div>
        </div>
      </div>
      
      <div>
        <div class="deal-risk-section">
          <span class="text-dim small-text">Risk Score:</span>
          <div class="deal-risk-pill">
            <span class="badge ${risk.class}">${risk.text}</span>
            <strong style="color: ${risk.color}">${deal.riskScore}/100</strong>
          </div>
        </div>

        <div class="deal-card-actions">
          ${
            deal.status === "Accepted" 
            ? `<button class="btn btn-outline btn-sm" disabled>✓ Funding Secured</button>`
            : `<button class="btn btn-primary btn-sm" onclick="openOfferComparison('${deal.id}')" ${offerCount === 0 ? 'disabled' : ''}>
                ${offerCount > 0 ? `Compare Offers (${offerCount})` : 'Awaiting Underwriting'}
               </button>`
          }
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 8. RENDER FACTOR DEALS QUEUE
function renderFactorDealsQueue() {
  const queue = document.getElementById("factor-deals-queue");
  if (!queue) return;

  if (deals.length === 0) {
    queue.innerHTML = `<p class="text-dim small-text text-center" style="padding: 2rem 0;">No active deals in pipeline.</p>`;
    return;
  }

  queue.innerHTML = "";
  deals.forEach(deal => {
    const item = document.createElement("div");
    item.className = "factor-deal-item";
    item.dataset.id = deal.id;
    
    let sub = `${deal.exporter} ➔ ${deal.importer}`;
    let statusPill = "";
    if (deal.status === "Accepted") {
      statusPill = `<span class="badge badge-success" style="font-size:0.55rem; padding: 0.1rem 0.35rem;">Accepted</span>`;
    }

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4>${deal.id}</h4>
        ${statusPill}
      </div>
      <p class="small-text text-dim" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub}</p>
      <div class="factor-deal-meta" style="margin-top: 0.35rem;">
        <strong>$${deal.invoiceAmount.toLocaleString()}</strong>
        <span>Risk: ${deal.riskScore}/100</span>
      </div>
    `;

    item.addEventListener("click", () => {
      document.querySelectorAll(".factor-deal-item").forEach(d => d.classList.remove("active"));
      item.classList.add("active");
      loadDealIntoEvaluator(deal.id);
    });

    queue.appendChild(item);
  });
}

// 9. UNDERWRITE DEAL (Factor Dashboard detail view)
function loadDealIntoEvaluator(dealId) {
  const deal = deals.find(d => d.id === dealId);
  const panel = document.getElementById("deal-evaluator-panel");
  if (!deal || !panel) return;

  const currentFactor = document.getElementById("active-factor-select").value;
  const factorNamesMap = {
    apex: "Apex Trade Credit",
    horizon: "Horizon Liquidity",
    oasis: "Oasis Capital Partners",
    beacon: "Beacon Finance Corp"
  };
  const currentFactorName = factorNamesMap[currentFactor];
  
  // Check if this factor has already issued an offer on this deal
  const existingOffer = deal.offers.find(o => o.factorId === currentFactor);
  const isAccepted = deal.status === "Accepted";
  
  // Compute typical dynamic suggestions based on risk
  let suggestedAdvance = 85;
  let suggestedFee = 2.5;
  let suggestedApr = 6.0;

  if (deal.riskScore > 65) {
    suggestedAdvance = 75;
    suggestedFee = 4.2;
    suggestedApr = 9.5;
  } else if (deal.riskScore > 35) {
    suggestedAdvance = 82;
    suggestedFee = 3.0;
    suggestedApr = 7.5;
  }

  // Draw Map Route variables
  let mapRouteSvg = getMapRouteSvg(deal.transitRoute, deal.originPort, deal.destPort);

  panel.innerHTML = `
    <div class="evaluator-grid">
      <!-- Left Column: Details -->
      <div class="eval-left">
        <div class="eval-deal-header">
          <div class="eval-title-block">
            <span class="deal-id">${deal.id}</span>
            <h2>${deal.exporter} ➔ ${deal.importer}</h2>
            <div class="eval-meta-block">
              <div class="eval-meta-item">
                <span class="lbl">Exporter Origin</span>
                <span class="val">${deal.exporter} (${deal.exporterCountry})</span>
              </div>
              <div class="eval-meta-item">
                <span class="lbl">Importer Destination</span>
                <span class="val">${deal.importer} (${deal.importerCountry})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Documents Audit Card -->
        <div class="doc-audit-card glass-panel">
          <h3>📂 Submitted Trade Documents</h3>
          <p class="small-text text-dim" style="margin-bottom:0.75rem;">Extract invoice parameters via OCR and cross-reference values automatically.</p>
          <div class="doc-audit-list">
            
            <div class="doc-audit-item">
              <div class="doc-info-block">
                <span class="doc-emoji">📄</span>
                <div>
                  <span class="doc-name">${deal.docs.invoice ? deal.docs.invoice.fileName : 'Commercial Invoice.pdf'}</span>
                  <button type="button" class="doc-ocr-btn" onclick="openOcrViewer('${deal.id}', 'invoice')">View OCR Scan</button>
                </div>
              </div>
              <div class="doc-checklist">
                <span class="badge ${deal.docs.invoice?.checks.amountMatch ? 'badge-success' : 'badge-danger'}">
                  ${deal.docs.invoice?.checks.amountMatch ? 'Amount Match' : 'Mismatch Amount'}
                </span>
                <span class="badge ${deal.docs.invoice?.checks.signed ? 'badge-success' : 'badge-danger'}">
                  ${deal.docs.invoice?.checks.signed ? 'Signed' : 'Unsigned'}
                </span>
              </div>
            </div>

            <div class="doc-audit-item">
              <div class="doc-info-block">
                <span class="doc-emoji">🚢</span>
                <div>
                  <span class="doc-name">${deal.docs.bol ? deal.docs.bol.fileName : 'Bill_of_Lading.pdf'}</span>
                  ${deal.docs.bol ? `<button type="button" class="doc-ocr-btn" onclick="openOcrViewer('${deal.id}', 'bol')">View OCR Scan</button>` : ''}
                </div>
              </div>
              <div class="doc-checklist">
                ${deal.docs.bol ? `
                  <span class="badge ${deal.docs.bol.checks.portsMatch ? 'badge-success' : 'badge-danger'}">
                    ${deal.docs.bol.checks.portsMatch ? 'Port Match' : 'Port Discrepancy'}
                  </span>
                  <span class="badge ${deal.docs.bol.checks.partyMatch ? 'badge-success' : 'badge-danger'}">
                    ${deal.docs.bol.checks.partyMatch ? 'Parties Match' : 'Party Mismatch'}
                  </span>
                ` : `<span class="badge badge-danger">Not Uploaded</span>`}
              </div>
            </div>

          </div>
        </div>

        <!-- SVG Route Map -->
        <div class="route-map-panel glass-panel">
          <h3>🚢 Trade Transit Route Visualizer</h3>
          <p class="small-text text-dim" style="margin-bottom:0.75rem;">Simulated sea lanes with highlighted maritime bottlenecks.</p>
          <div class="route-svg-container">
            ${mapRouteSvg}
          </div>
        </div>

      </div>

      <!-- Right Column: Risk & Offer Submission -->
      <div class="eval-right">
        
        <!-- Risk Dial Card -->
        <div class="risk-assess-card glass-panel">
          <h3>📊 Risk Audit Score</h3>
          <div class="risk-gauge-container">
            <svg class="risk-gauge-svg">
              <circle class="gauge-bg" cx="80" cy="80" r="70"/>
              <circle id="eval-risk-gauge-fill" class="gauge-fill" cx="80" cy="80" r="70"/>
            </svg>
            <div class="gauge-value-display">
              <span class="gauge-score" id="eval-risk-gauge-val">0</span>
              <span class="gauge-label">Score</span>
            </div>
          </div>
          <div class="risk-breakdown-details">
            <div class="risk-category-row">
              <span class="name">Buyer Credit rating (${deal.importerRating})</span>
              <span class="score">${deal.importerRating === 'AAA' || deal.importerRating === 'AA' ? 'Low Risk' : (deal.importerRating === 'A' || deal.importerRating === 'BBB' ? 'Moderate' : 'High Risk')}</span>
            </div>
            <div class="risk-category-row">
              <span class="name">Document Compliance</span>
              <span class="score">${(deal.docs.invoice?.checks.amountMatch && (deal.docs.bol ? deal.docs.bol.checks.portsMatch : false)) ? 'Perfect' : 'Warnings Flagged'}</span>
            </div>
            <div class="risk-category-row">
              <span class="name">Transit Corridor Danger</span>
              <span class="score">${deal.transitRoute === 'suez' ? 'Geopolitical Risk' : 'Standard Ocean Corridor'}</span>
            </div>
          </div>
        </div>

        <!-- World Event Simulation Controls -->
        <div class="events-toggles-card glass-panel">
          <h3>🌍 Live Macro Event Simulator</h3>
          <p class="small-text text-dim">Toggle geopolitical hazards or labor strikes to trigger instant changes in risk scores.</p>
          <div class="events-list">
            <div class="event-toggle-item">
              <span>Suez Canal Conflict Escalation</span>
              <label class="switch">
                <input type="checkbox" id="evt-suez" ${globalEvents.suezCongestion ? 'checked' : ''} onchange="toggleWorldEvent('suezCongestion', '${deal.id}')">
                <span class="slider"></span>
              </label>
            </div>
            <div class="event-toggle-item">
              <span>Panama Canal Draft Shortage</span>
              <label class="switch">
                <input type="checkbox" id="evt-panama" ${globalEvents.panamaDrought ? 'checked' : ''} onchange="toggleWorldEvent('panamaDrought', '${deal.id}')">
                <span class="slider"></span>
              </label>
            </div>
            <div class="event-toggle-item">
              <span>US West Coast Port Labor Strikes</span>
              <label class="switch">
                <input type="checkbox" id="evt-lax" ${globalEvents.laxStrikes ? 'checked' : ''} onchange="toggleWorldEvent('laxStrikes', '${deal.id}')">
                <span class="slider"></span>
              </label>
            </div>
            <div class="event-toggle-item">
              <span>Global Currency FX Shock</span>
              <label class="switch">
                <input type="checkbox" id="evt-fx" ${globalEvents.currencyVolatility ? 'checked' : ''} onchange="toggleWorldEvent('currencyVolatility', '${deal.id}')">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Underwriting Proposal Form -->
        <div class="factor-offer-card glass-panel">
          <h3>Proposal Form: ${currentFactorName}</h3>
          ${
            isAccepted 
            ? `<div class="payout-banner text-success" style="text-align:center; padding:1rem 0; font-weight:600;">✓ Exporter accepted offer. Funds Released.</div>`
            : existingOffer 
              ? `
                <div class="active-offer-details" style="background:rgba(255,255,255,0.03); border-radius:6px; padding:0.75rem; font-size:0.85rem; border:1px solid rgba(255,255,255,0.05);">
                  <p><strong>Offer Submitted Successfully</strong></p>
                  <p>Advance: ${existingOffer.advanceRate}% | Fee: ${existingOffer.feeRate}% | APR: ${existingOffer.apr}%</p>
                  <p style="margin-top:0.25rem;">Type: ${existingOffer.recourse === 'recourse' ? 'Recourse' : 'Non-Recourse'}</p>
                  <button type="button" class="btn btn-outline btn-sm" style="margin-top:0.5rem; width:100%;" onclick="retractOffer('${deal.id}', '${currentFactor}')">Retract Proposal</button>
                </div>
              `
              : `
                <form class="factor-offer-form" id="factor-offer-submission-form">
                  <div class="form-row col-2">
                    <div class="form-group">
                      <label for="off-advance">Advance Rate (%)</label>
                      <input type="number" id="off-advance" min="65" max="95" value="${suggestedAdvance}" required>
                    </div>
                    <div class="form-group">
                      <label for="off-fee">Factoring Fee (%)</label>
                      <input type="number" id="off-fee" min="0.5" max="8.0" step="0.1" value="${suggestedFee}" required>
                    </div>
                  </div>
                  
                  <div class="form-row col-2">
                    <div class="form-group">
                      <label for="off-apr">Reserve Interest (APR %)</label>
                      <input type="number" id="off-apr" min="2.0" max="18.0" step="0.1" value="${suggestedApr}" required>
                    </div>
                    <div class="form-group">
                      <label for="off-valid">Validity (Days)</label>
                      <input type="number" id="off-valid" min="1" max="30" value="14" required>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Recourse Terms</label>
                    <div class="radio-group">
                      <label class="radio-label">
                        <input type="radio" name="off-recourse" value="recourse" checked> Recourse Factoring
                      </label>
                      <label class="radio-label">
                        <input type="radio" name="off-recourse" value="non-recourse"> Non-Recourse (Higher Risk)
                      </label>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary" style="margin-top:0.5rem; width:100%;">Submit Credit Offer</button>
                </form>
              `
          }
        </div>

      </div>
    </div>
  `;

  // Animate the risk dial fill and score
  setTimeout(() => {
    updateRiskDialUi(deal.riskScore);
  }, 100);

  // Form submission handler
  const form = document.getElementById("factor-offer-submission-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      
      const newOffer = {
        id: "OFF-" + Math.floor(100 + Math.random() * 900),
        factorId: currentFactor,
        factorName: currentFactorName,
        advanceRate: parseFloat(document.getElementById("off-advance").value),
        feeRate: parseFloat(document.getElementById("off-fee").value),
        apr: parseFloat(document.getElementById("off-apr").value),
        recourse: form.querySelector('input[name="off-recourse"]:checked').value,
        validDays: parseInt(document.getElementById("off-valid").value),
        remarks: "Proposal generated via Automated Credit scoring rules."
      };

      // Push into deal
      deal.offers.push(newOffer);
      if (deal.status === "Awaiting Offers") {
        deal.status = "Offers Received";
      }

      // Re-render
      loadDealIntoEvaluator(deal.id);
      renderFactorDealsQueue();
      renderFactorSentOffers();
    });
  }
}

// 10. DYNAMIC SVG MAP COORDINATES DRAWING
function getMapRouteSvg(transitRoute, originPort, destPort) {
  // SVG size is 360 x 200
  // Background represents a simplified world map layout
  let originCoord = {x: 50, y: 120};
  let destCoord = {x: 320, y: 80};
  let points = "";
  let warningPointsHtml = "";
  
  if (transitRoute === "suez") {
    // SZX -> Suez -> HAM
    originCoord = {x: 230, y: 125}; // Shenzhen
    destCoord = {x: 80, y: 55};   // Hamburg
    // Curve coordinates going through Singapore (190, 150) -> Bab el Mandeb / Red Sea (140, 100) -> Suez (115, 68) -> Gibraltar (55, 65) -> Hamburg
    points = "M 230,125 Q 190,150 160,115 T 115,68 T 55,65 T 80,55";
    
    // Add warning check for Suez Event
    warningPointsHtml += `
      <g>
        <circle cx="115" cy="68" r="6" fill="${globalEvents.suezCongestion ? 'var(--color-danger)' : 'rgba(255,255,255,0.3)'}" class="${globalEvents.suezCongestion ? 'hazard-pulse' : ''}" />
        <text x="115" y="55" font-size="8" fill="var(--color-text-secondary)" text-anchor="middle">Suez Canal</text>
      </g>
    `;
  } else if (transitRoute === "panama") {
    // Tokyo/Shanghai -> Panama -> Rotterdam/New York
    originCoord = {x: 200, y: 110};
    destCoord = {x: 340, y: 85};
    // Curve coordinates: Tokyo -> Hawaii -> Panama (270, 95) -> US East Coast / Rotterdam
    points = "M 200,110 Q 235,100 270,95 T 340,85";
    
    warningPointsHtml += `
      <g>
        <circle cx="270" cy="95" r="6" fill="${globalEvents.panamaDrought ? 'var(--color-danger)' : 'rgba(255,255,255,0.3)'}" class="${globalEvents.panamaDrought ? 'hazard-pulse' : ''}" />
        <text x="270" y="85" font-size="8" fill="var(--color-text-secondary)" text-anchor="middle">Panama Canal</text>
      </g>
    `;
  } else if (transitRoute === "transpacific") {
    // SGN / Shanghai -> Los Angeles (300, 70)
    originCoord = {x: 220, y: 130};
    destCoord = {x: 320, y: 75};
    points = "M 220,130 Q 270,95 320,75";
    
    warningPointsHtml += `
      <g>
        <circle cx="320" cy="75" r="6" fill="${globalEvents.laxStrikes ? 'var(--color-danger)' : 'rgba(255,255,255,0.3)'}" class="${globalEvents.laxStrikes ? 'hazard-pulse' : ''}" />
        <text x="320" y="65" font-size="8" fill="var(--color-text-secondary)" text-anchor="middle">LAX Port</text>
      </g>
    `;
  } else if (transitRoute === "cape") {
    // SZX -> Cape of Good Hope -> Hamburg
    originCoord = {x: 230, y: 125};
    destCoord = {x: 80, y: 55};
    // Curve going south around Africa (100, 190) -> North to Hamburg
    points = "M 230,125 Q 170,165 100,185 T 40,115 T 80,55";
  } else {
    // Default straight/curved line
    points = `M ${originCoord.x},${originCoord.y} Q 180,100 ${destCoord.x},${destCoord.y}`;
  }

  return `
    <svg viewBox="0 0 360 200" class="route-svg-map">
      <!-- Background world outlines representation -->
      <path d="M10,80 Q35,80 50,55 T90,50 T130,70 T170,80 T220,70 T260,85 T300,75 T350,90" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="20" />
      <path d="M10,120 Q50,115 100,180 T150,140 T210,160 T280,130" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="15" />
      
      <!-- Route line -->
      <path d="${points}" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-dasharray="4" stroke-opacity="0.7">
        <animate attributeName="stroke-dashoffset" values="32;0" dur="2s" repeatCount="indefinite" />
      </path>
      
      <!-- Origin Node -->
      <g>
        <circle cx="${originCoord.x}" cy="${originCoord.y}" r="4" fill="var(--color-success)" />
        <circle cx="${originCoord.x}" cy="${originCoord.y}" r="8" fill="none" stroke="var(--color-success)" stroke-width="1" stroke-opacity="0.5">
          <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="${originCoord.x}" y="${originCoord.y + 12}" font-size="7" fill="var(--color-text-secondary)" text-anchor="middle">${originPort.split(' ')[0]}</text>
      </g>
      
      <!-- Destination Node -->
      <g>
        <circle cx="${destCoord.x}" cy="${destCoord.y}" r="4" fill="var(--color-primary)" />
        <circle cx="${destCoord.x}" cy="${destCoord.y}" r="8" fill="none" stroke="var(--color-primary)" stroke-width="1" stroke-opacity="0.5">
          <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="${destCoord.x}" y="${destCoord.y + 12}" font-size="7" fill="var(--color-text-secondary)" text-anchor="middle">${destPort.split(' ')[0]}</text>
      </g>
      
      <!-- Hazard overlays -->
      ${warningPointsHtml}
    </svg>
  `;
}

// 11. RISK DIAL UPDATE HELPER
function updateRiskDialUi(score) {
  const fill = document.getElementById("eval-risk-gauge-fill");
  const valDisp = document.getElementById("eval-risk-gauge-val");
  if (!fill || !valDisp) return;
  
  valDisp.textContent = score;
  
  // Calculate dash offset: circumference is 439.6 (2 * PI * 70)
  const circumference = 439.6;
  const offset = circumference - (score / 100) * circumference;
  fill.style.strokeDashoffset = offset;
  
  // Set color according to tier
  let color = "var(--color-success)";
  if (score > 65) color = "var(--color-danger)";
  else if (score > 35) color = "var(--color-warning)";
  
  fill.style.stroke = color;
}

// 12. WORLD EVENT INTERACTION SIMULATION
function toggleWorldEvent(eventKey, activeDealId) {
  globalEvents[eventKey] = !globalEvents[eventKey];
  
  // Recalculate risk scores on all deals in-memory
  deals.forEach(deal => {
    deal.riskScore = calculateRiskScore(deal);
  });
  
  // Reload evaluator details to reflect new risk core calculations
  loadDealIntoEvaluator(activeDealId);
  renderFactorDealsQueue();
  renderPartnerDeals();
}

// Retract Factor proposal
function retractOffer(dealId, factorId) {
  const deal = deals.find(d => d.id === dealId);
  if (!deal) return;
  
  deal.offers = deal.offers.filter(o => o.factorId !== factorId);
  if (deal.offers.length === 0) {
    deal.status = "Awaiting Offers";
  }
  
  loadDealIntoEvaluator(dealId);
  renderFactorDealsQueue();
  renderFactorSentOffers();
}

// 13. RENDER SENT OFFERS TABLE
function renderFactorSentOffers() {
  const tableBody = document.getElementById("factor-sent-offers-table");
  if (!tableBody) return;

  const currentFactor = document.getElementById("active-factor-select").value;
  
  // Find all offers sent by this factor
  let sentOffers = [];
  deals.forEach(deal => {
    const offer = deal.offers.find(o => o.factorId === currentFactor);
    if (offer) {
      sentOffers.push({
        dealId: deal.id,
        exporter: deal.exporter,
        importer: deal.importer,
        importerRating: deal.importerRating,
        invoiceAmount: deal.invoiceAmount,
        advanceRate: offer.advanceRate,
        feeRate: offer.feeRate,
        recourse: offer.recourse,
        dealStatus: deal.status
      });
    }
  });

  if (sentOffers.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-dim">No offers sent yet by your selected factoring entity.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  sentOffers.forEach(o => {
    let statusClass = "badge-info";
    if (o.dealStatus === "Accepted") statusClass = "badge-success";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${o.dealId}</strong></td>
      <td>${o.exporter}</td>
      <td>${o.importer} <span class="badge badge-info" style="font-size:0.6rem; padding: 0.1rem 0.35rem;">${o.importerRating}</span></td>
      <td>$${o.invoiceAmount.toLocaleString()}</td>
      <td>${o.advanceRate}%</td>
      <td>${o.feeRate}%</td>
      <td><span style="text-transform: capitalize;">${o.recourse}</span></td>
      <td><span class="badge ${statusClass}">${o.dealStatus === 'Accepted' ? 'Accepted' : 'Pending Review'}</span></td>
    `;
    tableBody.appendChild(tr);
  });
}

// 14. TRADING PARTNER - OFFER COMPARISON & CALCULATOR
let calcState = {
  invoiceValue: 0,
  advanceRate: 85,
  feeRate: 2.5,
  apr: 6.5,
  termDays: 60
};

function openOfferComparison(dealId) {
  const deal = deals.find(d => d.id === dealId);
  const dialog = document.getElementById("offer-comparison-dialog");
  if (!deal || !dialog) return;

  document.getElementById("dialog-deal-title").textContent = `Factoring Proposals for Deal ${deal.id}`;
  document.getElementById("calc-invoice-val").textContent = `$${deal.invoiceAmount.toLocaleString()}`;
  document.getElementById("calc-buyer-rating").textContent = deal.importerRating;
  
  const risk = getRiskTier(deal.riskScore);
  const riskLabel = document.getElementById("calc-deal-risk");
  riskLabel.textContent = `${deal.riskScore}/100`;
  riskLabel.style.color = risk.color;

  calcState.invoiceValue = deal.invoiceAmount;
  calcState.termDays = parseInt(deal.paymentTerms) || 60;

  // Render offer selection cards
  const list = document.getElementById("dialog-offers-list");
  list.innerHTML = "";
  
  deal.offers.forEach((off, idx) => {
    const isSelected = idx === 0; // Select first by default
    if (isSelected) {
      calcState.advanceRate = off.advanceRate;
      calcState.feeRate = off.feeRate;
      calcState.apr = off.apr;
    }

    const card = document.createElement("div");
    card.className = `offer-select-card ${isSelected ? 'selected' : ''}`;
    card.dataset.factorId = off.factorId;
    card.dataset.advance = off.advanceRate;
    card.dataset.fee = off.feeRate;
    card.dataset.apr = off.apr;
    
    card.innerHTML = `
      <div class="factor-name">${off.factorName}</div>
      <div class="offer-details-row">
        <span>Advance: <strong>${off.advanceRate}%</strong></span>
        <span>Fee: <strong>${off.feeRate}%</strong></span>
        <span>APR: <strong>${off.apr}%</strong></span>
      </div>
      <span class="offer-badge badge-info">${off.recourse === 'recourse' ? 'Recourse' : 'Non-Recourse'}</span>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".offer-select-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      // Load into sliders
      updateSliderValues(off.advanceRate, off.feeRate, off.apr);
      updateCalculator();
    });

    list.appendChild(card);
  });

  // Init slider positions & values
  updateSliderValues(calcState.advanceRate, calcState.feeRate, calcState.apr);
  updateCalculator();

  // Handle Accept Button addition in footer
  const footer = dialog.querySelector(".dialog-footer");
  // Clear any existing accept button
  const oldAccept = footer.querySelector(".btn-accept-deal");
  if (oldAccept) oldAccept.remove();

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "btn btn-primary btn-accept-deal";
  acceptBtn.textContent = "Accept Selected Proposal";
  acceptBtn.type = "button";
  acceptBtn.addEventListener("click", () => {
    const selectedFactorId = dialog.querySelector(".offer-select-card.selected")?.dataset.factorId;
    if (!selectedFactorId) return;

    // Change status of the deal to Accepted
    deal.status = "Accepted";
    
    // Purge other offers, lock the selected one
    deal.offers = deal.offers.filter(o => o.factorId === selectedFactorId);

    dialog.close();
    renderPartnerDeals();
  });
  footer.appendChild(acceptBtn);

  dialog.showModal();
}

function updateSliderValues(advance, fee, apr) {
  document.getElementById("calc-slider-advance").value = advance;
  document.getElementById("val-slider-advance").textContent = advance;
  
  document.getElementById("calc-slider-fee").value = fee;
  document.getElementById("val-slider-fee").textContent = fee;
  
  document.getElementById("calc-slider-apr").value = apr;
  document.getElementById("val-slider-apr").textContent = apr.toFixed(2);
  
  calcState.advanceRate = advance;
  calcState.feeRate = fee;
  calcState.apr = apr;
}

function setupCalculators() {
  const sliderAdv = document.getElementById("calc-slider-advance");
  const sliderFee = document.getElementById("calc-slider-fee");
  const sliderApr = document.getElementById("calc-slider-apr");

  sliderAdv.addEventListener("input", () => {
    calcState.advanceRate = parseFloat(sliderAdv.value);
    document.getElementById("val-slider-advance").textContent = sliderAdv.value;
    updateCalculator();
  });

  sliderFee.addEventListener("input", () => {
    calcState.feeRate = parseFloat(sliderFee.value);
    document.getElementById("val-slider-fee").textContent = sliderFee.value;
    updateCalculator();
  });

  sliderApr.addEventListener("input", () => {
    calcState.apr = parseFloat(sliderApr.value);
    document.getElementById("val-slider-apr").textContent = parseFloat(sliderApr.value).toFixed(2);
    updateCalculator();
  });
}

function updateCalculator() {
  const invTotal = calcState.invoiceValue;
  const advanceRate = calcState.advanceRate / 100;
  const feeRate = calcState.feeRate / 100;
  const aprRate = calcState.apr / 100;
  const days = calcState.termDays;

  // Math variables
  const advanceAmt = invTotal * advanceRate;
  const reserveAmt = invTotal - advanceAmt;
  const factoringFee = invTotal * feeRate;
  // Interest is typically calculated on the advanced amount outstanding over the net days
  const interestFee = advanceAmt * aprRate * (days / 365);
  const netRebate = reserveAmt - factoringFee - interestFee;

  document.getElementById("res-invoice-total").textContent = `$${invTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("res-advance-amount").textContent = `$${advanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("res-reserve-amount").textContent = `$${reserveAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("res-fee-amount").textContent = `$${factoringFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById("res-interest-amount").textContent = `$${interestFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  const rebateEl = document.getElementById("res-rebate-amount");
  rebateEl.textContent = `$${netRebate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  if (netRebate < 0) {
    rebateEl.className = "value text-danger";
  } else {
    rebateEl.className = "value text-primary";
  }
}

// 15. OCR SCAN TERMINAL MODAL VIEWER
function openOcrViewer(dealId, docType) {
  const deal = deals.find(d => d.id === dealId);
  const dialog = document.getElementById("ocr-viewer-dialog");
  const term = document.getElementById("ocr-terminal-content");
  if (!deal || !dialog || !term) return;

  const doc = deal.docs[docType];
  if (doc) {
    term.textContent = doc.scannedText;
  } else {
    term.textContent = "FILE ERROR: No data stream recovered from document image.";
  }

  dialog.showModal();
}

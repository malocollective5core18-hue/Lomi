// Lomi-Store - Vanilla JS Implementation

// ============ STORE (localStorage) ============
const PRODUCTS_KEY = "lomi_products";
const USERS_KEY = "lomi_users";
const SESSION_KEY = "lomi_session";
const SETTINGS_KEY = "lomi_settings";

const defaultProducts = [
  {
    id: crypto.randomUUID(),
    title: "Airflow Sneakers",
    category: "Shoes",
    oldPrice: 129.99,
    price: 89.99,
    desc: "Breathable mesh, ultimate comfort.",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format",
    available: true,
  },
  {
    id: crypto.randomUUID(),
    title: "Urban Hoodie",
    category: "Clothing",
    oldPrice: 79.99,
    price: 59.99,
    desc: "Cotton blend, modern streetwear.",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format",
    available: true,
  },
  {
    id: crypto.randomUUID(),
    title: "Wireless Earbuds",
    category: "Electronics",
    oldPrice: 149.99,
    price: 99.99,
    desc: "Noise cancellation, 24h battery life.",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format",
    available: false,
  },
  {
    id: crypto.randomUUID(),
    title: "Minimal Watch",
    category: "Accessories",
    oldPrice: 199.99,
    price: 149.99,
    desc: "Elegant design, smart features.",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format",
    available: true,
  },
];

function loadProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveProducts(defaultProducts);
  return defaultProducts;
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.find((u) => u.role === "admin")) {
      list.push({ email: "admin@lomi.store", password: "admin123", role: "admin" });
      saveUsers(list);
    }
    return list;
  } catch {
    const seed = [{ email: "admin@lomi.store", password: "admin123", role: "admin" }];
    saveUsers(seed);
    return seed;
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(SESSION_KEY);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      defaultLocationLink: parsed.defaultLocationLink || "",
    };
  } catch {
    return { defaultLocationLink: "" };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ============ STATE ============
let state = {
  user: null,
  products: [],
  search: "",
  category: "all",
  view: "home",
  editing: null,
  selectedProduct: null,
  settings: {
    defaultLocationLink: "",
  },
  sidebarOpen: false,
  authOpen: false,
  authMode: "login",
};

// ============ TOAST ============
function toast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============ CAROUSEL DATA ============
const carouselSlides = [
  {
    title: "Limited Edition",
    desc: "Trending kicks up to 30% off this week.",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format",
    badge: "Hot",
  },
  {
    title: "Smart Watch X",
    desc: "Best seller with real-time health tracking.",
    img: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format",
    badge: "Trending",
  },
  {
    title: "Minimal Backpack",
    desc: "Eco-friendly materials, fully waterproof.",
    img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format",
    badge: "Popular",
  },
];

let carouselIndex = 0;
let carouselInterval = null;

// ============ HELPERS ============
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function formatPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0.00Tzsh/=";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}Tzsh/=`;
}

function formatPhoneLink(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

function buildDirectionsUrl(sharedLink) {
  const raw = String(sharedLink || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const params = url.searchParams;
    let destination = params.get("destination") || params.get("query") || params.get("q");

    if (!destination) {
      const atMatch = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      const markerMatch = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      const placeMatch = url.pathname.match(/\/place\/([^/]+)/);

      if (atMatch) destination = `${atMatch[1]},${atMatch[2]}`;
      else if (markerMatch) destination = `${markerMatch[1]},${markerMatch[2]}`;
      else if (placeMatch) destination = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    }

    if (!destination) return raw;

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  } catch {
    return raw;
  }
}

// ============ RENDER ============
function render() {
  renderHeader();
  renderSidebar();
  renderAuthModal();
  renderProductModal();
  renderMain();
  renderFooter();
}

function renderHeader() {
  const app = $("#app");
  let header = $("header");
  if (!header) {
    header = document.createElement("header");
    header.className = "sticky";
    header.innerHTML = `
      <div class="header-logo" onclick="setView('home')">
        <span>🛍</span>
        <span class="text-brand">Lomi-Store</span>
      </div>
      <button class="menu-btn" onclick="toggleSidebar(true)">
        <span></span>
        <span></span>
        <span></span>
      </button>
    `;
    app.appendChild(header);
  }
}

function renderSidebar() {
  const existing = $(".sidebar-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "sidebar-overlay";
  overlay.className = `sidebar-overlay${state.sidebarOpen ? " open" : ""}`;
  overlay.onclick = () => toggleSidebar(false);

  const isAdmin = state.user?.role === "admin";
  
  overlay.innerHTML = `
    <aside class="sidebar${state.sidebarOpen ? " open" : ""}">
      <div class="sidebar-header">
        <h3 class="sidebar-title"><i class="fas fa-chalkboard-user"></i> Menu</h3>
        <button class="sidebar-close" onclick="toggleSidebar(false)"><i class="fas fa-times"></i></button>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item" onclick="setView('home'); toggleSidebar(false)">
          <i class="fas fa-home"></i> Home
        </button>
        <button class="nav-item" onclick="goToSearch()">
          <i class="fas fa-search"></i> Search
        </button>
        ${isAdmin ? `
          <button class="nav-item" onclick="setView('dashboard'); toggleSidebar(false)">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </button>
          <button class="nav-item" onclick="setView('categories'); toggleSidebar(false)">
            <i class="fas fa-boxes"></i> Categories
          </button>
        ` : ""}
        <button class="nav-item" onclick="goToTrending()">
          <i class="fas fa-chart-line"></i> Trends
        </button>
      </nav>
      <div class="sidebar-footer">
        ${state.user ? `
          <div class="user-info">
            <i class="fas fa-user-circle"></i>
            <strong class="user-email">${state.user.email}</strong>
            <span class="user-role">${state.user.role === "admin" ? "👑 Admin" : "👤 Customer"}</span>
          </div>
          <button class="logout-btn" onclick="handleLogout()">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        ` : `
          <button class="login-btn" onclick="openAuth()">
            <i class="fas fa-key"></i> Login / Sign Up
          </button>
        `}
        <div class="sidebar-footer-text">
          <i class="fas fa-shield-alt"></i> v2.0 · secure
        </div>
      </div>
    </aside>
  `;

  document.body.appendChild(overlay);
}

function renderAuthModal() {
  const existing = $(".auth-overlay");
  if (existing) existing.remove();

  if (!state.authOpen) return;

  const overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.onclick = (e) => {
    if (e.target === overlay) closeAuth();
  };

  overlay.innerHTML = `
    <div class="auth-modal">
      <button class="auth-close" onclick="closeAuth()">×</button>
      <h3 class="auth-title">${state.authMode === "login" ? "Login" : "Sign Up"}</h3>
      <input type="text" id="auth-email" class="input-field auth-input" placeholder="Email / Username">
      <input type="password" id="auth-password" class="input-field auth-input" placeholder="Password">
      <button class="auth-submit" onclick="handleAuthSubmit()">
        ${state.authMode === "login" ? "Login" : "Create Account"}
      </button>
      <button class="auth-switch" onclick="toggleAuthMode()">
        ${state.authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function renderProductModal() {
  const existing = $(".product-modal-overlay");
  if (existing) existing.remove();

  if (!state.selectedProduct) return;

  const prod = state.selectedProduct;
  const discount = prod.oldPrice && prod.oldPrice > prod.price
    ? Math.round(((prod.oldPrice - prod.price) / prod.oldPrice) * 100)
    : null;
  const phoneLink = formatPhoneLink(prod.phone || "+255742000000");
  const locationLink = buildDirectionsUrl(prod.locationLink || state.settings.defaultLocationLink);

  const overlay = document.createElement("div");
  overlay.className = "product-modal-overlay";
  overlay.onclick = (e) => {
    if (e.target === overlay) closeProductModal();
  };

  overlay.innerHTML = `
    <div class="product-modal">
      <button class="product-modal-close" onclick="closeProductModal()">
        <i class="fas fa-times"></i>
      </button>
      <div class="product-modal-body">
        <img src="${prod.image}" alt="${prod.title}" class="product-modal-image"
          onerror="this.src='https://via.placeholder.com/900x900?text=Image'">
        <div class="product-modal-content">
          <div class="product-modal-category"><i class="fas fa-tag"></i> ${prod.category}</div>
          <h3 class="product-modal-title">${prod.title}</h3>
          <p class="product-modal-desc">${prod.desc}</p>
          <div class="product-modal-prices">
            ${prod.oldPrice ? `<span class="old-price">${formatPrice(prod.oldPrice)}</span>` : ""}
            <span class="current-price">${formatPrice(prod.price)}</span>
            ${discount ? `<span class="discount-badge">-${discount}%</span>` : ""}
          </div>
          <div class="product-modal-actions">
            <a class="product-icon-btn call-btn" href="${phoneLink}">
              <i class="fas fa-phone-alt"></i>
              <span>Call</span>
            </a>
            ${locationLink ? `
            <a class="product-icon-btn location-btn" href="${locationLink}" target="_blank" rel="noopener noreferrer">
              <i class="fas fa-location-dot"></i>
              <span>Location</span>
            </a>
            ` : `
            <button class="product-icon-btn location-btn disabled" type="button" title="Location unavailable" disabled>
              <i class="fas fa-location-dot"></i>
              <span>Location</span>
            </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function renderMain() {
  let main = $("main");
  if (!main) {
    main = document.createElement("main");
    $("#app").appendChild(main);
  }

  let content = "";

  if (state.view === "home") {
    content += renderCarousel();
    content += renderSearch();
    content += renderProducts();
  } else if (state.view === "dashboard") {
    content += renderDashboard();
  } else if (state.view === "categories") {
    content += renderCategories();
  }

  main.innerHTML = content;

  // Re-render carousel after DOM update
  if (state.view === "home") {
    initCarousel();
  }
}

function refreshProductsSection() {
  const section = $(".products-section");
  if (!section || state.view !== "home") {
    renderMain();
    return;
  }

  section.outerHTML = renderProducts();
}

function renderCarousel() {
  const slidesHtml = carouselSlides.map((s, i) => `
    <div class="carousel-slide">
      <div class="carousel-content">
        <h2 class="carousel-title">${s.title}</h2>
        <p class="carousel-desc">${s.desc}</p>
        <span class="carousel-badge"><i class="fas fa-chart-line"></i> ${s.badge}</span>
      </div>
      <div class="carousel-image-wrapper">
        <img src="${s.img}" alt="${s.title}" class="carousel-image" loading="lazy">
      </div>
    </div>
  `).join("");

  const dotsHtml = carouselSlides.map((_, i) => `
    <button class="carousel-dot${i === 0 ? " active" : ""}" onclick="goToSlide(${i})"></button>
  `).join("");

  return `
    <section class="carousel-section">
      <div class="carousel-track" style="transform: translateX(0)">
        ${slidesHtml}
      </div>
      <div class="carousel-dots">
        ${dotsHtml}
      </div>
    </section>
  `;
}

function renderSearch() {
  const categories = [...new Set(state.products.map(p => p.category || "Uncategorized"))];
  
  return `
    <section class="search-section">
      <div class="search-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="input-field pl-11" placeholder="Search products..." 
          value="${state.search}" oninput="handleSearch(this.value)">
      </div>
      <select class="category-select" onchange="handleCategoryChange(this.value)">
        <option value="all" ${state.category === "all" ? "selected" : ""}>All Categories</option>
        ${categories.map(c => `<option value="${c}" ${state.category === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
    </section>
  `;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const isAdmin = state.user?.role === "admin";

  const productsHtml = filtered.length === 0 
    ? `<div class="empty-state"><i class="fas fa-box-open"></i>No products found.</div>`
    : filtered.map(prod => {
        const discount = prod.oldPrice && prod.oldPrice > prod.price
          ? Math.round(((prod.oldPrice - prod.price) / prod.oldPrice) * 100)
          : null;
        
        return `
          <article class="product-card" onclick="openProductModal('${prod.id}')">
            <img src="${prod.image}" alt="${prod.title}" class="product-img" 
              onerror="this.src='https://via.placeholder.com/600x450?text=Image'" loading="lazy">
            <div class="product-content">
              <div class="product-category"><i class="fas fa-tag"></i> ${prod.category}</div>
              <h3 class="product-title">${prod.title}</h3>
              <p class="product-desc">${prod.desc}</p>
              <div class="product-prices">
                ${prod.oldPrice ? `<span class="old-price">${formatPrice(prod.oldPrice)}</span>` : ""}
                <span class="current-price">${formatPrice(prod.price)}</span>
                ${discount ? `<span class="discount-badge">-${discount}%</span>` : ""}
              </div>
              <div class="product-actions">
                <button class="availability-btn ${prod.available ? "available" : "unavailable"}" 
                  onclick="event.stopPropagation(); handleToggleAvailable('${prod.id}')" ${!isAdmin ? "disabled style='opacity:0.5'" : ""}>
                  ${prod.available ? "✓ Available" : "✗ Unavailable"}
                </button>
                ${isAdmin ? `
                  <div class="admin-actions">
                    <button class="edit-btn" onclick="event.stopPropagation(); handleEdit('${prod.id}')">
                      <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); handleDelete('${prod.id}')">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ` : ""}
              </div>
            </div>
          </article>
        `;
      }).join("");

  return `
    <section class="products-section">
      <h2 class="section-title">
        <i class="fas fa-fire text-accent"></i>
        <span>Latest Drops</span>
        <span class="section-count">${filtered.length} item${filtered.length !== 1 ? "s" : ""}</span>
      </h2>
      <div class="products-grid">
        ${productsHtml}
      </div>
    </section>
  `;
}

function renderDashboard() {
  if (state.user?.role !== "admin") {
    state.view = "home";
    renderMain();
    return "";
  }

  const categories = [...new Set(state.products.map(p => p.category || "Uncategorized"))];
  const form = state.editing || { title: "", category: "", oldPrice: "", price: "", desc: "", image: "", phone: "", locationLink: "" };
  const defaultLocationLink = state.settings.defaultLocationLink || "";

  return `
    <section class="dashboard-section">
      <header class="dashboard-header">
        <h2 class="dashboard-title"><i class="fas fa-pen-ruler mr-2 text-accent"></i> Content Manager</h2>
        <span class="dashboard-badge">✨ admin only</span>
      </header>
      <form class="dashboard-form" onsubmit="handleProductSubmit(event)">
        <div class="form-field">
          <label class="form-label">Product Title</label>
          <input type="text" class="input-field" name="title" value="${form.title}" placeholder="e.g., Urban sneakers" required>
        </div>
        <div class="form-field">
          <label class="form-label">Category</label>
          <input type="text" class="input-field" name="category" value="${form.category}" placeholder="e.g., Shoes, Electronics" list="categorySuggestions">
          <datalist id="categorySuggestions">
            ${categories.map(c => `<option value="${c}">`).join("")}
          </datalist>
        </div>
        <div class="form-field">
          <label class="form-label">Original Price</label>
          <input type="number" class="input-field" name="oldPrice" value="${form.oldPrice || ""}" placeholder="Original price" step="0.01">
        </div>
        <div class="form-field">
          <label class="form-label">Selling Price</label>
          <input type="number" class="input-field" name="price" value="${form.price || ""}" placeholder="Current price" step="0.01" required>
        </div>
        <div class="form-field">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="input-field" name="phone" value="${form.phone || ""}" placeholder="e.g., +255712345678" required>
        </div>
        <div class="form-field">
          <label class="form-label">Google Maps Link</label>
          <input type="url" class="input-field" name="locationLink" value="${form.locationLink || ""}" placeholder="Optional product-specific Google Maps link">
        </div>
        <div class="form-field full-width">
          <label class="form-label">Default Shop Map Link</label>
          <input type="url" class="input-field" name="defaultLocationLink" value="${defaultLocationLink}" placeholder="Used by all products unless a product has its own map link">
        </div>
        <div class="form-field full-width">
          <label class="form-label">Description</label>
          <textarea class="input-field form-textarea" name="desc" rows="2" placeholder="Short description...">${form.desc}</textarea>
        </div>
        <div class="form-field full-width">
          <label class="form-label">Product Image</label>
          <label class="form-file">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Click to upload</span>
            <input type="file" accept="image/*" onchange="handleFileUpload(event)">
            ${form.image ? `<img src="${form.image}" alt="Preview" class="preview-image">` : ""}
          </label>
        </div>
        <div class="form-buttons">
          <button type="submit" class="submit-btn">
            <i class="fas ${state.editing ? "fa-save" : "fa-plus-circle"}"></i>
            ${state.editing ? "Update Product" : "Add Product"}
          </button>
          ${state.editing ? `<button type="button" class="cancel-btn" onclick="cancelEdit()">Cancel Edit</button>` : ""}
        </div>
      </form>
    </section>
  `;
}

function renderCategories() {
  if (state.user?.role !== "admin") {
    state.view = "home";
    renderMain();
    return "";
  }

  const categories = [...new Set(state.products.map(p => p.category || "Uncategorized"))];

  const categoriesHtml = categories.length === 0
    ? `<div class="empty-state"><i class="fas fa-box-open"></i>No categories yet</div>`
    : categories.map(cat => {
        const count = state.products.filter(p => (p.category || "Uncategorized") === cat).length;
        return `
          <button class="category-card" onclick="selectCategory('${cat}')">
            <div class="category-icon">📦</div>
            <div class="category-name">${cat}</div>
            <div class="category-count">${count} item${count !== 1 ? "s" : ""}</div>
          </button>
        `;
      }).join("");

  return `
    <section class="categories-section">
      <header class="categories-header">
        <h2 class="categories-title"><i class="fas fa-boxes mr-2 text-accent"></i> Categories</h2>
        <button class="back-btn" onclick="setView('dashboard')">
          <i class="fas fa-arrow-left"></i> Back
        </button>
      </header>
      <div class="categories-grid">
        ${categoriesHtml}
      </div>
    </section>
  `;
}

function renderFooter() {
  let footer = $("footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.innerHTML = `<i class="fas fa-globe"></i> Lomi-Store — premium responsive experience`;
    $("#app").appendChild(footer);
  }
}

// ============ ACTIONS ============
function getFilteredProducts() {
  const term = state.search.toLowerCase();
  return state.products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(term);
    const matchesCat = state.category === "all" || (p.category || "Uncategorized") === state.category;
    return matchesSearch && matchesCat;
  });
}

function setView(view) {
  state.view = view;
  renderMain();
}

function goToSearch() {
  state.view = "home";
  toggleSidebar(false);
  renderMain();

  requestAnimationFrame(() => {
    const searchSection = $(".search-section");
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function goToTrending() {
  state.view = "home";
  toggleSidebar(false);
  renderMain();

  requestAnimationFrame(() => {
    const carouselSection = $(".carousel-section");
    if (carouselSection) {
      carouselSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function toggleSidebar(open) {
  state.sidebarOpen = open;
  renderSidebar();
}

function openAuth() {
  state.authOpen = true;
  state.authMode = "login";
  toggleSidebar(false);
  renderAuthModal();
}

function closeAuth() {
  state.authOpen = false;
  renderAuthModal();
}

function toggleAuthMode() {
  state.authMode = state.authMode === "login" ? "signup" : "login";
  renderAuthModal();
}

function handleAuthSubmit() {
  const email = $("#auth-email")?.value?.trim();
  const password = $("#auth-password")?.value?.trim();

  if (!email || !password) {
    toast("Please enter credentials", "error");
    return;
  }

  const users = loadUsers();

  if (state.authMode === "login") {
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) {
      toast("Invalid. Try admin@lomi.store / admin123", "error");
      return;
    }
    state.user = { email: found.email, role: found.role };
    saveSession(state.user);
    toast(`Welcome, ${found.email}`, "success");
    if (found.role === "admin") state.view = "dashboard";
    closeAuth();
    render();
  } else {
    if (users.find(u => u.email === email)) {
      toast("User already exists", "error");
      return;
    }
    users.push({ email, password, role: "user" });
    saveUsers(users);
    toast("Account created — please login", "success");
    toggleAuthMode();
  }
}

function handleLogout() {
  state.user = null;
  saveSession(null);
  state.view = "home";
  state.editing = null;
  toggleSidebar(false);
  toast("Logged out", "success");
  render();
}

function handleSearch(value) {
  state.search = value;
  refreshProductsSection();
}

function handleCategoryChange(value) {
  state.category = value;
  refreshProductsSection();
}

function handleToggleAvailable(id) {
  if (state.user?.role !== "admin") {
    toast("Admin access required", "error");
    return;
  }
  state.products = state.products.map(p => 
    p.id === id ? { ...p, available: !p.available } : p
  );
  saveProducts(state.products);
  renderMain();
}

function handleDelete(id) {
  if (state.user?.role !== "admin") {
    toast("Admin access required", "error");
    return;
  }
  if (!confirm("Delete this product?")) return;
  state.products = state.products.filter(p => p.id !== id);
  saveProducts(state.products);
  toast("Product deleted", "success");
  renderMain();
}

function handleEdit(id) {
  if (state.user?.role !== "admin") {
    toast("Admin access required", "error");
    return;
  }
  const product = state.products.find(p => p.id === id);
  if (product) {
    state.editing = { ...product };
    state.view = "dashboard";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openProductModal(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  state.selectedProduct = { ...product };
  renderProductModal();
}

function closeProductModal() {
  state.selectedProduct = null;
  renderProductModal();
}

let pendingImage = "";

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingImage = ev.target?.result;
    // Update the form display
    const preview = $(".preview-image");
    if (preview) {
      preview.src = pendingImage;
    } else {
      const fileInput = event.target;
      const label = fileInput.parentElement;
      const img = document.createElement("img");
      img.src = pendingImage;
      img.alt = "Preview";
      img.className = "preview-image";
      label.appendChild(img);
    }
  };
  reader.readAsDataURL(file);
}

function handleProductSubmit(event) {
  event.preventDefault();
  
  if (state.user?.role !== "admin") {
    toast("Admin access required", "error");
    return;
  }

  const formData = new FormData(event.target);
  const title = formData.get("title")?.toString().trim();
  const price = formData.get("price")?.toString();
  const phone = formData.get("phone")?.toString().trim();
  const defaultLocationLink = formData.get("defaultLocationLink")?.toString().trim() || "";

  if (!title || !price || !phone) {
    toast("Title, price and phone number are required", "error");
    return;
  }

  const image = pendingImage || state.editing?.image;
  if (!image) {
    toast("Please upload an image", "error");
    return;
  }

  const productData = {
    title,
    category: formData.get("category")?.toString().trim() || "Uncategorized",
    oldPrice: formData.get("oldPrice") ? parseFloat(formData.get("oldPrice")) : null,
    price: parseFloat(price),
    phone,
    locationLink: formData.get("locationLink")?.toString().trim() || "",
    desc: formData.get("desc")?.toString().trim() || "Premium item",
    image,
  };

  state.settings.defaultLocationLink = defaultLocationLink;
  saveSettings(state.settings);

  if (state.editing) {
    state.products = state.products.map(p => 
      p.id === state.editing.id ? { ...p, ...productData } : p
    );
    toast("Product updated", "success");
    state.editing = null;
  } else {
    const newProduct = { ...productData, id: crypto.randomUUID(), available: true };
    state.products = [newProduct, ...state.products];
    toast("Product added", "success");
  }

  saveProducts(state.products);
  pendingImage = "";
  event.target.reset();
  renderMain();
}

function cancelEdit() {
  state.editing = null;
  pendingImage = "";
  renderMain();
}

function selectCategory(cat) {
  state.category = cat;
  state.view = "home";
  render();
}

// ============ CAROUSEL ============
function initCarousel() {
  const track = $(".carousel-track");
  if (!track) return;

  stopCarousel();
  
  carouselInterval = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselSlides.length;
    updateCarousel();
  }, 4500);

  window.addEventListener("focus", startCarousel);
  window.addEventListener("blur", stopCarousel);
}

function startCarousel() {
  stopCarousel();
  carouselInterval = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselSlides.length;
    updateCarousel();
  }, 4500);
}

function stopCarousel() {
  if (carouselInterval) {
    clearInterval(carouselInterval);
    carouselInterval = null;
  }
}

function goToSlide(index) {
  carouselIndex = index;
  updateCarousel();
  startCarousel();
}

function updateCarousel() {
  const track = $(".carousel-track");
  const dots = $$(".carousel-dot");
  
  if (track) {
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
  }
  
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === carouselIndex);
  });
}

// ============ INIT ============
function init() {
  state.products = loadProducts();
  state.user = loadSession();
  state.settings = loadSettings();

  $("#app").className = "min-h-screen bg-background";

  render();

  window.addEventListener("offline", () => toast("You are offline", "error"));
  window.addEventListener("online", () => toast("Back online", "success"));
}

// Start app
document.addEventListener("DOMContentLoaded", init);

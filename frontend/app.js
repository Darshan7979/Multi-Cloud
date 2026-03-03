const API_BASE = "http://localhost:4000/api";

const getFileIcon = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const icons = {
    pdf: "📄",
    doc: "📝", docx: "📝", txt: "📝",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
    mp4: "🎥", avi: "🎥", mov: "🎥",
    zip: "📦", rar: "📦",
    xls: "📊", xlsx: "📊",
    mp3: "🎵", wav: "🎵",
  };
  return icons[ext] || "📁";
};

const state = {
  token: null,
  user: null,
  files: [],
};

// Theme toggle functionality
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    updateThemeIcon(true);
  }
};

const updateThemeIcon = (isDark) => {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');

  if (isDark) {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
};

const toggleTheme = () => {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
};

// Initialize theme on load
initTheme();

const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");
const uploadForm = document.getElementById("upload-form-upload");
const uploadMessage = document.getElementById("upload-message-upload");
const filesList = document.getElementById("files-list-files");
const searchInput = document.getElementById("search-input-files");
const cloudFilter = document.getElementById("cloud-filter-files");
const refreshBtn = document.getElementById("refresh-btn-files");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const storageUsed = document.getElementById("storage-used");
const fileCount = document.getElementById("file-count");
const privateCount = document.getElementById("private-count");
const securityScore = document.getElementById("security-score");
const securityBar = document.getElementById("security-bar");

const setView = (view) => {
  if (view === "auth") {
    // Auth view
    authView.classList.remove("hidden");
    document.getElementById("dashboard-view")?.classList.add("hidden");
    document.getElementById("upload-view")?.classList.add("hidden");
    document.getElementById("files-view")?.classList.add("hidden");
    document.getElementById("analytics-view")?.classList.add("hidden");
    document.getElementById("security-view")?.classList.add("hidden");
    document.getElementById("services-view")?.classList.add("hidden");
    document.getElementById("settings-view")?.classList.add("hidden");
  } else {
    // Dashboard views
    authView.classList.add("hidden");

    // Hide all dashboard views first
    document.getElementById("dashboard-view")?.classList.add("hidden");
    document.getElementById("upload-view")?.classList.add("hidden");
    document.getElementById("files-view")?.classList.add("hidden");
    document.getElementById("analytics-view")?.classList.add("hidden");
    document.getElementById("security-view")?.classList.add("hidden");
    document.getElementById("services-view")?.classList.add("hidden");
    document.getElementById("settings-view")?.classList.add("hidden");

    // Show the requested view
    const viewId = `${view}-view`;
    document.getElementById(viewId)?.classList.remove("hidden");

    // Update active nav button
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }
};

const setTab = (tab) => {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  const forms = [loginForm, registerForm].filter(f => f);
  forms.forEach((form) => {
    form.style.opacity = "0";
    form.style.transform = "translateY(10px)";
  });

  setTimeout(() => {
    if (tab === "login") {
      if (loginForm) loginForm.classList.remove("hidden");
      if (registerForm) registerForm.classList.add("hidden");
      if (loginMessage) loginMessage.textContent = "";
    } else {
      if (loginForm) loginForm.classList.add("hidden");
      if (registerForm) registerForm.classList.remove("hidden");
      if (registerMessage) registerMessage.textContent = "";
    }

    const activeForm = tab === "login" ? loginForm : registerForm;
    if (activeForm) {
      setTimeout(() => {
        activeForm.style.opacity = "1";
        activeForm.style.transform = "translateY(0)";
      }, 10);
    }
  }, 200);
};

const apiRequest = async (path, options = {}) => {
  const headers = options.headers || {};

  // Get fresh token from Firebase if user is logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const loadStats = async () => {
  const summary = await apiRequest("/analytics/summary");

  // Update old stats
  if (fileCount) fileCount.textContent = summary.fileCount;
  if (privateCount) privateCount.textContent = summary.privateCount;

  const securityScoreEl = document.getElementById("security-score");
  if (securityScoreEl) securityScoreEl.textContent = `${summary.securityScore}%`;

  if (securityBar) securityBar.style.width = `${summary.securityScore}%`;

  // Active services (count cloud services with files)
  const cloudServices = summary.cloudDistribution ? Object.keys(summary.cloudDistribution).length : 0;
  const activeServicesEl = document.getElementById("active-services");
  if (activeServicesEl) activeServicesEl.textContent = cloudServices > 0 ? cloudServices : "--";

  // Update new dashboard elements
  const storageMbEl = document.getElementById("storage-used-mb");
  if (storageMbEl) storageMbEl.textContent = `${summary.storageUsedMB} MB`;

  const storagePercentEl = document.getElementById("storage-percent");
  if (storagePercentEl) storagePercentEl.textContent = (summary.storageUsedPercent || 0).toFixed(1);

  const storageFillEl = document.getElementById("storage-fill");
  if (storageFillEl) storageFillEl.style.width = `${summary.storageUsedPercent || 0}%`;

  // Populate cloud distribution
  const distributionContainer = document.getElementById("cloud-distribution");
  if (distributionContainer) {
    distributionContainer.innerHTML = "";

    if (summary.cloudDistribution && Object.keys(summary.cloudDistribution).length > 0) {
      const colors = {
        firebase: "#ff9800",
        cloudinary: "#3498db",
        mongodb: "#2ecc40"
      };

      Object.entries(summary.cloudDistribution).forEach(([service, data]) => {
        const percentage = data.percentage || 0;
        const color = colors[service] || "#5856D6";

        const item = document.createElement("div");
        item.className = "distribution-item";
        item.innerHTML = `
          <div class="dist-label">${service.charAt(0).toUpperCase() + service.slice(1)}</div>
          <div class="dist-bar">
            <div class="dist-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
          <div class="dist-percent">${Math.round(percentage)}%</div>
        `;
        distributionContainer.appendChild(item);
      });
    } else {
      const empty = document.createElement("div");
      empty.style.textAlign = "center";
      empty.style.color = "#999";
      empty.style.padding = "20px";
      empty.textContent = "No files uploaded yet";
      distributionContainer.appendChild(empty);
    }
  }
};

const renderFiles = () => {
  if (!filesList) return;

  filesList.innerHTML = "";

  if (!state.files.length) {
    const empty = document.createElement("div");
    empty.className = "mini";
    empty.textContent = "No files uploaded yet.";
    filesList.appendChild(empty);
    return;
  }

  state.files.forEach((file) => {
    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <span class="file-name-cell">${file.originalName}</span>
      <span class="file-cloud-cell">${file.cloudService}</span>
      <span class="file-privacy-cell">${file.privacy}</span>
      <span class="file-size-cell">${Math.round(file.sizeBytes / 1024)} KB</span>
      <button class="file-action ghost" data-id="${file._id}">Delete</button>
    `;

    filesList.appendChild(row);
  });

  document.querySelectorAll(".file-action").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteFile(button.dataset.id);
    });
  });

  // Populate Dashboard Recent Files
  const recentFilesContainer = document.getElementById("recent-files");
  if (recentFilesContainer) {
    recentFilesContainer.innerHTML = "";
    const recentFiles = state.files.slice(0, 4);

    if (!recentFiles.length) {
      const empty = document.createElement("div");
      empty.className = "mini";
      empty.textContent = "No recent files.";
      recentFilesContainer.appendChild(empty);
    } else {
      recentFiles.forEach(file => {
        const item = document.createElement("div");
        item.className = "recent-item";
        item.innerHTML = `
          <div class="recent-icon">${getFileIcon(file.originalName)}</div>
          <div class="recent-details">
            <div class="recent-name">${file.originalName}</div>
            <div class="recent-meta">${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB</div>
          </div>
          <div class="recent-cloud">${file.cloudService.charAt(0).toUpperCase() + file.cloudService.slice(1)}</div>
        `;
        recentFilesContainer.appendChild(item);
      });
    }
  }
};

const loadFiles = async () => {
  const params = new URLSearchParams();
  if (searchInput && searchInput.value) {
    params.set("search", searchInput.value);
  }
  if (cloudFilter && cloudFilter.value) {
    params.set("cloud", cloudFilter.value);
  }

  const data = await apiRequest(`/files?${params.toString()}`);
  state.files = data.files;
  renderFiles();
};

const syncUserWithBackend = async (firebaseUser) => {
  const idToken = await firebaseUser.getIdToken();

  const response = await fetch(`${API_BASE}/auth/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Sync failed");
  }

  state.token = idToken;
  state.user = data.user;
  if (userName) userName.textContent = state.user.name;
  setView("dashboard");
  await loadStats();
  await loadFiles();
};

const login = async (email, password) => {
  const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
  await syncUserWithBackend(userCredential.user);
};

const register = async (name, email, password) => {
  const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
  await userCredential.user.updateProfile({ displayName: name });
  await syncUserWithBackend(userCredential.user);
};

const uploadFile = async (payload) => {
  await apiRequest("/files/upload", {
    method: "POST",
    body: payload,
  });
};

const deleteFile = async (id) => {
  await apiRequest(`/files/${id}`, { method: "DELETE" });
  await loadFiles();
  await loadStats();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (loginMessage) loginMessage.textContent = "";

  const formData = new FormData(loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await login(email, password);
  } catch (err) {
    if (loginMessage) loginMessage.textContent = err.message || "Login failed";
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (registerMessage) registerMessage.textContent = "";

  const formData = new FormData(registerForm);
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await register(name, email, password);
  } catch (err) {
    if (registerMessage) registerMessage.textContent = err.message || "Registration failed";
  }
});

if (uploadForm) {
  const fileInput = document.getElementById("file-upload");
  const dropzone = document.querySelector(".upload-dropzone");
  const selectedFileName = document.getElementById("selected-file-name");

  if (fileInput && dropzone && selectedFileName) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        selectedFileName.textContent = `Selected: ${e.target.files[0].name}`;
      } else {
        selectedFileName.textContent = "";
      }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        selectedFileName.textContent = `Selected: ${files[0].name}`;
      }
    });
  }

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (uploadMessage) uploadMessage.textContent = "";

    const formData = new FormData(uploadForm);

    try {
      await uploadFile(formData);
      if (uploadMessage) {
        uploadMessage.textContent = "Upload complete.";
        uploadMessage.style.color = "var(--success)";
      }
      uploadForm.reset();
      if (selectedFileName) selectedFileName.textContent = "";
      await loadFiles();
      await loadStats();
    } catch (err) {
      if (uploadMessage) {
        uploadMessage.textContent = err.message;
        uploadMessage.style.color = "var(--danger)";
      }
    }
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    loadFiles().catch(() => { });
  });
}

if (cloudFilter) {
  cloudFilter.addEventListener("change", () => {
    loadFiles().catch(() => { });
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadFiles().catch(() => { });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await window.auth.signOut();
    state.token = null;
    state.user = null;
    setView("auth");
  });
}

const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");
if (sidebarLogoutBtn) {
  sidebarLogoutBtn.addEventListener("click", async () => {
    await window.auth.signOut();
    state.token = null;
    state.user = null;
    setView("auth");
  });
}

const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

// Add nav button click listeners
document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view) {
      setView(view);
      // Load data for the view if needed
      if (view === "files" && typeof loadFiles === 'function') {
        loadFiles().catch(() => { });
      } else if (view === "analytics" && typeof loadStats === 'function') {
        loadStats().catch(() => { });
      }
    }
  });
});

// Make dashboard stat cards clickable to act as navigation shortcuts
const statCardMapping = {
  "file-count": "files",
  "storage-used": "analytics",
  "active-services": "services",
  "security-score": "security"
};

Object.entries(statCardMapping).forEach(([id, view]) => {
  const el = document.getElementById(id);
  if (el && el.closest('.stat-card')) {
    const card = el.closest('.stat-card');
    card.style.cursor = 'pointer';
    card.addEventListener("click", () => {
      setView(view);

      // Load data for the view if needed
      if (view === "files" && typeof loadFiles === 'function') {
        loadFiles().catch(() => { });
      } else if (view === "analytics" && typeof loadStats === 'function') {
        loadStats().catch(() => { });
      }
    });
  }
});

// Setup all theme toggles for each view
const themeToggleIds = ["theme-toggle-upload", "theme-toggle-files", "theme-toggle-analytics", "theme-toggle-security", "theme-toggle-services", "theme-toggle-settings"];
themeToggleIds.forEach(id => {
  const toggle = document.getElementById(id);
  if (toggle) {
    toggle.addEventListener("click", toggleTheme);
  }
});

// Setup logout buttons for each view
const logoutBtnIds = ["logout-btn-upload", "logout-btn-files", "logout-btn-analytics", "logout-btn-security", "logout-btn-services", "logout-btn-settings"];
logoutBtnIds.forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", async () => {
      await window.auth.signOut();
      state.token = null;
      state.user = null;
      setView("auth");
    });
  }
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    if (input.type === "password") {
      input.type = "text";
      button.style.color = "var(--accent)";
    } else {
      input.type = "password";
      button.style.color = "";
    }
  });
});

// Firebase Auth State Listener
window.auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    try {
      await syncUserWithBackend(firebaseUser);
    } catch (err) {
      console.error("Failed to sync user:", err);
      setView("auth");
    }
  } else {
    state.token = null;
    state.user = null;
    setView("auth");
  }
});

// Enhanced Animations & Interactions

// Add drag and drop animations to file input
const fileInputBtn = document.querySelector('.file-input-btn');
if (fileInputBtn) {
  const fileInput = fileInputBtn.querySelector('input[type="file"]');

  ['dragenter', 'dragover'].forEach(eventName => {
    fileInputBtn.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInputBtn.classList.add('dragover');
      fileInputBtn.style.transform = 'scale(1.05)';
      fileInputBtn.style.borderColor = 'var(--accent)';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileInputBtn.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInputBtn.classList.remove('dragover');
      fileInputBtn.style.transform = '';
      fileInputBtn.style.borderColor = '';
    });
  });

  fileInputBtn.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      animateFileSelected(fileInputBtn, files[0].name);
    }
  });

  // Animate when file is selected
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      animateFileSelected(fileInputBtn, e.target.files[0].name);
    }
  });
}

function animateFileSelected(element, fileName) {
  const span = element.querySelector('span');
  if (span) {
    span.textContent = fileName;
    span.style.animation = 'bounce 0.6s ease';
    setTimeout(() => {
      span.style.animation = '';
    }, 600);
  }
}

// Add loading spinner during operations
function showLoading(button) {
  if (!button) return;
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.innerHTML = '<span class="spinner"></span>';
}

function hideLoading(button, success = true) {
  if (!button) return;
  button.disabled = false;
  const originalText = button.dataset.originalText || 'Submit';

  if (success) {
    button.textContent = '✓ Success';
    button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  } else {
    button.textContent = '✗ Failed';
    button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  }

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = '';
  }, 2000);
}

// Animate stats counter
function animateCounter(element, target, duration = 1000) {
  if (!element) return;

  let start = 0;
  const increment = target / (duration / 16);

  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = formatNumber(target);
      clearInterval(timer);
    } else {
      element.textContent = formatNumber(Math.floor(start));
    }
  }, 16);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Staggered animation for lists
function animateList(listElement) {
  if (!listElement) return;

  const items = listElement.children;
  Array.from(items).forEach((item, index) => {
    item.style.animation = 'none';
    item.offsetHeight; // Trigger reflow
    item.style.animation = `slideInUp 0.6s ease backwards ${index * 0.05}s`;
  });
}

// Smooth scroll with offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Ripple effect removed - user preference

// Observe elements entering viewport for animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'slideInUp 0.6s ease';
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1
});

// Observe stat cards and panels
document.querySelectorAll('.stat-card, .panel, .file-card').forEach(el => {
  observer.observe(el);
});

// Parallax effect for brand mark
const brandMark = document.querySelector('.brand-mark');
if (brandMark) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    brandMark.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// Add hover sound effect simulation (visual feedback)
document.querySelectorAll('.nav-btn, button').forEach(element => {
  element.addEventListener('mouseenter', function () {
    this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  });
});

// Refresh animations when files list updates
const originalLoadFiles = loadFiles;
if (typeof loadFiles === 'function') {
  loadFiles = async function () {
    const result = await originalLoadFiles.apply(this, arguments);
    setTimeout(() => {
      const filesList = document.getElementById('files-list');
      if (filesList) animateList(filesList);
    }, 100);
    return result;
  };
}

console.log('🎨 Enhanced animations loaded!');

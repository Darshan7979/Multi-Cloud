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
  summary: null,
};

let charts = {};

// ── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:16px">${icons[type] || icons.info}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}


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
  if (typeof renderAnalytics === 'function') renderAnalytics();
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
  state.summary = summary;

  // Update old stats
  if (fileCount) fileCount.textContent = summary.fileCount;
  if (privateCount) privateCount.textContent = summary.privateCount;

  const securityScoreCardEl = document.querySelectorAll("#security-score");
  if (securityScoreCardEl.length > 0) {
    securityScoreCardEl.forEach(el => {
      el.textContent = `${summary.securityScore}%`;
    });
  }

  if (securityBar) securityBar.style.width = `${summary.securityScore}%`;

  // Active services (count cloud services with files)
  const cloudServices = summary.byCloud ? summary.byCloud.length : 0;
  const activeServicesEl = document.getElementById("active-services");
  if (activeServicesEl) activeServicesEl.textContent = cloudServices > 0 ? cloudServices : "--";

  // Update new dashboard elements
  if (storageUsed) {
    storageUsed.textContent = `${summary.storageUsedMB} MB`;
  }
  const storageMbEl = document.getElementById("storage-used-mb");
  if (storageMbEl) {
    const parent = storageMbEl.parentElement;
    if (parent) {
      parent.innerHTML = `<span id="storage-used-mb">${summary.storageUsedMB} MB</span> of 5 GB used`;
    }
  }

  const MAX_STORAGE_MB = 5 * 1024; // 5 GB limit
  const storageUsedPercent = Math.min((summary.storageUsedMB / MAX_STORAGE_MB) * 100, 100);

  const storagePercentEl = document.getElementById("storage-percent");
  if (storagePercentEl) storagePercentEl.textContent = storageUsedPercent.toFixed(1);

  const storageFillEl = document.getElementById("storage-fill");
  if (storageFillEl) storageFillEl.style.width = `${storageUsedPercent}%`;

  // Populate cloud distribution
  const distributionContainer = document.getElementById("cloud-distribution");
  if (distributionContainer) {
    distributionContainer.innerHTML = "";

    if (summary.byCloud && summary.byCloud.length > 0) {
      const colors = {
        firebase: "#ff9800",
        cloudinary: "#3498db",
        supabase: "#3ECF8E",
        mongodb: "#2ecc40"
      };

      summary.byCloud.forEach((item) => {
        const percentage = summary.storageUsedBytes > 0 ? (item.totalBytes / summary.storageUsedBytes) * 100 : 0;
        const color = colors[item.cloudService] || "#5856D6";

        const displayWidth = percentage > 0 && percentage < 1 ? 1 : percentage;
        const displayPercent = percentage > 0 && percentage < 1 ? '<1' : Math.round(percentage);

        const div = document.createElement("div");
        div.className = "distribution-item";
        div.innerHTML = `
          <div class="dist-label">${item.cloudService.charAt(0).toUpperCase() + item.cloudService.slice(1)}</div>
          <div class="dist-bar">
            <div class="dist-fill" style="width: ${displayWidth}%; background: ${color};"></div>
          </div>
          <div class="dist-percent">${displayPercent}%</div>
        `;
        distributionContainer.appendChild(div);
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

  renderAnalytics();
};

const renderAnalytics = () => {
  if (!state.summary || !state.files) return;

  // Total Bandwidth & Requests (Real data from backend)
  const bandwidthEl = document.getElementById("analytics-bandwidth");
  const requestsEl = document.getElementById("analytics-requests");

  if (bandwidthEl) {
    const totalGB = state.summary.totalBandwidthGB || 0;
    bandwidthEl.textContent = `${totalGB} GB`;
  }
  if (requestsEl) {
    requestsEl.textContent = state.summary.totalRequests || 0;
  }

  // Data for Chart.js
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#e4e4e7' : '#0f172a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: textColor,
    plugins: {
      legend: { labels: { color: textColor, font: { family: 'Outfit', size: 12 } } },
      tooltip: { backgroundColor: isDark ? '#1a1a1a' : '#fff', titleColor: textColor, bodyColor: textColor, borderColor: gridColor, borderWidth: 1 }
    }
  };

  // 1. Storage Usage Over Time (Line Chart)
  const timelineCtx = document.getElementById('storageTimelineChart');
  if (timelineCtx) {
    if (charts.timeline) charts.timeline.destroy();

    const timelineData = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      timelineData[key] = 0;
    }

    // Add file sizes (in MB)
    let hasHistoricalData = false;
    state.files.forEach(f => {
      const d = new Date(f.createdAt || Date.now());
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (timelineData[key] !== undefined) {
        timelineData[key] += f.sizeBytes / (1024 * 1024);
        hasHistoricalData = true;
      }
    });

    let cumulative = 0;
    const labels = Object.keys(timelineData);
    let data;

    if (!hasHistoricalData && state.summary.storageUsedMB > 0) {
      // Fallback smooth curve if no files with valid history
      data = [0, 0, 0, state.summary.storageUsedMB * 0.3, state.summary.storageUsedMB * 0.7, state.summary.storageUsedMB];
    } else {
      data = labels.map(k => {
        cumulative += timelineData[k];
        return cumulative.toFixed(2);
      });
    }

    charts.timeline = new Chart(timelineCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Storage Used (MB)',
          data: data,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#6366f1',
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
  }

  // 2. File Type Distribution (Doughnut Chart)
  const fileTypeCtx = document.getElementById('fileTypeChart');
  if (fileTypeCtx) {
    if (charts.fileType) charts.fileType.destroy();

    const typeDistribution = {};
    if (state.files.length > 0) {
      state.files.forEach(f => {
        const ext = f.originalName.split('.').pop().toLowerCase();
        const type = ['jpg', 'png', 'jpeg', 'gif', 'svg'].includes(ext) ? 'Images' :
          ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'Videos' :
            ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'].includes(ext) ? 'Documents' : 'Others';
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      });
    }

    const labels = Object.keys(typeDistribution).length > 0 ? Object.keys(typeDistribution) : ['No Files'];
    const data = Object.keys(typeDistribution).length > 0 ? Object.values(typeDistribution) : [1];

    charts.fileType = new Chart(fileTypeCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: Object.keys(typeDistribution).length > 0 ? ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'] : ['#e2e8f0'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        ...commonOptions,
        cutout: '70%',
      }
    });
  }

  // 3. Cloud Provider Distribution (Pie Chart)
  const cloudCtx = document.getElementById('cloudProviderChart');
  if (cloudCtx) {
    if (charts.cloud) charts.cloud.destroy();

    let labels = [];
    let data = [];

    if (state.summary.byCloud && state.summary.byCloud.length > 0) {
      state.summary.byCloud.forEach((item) => {
        const percentage = state.summary.storageUsedBytes > 0 ? (item.totalBytes / state.summary.storageUsedBytes) * 100 : 0;
        labels.push(item.cloudService.charAt(0).toUpperCase() + item.cloudService.slice(1));
        data.push(percentage.toFixed(2));
      });
    } else {
      labels = ['No Files'];
      data = [100];
    }

    charts.cloud = new Chart(cloudCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: state.summary.byCloud && state.summary.byCloud.length > 0
            ? ['#ff9800', '#3498db', '#3ECF8E', '#2ecc40']
            : ['#e2e8f0'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: commonOptions
    });
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
    const card = document.createElement("div");
    card.className = "file-card";

    // Add file icon, details, and action buttons wrapper
    card.innerHTML = `
      <div class="file-card-header">
        <div class="file-icon-large">${getFileIcon(file.originalName)}</div>
        <div class="file-badges">
          <span class="badge privacy-${file.privacy}">
            ${file.privacy === 'private' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'}
          </span>
          <span class="badge cloud-badge">${file.cloudService}</span>
        </div>
      </div>
      <div class="file-card-body">
        <h4 class="file-name" title="${file.originalName}">${file.originalName}</h4>
        <p class="file-size">${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      <div class="file-card-actions">
        <button class="action-btn download-btn" data-url="${file.url}" title="Download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download</span>
        </button>
        <div class="action-btn-group">
          <button class="action-btn file-action" data-id="${file._id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    filesList.appendChild(card);
  });

  // Attach event listeners to buttons

  // Delete Button
  document.querySelectorAll(".file-action").forEach((button) => {
    button.addEventListener("click", async () => {
      // Add a simple confirmation dialog before deleting
      if (confirm('Are you sure you want to delete this file?')) {
        const tr = button.closest('.file-card');
        tr.style.opacity = '0.5';
        try {
          await deleteFile(button.dataset.id);
        } catch (error) {
          console.error(error)
          tr.style.opacity = '1';
          alert("Delete failed")
        }
      }
    });
  });

  // Rename Button
  document.querySelectorAll(".rename-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const currentName = button.dataset.name;
      const newName = prompt("Enter new file name:", currentName);
      if (newName && newName !== currentName) {
        try {
          await renameFile(button.dataset.id, newName);
        } catch (e) {
          alert("Error renaming file: " + e.message);
        }
      }
    });
  });

  // View Button
  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      window.open(button.dataset.url, '_blank');
    });
  });

  // Download Button
  document.querySelectorAll(".download-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        // Attempt to fetch file directly as a Blob for a seamless native download
        const response = await fetch(button.dataset.url);
        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const fileName = button.closest('.file-card').querySelector('.file-name').textContent;

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (e) {
        console.error("Direct download failed, falling back to new tab window...", e);
        // Fallback to opening the signed URL in a new tab if CORS occurs
        window.open(button.dataset.url, '_blank');
      }
    });
  });
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

let loadFiles = async () => {
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
  renderAnalytics();
};

const syncUserWithBackend = async (firebaseUser, bypassRedirect = false) => {
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

  await loadStats();
  await loadFiles();

  if (!bypassRedirect) {
    setView("dashboard");
  }
};

const login = async (email, password) => {
  const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
  await syncUserWithBackend(userCredential.user);
  setView("dashboard");
};

const register = async (name, email, password) => {
  const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
  await userCredential.user.updateProfile({ displayName: name });
  await syncUserWithBackend(userCredential.user);
  setView("dashboard");
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

const renameFile = async (id, newName) => {
  await apiRequest(`/files/${id}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newName }),
  });
  await loadFiles();
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

loginForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loginForm.dispatchEvent(new Event("submit"));
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

registerForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    registerForm.dispatchEvent(new Event("submit"));
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

// Forgot Password Handler
const forgotLink = document.querySelector(".forgot-link");
if (forgotLink) {
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();

    // Try to get the email from the login form
    const loginEmailInput = document.querySelector('#login-form input[name="email"]');
    let email = loginEmailInput ? loginEmailInput.value.trim() : "";

    if (!email) {
      email = prompt("Enter your registered email address:");
    }

    if (!email || !email.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    try {
      await window.auth.sendPasswordResetEmail(email);
      showToast(`Password reset email sent to ${email}. Check your inbox!`, "success", 6000);
    } catch (err) {
      console.error("Forgot password error:", err);
      if (err.code === "auth/user-not-found") {
        showToast("No account found with that email address.", "error");
      } else if (err.code === "auth/invalid-email") {
        showToast("Please enter a valid email address.", "error");
      } else {
        showToast("Failed to send reset email. Please try again.", "error");
      }
    }
  });
}

// Firebase Auth State Listener
window.auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    try {
      await syncUserWithBackend(firebaseUser, false);
      // User is already logged in, redirect to dashboard
    } catch (err) {
      console.error("Failed to sync user:", err);
      // If sync fails, don't force them out, just let them see auth view
      authView.classList.remove("hidden");
      setView("auth");
    }
  } else {
    state.token = null;
    state.user = null;
    authView.classList.remove("hidden");
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

// Stripe Payment Integration
document.querySelectorAll('.upgrade-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const plan = e.target.getAttribute('data-plan');
    const originalText = e.target.innerText;

    try {
      e.target.innerText = 'Redirecting...';
      e.target.disabled = true;

      const response = await fetch('http://localhost:4000/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout process.');
        e.target.innerText = originalText;
        e.target.disabled = false;
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Error connecting to payment server.');
      e.target.innerText = originalText;
      e.target.disabled = false;
    }
  });
});

// Razorpay Payment Integration
document.querySelectorAll('.razorpay-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const plan = e.target.getAttribute('data-plan');
    const originalText = e.target.innerText;

    try {
      e.target.innerText = 'Loading...';
      e.target.disabled = true;

      const response = await fetch('http://localhost:4000/api/payments/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      const data = await response.json();

      if (data.error) {
        alert('Razorpay Checkout Error: ' + data.error);
        e.target.innerText = originalText;
        e.target.disabled = false;
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "CloudFusion",
        description: `${plan} Storage Plan Upgrade`,
        order_id: data.orderId,
        handler: function (response) {
          alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
          // Usually, you would verify this signature on the backend before upgrading the user
        },
        prefill: {
          name: "CloudFusion User",
          email: "user@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#6366f1" // Matches var(--accent)
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert("Payment Failed: " + response.error.description);
      });

      rzp.open();

      e.target.innerText = originalText;
      e.target.disabled = false;

    } catch (error) {
      console.error('Error starting Razorpay checkout:', error);
      alert('Error connecting to Razorpay server.');
      e.target.innerText = originalText;
      e.target.disabled = false;
    }
  });
});

console.log('🎨 Enhanced animations loaded!');

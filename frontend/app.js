const API_BASE = "https://cloudfusion-backend.onrender.com/api";
fetch("https://cloudfusion-backend.onrender.com")
    .catch(() => {});

const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const icons = {
        pdf: "📄",
        doc: "📝",
        docx: "📝",
        txt: "📝",
        jpg: "🖼️",
        jpeg: "🖼️",
        png: "🖼️",
        gif: "🖼️",
        mp4: "🎥",
        avi: "🎥",
        mov: "🎥",
        zip: "📦",
        rar: "📦",
        xls: "📊",
        xlsx: "📊",
        mp3: "🎵",
        wav: "🎵",
    };
    return icons[ext] || "📁";
};

const state = {
    token: null,
    user: null,
    files: [],
    summary: null,
    recycleBinMode: false,
};

let charts = {};

const MAX_STORAGE_MB = 5 * 1024;
const CLOUD_META = {
    firebase: { label: "Firebase", color: "#f59e0b", icon: "F" },
    cloudinary: { label: "Cloudinary", color: "#2563eb", icon: "C" },
    supabase: { label: "Supabase", color: "#22c55e", icon: "S" },
    aws: { label: "AWS S3", color: "#f97316", icon: "A" },
    mongodb: { label: "MongoDB", color: "#16a34a", icon: "M" },
    other: { label: "Other", color: "#6366f1", icon: "O" }
};

const formatCloudName = (cloudKey) => {
    const key = (cloudKey || "other").toLowerCase();
    return (CLOUD_META[key] || CLOUD_META.other).label;
};

const formatStorageSize = (bytes) => {
    const safeBytes = Math.max(Number(bytes) || 0, 0);
    const mb = safeBytes / (1024 * 1024);
    if (mb < 1024) {
        return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(2)} GB`;
};

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
const filesHeading = document.getElementById("files-heading-files");
const searchInput = document.getElementById("search-input-files");
const cloudFilter = document.getElementById("cloud-filter-files");
const recycleToggleBtn = document.getElementById("recycle-toggle-files");
const refreshBtn = document.getElementById("refresh-btn-files");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const storageUsed = document.getElementById("storage-used");
const fileCount = document.getElementById("file-count");
const privateCount = document.getElementById("private-count");
const securityScore = document.getElementById("security-score");
const securityBar = document.getElementById("security-bar");

const getDashboardStatusEl = () => {
    let statusEl = document.getElementById("dashboard-loading-message");
    if (!statusEl && dashboardView) {
        statusEl = document.createElement("p");
        statusEl.id = "dashboard-loading-message";
        statusEl.className = "muted";
        statusEl.style.margin = "0 0 1rem";

        const topBar = dashboardView.querySelector(".top-bar");
        if (topBar) {
            topBar.insertAdjacentElement("afterend", statusEl);
        } else {
            dashboardView.prepend(statusEl);
        }
    }
    return statusEl;
};

const setDashboardStatusMessage = (message, isError = false) => {
    const statusEl = getDashboardStatusEl();
    if (!statusEl) return;

    statusEl.textContent = message || "";
    statusEl.style.display = message ? "block" : "none";
    statusEl.style.color = isError ? "#dc2626" : "";
};

const setView = (view) => {
    var allViews = ["dashboard-view", "upload-view", "files-view", "analytics-view", "security-view", "services-view", "settings-view"];
    if (view === "auth") {
        authView.classList.remove("hidden");
        allViews.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.add("hidden"); });
    } else {
        authView.classList.add("hidden");
        allViews.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.add("hidden"); });
        var target = document.getElementById(view + "-view");
        if (target) target.classList.remove("hidden");
        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.view === view);
        });
        if (view === "security" && typeof loadSecurityData === "function") {
            loadSecurityData();
        }
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

const apiRequest = async(path, options = {}) => {
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
        const error = new Error(data.message || "Request failed");
        error.code = data.code || null;
        error.status = response.status;
        throw error;
    }

    return data;
};

const loadStats = async() => {
    const summary = await apiRequest("/analytics/summary");
    state.summary = summary;
    const totalUsedBytes = Number(summary.storageUsedBytes || 0);
    const totalUsedMB = Number(summary.storageUsedMB || (totalUsedBytes / (1024 * 1024)));

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
        storageUsed.textContent = `${totalUsedMB.toFixed(1)} MB`;
    }
    const storageMbEl = document.getElementById("storage-used-mb");
    if (storageMbEl) {
        storageMbEl.textContent = `${totalUsedMB.toFixed(1)} MB`;
    }

    const storageUsedPercent = Math.min((totalUsedMB / MAX_STORAGE_MB) * 100, 100);

    const storagePercentEl = document.getElementById("storage-percent");
    if (storagePercentEl) storagePercentEl.textContent = storageUsedPercent.toFixed(1);

    const storageFillEl = document.getElementById("storage-fill");
    if (storageFillEl) storageFillEl.style.width = `${storageUsedPercent}%`;

    const cloudUsageContainer = document.getElementById("storage-by-cloud");
    if (cloudUsageContainer) {
        cloudUsageContainer.innerHTML = "";

        if (summary.byCloud && summary.byCloud.length > 0) {
            const sortedClouds = [...summary.byCloud].sort((a, b) => Number(b.totalBytes || 0) - Number(a.totalBytes || 0));

            sortedClouds.forEach((item, index) => {
                const serviceKey = (item.cloudService || "other").toLowerCase();
                const meta = CLOUD_META[serviceKey] || CLOUD_META.other;
                const cloudBytes = Number(item.totalBytes || 0);
                const cloudShare = totalUsedBytes > 0 ? (cloudBytes / totalUsedBytes) * 100 : 0;
                const quotaPercent = Math.min((cloudBytes / (MAX_STORAGE_MB * 1024 * 1024)) * 100, 100);

                const usageCard = document.createElement("article");
                usageCard.className = "cloud-usage-item";
                usageCard.style.setProperty("--cloud-color", meta.color);
                usageCard.style.setProperty("--cloud-delay", `${index * 80}ms`);
                usageCard.innerHTML = `
                    <div class="cloud-usage-head">
                        <div class="cloud-usage-name">
                            <span class="cloud-usage-mark">${meta.icon}</span>
                            <span class="cloud-usage-provider">${formatCloudName(serviceKey)}</span>
                        </div>
                        <div class="cloud-usage-size-pill">${cloudShare.toFixed(1)}%</div>
                    </div>
                    <div class="cloud-usage-size">${formatStorageSize(cloudBytes)}</div>
                    <div class="cloud-usage-bar">
                        <div class="cloud-usage-fill" style="width:${Math.max(cloudShare, cloudShare > 0 ? 2 : 0)}%;"></div>
                    </div>
                    <div class="cloud-usage-meta">
                        <span>${cloudShare.toFixed(1)}% of used storage</span>
                        <span>${quotaPercent.toFixed(1)}% of total quota</span>
                    </div>
                `;
                cloudUsageContainer.appendChild(usageCard);
            });
        } else {
            const empty = document.createElement("div");
            empty.className = "cloud-usage-empty";
            empty.textContent = "No cloud partitions yet. Upload files to see usage split by provider.";
            cloudUsageContainer.appendChild(empty);
        }
    }

    // Populate cloud distribution
    const distributionContainer = document.getElementById("cloud-distribution");
    if (distributionContainer) {
        distributionContainer.innerHTML = "";

        if (summary.byCloud && summary.byCloud.length > 0) {
            const colors = {
                firebase: "#ff9800",
                cloudinary: "#3498db",
                supabase: "#3ECF8E",
                aws: "#f97316",
                mongodb: "#2ecc40"
            };

            summary.byCloud.forEach((item) => {
                const serviceKey = (item.cloudService || "other").toLowerCase();
                const percentage = totalUsedBytes > 0 ? (item.totalBytes / totalUsedBytes) * 100 : 0;
                const color = colors[serviceKey] || "#5856D6";

                const displayWidth = percentage > 0 && percentage < 1 ? 1 : percentage;
                const displayPercent = percentage > 0 && percentage < 1 ? '<1' : Math.round(percentage);

                const div = document.createElement("div");
                div.className = "distribution-item";
                div.innerHTML = `
                    <div class="dist-label">${formatCloudName(serviceKey)}</div>
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
                const type = ['jpg', 'png', 'jpeg', 'gif', 'svg'].includes(ext) ? 'Images' : ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'Videos' : ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'].includes(ext) ? 'Documents' : 'Others';
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
                    backgroundColor: state.summary.byCloud && state.summary.byCloud.length > 0 ? ['#ff9800', '#3498db', '#3ECF8E', '#2ecc40'] : ['#e2e8f0'],
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

    if (filesHeading) {
        filesHeading.textContent = state.recycleBinMode ? "Recycle Bin" : "All Files";
    }
    if (recycleToggleBtn) {
        recycleToggleBtn.textContent = state.recycleBinMode ? "Back to Files" : "Recycle Bin";
    }

    filesList.innerHTML = "";

    if (!state.files.length) {
        const empty = document.createElement("div");
        empty.className = "mini";
        empty.textContent = state.recycleBinMode ? "Recycle bin is empty." : "No files uploaded yet.";
        filesList.appendChild(empty);
        return;
    }

    state.files.forEach((file) => {
        const card = document.createElement("div");
        card.className = "file-card";

        const actionsHtml = state.recycleBinMode ? `
                    <button class="action-btn restore-btn" data-id="${file._id}" title="Restore">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 .49-9"></path>
                        </svg>
                        <span>Restore</span>
                    </button>
                    <button class="action-btn permanent-delete-btn" data-id="${file._id}" title="Delete Permanently">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                ` : `
                    <button class="action-btn file-trash-btn" data-id="${file._id}" title="Move to Recycle Bin">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                `;

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
                    ${actionsHtml}
        </div>
      </div>
    `;

        filesList.appendChild(card);
    });

    // Attach event listeners to buttons

    // Move to recycle bin
    document.querySelectorAll(".file-trash-btn").forEach((button) => {
        button.addEventListener("click", async() => {
            if (confirm("Move this file to recycle bin?")) {
                const tr = button.closest('.file-card');
                tr.style.opacity = '0.5';
                try {
                    await deleteFile(button.dataset.id);
                } catch (error) {
                    console.error(error)
                    tr.style.opacity = '1';
                    alert("Could not move file to recycle bin.")
                }
            }
        });
    });

    // Restore from recycle bin
    document.querySelectorAll(".restore-btn").forEach((button) => {
        button.addEventListener("click", async() => {
            const tr = button.closest('.file-card');
            tr.style.opacity = '0.5';
            try {
                await restoreFile(button.dataset.id);
            } catch (error) {
                console.error(error);
                tr.style.opacity = '1';
                alert("Restore failed");
            }
        });
    });

    // Permanently delete from recycle bin
    document.querySelectorAll(".permanent-delete-btn").forEach((button) => {
        button.addEventListener("click", async() => {
            if (confirm("Delete permanently? This cannot be undone.")) {
                const tr = button.closest('.file-card');
                tr.style.opacity = '0.5';
                try {
                    await permanentlyDeleteFile(button.dataset.id);
                } catch (error) {
                    console.error(error);
                    tr.style.opacity = '1';
                    alert("Permanent delete failed");
                }
            }
        });
    });

    // Rename Button
    document.querySelectorAll(".rename-btn").forEach((button) => {
        button.addEventListener("click", async() => {
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
        button.addEventListener("click", async() => {
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
    if (recentFilesContainer && !state.recycleBinMode) {
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

let loadFiles = async() => {
    const params = new URLSearchParams();
    if (searchInput && searchInput.value) {
        params.set("search", searchInput.value);
    }
    if (cloudFilter && cloudFilter.value) {
        params.set("cloud", cloudFilter.value);
    }
    if (state.recycleBinMode) {
        params.set("bin", "true");
    }

    const data = await apiRequest(`/files?${params.toString()}`);
    state.files = data.files;
    renderFiles();
    if (!state.recycleBinMode) {
        renderAnalytics();
    }
};

const loadUserData = async(firebaseUser = window.auth.currentUser) => {
    if (!firebaseUser) {
        throw new Error("No authenticated user");
    }

    const idToken = await firebaseUser.getIdToken();
    const response = await fetch(`${API_BASE}/files`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to load data");
    }

    state.files = Array.isArray(data.files) ? data.files : [];
    renderFiles();

    if (fileCount) fileCount.textContent = String(state.files.length);

    const privateFiles = state.files.filter((file) => Boolean(file.isPrivate)).length;
    if (privateCount) privateCount.textContent = String(privateFiles);

    const totalBytes = state.files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
    if (storageUsed) {
        storageUsed.textContent = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    setDashboardStatusMessage("");
    return data;
};

const syncUserWithBackend = async(firebaseUser, bypassRedirect = false) => {
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

    // Register device for FCM push notifications (non-blocking)
    if (typeof window.initFCM === "function") {
        window.initFCM(API_BASE, () => firebaseUser.getIdToken()).catch(() => {});
    }
};

const login = async(email, password) => {
    const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
    setView("dashboard");

    syncUserWithBackend(userCredential.user)
        .then(() => loadUserData(userCredential.user))
        .catch((error) => {
            console.error("Background user sync failed:", error);
            setDashboardStatusMessage("Failed to load data", true);
        });
};

const register = async(name, email, password) => {
    const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    await syncUserWithBackend(userCredential.user);
    setView("dashboard");
};

const uploadFile = async(payload) => {
    return await apiRequest("/files/upload", {
        method: "POST",
        body: payload,
    });
};

const deleteFile = async(id) => {
    await apiRequest(`/files/${id}`, { method: "DELETE" });
    await loadFiles();
    await loadStats();
};

const restoreFile = async(id) => {
    await apiRequest(`/files/${id}/restore`, { method: "POST" });
    await loadFiles();
    await loadStats();
};

const permanentlyDeleteFile = async(id) => {
    await apiRequest(`/files/${id}/permanent`, { method: "DELETE" });
    await loadFiles();
    await loadStats();
};

const renameFile = async(id, newName) => {
    await apiRequest(`/files/${id}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
    });
    await loadFiles();
};

loginForm.addEventListener("submit", async(event) => {
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

registerForm.addEventListener("submit", async(event) => {
    event.preventDefault();
    if (registerMessage) registerMessage.textContent = "";

    const formData = new FormData(registerForm);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    try {
        await register(name, email, password);
    } catch (err) {
        if (registerMessage) {
            const message = String(err.message || "");
            if (err.code === "auth/email-already-in-use") {
                registerMessage.textContent = "This email is already registered. Please log in.";
            } else if (message.includes("already registered") || message.includes("duplicate key")) {
                registerMessage.textContent = "This email is already registered. Please log in.";
            } else {
                registerMessage.textContent = message || "Registration failed";
            }
        }
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

    uploadForm.addEventListener("submit", async(event) => {
        event.preventDefault();
        if (uploadMessage) uploadMessage.textContent = "";

        const formData = new FormData(uploadForm);

        try {
            const result = await uploadFile(formData);
            if (uploadMessage) {
                const es = result && result.emailStatus;
                const fallback = result && result.fallback;
                const malwareScan = result && result.malwareScan;
                const fallbackNote =
                    fallback && fallback.requested === "firebase" && fallback.used ?
                    ` File stored on ${formatCloudName(fallback.used)} because Firebase is unavailable.` :
                    "";
                const scanNote =
                    malwareScan && malwareScan.status === "scan-skipped" ?
                    " (Malware scanner unavailable; upload allowed in best-effort mode.)" :
                    "";
                if (es && es.sent) {
                    uploadMessage.textContent = `Upload complete! Email notification sent to your login email.${fallbackNote}${scanNote}`;
                } else if (es && es.reason === "not-configured") {
                    uploadMessage.textContent = `Upload complete. (Email service not configured on server yet.)${fallbackNote}${scanNote}`;
                } else if (es && es.reason === "send-error") {
                    uploadMessage.textContent = `Upload complete. (Email send failed — check server logs)${fallbackNote}${scanNote}`;
                } else {
                    uploadMessage.textContent = `Upload complete.${fallbackNote}${scanNote}`;
                }
                uploadMessage.className = "form-message success";
                uploadMessage.style.color = "";
            }
            uploadForm.reset();
            if (selectedFileName) selectedFileName.textContent = "";
            await loadFiles();
            await loadStats();
        } catch (err) {
            if (uploadMessage) {
                const msg = err.message || "";
                if (err.code === "MALWARE_DETECTED" || msg.toLowerCase().includes("malware")) {
                    uploadMessage.textContent = "⚠️ Upload blocked: malware detected in the selected file.";
                } else if (err.code === "MALWARE_SCAN_UNAVAILABLE") {
                    uploadMessage.textContent = "⚠️ Upload blocked: malware scanner is unavailable right now. Please try again later.";
                } else if (msg.includes("billing account") || msg.includes("FIREBASE_BILLING") || msg.includes("accountDisabled")) {
                    uploadMessage.textContent = "⚠️ Firebase Storage is unavailable (billing account closed). Please select Cloudinary, AWS S3, or Supabase.";
                } else {
                    uploadMessage.textContent = msg || "Upload failed.";
                }
                uploadMessage.className = "form-message error";
                uploadMessage.style.color = "";
            }
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        loadFiles().catch(() => {});
    });
}

if (cloudFilter) {
    cloudFilter.addEventListener("change", () => {
        loadFiles().catch(() => {});
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        loadFiles().catch(() => {});
    });
}

if (recycleToggleBtn) {
    recycleToggleBtn.addEventListener("click", () => {
        state.recycleBinMode = !state.recycleBinMode;
        loadFiles().catch(() => {});
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", async() => {
        await window.auth.signOut();
        state.token = null;
        state.user = null;
        setView("auth");
    });
}

const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");
if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", async() => {
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
                loadFiles().catch(() => {});
            } else if (view === "analytics" && typeof loadStats === 'function') {
                loadStats().catch(() => {});
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
                loadFiles().catch(() => {});
            } else if (view === "analytics" && typeof loadStats === 'function') {
                loadStats().catch(() => {});
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
        btn.addEventListener("click", async() => {
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
    forgotLink.addEventListener("click", async(e) => {
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
window.auth.onAuthStateChanged(async(firebaseUser) => {
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
    anchor.addEventListener('click', function(e) {
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
    element.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
});

// Refresh animations when files list updates
const originalLoadFiles = loadFiles;
if (typeof loadFiles === 'function') {
    loadFiles = async function() {
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
    btn.addEventListener('click', async(e) => {
        const plan = e.target.getAttribute('data-plan');
        const originalText = e.target.innerText;

        try {
            e.target.innerText = 'Redirecting...';
            e.target.disabled = true;

            const response = await fetch(`${API_BASE}/payments/create-checkout-session`, {
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
    btn.addEventListener('click', async(e) => {
        const plan = e.target.getAttribute('data-plan');
        const originalText = e.target.innerText;

        try {
            e.target.innerText = 'Loading...';
            e.target.disabled = true;

            const response = await fetch(`${API_BASE}/payments/create-razorpay-order`, {
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
                handler: function(response) {
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
            rzp.on('payment.failed', function(response) {
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

// ═══════════════════════════════════════════
// GLOBAL i18n — Multilingual for ALL Views
// ═══════════════════════════════════════════
(function initGlobalI18n() {
    var SETTINGS_KEY = 'cloudfusion_settings';

    var globalDict = {
        en: {
            navDashboard: 'Dashboard',
            navUpload: 'Upload Files',
            navFiles: 'My Files',
            navAnalytics: 'Analytics',
            navSecurity: 'Security',
            navServices: 'Cloud Services',
            navSettings: 'Settings',
            sideSecScore: 'Security Score',
            sideLogout: 'Logout',
            authWelcome: 'Welcome to CloudFusion',
            authSubtitle: 'Unified cloud storage, infinite possibilities',
            authLogin: 'Login',
            authRegister: 'Register',
            authEmail: 'Email',
            authPassword: 'Password',
            authName: 'Name',
            authRememberMe: 'Remember me',
            authForgotPassword: 'Forgot password?',
            authPasswordHint: 'Use at least 8 characters with letters and numbers',
            authFeatureSecure: 'Secure & Encrypted',
            authFeatureMultiCloud: 'Multi-Cloud Storage',
            authFeatureAnalytics: 'Real-time Analytics',
            dashWelcome: 'Welcome back, ',
            dashSubtitle: "Here's your cloud storage overview",
            dashTotalFiles: 'Total Files',
            dashStorageUsed: 'Storage Used',
            dashCloudServices: 'Cloud Services',
            dashSecurityScore: 'Security Score',
            dashStorageUsage: 'Storage Usage',
            dashRecentFiles: 'Recent Files',
            dashCloudDistribution: 'Cloud Distribution',
            uploadTitle: 'Upload Files',
            uploadSubtitle: 'Upload files to multiple cloud storage providers',
            uploadDragDrop: 'Drag & drop files here',
            uploadOr: 'or',
            uploadBrowse: 'Browse Files',
            uploadMaxSize: 'Max file size: 100MB',
            uploadBtn: 'Upload',
            uploadSettings: 'Upload Settings',
            uploadSelectCloud: 'Select Cloud Service',
            uploadFilePrivacy: 'File Privacy',
            uploadAutoEncrypt: 'Auto-encrypt files (AES-256)',
            uploadSecFeatures: 'Security Features',
            uploadE2E: '\u2713 End-to-end encryption',
            uploadSecTransfer: '\u2713 Secure file transfer',
            uploadAccessCtrl: '\u2713 Access control',
            uploadActivityLog: '\u2713 Activity logging',
            uploadPrivate: 'Private',
            uploadPublic: 'Public',
            filesTitle: 'My Files',
            filesSubtitle: 'Manage all your uploaded files',
            filesAll: 'All Files',
            filesSearch: 'Search files',
            filesAllClouds: 'All Clouds',
            filesRefresh: '\u21BB Refresh',
            analyticsTitle: 'Analytics',
            analyticsSubtitle: 'Monitor your storage and usage statistics',
            analyticsBandwidth: 'Total Bandwidth',
            analyticsRequests: 'Total Requests',
            analyticsStorageTime: 'Storage Usage Over Time',
            analyticsFileType: 'File Type Distribution',
            analyticsCloudProvider: 'Cloud Provider Distribution',
            secTitle: 'Security',
            secSubtitle: 'Manage your security settings and permissions',
            secPassMgmt: 'Password Management',
            secPassDesc: 'Ensure your account is using a long, random password to stay secure.',
            secCurPass: 'Current Password',
            secNewPass: 'New Password',
            secUpdatePass: 'Update Password',
            sec2FA: 'Two-Factor Authentication (2FA)',
            sec2FADesc: 'Add an extra layer of security to your account.',
            secScanQR: 'Scan this QR code with your authenticator app:',
            secManualKey: 'Or enter this setup key manually:',
            secEnterCode: 'Enter 6-digit code',
            secVerify: 'Verify',
            secActiveSess: 'Active Sessions',
            secActiveSessDesc: 'Manage and log out of your active sessions on other devices.',
            secLogoutOther: 'Logout Other Devices',
            secCurSession: 'Current Session',
            secActiveNow: 'Active Now',
            svcTitle: 'Cloud Services',
            svcSubtitle: 'Manage your connected cloud services',
            svcChoosePlan: 'Choose Your Storage Plan',
            svcPlanDesc: 'Upgrade your storage and unlock premium features.',
            svcBasic: 'Basic',
            svcPro: 'Pro',
            svcEnterprise: 'Enterprise',
            svcPopular: 'Most Popular',
            svcCurrentPlan: 'Current Plan',
            svcMo: '/mo',
            svc5GB: '5 GB Storage',
            svcAllCloud: 'All Cloud Providers',
            svcStdSpeed: 'Standard Speed',
            svcPriority: 'Priority Support',
            svc100GB: '100 GB Storage',
            svcHighSpeed: 'High Speed Sync',
            svc1TB: '1 TB+ Storage',
            svcUnlimited: 'Unlimited Speed',
            svc247: '24/7 Dedicated Support'
        },
        hi: {
            navDashboard: '\u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921',
            navUpload: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902',
            navFiles: '\u092E\u0947\u0930\u0940 \u092B\u093C\u093E\u0907\u0932\u0947\u0902',
            navAnalytics: '\u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            navSecurity: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            navServices: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E\u090F\u0901',
            navSettings: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            sideSecScore: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            sideLogout: '\u0932\u0949\u0917\u0906\u0909\u091F',
            authWelcome: 'CloudFusion \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948',
            authSubtitle: '\u090F\u0915\u0940\u0915\u0943\u0924 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C, \u0905\u0928\u0902\u0924 \u0938\u0902\u092D\u093E\u0935\u0928\u093E\u090F\u0901',
            authLogin: '\u0932\u0949\u0917\u093F\u0928',
            authRegister: '\u0930\u091C\u093F\u0938\u094D\u091F\u0930',
            authEmail: '\u0908\u092E\u0947\u0932',
            authPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            authName: '\u0928\u093E\u092E',
            authRememberMe: '\u092E\u0941\u091D\u0947 \u092F\u093E\u0926 \u0930\u0916\u0947\u0902',
            authForgotPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092D\u0942\u0932 \u0917\u090F?',
            authPasswordHint: '\u0915\u092E \u0938\u0947 \u0915\u092E 8 \u0905\u0915\u094D\u0937\u0930, \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0914\u0930 \u0938\u0902\u0916\u094D\u092F\u093E\u0913\u0902 \u0915\u0947 \u0938\u093E\u0925',
            authFeatureSecure: '\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0914\u0930 \u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F\u0947\u0921',
            authFeatureMultiCloud: '\u092E\u0932\u094D\u091F\u0940-\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            authFeatureAnalytics: '\u0930\u093F\u092F\u0932-\u091F\u093E\u0907\u092E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            dashWelcome: '\u0935\u093E\u092A\u0938\u0940 \u092A\u0930 \u0938\u094D\u0935\u093E\u0917\u0924, ',
            dashSubtitle: '\u092F\u0939\u093E\u0901 \u0906\u092A\u0915\u093E \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0905\u0935\u0932\u094B\u0915\u0928 \u0939\u0948',
            dashTotalFiles: '\u0915\u0941\u0932 \u092B\u093C\u093E\u0907\u0932\u0947\u0902',
            dashStorageUsed: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0909\u092A\u092F\u094B\u0917',
            dashCloudServices: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E\u090F\u0901',
            dashSecurityScore: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            dashStorageUsage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0909\u092A\u092F\u094B\u0917',
            dashRecentFiles: '\u0939\u093E\u0932\u093F\u092F\u093E \u092B\u093C\u093E\u0907\u0932\u0947\u0902',
            dashCloudDistribution: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0935\u093F\u0924\u0930\u0923',
            uploadTitle: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902',
            uploadSubtitle: '\u0915\u0908 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0930\u0926\u093E\u0924\u093E\u0913\u0902 \u092A\u0930 \u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902',
            uploadDragDrop: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u092F\u0939\u093E\u0901 \u0916\u0940\u0902\u091A\u0947\u0902 \u0914\u0930 \u091B\u094B\u0921\u093C\u0947\u0902',
            uploadOr: '\u092F\u093E',
            uploadBrowse: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930\u0947\u0902',
            uploadMaxSize: '\u0905\u0927\u093F\u0915\u0924\u092E \u092B\u093C\u093E\u0907\u0932 \u0906\u0915\u093E\u0930: 100MB',
            uploadBtn: '\u0905\u092A\u0932\u094B\u0921',
            uploadSettings: '\u0905\u092A\u0932\u094B\u0921 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            uploadSelectCloud: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E \u091A\u0941\u0928\u0947\u0902',
            uploadFilePrivacy: '\u092B\u093C\u093E\u0907\u0932 \u0917\u094B\u092A\u0928\u0940\u092F\u0924\u093E',
            uploadAutoEncrypt: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0911\u091F\u094B-\u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (AES-256)',
            uploadSecFeatures: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901',
            uploadE2E: '\u2713 \u090F\u0902\u0921-\u091F\u0942-\u090F\u0902\u0921 \u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928',
            uploadSecTransfer: '\u2713 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092B\u093C\u093E\u0907\u0932 \u091F\u094D\u0930\u093E\u0902\u0938\u092B\u0930',
            uploadAccessCtrl: '\u2713 \u090F\u0915\u094D\u0938\u0947\u0938 \u0915\u0902\u091F\u094D\u0930\u094B\u0932',
            uploadActivityLog: '\u2713 \u0917\u0924\u093F\u0935\u093F\u0927\u093F \u0932\u0949\u0917\u093F\u0902\u0917',
            uploadPrivate: '\u0928\u093F\u091C\u0940',
            uploadPublic: '\u0938\u093E\u0930\u094D\u0935\u091C\u0928\u093F\u0915',
            filesTitle: '\u092E\u0947\u0930\u0940 \u092B\u093C\u093E\u0907\u0932\u0947\u0902',
            filesSubtitle: '\u0905\u092A\u0928\u0940 \u0938\u092D\u0940 \u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0917\u0908 \u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            filesAll: '\u0938\u092D\u0940 \u092B\u093C\u093E\u0907\u0932\u0947\u0902',
            filesSearch: '\u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0916\u094B\u091C\u0947\u0902',
            filesAllClouds: '\u0938\u092D\u0940 \u0915\u094D\u0932\u093E\u0909\u0921',
            filesRefresh: '\u21BB \u0930\u093F\u092B\u094D\u0930\u0947\u0936',
            analyticsTitle: '\u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            analyticsSubtitle: '\u0905\u092A\u0928\u0947 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0914\u0930 \u0909\u092A\u092F\u094B\u0917 \u0915\u0947 \u0906\u0902\u0915\u0921\u093C\u094B\u0902 \u0915\u0940 \u0928\u093F\u0917\u0930\u093E\u0928\u0940 \u0915\u0930\u0947\u0902',
            analyticsBandwidth: '\u0915\u0941\u0932 \u092C\u0948\u0902\u0921\u0935\u093F\u0921\u094D\u0925',
            analyticsRequests: '\u0915\u0941\u0932 \u0905\u0928\u0941\u0930\u094B\u0927',
            analyticsStorageTime: '\u0938\u092E\u092F \u0915\u0947 \u0938\u093E\u0925 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0909\u092A\u092F\u094B\u0917',
            analyticsFileType: '\u092B\u093C\u093E\u0907\u0932 \u092A\u094D\u0930\u0915\u093E\u0930 \u0935\u093F\u0924\u0930\u0923',
            analyticsCloudProvider: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E \u0935\u093F\u0924\u0930\u0923',
            secTitle: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            secSubtitle: '\u0905\u092A\u0928\u0940 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0914\u0930 \u0905\u0928\u0941\u092E\u0924\u093F\u092F\u093E\u0901 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            secPassMgmt: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092A\u094D\u0930\u092C\u0902\u0927\u0928',
            secPassDesc: '\u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0947\u0902 \u0915\u093F \u0906\u092A\u0915\u093E \u0916\u093E\u0924\u093E \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0930\u0939\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0932\u0902\u092C\u093E, \u092F\u093E\u0926\u0943\u091A\u094D\u091B\u093F\u0915 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0909\u092A\u092F\u094B\u0917 \u0915\u0930 \u0930\u0939\u093E \u0939\u0948\u0964',
            secCurPass: '\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            secNewPass: '\u0928\u092F\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            secUpdatePass: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0947\u0902',
            sec2FA: '\u0926\u094B-\u0915\u093E\u0930\u0915 \u092A\u094D\u0930\u092E\u093E\u0923\u0940\u0915\u0930\u0923 (2FA)',
            sec2FADesc: '\u0905\u092A\u0928\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u0940 \u090F\u0915 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092A\u0930\u0924 \u091C\u094B\u0921\u093C\u0947\u0902\u0964',
            secScanQR: '\u0905\u092A\u0928\u0947 \u0911\u0925\u0947\u0902\u091F\u093F\u0915\u0947\u091F\u0930 \u0910\u092A \u0938\u0947 \u0907\u0938 QR \u0915\u094B\u0921 \u0915\u094B \u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0947\u0902:',
            secManualKey: '\u092F\u093E \u092E\u0948\u0928\u094D\u092F\u0941\u0905\u0932\u0940 \u092F\u0939 \u0938\u0947\u091F\u0905\u092A \u0915\u0941\u0902\u091C\u0940 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902:',
            secEnterCode: '6-\u0905\u0902\u0915\u0940\u092F \u0915\u094B\u0921 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902',
            secVerify: '\u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902',
            secActiveSess: '\u0938\u0915\u094D\u0930\u093F\u092F \u0938\u0924\u094D\u0930',
            secActiveSessDesc: '\u0905\u0928\u094D\u092F \u0909\u092A\u0915\u0930\u0923\u094B\u0902 \u092A\u0930 \u0905\u092A\u0928\u0947 \u0938\u0915\u094D\u0930\u093F\u092F \u0938\u0924\u094D\u0930\u094B\u0902 \u0915\u094B \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0932\u0949\u0917 \u0906\u0909\u091F \u0915\u0930\u0947\u0902\u0964',
            secLogoutOther: '\u0905\u0928\u094D\u092F \u0909\u092A\u0915\u0930\u0923 \u0932\u0949\u0917 \u0906\u0909\u091F \u0915\u0930\u0947\u0902',
            secCurSession: '\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u0924\u094D\u0930',
            secActiveNow: '\u0905\u092D\u0940 \u0938\u0915\u094D\u0930\u093F\u092F',
            svcTitle: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E\u090F\u0901',
            svcSubtitle: '\u0905\u092A\u0928\u0940 \u0915\u0928\u0947\u0915\u094D\u091F\u0947\u0921 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E\u090F\u0901 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            svcChoosePlan: '\u0905\u092A\u0928\u093E \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0932\u093E\u0928 \u091A\u0941\u0928\u0947\u0902',
            svcPlanDesc: '\u0905\u092A\u0928\u093E \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u094D\u0930\u0940\u092E\u093F\u092F\u092E \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901 \u0905\u0928\u0932\u0949\u0915 \u0915\u0930\u0947\u0902\u0964',
            svcBasic: '\u092C\u0947\u0938\u093F\u0915',
            svcPro: '\u092A\u094D\u0930\u094B',
            svcEnterprise: '\u090F\u0902\u091F\u0930\u092A\u094D\u0930\u093E\u0907\u091C\u093C',
            svcPopular: '\u0938\u092C\u0938\u0947 \u0932\u094B\u0915\u092A\u094D\u0930\u093F\u092F',
            svcCurrentPlan: '\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092A\u094D\u0932\u093E\u0928',
            svcMo: '/\u092E\u093E\u0939',
            svc5GB: '5 GB \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcAllCloud: '\u0938\u092D\u0940 \u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E',
            svcStdSpeed: '\u0938\u094D\u091F\u0948\u0902\u0921\u0930\u094D\u0921 \u0938\u094D\u092A\u0940\u0921',
            svcPriority: '\u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E \u0938\u0939\u093E\u092F\u0924\u093E',
            svc100GB: '100 GB \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcHighSpeed: '\u0939\u093E\u0908 \u0938\u094D\u092A\u0940\u0921 \u0938\u093F\u0902\u0915',
            svc1TB: '1 TB+ \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcUnlimited: '\u0905\u0928\u0932\u093F\u092E\u093F\u091F\u0947\u0921 \u0938\u094D\u092A\u0940\u0921',
            svc247: '24/7 \u0938\u092E\u0930\u094D\u092A\u093F\u0924 \u0938\u0939\u093E\u092F\u0924\u093E'
        },
        mr: {
            navDashboard: '\u0921\u0945\u0936\u092C\u094B\u0930\u094D\u0921',
            navUpload: '\u092B\u093E\u0907\u0932\u094D\u0938 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u093E',
            navFiles: '\u092E\u093E\u091D\u094D\u092F\u093E \u092B\u093E\u0907\u0932\u094D\u0938',
            navAnalytics: '\u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            navSecurity: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            navServices: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E',
            navSettings: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            sideSecScore: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            sideLogout: '\u0932\u0949\u0917\u0906\u0909\u091F',
            authWelcome: 'CloudFusion \u092E\u0927\u094D\u092F\u0947 \u0906\u092A\u0932\u0947 \u0938\u094D\u0935\u093E\u0917\u0924 \u0906\u0939\u0947',
            authSubtitle: '\u090F\u0915\u0924\u094D\u0930\u093F\u0924 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C, \u0905\u092E\u0930\u094D\u092F\u093E\u0926 \u0936\u0915\u094D\u092F\u0924\u093E',
            authLogin: '\u0932\u0949\u0917\u093F\u0928',
            authRegister: '\u0928\u094B\u0902\u0926\u0923\u0940',
            authEmail: '\u0908\u092E\u0947\u0932',
            authPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            authName: '\u0928\u093E\u0935',
            authRememberMe: '\u092E\u0932\u093E \u0932\u0915\u094D\u0937\u093E\u0924 \u0920\u0947\u0935\u093E',
            authForgotPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0935\u093F\u0938\u0930\u0932\u093E\u0924?',
            authPasswordHint: '\u0915\u093F\u092E\u093E\u0928 8 \u0905\u0915\u094D\u0937\u0930\u0947, \u0905\u0915\u094D\u0937\u0930\u0947 \u0906\u0923\u093F \u0938\u0902\u0916\u094D\u092F\u093E \u0935\u093E\u092A\u0930\u093E',
            authFeatureSecure: '\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0906\u0923\u093F \u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F\u0947\u0921',
            authFeatureMultiCloud: '\u092E\u0932\u094D\u091F\u0940-\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            authFeatureAnalytics: '\u0930\u093F\u0905\u0932-\u091F\u093E\u0907\u092E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            dashWelcome: '\u092A\u0930\u0924 \u0938\u094D\u0935\u093E\u0917\u0924, ',
            dashSubtitle: '\u0939\u0947 \u0924\u0941\u092E\u091A\u0947 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u093F\u0939\u0902\u0917\u093E\u0935\u0932\u094B\u0915\u0928 \u0906\u0939\u0947',
            dashTotalFiles: '\u090F\u0915\u0942\u0923 \u092B\u093E\u0907\u0932\u094D\u0938',
            dashStorageUsed: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u093E\u092A\u0930',
            dashCloudServices: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E',
            dashSecurityScore: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            dashStorageUsage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u093E\u092A\u0930',
            dashRecentFiles: '\u0905\u0932\u0940\u0915\u0921\u0940\u0932 \u092B\u093E\u0907\u0932\u094D\u0938',
            dashCloudDistribution: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0935\u093F\u0924\u0930\u0923',
            uploadTitle: '\u092B\u093E\u0907\u0932\u094D\u0938 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u093E',
            uploadSubtitle: '\u0905\u0928\u0947\u0915 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0930\u0926\u093E\u0924\u094D\u092F\u093E\u0902\u0935\u0930 \u092B\u093E\u0907\u0932\u094D\u0938 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u093E',
            uploadDragDrop: '\u092B\u093E\u0907\u0932\u094D\u0938 \u0907\u0925\u0947 \u0921\u094D\u0930\u0945\u0917 \u0906\u0923\u093F \u0921\u094D\u0930\u0949\u092A \u0915\u0930\u093E',
            uploadOr: '\u0915\u093F\u0902\u0935\u093E',
            uploadBrowse: '\u092B\u093E\u0907\u0932\u094D\u0938 \u092C\u094D\u0930\u093E\u0909\u091D \u0915\u0930\u093E',
            uploadMaxSize: '\u0915\u092E\u093E\u0932 \u092B\u093E\u0907\u0932 \u0906\u0915\u093E\u0930: 100MB',
            uploadBtn: '\u0905\u092A\u0932\u094B\u0921',
            uploadSettings: '\u0905\u092A\u0932\u094B\u0921 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            uploadSelectCloud: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E \u0928\u093F\u0935\u0921\u093E',
            uploadFilePrivacy: '\u092B\u093E\u0907\u0932 \u0917\u094B\u092A\u0928\u0940\u092F\u0924\u093E',
            uploadAutoEncrypt: '\u092B\u093E\u0907\u0932\u094D\u0938 \u0911\u091F\u094B-\u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (AES-256)',
            uploadSecFeatures: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0935\u0948\u0936\u093F\u0937\u094D\u091F\u094D\u092F\u0947',
            uploadE2E: '\u2713 \u090F\u0902\u0921-\u091F\u0942-\u090F\u0902\u0921 \u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928',
            uploadSecTransfer: '\u2713 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092B\u093E\u0907\u0932 \u091F\u094D\u0930\u093E\u0928\u094D\u0938\u092B\u0930',
            uploadAccessCtrl: '\u2713 \u0905\u0945\u0915\u094D\u0938\u0947\u0938 \u0915\u0902\u091F\u094D\u0930\u094B\u0932',
            uploadActivityLog: '\u2713 \u0915\u094D\u0930\u093F\u092F\u093E\u0915\u0932\u093E\u092A \u0932\u0949\u0917\u093F\u0902\u0917',
            uploadPrivate: '\u0916\u093E\u091C\u0917\u0940',
            uploadPublic: '\u0938\u093E\u0930\u094D\u0935\u091C\u0928\u093F\u0915',
            filesTitle: '\u092E\u093E\u091D\u094D\u092F\u093E \u092B\u093E\u0907\u0932\u094D\u0938',
            filesSubtitle: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0938\u0930\u094D\u0935 \u0905\u092A\u0932\u094B\u0921 \u0915\u0947\u0932\u0947\u0932\u094D\u092F\u093E \u092B\u093E\u0907\u0932\u094D\u0938 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            filesAll: '\u0938\u0930\u094D\u0935 \u092B\u093E\u0907\u0932\u094D\u0938',
            filesSearch: '\u092B\u093E\u0907\u0932\u094D\u0938 \u0936\u094B\u0927\u093E',
            filesAllClouds: '\u0938\u0930\u094D\u0935 \u0915\u094D\u0932\u093E\u0909\u0921',
            filesRefresh: '\u21BB \u0930\u093F\u092B\u094D\u0930\u0947\u0936',
            analyticsTitle: '\u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923',
            analyticsSubtitle: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0906\u0923\u093F \u0935\u093E\u092A\u0930 \u0906\u0915\u0921\u0947\u0935\u093E\u0930\u0940\u091A\u0947 \u0928\u093F\u0930\u0940\u0915\u094D\u0937\u0923 \u0915\u0930\u093E',
            analyticsBandwidth: '\u090F\u0915\u0942\u0923 \u092C\u0945\u0902\u0921\u0935\u093F\u0921\u094D\u0925',
            analyticsRequests: '\u090F\u0915\u0942\u0923 \u0935\u093F\u0928\u0902\u0924\u094D\u092F\u093E',
            analyticsStorageTime: '\u0935\u0947\u0933\u0947\u0928\u0941\u0938\u093E\u0930 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u093E\u092A\u0930',
            analyticsFileType: '\u092B\u093E\u0907\u0932 \u092A\u094D\u0930\u0915\u093E\u0930 \u0935\u093F\u0924\u0930\u0923',
            analyticsCloudProvider: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E \u0935\u093F\u0924\u0930\u0923',
            secTitle: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            secSubtitle: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C \u0906\u0923\u093F \u092A\u0930\u0935\u093E\u0928\u0917\u094D\u092F\u093E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            secPassMgmt: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0928',
            secPassDesc: '\u0924\u0941\u092E\u091A\u0947 \u0916\u093E\u0924\u0947 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0930\u093E\u0939\u0923\u094D\u092F\u093E\u0938\u093E\u0920\u0940 \u0932\u093E\u0902\u092C, \u092F\u093E\u0926\u0943\u091A\u094D\u091B\u093F\u0915 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0935\u093E\u092A\u0930\u0924 \u0905\u0938\u0932\u094D\u092F\u093E\u091A\u0940 \u0916\u093E\u0924\u094D\u0930\u0940 \u0915\u0930\u093E.',
            secCurPass: '\u0938\u0927\u094D\u092F\u093E\u091A\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            secNewPass: '\u0928\u0935\u0940\u0928 \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            secUpdatePass: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u093E',
            sec2FA: '\u0926\u094D\u0935\u093F-\u0918\u091F\u0915 \u092A\u094D\u0930\u092E\u093E\u0923\u0940\u0915\u0930\u0923 (2FA)',
            sec2FADesc: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0916\u093E\u0924\u094D\u092F\u093E\u0924 \u0938\u0941\u0930\u0915\u094D\u0937\u0947\u091A\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0938\u094D\u0924\u0930 \u091C\u094B\u0921\u093E.',
            secScanQR: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0911\u0925\u0947\u0902\u091F\u093F\u0915\u0947\u091F\u0930 \u0905\u0945\u092A\u0928\u0947 \u0939\u093E QR \u0915\u094B\u0921 \u0938\u094D\u0915\u0945\u0928 \u0915\u0930\u093E:',
            secManualKey: '\u0915\u093F\u0902\u0935\u093E \u0939\u0940 \u0938\u0947\u091F\u0905\u092A \u0915\u0940 \u092E\u0945\u0928\u094D\u092F\u0941\u0905\u0932\u0940 \u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F \u0915\u0930\u093E:',
            secEnterCode: '6-\u0905\u0902\u0915\u0940 \u0915\u094B\u0921 \u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F \u0915\u0930\u093E',
            secVerify: '\u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            secActiveSess: '\u0938\u0915\u094D\u0930\u093F\u092F \u0938\u0924\u094D\u0930\u0947',
            secActiveSessDesc: '\u0907\u0924\u0930 \u0909\u092A\u0915\u0930\u0923\u093E\u0902\u0935\u0930\u0940\u0932 \u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0938\u0915\u094D\u0930\u093F\u092F \u0938\u0924\u094D\u0930\u093E\u0902\u091A\u0947 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0928 \u0915\u0930\u093E \u0906\u0923\u093F \u0932\u0949\u0917 \u0906\u0909\u091F \u0915\u0930\u093E.',
            secLogoutOther: '\u0907\u0924\u0930 \u0909\u092A\u0915\u0930\u0923\u0947 \u0932\u0949\u0917 \u0906\u0909\u091F \u0915\u0930\u093E',
            secCurSession: '\u0938\u0927\u094D\u092F\u093E\u091A\u0947 \u0938\u0924\u094D\u0930',
            secActiveNow: '\u0906\u0924\u093E \u0938\u0915\u094D\u0930\u093F\u092F',
            svcTitle: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E',
            svcSubtitle: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0947\u0932\u0947\u0932\u094D\u092F\u093E \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u0935\u093E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            svcChoosePlan: '\u0924\u0941\u092E\u091A\u093E \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0932\u0945\u0928 \u0928\u093F\u0935\u0921\u093E',
            svcPlanDesc: '\u0924\u0941\u092E\u091A\u0947 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u093E \u0906\u0923\u093F \u092A\u094D\u0930\u0940\u092E\u093F\u092F\u092E \u0935\u0948\u0936\u093F\u0937\u094D\u091F\u094D\u092F\u0947 \u0905\u0928\u0932\u0949\u0915 \u0915\u0930\u093E.',
            svcBasic: '\u092C\u0947\u0938\u093F\u0915',
            svcPro: '\u092A\u094D\u0930\u094B',
            svcEnterprise: '\u090F\u0902\u091F\u0930\u092A\u094D\u0930\u093E\u0907\u091D',
            svcPopular: '\u0938\u0930\u094D\u0935\u093E\u0924 \u0932\u094B\u0915\u092A\u094D\u0930\u093F\u092F',
            svcCurrentPlan: '\u0938\u0927\u094D\u092F\u093E\u091A\u093E \u092A\u094D\u0932\u0945\u0928',
            svcMo: '/\u092E\u0939\u093F\u0928\u093E',
            svc5GB: '5 GB \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcAllCloud: '\u0938\u0930\u094D\u0935 \u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u0947',
            svcStdSpeed: '\u0938\u094D\u091F\u0945\u0902\u0921\u0930\u094D\u0921 \u0938\u094D\u092A\u0940\u0921',
            svcPriority: '\u092A\u094D\u0930\u093E\u0927\u093E\u0928\u094D\u092F \u0938\u0939\u093E\u092F\u094D\u092F',
            svc100GB: '100 GB \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcHighSpeed: '\u0939\u093E\u092F \u0938\u094D\u092A\u0940\u0921 \u0938\u093F\u0902\u0915',
            svc1TB: '1 TB+ \u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            svcUnlimited: '\u0905\u0928\u0932\u093F\u092E\u093F\u091F\u0947\u0921 \u0938\u094D\u092A\u0940\u0921',
            svc247: '24/7 \u0938\u092E\u0930\u094D\u092A\u093F\u0924 \u0938\u0939\u093E\u092F\u094D\u092F'
        }
    };

    function setFirstText(el, text) {
        for (var i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) {
                el.childNodes[i].textContent = text + '\n            ';
                return;
            }
        }
    }

    function setLastText(el, text) {
        for (var i = el.childNodes.length - 1; i >= 0; i--) {
            if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) {
                el.childNodes[i].textContent = ' ' + text;
                return;
            }
        }
    }

    function t(sel, key, mode) {
        var el = document.querySelector(sel);
        if (!el || !dict[key]) return;
        if (mode === 'firstText') setFirstText(el, dict[key]);
        else if (mode === 'lastText') setLastText(el, dict[key]);
        else if (mode === 'placeholder') el.placeholder = dict[key];
        else el.textContent = dict[key];
    }

    var dict;

    window.applyGlobalLanguage = function(lang) {
        dict = globalDict[lang] || globalDict.en;

        // ── Sidebar ──
        t('.nav-btn[data-view="dashboard"] span', 'navDashboard');
        t('.nav-btn[data-view="upload"] span', 'navUpload');
        t('.nav-btn[data-view="files"] span', 'navFiles');
        t('.nav-btn[data-view="analytics"] span', 'navAnalytics');
        t('.nav-btn[data-view="security"] span', 'navSecurity');
        t('.nav-btn[data-view="services"] span', 'navServices');
        t('.nav-btn[data-view="settings"] span', 'navSettings');
        t('.side-card h3', 'sideSecScore');
        t('#sidebar-logout-btn span', 'sideLogout');

        // ── Auth View ──
        t('.auth-header h2', 'authWelcome');
        t('.auth-subtitle', 'authSubtitle');
        t('.tab[data-tab="login"]', 'authLogin');
        t('.tab[data-tab="register"]', 'authRegister');
        t('#login-form > label:nth-of-type(1)', 'authEmail', 'firstText');
        t('#login-form > label:nth-of-type(2)', 'authPassword', 'firstText');
        t('#login-form .primary', 'authLogin');
        t('.checkbox-label span', 'authRememberMe');
        t('.forgot-link', 'authForgotPassword');
        t('#register-form > label:nth-of-type(1)', 'authName', 'firstText');
        t('#register-form > label:nth-of-type(2)', 'authEmail', 'firstText');
        t('#register-form > label:nth-of-type(3)', 'authPassword', 'firstText');
        t('#register-form .primary', 'authRegister');
        t('.password-hint', 'authPasswordHint');
        t('.auth-features .feature-item:nth-child(1) span', 'authFeatureSecure');
        t('.auth-features .feature-item:nth-child(2) span', 'authFeatureMultiCloud');
        t('.auth-features .feature-item:nth-child(3) span', 'authFeatureAnalytics');

        // ── Dashboard View ──
        var dashH2 = document.querySelector('#dashboard-view > header h2');
        if (dashH2) {
            for (var i = 0; i < dashH2.childNodes.length; i++) {
                if (dashH2.childNodes[i].nodeType === 3 && dashH2.childNodes[i].textContent.trim()) {
                    dashH2.childNodes[i].textContent = dict.dashWelcome;
                    break;
                }
            }
        }
        t('#dashboard-view > header .muted', 'dashSubtitle');
        t('#dashboard-view .stats-grid .stat-card:nth-child(1) .stat-label', 'dashTotalFiles');
        t('#dashboard-view .stats-grid .stat-card:nth-child(2) .stat-label', 'dashStorageUsed');
        t('#dashboard-view .stats-grid .stat-card:nth-child(3) .stat-label', 'dashCloudServices');
        t('#dashboard-view .stats-grid .stat-card:nth-child(4) .stat-label', 'dashSecurityScore');
        t('.storage-panel h3', 'dashStorageUsage');
        t('.recent-panel h3', 'dashRecentFiles');
        t('.distribution-panel h3', 'dashCloudDistribution');

        // ── Upload View ──
        t('#upload-view > header h2', 'uploadTitle');
        t('#upload-view > header .muted', 'uploadSubtitle');
        t('.drop-text', 'uploadDragDrop');
        t('.drop-or', 'uploadOr');
        t('.btn-browse', 'uploadBrowse');
        t('.file-limits', 'uploadMaxSize');
        t('.btn-upload-submit', 'uploadBtn');
        t('.upload-settings .settings-title', 'uploadSettings');
        t('#upload-view label[for="upload-cloud"]', 'uploadSelectCloud');
        var uploadFormGroups = document.querySelectorAll('.upload-settings .form-group');
        if (uploadFormGroups[1]) {
            var lbl = uploadFormGroups[1].querySelector('label');
            if (lbl) lbl.textContent = dict.uploadFilePrivacy;
        }
        t('.upload-settings .checkbox-text', 'uploadAutoEncrypt');
        t('.upload-security-info h4', 'uploadSecFeatures');
        var secFeatureItems = document.querySelectorAll('.upload-security-info li');
        var secFeatureKeys = ['uploadE2E', 'uploadSecTransfer', 'uploadAccessCtrl', 'uploadActivityLog'];
        secFeatureItems.forEach(function(li, idx) {
            if (secFeatureKeys[idx] && dict[secFeatureKeys[idx]]) li.textContent = dict[secFeatureKeys[idx]];
        });
        var privacySelect = document.querySelector('.upload-settings select[name="privacy"]');
        if (privacySelect) {
            for (var j = 0; j < privacySelect.options.length; j++) {
                if (privacySelect.options[j].value === 'private') privacySelect.options[j].textContent = dict.uploadPrivate;
                if (privacySelect.options[j].value === 'public') privacySelect.options[j].textContent = dict.uploadPublic;
            }
        }

        // ── Files View ──
        t('#files-view > header h2', 'filesTitle');
        t('#files-view > header .muted', 'filesSubtitle');
        t('#files-view .section-head h3', 'filesAll');
        t('#search-input-files', 'filesSearch', 'placeholder');
        t('#refresh-btn-files', 'filesRefresh');
        var cloudFilterEl = document.getElementById('cloud-filter-files');
        if (cloudFilterEl && cloudFilterEl.options[0]) cloudFilterEl.options[0].textContent = dict.filesAllClouds;

        // ── Analytics View ──
        t('#analytics-view > header h2', 'analyticsTitle');
        t('#analytics-view > header .muted', 'analyticsSubtitle');
        t('#analytics-view .stats-grid .stat-card:nth-child(1) .stat-label', 'analyticsBandwidth');
        t('#analytics-view .stats-grid .stat-card:nth-child(2) .stat-label', 'analyticsRequests');
        t('#analytics-view > .full-width-panel h3', 'analyticsStorageTime');
        var analyticsPanels = document.querySelectorAll('#analytics-view .dashboard-sections .panel h3');
        if (analyticsPanels[0]) analyticsPanels[0].textContent = dict.analyticsFileType;
        if (analyticsPanels[1]) analyticsPanels[1].textContent = dict.analyticsCloudProvider;

        // ── Security View ──
        t('#security-view > header h2', 'secTitle');
        t('#security-view > header .muted', 'secSubtitle');
        var secPanels = document.querySelectorAll('.security-grid > .security-panel');
        if (secPanels[0]) {
            var h3p = secPanels[0].querySelector('h3');
            if (h3p) h3p.textContent = dict.secPassMgmt;
            var pp = secPanels[0].querySelector('p.muted');
            if (pp) pp.textContent = dict.secPassDesc;
        }
        t('#change-password-form > label:nth-of-type(1)', 'secCurPass', 'firstText');
        t('#change-password-form > label:nth-of-type(2)', 'secNewPass', 'firstText');
        t('#change-password-form .primary', 'secUpdatePass');
        if (secPanels[1]) {
            var h3t = secPanels[1].querySelector('h3');
            if (h3t) h3t.textContent = dict.sec2FA;
            var pt = secPanels[1].querySelector('.muted');
            if (pt) pt.textContent = dict.sec2FADesc;
        }
        t('#tfa-setup-container > .font-bold', 'secScanQR');
        var manualKeyP = document.querySelector('#tfa-setup-container > p.muted');
        if (manualKeyP) setFirstText(manualKeyP, dict.secManualKey);
        t('#tfa-code', 'secEnterCode', 'placeholder');
        t('#tfa-verify-form .primary', 'secVerify');
        if (secPanels[2]) {
            var h3s = secPanels[2].querySelector('h3');
            if (h3s) h3s.textContent = dict.secActiveSess;
            var ps = secPanels[2].querySelector('.muted');
            if (ps) ps.textContent = dict.secActiveSessDesc;
        }
        t('#revoke-sessions-btn', 'secLogoutOther');
        var sessionDevice = document.querySelector('.session-device');
        if (sessionDevice) {
            var badge = sessionDevice.querySelector('.badge');
            if (badge) badge.textContent = dict.secActiveNow;
            for (var k = 0; k < sessionDevice.childNodes.length; k++) {
                if (sessionDevice.childNodes[k].nodeType === 3 && sessionDevice.childNodes[k].textContent.trim()) {
                    sessionDevice.childNodes[k].textContent = dict.secCurSession + ' ';
                    break;
                }
            }
        }

        // ── Services View ──
        t('#services-view > header h2', 'svcTitle');
        t('#services-view > header .muted', 'svcSubtitle');
        t('.pricing-header h3', 'svcChoosePlan');
        t('.pricing-header .muted', 'svcPlanDesc');
        t('.popular-badge', 'svcPopular');
        var pricingCards = document.querySelectorAll('.pricing-card');
        var cardDefs = [
            { title: 'svcBasic', features: ['svc5GB', 'svcAllCloud', 'svcStdSpeed', 'svcPriority'] },
            { title: 'svcPro', features: ['svc100GB', 'svcAllCloud', 'svcHighSpeed', 'svcPriority'] },
            { title: 'svcEnterprise', features: ['svc1TB', 'svcAllCloud', 'svcUnlimited', 'svc247'] }
        ];
        pricingCards.forEach(function(card, ci) {
            if (!cardDefs[ci]) return;
            var h4 = card.querySelector('h4');
            if (h4) h4.textContent = dict[cardDefs[ci].title];
            var period = card.querySelector('.period');
            if (period) period.textContent = dict.svcMo;
            card.querySelectorAll('.features-list li').forEach(function(li, fi) {
                if (cardDefs[ci].features[fi]) setLastText(li, dict[cardDefs[ci].features[fi]]);
            });
        });
        var curPlanBtn = document.querySelector('.pricing-btn.current');
        if (curPlanBtn) curPlanBtn.textContent = dict.svcCurrentPlan;

        // ── Page title ──
        document.title = 'CloudFusion - ' + (dict.authFeatureMultiCloud || 'Multi-Cloud Storage');
    };

    // Apply saved language on load
    try {
        var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (s.language && s.language !== 'en') {
            window.applyGlobalLanguage(s.language);
        }
    } catch (e) {}
})();

// ═══════════════════════════════════════════
// SETTINGS PAGE — Fully Dynamic & Interactive
// ═══════════════════════════════════════════
(function initSettingsPage() {
    var SETTINGS_KEY = 'cloudfusion_settings';

    // ── Core helpers ──
    function loadSettings() {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    }

    function saveSettings(partial) {
        var cur = loadSettings();
        Object.assign(cur, partial);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(cur));
        updateSecurityScore();
    }
    var saved = loadSettings();

    function shakeElement(el) {
        if (!el) return;
        el.style.animation = 'stgShake 0.4s ease';
        el.addEventListener('animationend', function() { el.style.animation = ''; }, { once: true });
    }

    function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

    // ════════════════════════════════════════
    //  1. MULTILINGUAL SUPPORT (EN / HI / MR)
    // ════════════════════════════════════════
    var translations = {
        en: {
            settingsTitle: 'Settings',
            settingsSubtitle: 'Manage your preferences and account settings',
            logout: 'Logout',
            tabProfile: 'Profile',
            tabSecurity: 'Security',
            tabCloud: 'Cloud Providers',
            tabStorage: 'Storage',
            tabNotifications: 'Notifications',
            tabAppearance: 'Appearance',
            profileSettings: 'Profile Settings',
            profileDesc: 'Manage your personal information',
            fullName: 'Full Name',
            emailAddress: 'Email Address',
            phoneNumber: 'Phone Number',
            timezone: 'Timezone',
            saveChanges: 'Save Changes',
            changePassword: 'Change Password',
            securitySettings: 'Security Settings',
            securityDesc: 'Protect your account with enhanced security',
            twoFactorAuth: 'Two-Factor Authentication',
            twoFactorDesc: 'Add an extra layer of security with 2FA',
            currentPassword: 'Current Password',
            newPassword: 'New Password',
            confirmPassword: 'Confirm New Password',
            updatePassword: 'Update Password',
            loginActivity: 'Login Activity',
            loginActivityDesc: 'Recent logins to your account',
            activeDevices: 'Active Devices',
            activeDevicesDesc: 'Devices currently signed in',
            revoke: 'Revoke',
            cloudSettings: 'Cloud Provider Settings',
            cloudDesc: 'Connect and manage your cloud storage services',
            connect: 'Connect',
            disconnect: 'Disconnect',
            apiKey: 'API Key',
            projectId: 'Project ID',
            cloudName: 'Cloud Name',
            storagePrefs: 'Storage Preferences',
            storageDesc: 'Configure storage behavior and limits',
            defaultProvider: 'Default Cloud Provider',
            autoBackup: 'Auto Backup',
            autoBackupDesc: 'Automatically backup files to secondary cloud',
            fileVersioning: 'File Versioning',
            fileVersioningDesc: 'Keep previous versions of uploaded files',
            storageUsage: 'Storage Usage',
            notifSettings: 'Notification Settings',
            notifDesc: 'Control how you receive alerts and updates',
            emailNotif: 'Email Notifications',
            emailNotifDesc: 'Receive important updates via email',
            uploadAlerts: 'Upload Success Alerts',
            uploadAlertsDesc: 'Get notified when file uploads complete',
            securityAlerts: 'Security Alerts',
            securityAlertsDesc: 'Alert on suspicious login attempts',
            storageLimitWarn: 'Storage Limit Warning',
            storageLimitDesc: 'Notify when storage reaches 80% capacity',
            appearanceSettings: 'Appearance Settings',
            appearanceDesc: 'Customize the look and feel',
            darkMode: 'Dark Mode',
            darkModeDesc: 'Switch between light and dark themes',
            dashboardLayout: 'Dashboard Layout',
            layoutDefault: 'Default',
            layoutCompact: 'Compact',
            layoutWide: 'Wide',
            language: 'Language',
            secScoreTitle: 'Security Score',
            secProfile: 'Profile completed',
            secPassword: 'Password updated',
            secNotifs: 'Notifications enabled',
            secProvider: 'Cloud provider connected',
            sec2fa: '2FA enabled',
            cancel: 'Cancel',
            modalChangePass: 'Change Password'
        },
        hi: {
            settingsTitle: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            settingsSubtitle: '\u0905\u092A\u0928\u0940 \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E\u090F\u0901 \u0914\u0930 \u0916\u093E\u0924\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            logout: '\u0932\u0949\u0917\u0906\u0909\u091F',
            tabProfile: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932',
            tabSecurity: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            tabCloud: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E',
            tabStorage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            tabNotifications: '\u0938\u0942\u091A\u0928\u093E\u090F\u0901',
            tabAppearance: '\u0926\u093F\u0916\u093E\u0935\u091F',
            profileSettings: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            profileDesc: '\u0905\u092A\u0928\u0940 \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            fullName: '\u092A\u0942\u0930\u093E \u0928\u093E\u092E',
            emailAddress: '\u0908\u092E\u0947\u0932 \u092A\u0924\u093E',
            phoneNumber: '\u092B\u094B\u0928 \u0928\u0902\u092C\u0930',
            timezone: '\u0938\u092E\u092F \u0915\u094D\u0937\u0947\u0924\u094D\u0930',
            saveChanges: '\u092A\u0930\u093F\u0935\u0930\u094D\u0924\u0928 \u0938\u0939\u0947\u091C\u0947\u0902',
            changePassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092C\u0926\u0932\u0947\u0902',
            securitySettings: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            securityDesc: '\u092C\u0947\u0939\u0924\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u0947 \u0938\u093E\u0925 \u0905\u092A\u0928\u0947 \u0916\u093E\u0924\u0947 \u0915\u0940 \u0930\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902',
            twoFactorAuth: '\u0926\u094B-\u0915\u093E\u0930\u0915 \u092A\u094D\u0930\u092E\u093E\u0923\u0940\u0915\u0930\u0923',
            twoFactorDesc: '2FA \u0915\u0947 \u0938\u093E\u0925 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u0940 \u090F\u0915 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092A\u0930\u0924 \u091C\u094B\u0921\u093C\u0947\u0902',
            currentPassword: '\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            newPassword: '\u0928\u092F\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            confirmPassword: '\u0928\u092F\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902',
            updatePassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0947\u0902',
            loginActivity: '\u0932\u0949\u0917\u093F\u0928 \u0917\u0924\u093F\u0935\u093F\u0927\u093F',
            loginActivityDesc: '\u0906\u092A\u0915\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u0939\u093E\u0932 \u0915\u0947 \u0932\u0949\u0917\u093F\u0928',
            activeDevices: '\u0938\u0915\u094D\u0930\u093F\u092F \u0909\u092A\u0915\u0930\u0923',
            activeDevicesDesc: '\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0938\u093E\u0907\u0928 \u0907\u0928 \u0921\u093F\u0935\u093E\u0907\u0938',
            revoke: '\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902',
            cloudSettings: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            cloudDesc: '\u0905\u092A\u0928\u0940 \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0938\u0947\u0935\u093E\u0913\u0902 \u0915\u094B \u0915\u0928\u0947\u0915\u094D\u091F \u0914\u0930 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930\u0947\u0902',
            connect: '\u0915\u0928\u0947\u0915\u094D\u091F',
            disconnect: '\u0921\u093F\u0938\u094D\u0915\u0928\u0947\u0915\u094D\u091F',
            apiKey: 'API \u0915\u0941\u0902\u091C\u0940',
            projectId: '\u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F ID',
            cloudName: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0928\u093E\u092E',
            storagePrefs: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E\u090F\u0901',
            storageDesc: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u094D\u092F\u0935\u0939\u093E\u0930 \u0914\u0930 \u0938\u0940\u092E\u093E \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930 \u0915\u0930\u0947\u0902',
            defaultProvider: '\u0921\u093F\u092B\u0949\u0932\u094D\u091F \u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E',
            autoBackup: '\u0911\u091F\u094B \u092C\u0948\u0915\u0905\u092A',
            autoBackupDesc: '\u0938\u0947\u0915\u0947\u0902\u0921\u0930\u0940 \u0915\u094D\u0932\u093E\u0909\u0921 \u092E\u0947\u0902 \u0938\u094D\u0935\u091A\u093E\u0932\u093F\u0924 \u092C\u0948\u0915\u0905\u092A',
            fileVersioning: '\u092B\u093E\u0907\u0932 \u0935\u0930\u094D\u091C\u0928\u093F\u0902\u0917',
            fileVersioningDesc: '\u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0917\u0908 \u092B\u093E\u0907\u0932\u094B\u0902 \u0915\u0947 \u092A\u0941\u0930\u093E\u0928\u0947 \u0938\u0902\u0938\u094D\u0915\u0930\u0923 \u0930\u0916\u0947\u0902',
            storageUsage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0909\u092A\u092F\u094B\u0917',
            notifSettings: '\u0938\u0942\u091A\u0928\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            notifDesc: '\u0906\u092A \u0915\u0948\u0938\u0947 \u0905\u0932\u0930\u094D\u091F \u0914\u0930 \u0905\u092A\u0921\u0947\u091F \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u093F\u0924 \u0915\u0930\u0947\u0902',
            emailNotif: '\u0908\u092E\u0947\u0932 \u0938\u0942\u091A\u0928\u093E\u090F\u0901',
            emailNotifDesc: '\u0908\u092E\u0947\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0905\u092A\u0921\u0947\u091F \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0947\u0902',
            uploadAlerts: '\u0905\u092A\u0932\u094B\u0921 \u0938\u092B\u0932\u0924\u093E \u0905\u0932\u0930\u094D\u091F',
            uploadAlertsDesc: '\u092B\u093E\u0907\u0932 \u0905\u092A\u0932\u094B\u0921 \u092A\u0942\u0930\u093E \u0939\u094B\u0928\u0947 \u092A\u0930 \u0938\u0942\u091A\u0928\u093E \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0947\u0902',
            securityAlerts: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0905\u0932\u0930\u094D\u091F',
            securityAlertsDesc: '\u0938\u0902\u0926\u093F\u0917\u094D\u0927 \u0932\u0949\u0917\u093F\u0928 \u092A\u094D\u0930\u092F\u093E\u0938\u094B\u0902 \u092A\u0930 \u0905\u0932\u0930\u094D\u091F',
            storageLimitWarn: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0938\u0940\u092E\u093E \u091A\u0947\u0924\u093E\u0935\u0928\u0940',
            storageLimitDesc: '80% \u0915\u094D\u0937\u092E\u0924\u093E \u092A\u0930 \u0938\u0942\u091A\u093F\u0924 \u0915\u0930\u0947\u0902',
            appearanceSettings: '\u0926\u093F\u0916\u093E\u0935\u091F \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
            appearanceDesc: '\u0932\u0941\u0915 \u0914\u0930 \u0905\u0928\u0941\u092D\u0935 \u0915\u094B \u0915\u0938\u094D\u091F\u092E\u093E\u0907\u091C\u093C \u0915\u0930\u0947\u0902',
            darkMode: '\u0921\u093E\u0930\u094D\u0915 \u092E\u094B\u0921',
            darkModeDesc: '\u0932\u093E\u0907\u091F \u0914\u0930 \u0921\u093E\u0930\u094D\u0915 \u0925\u0940\u092E \u0915\u0947 \u092C\u0940\u091A \u0938\u094D\u0935\u093F\u091A \u0915\u0930\u0947\u0902',
            dashboardLayout: '\u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921 \u0932\u0947\u0906\u0909\u091F',
            layoutDefault: '\u0921\u093F\u092B\u0949\u0932\u094D\u091F',
            layoutCompact: '\u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F',
            layoutWide: '\u0935\u093E\u0907\u0921',
            language: '\u092D\u093E\u0937\u093E',
            secScoreTitle: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            secProfile: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u092A\u0942\u0930\u094D\u0923',
            secPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u093F\u092F\u093E',
            secNotifs: '\u0938\u0942\u091A\u0928\u093E\u090F\u0901 \u0938\u0915\u094D\u0937\u092E',
            secProvider: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E \u0915\u0928\u0947\u0915\u094D\u091F\u0947\u0921',
            sec2fa: '2FA \u0938\u0915\u094D\u0937\u092E',
            cancel: '\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902',
            modalChangePass: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092C\u0926\u0932\u0947\u0902'
        },
        mr: {
            settingsTitle: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            settingsSubtitle: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u092A\u094D\u0930\u093E\u0927\u093E\u0928\u094D\u092F\u0947 \u0906\u0923\u093F \u0916\u093E\u0924\u0947 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            logout: '\u0932\u0949\u0917\u0906\u0909\u091F',
            tabProfile: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932',
            tabSecurity: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
            tabCloud: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u0947',
            tabStorage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C',
            tabNotifications: '\u0938\u0942\u091A\u0928\u093E',
            tabAppearance: '\u0926\u0947\u0916\u093E\u0935\u093E',
            profileSettings: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            profileDesc: '\u0924\u0941\u092E\u091A\u0940 \u0935\u0948\u092F\u0915\u094D\u0924\u093F\u0915 \u092E\u093E\u0939\u093F\u0924\u0940 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            fullName: '\u092A\u0942\u0930\u094D\u0923 \u0928\u093E\u0935',
            emailAddress: '\u0908\u092E\u0947\u0932 \u092A\u0924\u094D\u0924\u093E',
            phoneNumber: '\u092B\u094B\u0928 \u0928\u0902\u092C\u0930',
            timezone: '\u0935\u0947\u0933 \u0915\u094D\u0937\u0947\u0924\u094D\u0930',
            saveChanges: '\u092C\u0926\u0932 \u091C\u0924\u0928 \u0915\u0930\u093E',
            changePassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092C\u0926\u0932\u093E',
            securitySettings: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            securityDesc: '\u0935\u0930\u094D\u0927\u093F\u0924 \u0938\u0941\u0930\u0915\u094D\u0937\u0947\u0938\u0939 \u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0916\u093E\u0924\u094D\u092F\u093E\u091A\u0947 \u0938\u0902\u0930\u0915\u094D\u0937\u0923 \u0915\u0930\u093E',
            twoFactorAuth: '\u0926\u094D\u0935\u093F-\u0918\u091F\u0915 \u092A\u094D\u0930\u092E\u093E\u0923\u0940\u0915\u0930\u0923',
            twoFactorDesc: '2FA \u0938\u0939 \u0938\u0941\u0930\u0915\u094D\u0937\u0947\u091A\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0938\u094D\u0924\u0930 \u091C\u094B\u0921\u093E',
            currentPassword: '\u0938\u0927\u094D\u092F\u093E\u091A\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            newPassword: '\u0928\u0935\u0940\u0928 \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
            confirmPassword: '\u0928\u0935\u0940\u0928 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0916\u093E\u0924\u094D\u0930\u0940 \u0915\u0930\u093E',
            updatePassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u093E',
            loginActivity: '\u0932\u0949\u0917\u093F\u0928 \u0915\u094D\u0930\u093F\u092F\u093E\u0915\u0932\u093E\u092A',
            loginActivityDesc: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0916\u093E\u0924\u094D\u092F\u093E\u0924\u0940\u0932 \u0905\u0932\u0940\u0915\u0921\u0940\u0932 \u0932\u0949\u0917\u093F\u0928',
            activeDevices: '\u0938\u0915\u094D\u0930\u093F\u092F \u0909\u092A\u0915\u0930\u0923\u0947',
            activeDevicesDesc: '\u0938\u0927\u094D\u092F\u093E \u0938\u093E\u0907\u0928 \u0907\u0928 \u0905\u0938\u0932\u0947\u0932\u0940 \u0909\u092A\u0915\u0930\u0923\u0947',
            revoke: '\u0930\u0926\u094D\u0926 \u0915\u0930\u093E',
            cloudSettings: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u0947 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            cloudDesc: '\u0924\u0941\u092E\u091A\u094D\u092F\u093E \u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0938\u0947\u0935\u093E \u0915\u0928\u0947\u0915\u094D\u091F \u0906\u0923\u093F \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u093E',
            connect: '\u0915\u0928\u0947\u0915\u094D\u091F',
            disconnect: '\u0921\u093F\u0938\u094D\u0915\u0928\u0947\u0915\u094D\u091F',
            apiKey: 'API \u0915\u0940',
            projectId: '\u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F ID',
            cloudName: '\u0915\u094D\u0932\u093E\u0909\u0921 \u0928\u093E\u0935',
            storagePrefs: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u094D\u0930\u093E\u0927\u093E\u0928\u094D\u092F\u0947',
            storageDesc: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u0930\u094D\u0924\u0928 \u0906\u0923\u093F \u092E\u0930\u094D\u092F\u093E\u0926\u093E \u0915\u0949\u0928\u094D\u092B\u093F\u0917\u0930 \u0915\u0930\u093E',
            defaultProvider: '\u0921\u093F\u092B\u0949\u0932\u094D\u091F \u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E',
            autoBackup: '\u0911\u091F\u094B \u092C\u0945\u0915\u0905\u092A',
            autoBackupDesc: '\u0926\u0941\u092F\u094D\u092F\u092E \u0915\u094D\u0932\u093E\u0909\u0921\u0935\u0930 \u0938\u094D\u0935\u092F\u0902\u091A\u0932\u093F\u0924 \u092C\u0945\u0915\u0905\u092A',
            fileVersioning: '\u092B\u093E\u0907\u0932 \u0935\u094D\u0939\u0930\u094D\u091C\u0928\u093F\u0902\u0917',
            fileVersioningDesc: '\u0905\u092A\u0932\u094B\u0921 \u0915\u0947\u0932\u0947\u0932\u094D\u092F\u093E \u092B\u093E\u0907\u0932\u094D\u0938\u091A\u0947 \u091C\u0941\u0928\u0947 \u0935\u094D\u0939\u0930\u094D\u091C\u0928 \u0920\u0947\u0935\u093E',
            storageUsage: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0935\u093E\u092A\u0930',
            notifSettings: '\u0938\u0942\u091A\u0928\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            notifDesc: '\u0924\u0941\u092E\u094D\u0939\u093E\u0932\u093E \u0905\u0932\u0930\u094D\u091F \u0906\u0923\u093F \u0905\u092A\u0921\u0947\u091F \u0915\u0938\u0947 \u092E\u093F\u0933\u0924\u093E\u0924 \u0924\u0947 \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u093F\u0924 \u0915\u0930\u093E',
            emailNotif: '\u0908\u092E\u0947\u0932 \u0938\u0942\u091A\u0928\u093E',
            emailNotifDesc: '\u0908\u092E\u0947\u0932\u0926\u094D\u0935\u093E\u0930\u0947 \u092E\u0939\u0924\u094D\u0924\u094D\u0935\u093E\u091A\u0947 \u0905\u092A\u0921\u0947\u091F \u092E\u093F\u0933\u0935\u093E',
            uploadAlerts: '\u0905\u092A\u0932\u094B\u0921 \u092F\u0936\u0938\u094D\u0935\u0940 \u0905\u0932\u0930\u094D\u091F',
            uploadAlertsDesc: '\u092B\u093E\u0907\u0932 \u0905\u092A\u0932\u094B\u0921 \u092A\u0942\u0930\u094D\u0923 \u091D\u093E\u0932\u094D\u092F\u093E\u0935\u0930 \u0938\u0942\u091A\u0928\u093E \u092E\u093F\u0933\u0935\u093E',
            securityAlerts: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0905\u0932\u0930\u094D\u091F',
            securityAlertsDesc: '\u0938\u0902\u0936\u092F\u093E\u0938\u094D\u092A\u0926 \u0932\u0949\u0917\u093F\u0928 \u092A\u094D\u0930\u092F\u0924\u094D\u0928\u093E\u0902\u0935\u0930 \u0905\u0932\u0930\u094D\u091F',
            storageLimitWarn: '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092E\u0930\u094D\u092F\u093E\u0926\u093E \u091A\u0947\u0924\u093E\u0935\u0923\u0940',
            storageLimitDesc: '80% \u0915\u094D\u0937\u092E\u0924\u0947\u0935\u0930 \u0938\u0942\u091A\u093F\u0924 \u0915\u0930\u093E',
            appearanceSettings: '\u0926\u0947\u0916\u093E\u0935\u093E \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u091C',
            appearanceDesc: '\u0926\u093F\u0938\u0923\u0947 \u0906\u0923\u093F \u0905\u0928\u0941\u092D\u0935 \u0938\u0915\u0938\u094D\u091F\u092E\u093E\u0907\u091D \u0915\u0930\u093E',
            darkMode: '\u0921\u093E\u0930\u094D\u0915 \u092E\u094B\u0921',
            darkModeDesc: '\u0932\u093E\u0907\u091F \u0906\u0923\u093F \u0921\u093E\u0930\u094D\u0915 \u0925\u0940\u092E \u092E\u0927\u094D\u092F\u0947 \u0938\u094D\u0935\u093F\u091A \u0915\u0930\u093E',
            dashboardLayout: '\u0921\u0945\u0936\u092C\u094B\u0930\u094D\u0921 \u0932\u0947\u0906\u0909\u091F',
            layoutDefault: '\u0921\u093F\u092B\u0949\u0932\u094D\u091F',
            layoutCompact: '\u0915\u0949\u092E\u094D\u092A\u0945\u0915\u094D\u091F',
            layoutWide: '\u0935\u093E\u0907\u0921',
            language: '\u092D\u093E\u0937\u093E',
            secScoreTitle: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u094D\u0915\u094B\u0930',
            secProfile: '\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u092A\u0942\u0930\u094D\u0923',
            secPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0905\u092A\u0921\u0947\u091F \u0915\u0947\u0932\u093E',
            secNotifs: '\u0938\u0942\u091A\u0928\u093E \u0938\u0915\u094D\u0937\u092E',
            secProvider: '\u0915\u094D\u0932\u093E\u0909\u0921 \u092A\u094D\u0930\u0926\u093E\u0924\u093E \u0915\u0928\u0947\u0915\u094D\u091F\u0947\u0921',
            sec2fa: '2FA \u0938\u0915\u094D\u0937\u092E',
            cancel: '\u0930\u0926\u094D\u0926 \u0915\u0930\u093E',
            modalChangePass: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092C\u0926\u0932\u093E'
        }
    };

    // Mapping: data-i18n attribute → translation key, applied to textContent
    var i18nMap = [
        { sel: '#settings-view > header h2', key: 'settingsTitle' },
        { sel: '#settings-view > header .muted', key: 'settingsSubtitle' },
        { sel: '#logout-btn-settings', key: 'logout' },
        { sel: '.stg-tab[data-stg="profile"]', key: 'tabProfile', mode: 'lastChild' },
        { sel: '.stg-tab[data-stg="security"]', key: 'tabSecurity', mode: 'lastChild' },
        { sel: '.stg-tab[data-stg="cloud"]', key: 'tabCloud', mode: 'lastChild' },
        { sel: '.stg-tab[data-stg="storage"]', key: 'tabStorage', mode: 'lastChild' },
        { sel: '.stg-tab[data-stg="notifications"]', key: 'tabNotifications', mode: 'lastChild' },
        { sel: '.stg-tab[data-stg="appearance"]', key: 'tabAppearance', mode: 'lastChild' },
        { sel: '#stg-profile .stg-card-header h3', key: 'profileSettings' },
        { sel: '#stg-profile .stg-card-header .muted', key: 'profileDesc' },
        { sel: '#stg-profile label[for="stg-name"], #stg-name ~ label, #stg-profile .stg-field:nth-child(1) label', key: 'fullName', mode: 'firstLabel' },
        { sel: '#stg-save-profile', key: 'saveChanges' },
        { sel: '#stg-change-password-link', key: 'changePassword' },
        { sel: '#stg-security .stg-card-header h3', key: 'securitySettings' },
        { sel: '#stg-security .stg-card-header .muted', key: 'securityDesc' },
        { sel: '#stg-update-pass', key: 'updatePassword' },
        { sel: '#stg-cloud .stg-card-header h3', key: 'cloudSettings' },
        { sel: '#stg-cloud .stg-card-header .muted', key: 'cloudDesc' },
        { sel: '#stg-storage .stg-card-header h3', key: 'storagePrefs' },
        { sel: '#stg-storage .stg-card-header .muted', key: 'storageDesc' },
        { sel: '#stg-notifications .stg-card-header h3', key: 'notifSettings' },
        { sel: '#stg-notifications .stg-card-header .muted', key: 'notifDesc' },
        { sel: '#stg-appearance .stg-card-header h3', key: 'appearanceSettings' },
        { sel: '#stg-appearance .stg-card-header .muted', key: 'appearanceDesc' },
        { sel: '#stg-password-modal .stg-modal-header h3', key: 'modalChangePass' },
        { sel: '#stg-modal-cancel', key: 'cancel' },
        { sel: '#stg-modal-submit', key: 'updatePassword' }
    ];

    function changeLanguage(lang) {
        var dict = translations[lang] || translations.en;
        // Apply mapped translations
        i18nMap.forEach(function(item) {
            var el = document.querySelector(item.sel);
            if (!el) return;
            if (item.mode === 'lastChild') {
                // For tabs: the last text node (after the SVG)
                var nodes = el.childNodes;
                for (var i = nodes.length - 1; i >= 0; i--) {
                    if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                        nodes[i].textContent = '\n            ' + dict[item.key] + '\n          ';
                        break;
                    }
                }
            } else {
                el.textContent = dict[item.key];
            }
        });

        // Translate toggle rows via data mapping
        var toggleTranslations = {
            'stg-2fa-toggle': { title: 'twoFactorAuth', desc: 'twoFactorDesc' },
            'stg-auto-backup': { title: 'autoBackup', desc: 'autoBackupDesc' },
            'stg-versioning': { title: 'fileVersioning', desc: 'fileVersioningDesc' },
            'stg-email-notif': { title: 'emailNotif', desc: 'emailNotifDesc' },
            'stg-upload-notif': { title: 'uploadAlerts', desc: 'uploadAlertsDesc' },
            'stg-security-notif': { title: 'securityAlerts', desc: 'securityAlertsDesc' },
            'stg-storage-notif': { title: 'storageLimitWarn', desc: 'storageLimitDesc' },
            'stg-dark-toggle': { title: 'darkMode', desc: 'darkModeDesc' }
        };
        Object.keys(toggleTranslations).forEach(function(id) {
            var toggle = document.getElementById(id);
            if (!toggle) return;
            var row = toggle.closest('.stg-toggle-row');
            if (!row) return;
            var titleEl = row.querySelector('.stg-toggle-title');
            var descEl = row.querySelector('.stg-toggle-desc');
            if (titleEl) titleEl.textContent = dict[toggleTranslations[id].title];
            if (descEl) descEl.textContent = dict[toggleTranslations[id].desc];
        });

        // Translate layout labels
        document.querySelectorAll('.stg-layout-opt').forEach(function(opt) {
            var layout = opt.dataset.layout;
            var span = opt.querySelector('span');
            if (span && layout === 'default') span.textContent = dict.layoutDefault;
            if (span && layout === 'compact') span.textContent = dict.layoutCompact;
            if (span && layout === 'wide') span.textContent = dict.layoutWide;
        });

        // Translate subsection headings
        var subheadings = {
            'Change Password': 'changePassword',
            'Login Activity': 'loginActivity',
            'Active Devices': 'activeDevices',
            'Dashboard Layout': 'dashboardLayout',
            'Storage Usage': 'storageUsage'
        };
        document.querySelectorAll('#settings-view .stg-subsection h4').forEach(function(h4) {
            Object.keys(subheadings).forEach(function(engText) {
                // Match either english or current text via key lookup
                var key = subheadings[engText];
                if (h4.textContent.trim() === engText || h4.dataset.i18nKey === key) {
                    h4.textContent = dict[key];
                    h4.dataset.i18nKey = key;
                }
            });
        });

        // Translate labels above the language and default provider selects
        var langLabel = document.getElementById('stg-language');
        if (langLabel && langLabel.parentNode) {
            var lbl = langLabel.parentNode.querySelector('label');
            if (lbl) lbl.textContent = dict.language;
        }
        var dpLabel = document.getElementById('stg-default-provider');
        if (dpLabel && dpLabel.parentNode) {
            var lbl2 = dpLabel.parentNode.querySelector('label');
            if (lbl2) lbl2.textContent = dict.defaultProvider;
        }

        // Translate form field labels via their associated input IDs
        var fieldLabels = {
            'stg-name': 'fullName',
            'stg-email': 'emailAddress',
            'stg-phone': 'phoneNumber',
            'stg-timezone': 'timezone',
            'stg-cur-pass': 'currentPassword',
            'stg-new-pass': 'newPassword',
            'stg-confirm-pass': 'confirmPassword',
            'stg-modal-cur-pass': 'currentPassword',
            'stg-modal-new-pass': 'newPassword',
            'stg-modal-confirm-pass': 'confirmPassword'
        };
        Object.keys(fieldLabels).forEach(function(id) {
            var input = document.getElementById(id);
            if (!input) return;
            var field = input.closest('.stg-field');
            if (!field) return;
            var lbl3 = field.querySelector('label');
            if (lbl3) lbl3.textContent = dict[fieldLabels[id]];
        });

        // Translate cloud provider field labels and buttons
        var providerLabels = { aws: 'apiKey', firebase: 'projectId', cloudinary: 'cloudName', supabase: 'apiKey' };
        Object.keys(providerLabels).forEach(function(prov) {
            var card = document.querySelector('.stg-provider-card[data-provider="' + prov + '"]');
            if (!card) return;
            var lbl4 = card.querySelector('.stg-field label');
            if (lbl4) lbl4.textContent = dict[providerLabels[prov]];
        });
        document.querySelectorAll('.stg-provider-toggle').forEach(function(btn) {
            if (btn.disabled) return;
            var card = btn.closest('.stg-provider-card');
            var connected = card && card.classList.contains('stg-provider-connected');
            btn.textContent = connected ? dict.disconnect : dict.connect;
        });
        document.querySelectorAll('.stg-btn-danger-sm[data-device]').forEach(function(btn) {
            btn.textContent = dict.revoke;
        });

        // Update security score labels
        updateSecurityScore();

        // Apply language to all other views (sidebar, dashboard, upload, etc.)
        if (typeof window.applyGlobalLanguage === 'function') {
            window.applyGlobalLanguage(lang);
        }

        saveSettings({ language: lang });
        var langNames = { en: 'English', hi: '\u0939\u093F\u0902\u0926\u0940', mr: '\u092E\u0930\u093E\u0920\u0940' };
        showToast('Language: ' + (langNames[lang] || lang), 'info');
    }

    // ════════════════════════════
    //  2. TAB SWITCHING
    // ════════════════════════════
    var stgTabs = document.querySelectorAll('.stg-tab');
    var stgSections = document.querySelectorAll('.stg-section');

    stgTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var target = tab.dataset.stg;
            stgTabs.forEach(function(t) { t.classList.remove('active'); });
            stgSections.forEach(function(s) {
                s.classList.remove('active');
                s.style.opacity = '0';
                s.style.transform = 'translateY(12px)';
            });
            tab.classList.add('active');
            var section = document.getElementById('stg-' + target);
            if (section) {
                section.classList.add('active');
                requestAnimationFrame(function() {
                    section.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    section.style.opacity = '1';
                    section.style.transform = 'translateY(0)';
                });
            }
            saveSettings({ lastTab: target });
        });
    });
    if (saved.lastTab) {
        var savedTab = document.querySelector('.stg-tab[data-stg="' + saved.lastTab + '"]');
        if (savedTab) savedTab.click();
    }

    // ════════════════════════════
    //  3. PROFILE SETTINGS
    // ════════════════════════════
    function syncSettingsProfile() {
        var user = (state && state.user) ? state.user : null;
        var firebaseUser = window.auth && window.auth.currentUser;
        var nameField = document.getElementById('stg-name');
        var emailField = document.getElementById('stg-email');
        var displayName = document.getElementById('stg-display-name');
        var displayEmail = document.getElementById('stg-display-email');
        var avatarPreview = document.getElementById('stg-avatar-preview');

        var name = (user && user.name) || (firebaseUser && firebaseUser.displayName) || saved.profileName || '';
        var email = (user && user.email) || (firebaseUser && firebaseUser.email) || saved.profileEmail || '';

        if (nameField) nameField.value = name;
        if (emailField) emailField.value = email;
        if (displayName) displayName.textContent = name || 'User';
        if (displayEmail) displayEmail.textContent = email || 'user@email.com';

        if (avatarPreview && !avatarPreview.querySelector('img')) {
            if (saved.avatarData) {
                avatarPreview.innerHTML = '<img src="' + saved.avatarData + '" alt="Avatar" />';
            } else if (name) {
                var initials = name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
                avatarPreview.innerHTML = '<span style="font-size:24px;font-weight:800;color:var(--accent)">' + initials + '</span>';
            }
        }

        var phoneField = document.getElementById('stg-phone');
        if (phoneField && saved.profilePhone) phoneField.value = saved.profilePhone;
        var tzField = document.getElementById('stg-timezone');
        if (tzField && saved.profileTimezone) tzField.value = saved.profileTimezone;
    }

    var settingsNavBtn = document.querySelector('.nav-btn[data-view="settings"]');
    if (settingsNavBtn) settingsNavBtn.addEventListener('click', function() {
        syncSettingsProfile();
        syncStorageBar();
        updateSecurityScore();
    });
    syncSettingsProfile();

    // ── Avatar Upload ──
    var avatarBtn = document.getElementById('stg-change-avatar');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function(e) {
                var file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var avPrev = document.getElementById('stg-avatar-preview');
                    if (avPrev) {
                        avPrev.innerHTML = '<img src="' + ev.target.result + '" alt="Avatar" />';
                        avPrev.style.animation = 'stgPulse 0.5s ease';
                        setTimeout(function() { avPrev.style.animation = ''; }, 500);
                    }
                    saveSettings({ avatarData: ev.target.result });
                    showToast('Avatar updated!', 'success');
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    // ── Save Profile (with dirty-state tracking) ──
    var saveProfileBtn = document.getElementById('stg-save-profile');
    var profileFields = ['stg-name', 'stg-email', 'stg-phone', 'stg-timezone'];
    var profileSnapshot = {};

    function captureProfileSnapshot() {
        profileFields.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) profileSnapshot[id] = el.value;
        });
    }

    function checkProfileDirty() {
        if (!saveProfileBtn) return;
        var dirty = false;
        profileFields.forEach(function(id) {
            var el = document.getElementById(id);
            if (el && el.value !== (profileSnapshot[id] || '')) dirty = true;
        });
        if (dirty) {
            saveProfileBtn.classList.remove('stg-btn-disabled');
        } else {
            saveProfileBtn.classList.add('stg-btn-disabled');
        }
    }

    profileFields.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', checkProfileDirty);
        if (el) el.addEventListener('change', checkProfileDirty);
    });

    function saveProfile() {
        var nameEl = document.getElementById('stg-name');
        var emailEl = document.getElementById('stg-email');
        var phoneEl = document.getElementById('stg-phone');
        var tzEl = document.getElementById('stg-timezone');
        var name = nameEl ? nameEl.value : '';
        var email = emailEl ? emailEl.value : '';
        var phone = phoneEl ? phoneEl.value : '';
        var timezone = tzEl ? tzEl.value : '';

        if (!name.trim()) {
            showToast('Name cannot be empty', 'error');
            shakeElement(nameEl);
            return;
        }
        if (!email.trim() || email.indexOf('@') === -1) {
            showToast('Enter a valid email', 'error');
            shakeElement(emailEl);
            return;
        }

        var dn = document.getElementById('stg-display-name');
        var de = document.getElementById('stg-display-email');
        if (dn) dn.textContent = name;
        if (de) de.textContent = email;
        if (typeof userName !== 'undefined' && userName) userName.textContent = name;

        var avPrev = document.getElementById('stg-avatar-preview');
        if (avPrev && !avPrev.querySelector('img')) {
            var initials = name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            avPrev.innerHTML = '<span style="font-size:24px;font-weight:800;color:var(--accent)">' + initials + '</span>';
        }

        saveSettings({ profileName: name, profileEmail: email, profilePhone: phone, profileTimezone: timezone });
        captureProfileSnapshot();
        checkProfileDirty();

        saveProfileBtn.textContent = 'Saved \u2713';
        saveProfileBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        setTimeout(function() {
            var s = loadSettings();
            var lang = s.language || 'en';
            var dict = translations[lang] || translations.en;
            saveProfileBtn.textContent = dict.saveChanges;
            saveProfileBtn.style.background = '';
        }, 2000);
        showToast('Profile saved successfully!', 'success');
    }

    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    captureProfileSnapshot();
    checkProfileDirty();

    // ════════════════════════════════
    //  4. CHANGE PASSWORD MODAL
    // ════════════════════════════════
    var passwordModal = document.getElementById('stg-password-modal');
    var modalCloseBtn = document.getElementById('stg-modal-close');
    var modalCancelBtn = document.getElementById('stg-modal-cancel');
    var modalSubmitBtn = document.getElementById('stg-modal-submit');
    var modalPassMsg = document.getElementById('stg-modal-pass-msg');

    function openPasswordModal() {
        if (passwordModal) {
            passwordModal.classList.add('active');
            setTimeout(function() {
                var cur = document.getElementById('stg-modal-cur-pass');
                if (cur) cur.focus();
            }, 350);
        }
    }

    function closePasswordModal() {
        if (passwordModal) {
            passwordModal.classList.remove('active');
            // Clear fields
            ['stg-modal-cur-pass', 'stg-modal-new-pass', 'stg-modal-confirm-pass'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (modalPassMsg) {
                modalPassMsg.textContent = '';
                modalPassMsg.className = 'stg-msg';
            }
        }
    }

    // Open modal from both the profile link and the security inline button
    var cpLink = document.getElementById('stg-change-password-link');
    if (cpLink) cpLink.addEventListener('click', openPasswordModal);

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePasswordModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closePasswordModal);
    if (passwordModal) {
        passwordModal.addEventListener('click', function(e) {
            if (e.target === passwordModal) closePasswordModal();
        });
    }

    // Password strength meter for the modal
    var modalNewPass = document.getElementById('stg-modal-new-pass');
    if (modalNewPass) {
        if (!document.getElementById('stg-modal-pass-strength')) {
            var bar = document.createElement('div');
            bar.id = 'stg-modal-pass-strength';
            bar.className = 'stg-pass-strength';
            bar.innerHTML = '<div class="stg-pass-strength-fill" id="stg-modal-strength-fill"></div><span class="stg-pass-strength-label" id="stg-modal-strength-label"></span>';
            modalNewPass.parentNode.appendChild(bar);
        }
        modalNewPass.addEventListener('input', function() {
            var val = modalNewPass.value;
            var fill = document.getElementById('stg-modal-strength-fill');
            var label = document.getElementById('stg-modal-strength-label');
            if (!fill || !label) return;
            var score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            var levels = [
                { w: '0%', color: '#94a3b8', text: '' },
                { w: '20%', color: '#ef4444', text: 'Weak' },
                { w: '40%', color: '#f97316', text: 'Fair' },
                { w: '60%', color: '#eab308', text: 'Good' },
                { w: '80%', color: '#22c55e', text: 'Strong' },
                { w: '100%', color: '#059669', text: 'Excellent' }
            ];
            var lv = levels[score];
            fill.style.width = lv.w;
            fill.style.background = lv.color;
            label.textContent = lv.text;
            label.style.color = lv.color;
        });
    }

    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', function() {
            var curEl = document.getElementById('stg-modal-cur-pass');
            var npEl = document.getElementById('stg-modal-new-pass');
            var cpEl = document.getElementById('stg-modal-confirm-pass');
            var cur = curEl ? curEl.value : '';
            var np = npEl ? npEl.value : '';
            var cp = cpEl ? cpEl.value : '';

            if (!cur || !np || !cp) {
                if (modalPassMsg) {
                    modalPassMsg.textContent = 'Please fill all fields.';
                    modalPassMsg.className = 'stg-msg stg-msg-error';
                }
                return;
            }
            if (np.length < 6) {
                if (modalPassMsg) {
                    modalPassMsg.textContent = 'Password must be at least 6 characters.';
                    modalPassMsg.className = 'stg-msg stg-msg-error';
                }
                shakeElement(npEl);
                return;
            }
            if (np !== cp) {
                if (modalPassMsg) {
                    modalPassMsg.textContent = 'New passwords do not match.';
                    modalPassMsg.className = 'stg-msg stg-msg-error';
                }
                shakeElement(cpEl);
                return;
            }

            // Success
            saveSettings({ passwordUpdated: true, passwordUpdatedAt: Date.now() });
            if (modalPassMsg) {
                modalPassMsg.textContent = 'Password updated successfully!';
                modalPassMsg.className = 'stg-msg stg-msg-success';
            }
            modalSubmitBtn.textContent = 'Updated \u2713';
            modalSubmitBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            setTimeout(function() {
                closePasswordModal();
                var s = loadSettings();
                var dict = translations[s.language || 'en'] || translations.en;
                modalSubmitBtn.textContent = dict.updatePassword;
                modalSubmitBtn.style.background = '';
            }, 1500);
            showToast('Password updated!', 'success');
        });
    }

    // Also keep the inline password form in Security tab working
    var inlineNewPass = document.getElementById('stg-new-pass');
    if (inlineNewPass) {
        if (!document.getElementById('stg-pass-strength')) {
            var bar2 = document.createElement('div');
            bar2.id = 'stg-pass-strength';
            bar2.className = 'stg-pass-strength';
            bar2.innerHTML = '<div class="stg-pass-strength-fill" id="stg-pass-strength-fill"></div><span class="stg-pass-strength-label" id="stg-pass-strength-label"></span>';
            inlineNewPass.parentNode.appendChild(bar2);
        }
        inlineNewPass.addEventListener('input', function() {
            var val = inlineNewPass.value;
            var fill = document.getElementById('stg-pass-strength-fill');
            var label = document.getElementById('stg-pass-strength-label');
            if (!fill || !label) return;
            var score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            var levels = [
                { w: '0%', color: '#94a3b8', text: '' },
                { w: '20%', color: '#ef4444', text: 'Weak' },
                { w: '40%', color: '#f97316', text: 'Fair' },
                { w: '60%', color: '#eab308', text: 'Good' },
                { w: '80%', color: '#22c55e', text: 'Strong' },
                { w: '100%', color: '#059669', text: 'Excellent' }
            ];
            var lv = levels[score];
            fill.style.width = lv.w;
            fill.style.background = lv.color;
            label.textContent = lv.text;
            label.style.color = lv.color;
        });
    }

    var updatePassBtn = document.getElementById('stg-update-pass');
    var passMsg = document.getElementById('stg-pass-msg');
    if (updatePassBtn) {
        updatePassBtn.addEventListener('click', function() {
            var curEl = document.getElementById('stg-cur-pass');
            var npEl = document.getElementById('stg-new-pass');
            var cpEl = document.getElementById('stg-confirm-pass');
            var cur = curEl ? curEl.value : '';
            var np = npEl ? npEl.value : '';
            var cp = cpEl ? cpEl.value : '';
            if (!cur || !np || !cp) {
                if (passMsg) {
                    passMsg.textContent = 'Please fill all fields.';
                    passMsg.className = 'stg-msg stg-msg-error';
                }
                return;
            }
            if (np !== cp) {
                if (passMsg) {
                    passMsg.textContent = 'New passwords do not match.';
                    passMsg.className = 'stg-msg stg-msg-error';
                }
                shakeElement(cpEl);
                return;
            }
            if (np.length < 6) {
                if (passMsg) {
                    passMsg.textContent = 'Password must be at least 6 characters.';
                    passMsg.className = 'stg-msg stg-msg-error';
                }
                shakeElement(npEl);
                return;
            }
            saveSettings({ passwordUpdated: true, passwordUpdatedAt: Date.now() });
            if (passMsg) {
                passMsg.textContent = 'Password updated successfully!';
                passMsg.className = 'stg-msg stg-msg-success';
            }
            updatePassBtn.textContent = 'Updated \u2713';
            updatePassBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            setTimeout(function() {
                var s = loadSettings();
                var dict = translations[s.language || 'en'] || translations.en;
                updatePassBtn.textContent = dict.updatePassword;
                updatePassBtn.style.background = '';
            }, 2500);
            if (curEl) curEl.value = '';
            if (npEl) npEl.value = '';
            if (cpEl) cpEl.value = '';
            var fill = document.getElementById('stg-pass-strength-fill');
            var label = document.getElementById('stg-pass-strength-label');
            if (fill) fill.style.width = '0%';
            if (label) label.textContent = '';
            showToast('Password updated!', 'success');
        });
    }

    // ════════════════════════════
    //  5. 2FA TOGGLE
    // ════════════════════════════
    var tfa = document.getElementById('stg-2fa-toggle');
    if (tfa) {
        if (saved.twoFactorEnabled) tfa.checked = true;
        tfa.addEventListener('change', function() {
            saveSettings({ twoFactorEnabled: tfa.checked });
            showToast(tfa.checked ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled', tfa.checked ? 'success' : 'info');
        });
    }

    // ════════════════════════════
    //  6. DEVICE REVOKE
    // ════════════════════════════
    document.querySelectorAll('.stg-btn-danger-sm[data-device]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var device = btn.dataset.device;
            var item = btn.closest('.stg-device-item');
            if (item) {
                item.style.transition = 'all 0.4s ease';
                item.style.transform = 'translateX(30px)';
                item.style.opacity = '0';
                setTimeout(function() {
                    item.style.height = item.offsetHeight + 'px';
                    requestAnimationFrame(function() {
                        item.style.height = '0';
                        item.style.padding = '0';
                        item.style.margin = '0';
                        item.style.overflow = 'hidden';
                    });
                    setTimeout(function() { item.remove(); }, 350);
                }, 350);
            }
            showToast('Device "' + device + '" session revoked', 'success');
        });
    });

    // ════════════════════════════════════
    //  7. CLOUD PROVIDER CONNECT/DISCONNECT
    // ════════════════════════════════════
    function connectProvider(provider, btn) {
        var card = btn.closest('.stg-provider-card');
        var statusEl = document.getElementById('stg-' + provider + '-status');
        var isConnected = statusEl && statusEl.textContent.trim() === 'Connected';
        var s = loadSettings();
        var dict = translations[s.language || 'en'] || translations.en;

        if (isConnected) {
            if (statusEl) {
                statusEl.textContent = 'Not Connected';
                statusEl.className = 'stg-badge stg-badge-muted';
            }
            btn.textContent = dict.connect;
            btn.className = 'stg-btn-primary stg-provider-toggle';
            btn.style.width = '100%';
            btn.style.marginTop = '10px';
            if (card) card.classList.remove('stg-provider-connected');
            saveSettings({
                ['provider_' + provider]: false
            });
            showToast(capitalize(provider) + ' disconnected', 'info');
        } else {
            var keyInput = card ? card.querySelector('.stg-api-key') : null;
            if (keyInput && !keyInput.value.trim()) {
                showToast('Please enter an API key / ID first', 'error');
                shakeElement(keyInput);
                if (keyInput.focus) keyInput.focus();
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<span class="stg-spinner"></span> Connecting...';
            setTimeout(function() {
                btn.disabled = false;
                if (statusEl) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'stg-badge stg-badge-ok';
                }
                btn.textContent = dict.disconnect;
                btn.className = 'stg-btn-danger-sm stg-provider-toggle';
                btn.style.width = '100%';
                btn.style.marginTop = '10px';
                if (card) card.classList.add('stg-provider-connected');
                var keyVal = keyInput ? keyInput.value : '';
                saveSettings({
                    ['provider_' + provider]: true,
                    ['apikey_' + provider]: keyVal
                });
                showToast(capitalize(provider) + ' connected successfully!', 'success');
            }, 1200);
        }
    }

    // Restore provider states from localStorage
    ['aws', 'firebase', 'cloudinary', 'supabase'].forEach(function(p) {
        var key = 'provider_' + p;
        if (saved[key] !== undefined) {
            var statusEl = document.getElementById('stg-' + p + '-status');
            var card = document.querySelector('.stg-provider-card[data-provider="' + p + '"]');
            var btn = card ? card.querySelector('.stg-provider-toggle') : null;
            if (saved[key]) {
                if (statusEl) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'stg-badge stg-badge-ok';
                }
                if (btn) {
                    btn.textContent = 'Disconnect';
                    btn.className = 'stg-btn-danger-sm stg-provider-toggle';
                    btn.style.width = '100%';
                    btn.style.marginTop = '10px';
                }
                if (card) card.classList.add('stg-provider-connected');
            } else {
                if (statusEl) {
                    statusEl.textContent = 'Not Connected';
                    statusEl.className = 'stg-badge stg-badge-muted';
                }
                if (btn) {
                    btn.textContent = 'Connect';
                    btn.className = 'stg-btn-primary stg-provider-toggle';
                    btn.style.width = '100%';
                    btn.style.marginTop = '10px';
                }
                if (card) card.classList.remove('stg-provider-connected');
            }
        }
    });

    // Restore saved API keys
    ['aws', 'firebase', 'cloudinary', 'supabase'].forEach(function(p) {
        var apiKeyInput = document.querySelector('.stg-api-key[data-provider="' + p + '"]');
        if (apiKeyInput && saved['apikey_' + p]) {
            apiKeyInput.value = saved['apikey_' + p];
        }
    });

    document.querySelectorAll('.stg-provider-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            connectProvider(btn.dataset.provider, btn);
        });
    });

    // ── API Key visibility toggles ──
    document.querySelectorAll('.stg-api-key').forEach(function(input) {
        if (input.type !== 'password') return;
        var wrapper = input.parentNode;
        if (!wrapper.querySelector('.stg-eye-btn')) {
            var eyeBtn = document.createElement('button');
            eyeBtn.type = 'button';
            eyeBtn.className = 'stg-eye-btn';
            eyeBtn.title = 'Show/hide';
            eyeBtn.innerHTML = '\uD83D\uDC41';
            eyeBtn.addEventListener('click', function() {
                input.type = input.type === 'password' ? 'text' : 'password';
                eyeBtn.innerHTML = input.type === 'password' ? '\uD83D\uDC41' : '\uD83D\uDE48';
            });
            wrapper.style.position = 'relative';
            wrapper.appendChild(eyeBtn);
        }
    });

    // ════════════════════════════
    //  8. DARK MODE (bidirectional)
    // ════════════════════════════
    var darkToggle = document.getElementById('stg-dark-toggle');
    if (darkToggle) {
        darkToggle.checked = document.body.classList.contains('dark-theme');
        darkToggle.addEventListener('change', function() {
            toggleTheme();
            darkToggle.checked = document.body.classList.contains('dark-theme');
        });
        var observer = new MutationObserver(function() {
            darkToggle.checked = document.body.classList.contains('dark-theme');
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // ════════════════════════════
    //  9. LAYOUT SELECTION
    // ════════════════════════════
    function applyLayout(layout) {
        var app = document.querySelector('.app');
        if (!app) return;
        app.classList.remove('layout-compact', 'layout-wide');
        if (layout === 'compact') app.classList.add('layout-compact');
        else if (layout === 'wide') app.classList.add('layout-wide');

        // Set tooltip data attributes for collapsed sidebar
        document.querySelectorAll('.nav-btn').forEach(function(btn) {
            var span = btn.querySelector('span');
            if (span) btn.setAttribute('data-tooltip', span.textContent.trim());
        });
    }

    document.querySelectorAll('.stg-layout-opt').forEach(function(opt) {
        if (saved.layout === opt.dataset.layout) {
            document.querySelectorAll('.stg-layout-opt').forEach(function(o) { o.classList.remove('active'); });
            opt.classList.add('active');
        }
        opt.addEventListener('click', function() {
            document.querySelectorAll('.stg-layout-opt').forEach(function(o) { o.classList.remove('active'); });
            opt.classList.add('active');
            saveSettings({ layout: opt.dataset.layout });
            applyLayout(opt.dataset.layout);
            showToast('Layout: ' + opt.dataset.layout, 'info');
        });
    });

    // Apply saved layout on load
    if (saved.layout) applyLayout(saved.layout);

    // ════════════════════════════
    //  10. DEFAULT PROVIDER
    // ════════════════════════════
    var defProvider = document.getElementById('stg-default-provider');
    if (defProvider) {
        if (saved.defaultProvider) defProvider.value = saved.defaultProvider;
        defProvider.addEventListener('change', function() {
            saveSettings({ defaultProvider: defProvider.value });
            showToast('Default provider: ' + capitalize(defProvider.value), 'info');
        });
    }

    // ════════════════════════════
    //  11. ALL TOGGLES (persist)
    // ════════════════════════════
    var allToggles = ['stg-email-notif', 'stg-upload-notif', 'stg-security-notif', 'stg-storage-notif', 'stg-auto-backup', 'stg-versioning'];
    allToggles.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (saved['toggle_' + id] !== undefined) el.checked = saved['toggle_' + id];
        el.addEventListener('change', function() {
            var row = el.closest('.stg-toggle-row');
            var titleEl = row ? row.querySelector('.stg-toggle-title') : null;
            var title = titleEl ? titleEl.textContent : 'Setting';
            saveSettings({
                ['toggle_' + id]: el.checked
            });
            if (row) {
                row.style.transition = 'background 0.3s';
                row.style.background = el.checked ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.04)';
                setTimeout(function() { row.style.background = ''; }, 1500);
            }
            showToast(title + ' ' + (el.checked ? 'enabled' : 'disabled'), el.checked ? 'success' : 'info');
        });
    });

    // ════════════════════════════
    //  12. LANGUAGE SELECTOR
    // ════════════════════════════
    var langSelect = document.getElementById('stg-language');
    if (langSelect) {
        if (saved.language) langSelect.value = saved.language;
        langSelect.addEventListener('change', function() {
            changeLanguage(langSelect.value);
        });
    }

    // ════════════════════════════
    //  13. STORAGE BAR SYNC
    // ════════════════════════════
    function syncStorageBar() {
        if (!state || !state.summary) return;
        var used = state.summary.storageUsedMB || 0;
        var max = 5 * 1024;
        var pct = Math.min((used / max) * 100, 100);
        var usedEl = document.getElementById('stg-used');
        var fillEl = document.getElementById('stg-storage-fill');
        if (usedEl) usedEl.textContent = used < 1024 ? used.toFixed(1) + ' MB' : (used / 1024).toFixed(2) + ' GB';
        if (fillEl) {
            fillEl.style.width = '0%';
            requestAnimationFrame(function() {
                fillEl.style.transition = 'width 1.2s ease';
                fillEl.style.width = pct + '%';
            });
        }
        // Update storage breakdown from real data
        var breakdownEl = document.querySelector('.stg-storage-breakdown');
        if (breakdownEl && state.summary.byCloud && state.summary.byCloud.length > 0) {
            var colors = { aws: '#FF9900', firebase: '#FFCA28', cloudinary: '#6C63FF', supabase: '#3ECF8E' };
            breakdownEl.innerHTML = '';
            state.summary.byCloud.forEach(function(item) {
                var sizeMB = (item.totalBytes / (1024 * 1024)).toFixed(1);
                var color = colors[item.cloudService] || '#6366f1';
                var name = item.cloudService.charAt(0).toUpperCase() + item.cloudService.slice(1);
                var seg = document.createElement('div');
                seg.className = 'stg-storage-segment';
                seg.innerHTML = '<span class="stg-dot" style="background:' + color + ';"></span><span>' + name + ' \u2014 ' + sizeMB + ' MB</span>';
                breakdownEl.appendChild(seg);
            });
        }
    }
    syncStorageBar();

    // ════════════════════════════════════
    //  14. DYNAMIC SECURITY SCORE
    // ════════════════════════════════════
    function updateSecurityScore() {
        var s = loadSettings();
        var dict = translations[s.language || 'en'] || translations.en;
        var checks = [
            { key: 'secProfile', done: !!(s.profileName && s.profileEmail) },
            { key: 'secPassword', done: !!s.passwordUpdated },
            { key: 'secNotifs', done: s['toggle_stg-email-notif'] !== false && s['toggle_stg-security-notif'] !== false },
            { key: 'secProvider', done: !!(s.provider_aws || s.provider_firebase || s.provider_cloudinary || s.provider_supabase) },
            { key: 'sec2fa', done: !!s.twoFactorEnabled }
        ];
        var doneCount = 0;
        checks.forEach(function(c) { if (c.done) doneCount++; });
        var pct = Math.round((doneCount / checks.length) * 100);

        // Update sidebar security score
        var sideScore = document.getElementById('security-score');
        var sideBar = document.getElementById('security-bar');
        if (sideScore) sideScore.textContent = pct + '%';
        if (sideBar) {
            sideBar.style.width = pct + '%';
            if (pct >= 80) sideBar.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            else if (pct >= 50) sideBar.style.background = 'linear-gradient(135deg, #eab308, #f59e0b)';
            else sideBar.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
        }

        // Render score card inside profile section
        var profileBody = document.querySelector('#stg-profile .stg-card-body');
        if (!profileBody) return;

        var scoreCard = document.getElementById('stg-security-score-card');
        if (!scoreCard) {
            scoreCard = document.createElement('div');
            scoreCard.id = 'stg-security-score-card';
            scoreCard.className = 'stg-score-card';
            profileBody.appendChild(scoreCard);
        }

        var barColor = pct >= 80 ?
            'linear-gradient(135deg, #059669, #10b981)' :
            pct >= 50 ?
            'linear-gradient(135deg, #eab308, #f59e0b)' :
            'linear-gradient(135deg, #ef4444, #f97316)';

        var checklistHtml = '';
        checks.forEach(function(c) {
            checklistHtml += '<div class="stg-score-item"><span class="stg-score-icon ' + (c.done ? 'done' : 'pending') + '">' + (c.done ? '\u2713' : '\u2717') + '</span><span>' + dict[c.key] + '</span></div>';
        });

        scoreCard.innerHTML = '<div class="stg-score-header"><h4>' + dict.secScoreTitle + '</h4><span class="stg-score-value">' + pct + '%</span></div>' +
            '<div class="stg-score-bar-outer"><div class="stg-score-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
            '<div class="stg-score-checks">' + checklistHtml + '</div>';
    }
    updateSecurityScore();

    // ════════════════════════════
    //  15. HEADER BUTTONS
    // ════════════════════════════
    var stgThemeBtn = document.getElementById('theme-toggle-settings');
    if (stgThemeBtn) stgThemeBtn.addEventListener('click', toggleTheme);
    var stgLogoutBtn = document.getElementById('logout-btn-settings');
    if (stgLogoutBtn) stgLogoutBtn.addEventListener('click', function() { if (window.auth) window.auth.signOut(); });

    // ════════════════════════════
    //  16. APPLY SAVED LANGUAGE ON LOAD
    // ════════════════════════════
    if (saved.language && saved.language !== 'en') {
        changeLanguage(saved.language);
    }
})();
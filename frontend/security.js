/* ── SECURITY LOGIC ────────────────────────────────────────────── */

// Password Management
const changePasswordForm = document.getElementById("change-password-form");
const passwordMessage = document.getElementById("password-message");

if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (passwordMessage) passwordMessage.textContent = "";

        const formData = new FormData(changePasswordForm);
        const currentPassword = formData.get("currentPassword");
        const newPassword = formData.get("newPassword");

        try {
            const user = window.auth.currentUser;
            if (!user) throw new Error("Not logged in");

            // Re-authenticate user before changing password
            const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // Update password
            await user.updatePassword(newPassword);

            showToast("Password updated successfully!", "success");
            changePasswordForm.reset();
        } catch (error) {
            if (passwordMessage) {
                passwordMessage.textContent = error.message;
                passwordMessage.style.color = "var(--danger)";
            }
            showToast(error.message, "error");
        }
    });
}

// Global variable to store the setup intent
let tfSetupSecret = null;

// Load Security Data (2FA & Sessions)
const loadSecurityData = async () => {
    try {
        const data = await apiRequest("/security/status");

        // 1. Update 2FA Toggle State
        const tfaToggle = document.getElementById("tfa-toggle");
        if (tfaToggle) {
            tfaToggle.checked = data.twoFactorEnabled;
        }

        // 2. Render Sessions
        const sessionsList = document.getElementById("sessions-list");
        if (sessionsList && data.sessions) {
            sessionsList.innerHTML = "";
            const activeSessionId = state.token; // Rough approximation for demo

            data.sessions.forEach(session => {
                // Determine if this is the "Current Session"
                const isCurrent = Date.now() - new Date(session.lastActive).getTime() < 1000 * 60 * 5; // within 5 mins for demo

                const deviceName = session.device || "Unknown Device";
                const osName = session.os || "Unknown OS";
                const browser = session.browser || "Unknown Browser";

                const badge = isCurrent ? `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; margin-left: 8px;">Active Now</span>` : "";

                // Choose icon based on OS (very basic switch)
                let iconPath = `<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>`;

                if (osName.toLowerCase().includes('windows')) {
                    iconPath = `<path d="M4 11V4h7v7H4zm8 0V2h8v9h-8zm-8 8v-7h7v7H4zm8 0v-9h8v9h-8z"/>`; // Approximate Windows flag
                } else if (osName.toLowerCase().includes('mac') || osName.toLowerCase().includes('ios')) {
                    iconPath = `<path d="M12 20.592c-5.076 0-8.918-4.254-8.918-9.404..."/>`; // (Placeholder Apple)
                } else if (osName.toLowerCase().includes('android')) {
                    iconPath = `<path d="M17.523 15.3414c-.5511..."/>`; // (Placeholder Android)
                }

                sessionsList.innerHTML += `
                    <div class="session-item">
                        <div class="session-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                ${iconPath}
                            </svg>
                        </div>
                        <div class="session-details">
                            <div class="session-device">${isCurrent ? 'Current Session' : deviceName} ${badge}</div>
                            <div class="session-meta">${osName} • ${browser} • IP: ${session.ip || 'Unknown'} • Last Active: ${new Date(session.lastActive).toLocaleString()}</div>
                        </div>
                    </div>
                `;
            });

            if (data.sessions.length === 0) {
                sessionsList.innerHTML = `<div class="muted">No active sessions found.</div>`;
            }
        }
    } catch (e) {
        console.error("Failed to load security data:", e);
    }
};

const handleTfaToggle = async (e) => {
    const isChecked = e.target.checked;
    const setupContainer = document.getElementById("tfa-setup-container");
    const tfaMessage = document.getElementById("tfa-message");

    if (tfaMessage) tfaMessage.textContent = "";

    try {
        if (isChecked) {
            // Enable flow requested: Fetch QR Code from backend
            setupContainer.classList.remove("hidden");
            const data = await apiRequest("/security/2fa/setup", { method: "POST" });
            console.log("2FA Setup Data received:", data);

            // Render QR Code using a generic img tag attached to Google Charts API (or the raw SVG if backend returns node-qrcode string)
            const qrcodeDiv = document.getElementById("qrcode");
            if (qrcodeDiv) {
                console.log("QR Code div found, injecting image:", data.qrCodeUrl);
                qrcodeDiv.innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code" width="150" height="150" />`;
            } else {
                console.error("qrcode element not found in DOM");
            }

            const secretText = document.getElementById("tfa-secret-text");
            if (secretText) {
                secretText.textContent = data.secret;
            } else {
                console.error("tfa-secret-text element not found in DOM");
            }

            tfSetupSecret = data.secret;

        } else {
            // Disable flow requested: Disable immediately on backend
            setupContainer.classList.add("hidden");
            if (confirm("Are you sure you want to disable Two-Factor Authentication? This makes your account less secure.")) {
                await apiRequest("/security/2fa/disable", { method: "POST" });
                showToast("Two-Factor Authentication disabled.", "info");
                tfSetupSecret = null;
            } else {
                e.target.checked = true; // Revert toggle
            }
        }
    } catch (error) {
        showToast("Error updating 2FA: " + error.message, "error");
        e.target.checked = !isChecked; // Revert
        setupContainer.classList.add("hidden");
    }
};

const tfaVerifyForm = document.getElementById("tfa-verify-form");
if (tfaVerifyForm) {
    tfaVerifyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById("tfa-code");
        const code = codeInput.value;
        const msg = document.getElementById("tfa-message");
        if (msg) msg.textContent = "";

        try {
            await apiRequest("/security/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: code, secret: tfSetupSecret })
            });

            showToast("2FA successfully enabled!", "success");
            msg.textContent = "Verified!";
            msg.style.color = "var(--success)";
            codeInput.value = "";
            document.getElementById("tfa-setup-container").classList.add("hidden");

        } catch (error) {
            if (msg) {
                msg.textContent = error.message;
                msg.style.color = "var(--danger)";
            }
        }
    });
}

const revokeSessionsBtn = document.getElementById("revoke-sessions-btn");
if (revokeSessionsBtn) {
    revokeSessionsBtn.addEventListener("click", async () => {
        if (confirm("This will log out all other devices currently signed into your account. Continue?")) {
            try {
                await apiRequest("/security/sessions/revoke", { method: "POST" });
                showToast("All other sessions have been revoked.", "success");
                await loadSecurityData(); // Reload session list
            } catch (e) {
                showToast("Error revoking sessions: " + e.message, "error");
            }
        }
    });
}

// Attach toggle listener globally once
const tfaToggleEl = document.getElementById("tfa-toggle");
if (tfaToggleEl) {
    tfaToggleEl.addEventListener("change", handleTfaToggle);
}

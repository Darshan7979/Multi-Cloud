const buildEmailLayout = ({ heading, intro, body, buttonText, buttonUrl }) => {
        return `
        <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
                <div style="background:#111827;color:#ffffff;padding:20px 24px;">
                    <h1 style="margin:0;font-size:22px;">${heading}</h1>
                </div>
                <div style="padding:24px;color:#374151;line-height:1.7;">
                    <p style="margin:0 0 12px;">${intro}</p>
                    <p style="margin:0 0 20px;">${body}</p>
                    ${buttonUrl ? `<a href="${buttonUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${buttonText}</a>` : ""}
                    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">If you did not request this email, you can ignore it.</p>
                </div>
            </div>
        </div>
    `;
};

const buildWelcomeEmailTemplate = ({ name, appUrl }) => {
    const safeName = name || "there";
    const loginUrl = appUrl || "http://localhost:5500";

    return {
        subject: "Welcome to CloudFusion",
        text: `Hi ${safeName}, welcome to CloudFusion. Your account is ready. Visit ${loginUrl} to start uploading files.`,
        html: buildEmailLayout({
            heading: "Welcome to CloudFusion",
            intro: `Hi ${safeName},`,
            body: "Your account has been created successfully. You can now securely upload, manage, and track files across cloud providers.",
            buttonText: "Open Dashboard",
            buttonUrl: loginUrl,
        }),
    };
};

const buildLoginNotificationEmailTemplate = ({ name, appUrl }) => {
    const safeName = name || "there";
    const dashboardUrl = appUrl || "http://localhost:5500";

    return {
        subject: "New login to your CloudFusion account",
        text: `Hi ${safeName}, a login to your CloudFusion account was detected. If this was you, no action is needed. Dashboard: ${dashboardUrl}`,
        html: buildEmailLayout({
            heading: "Login Alert",
            intro: `Hi ${safeName},`,
            body: "A successful login to your CloudFusion account was detected. If this was not you, please secure your account immediately.",
            buttonText: "Open Dashboard",
            buttonUrl: dashboardUrl,
        }),
    };
};

const buildShortlistedCandidateEmailTemplate = ({ name, detailsUrl }) => {
    const safeName = name || "Candidate";

    return {
        subject: "Update on Your Application",
        text: `Hi ${safeName}, congratulations. You have been shortlisted. Please review the next steps here: ${detailsUrl || ""}`,
        html: buildEmailLayout({
            heading: "You Are Shortlisted",
            intro: `Hi ${safeName},`,
            body: "Great news. You have been shortlisted for the next stage. Please check the details and schedule your next step.",
            buttonText: "View Next Steps",
            buttonUrl: detailsUrl,
        }),
    };
};

const buildRejectionEmailTemplate = ({ name, careersUrl }) => {
    const safeName = name || "Candidate";

    return {
        subject: "Application Status Update",
        text: `Hi ${safeName}, thank you for your interest. We will not be moving forward right now, but we encourage you to apply again. ${careersUrl || ""}`,
        html: buildEmailLayout({
            heading: "Thank You for Applying",
            intro: `Hi ${safeName},`,
            body: "Thank you for your time and interest. We will not proceed with your application at this stage, but we appreciate your effort and encourage future applications.",
            buttonText: "Explore Opportunities",
            buttonUrl: careersUrl,
        }),
    };
};

module.exports = {
    buildWelcomeEmailTemplate,
    buildLoginNotificationEmailTemplate,
    buildShortlistedCandidateEmailTemplate,
    buildRejectionEmailTemplate,
};
const { sendEmail } = require("./sendEmail");

const toTitleCase = (value) => {
    const safeValue = String(value || "").trim();
    if (!safeValue) {
        return "N/A";
    }
    return safeValue.charAt(0).toUpperCase() + safeValue.slice(1);
};

const formatSize = (sizeBytes) => {
    const bytes = Number(sizeBytes);
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "N/A";
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatUploadTime = (value) => {
    if (!value) {
        return "N/A";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toISOString();
};

const escapeHtml = (value) =>
    String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendUploadSuccessEmail = async({ toEmail, uploadDetails = {} }) => {
    const cloudPlatform = toTitleCase(uploadDetails.cloudService);
    const fileName = uploadDetails.originalName || "N/A";
    const mimeType = uploadDetails.mimeType || "N/A";
    const fileSize = formatSize(uploadDetails.sizeBytes);
    const privacy = toTitleCase(uploadDetails.privacy);
    const uploadTime = formatUploadTime(uploadDetails.uploadTime);
    const fileUrl = uploadDetails.fileUrl || "N/A";

    const textLines = [
        "Your file has been uploaded successfully.",
        "",
        "Upload details:",
        `- Cloud Platform: ${cloudPlatform}`,
        `- File Name: ${fileName}`,
        `- File Type: ${mimeType}`,
        `- File Size: ${fileSize}`,
        `- Privacy: ${privacy}`,
        `- Upload Time: ${uploadTime}`,
        `- File URL: ${fileUrl}`,
        "",
        "Thank you for using CloudFusion.",
    ];

    const detailsRows = [
            { label: "Cloud Platform", value: cloudPlatform },
            { label: "File Name", value: fileName },
            { label: "File Type", value: mimeType },
            { label: "File Size", value: fileSize },
            { label: "Privacy", value: privacy },
            { label: "Upload Time", value: uploadTime },
            { label: "File URL", value: fileUrl },
        ]
        .map(
            ({ label, value }) =>
            `<tr><td style=\"padding:8px 0;color:#6b7280;font-size:14px;width:160px;\">${escapeHtml(label)}</td><td style=\"padding:8px 0;color:#111827;font-size:14px;font-weight:600;\">${escapeHtml(value)}</td></tr>`
        )
        .join("");

    try {
        const emailResult = await sendEmail({
            to: toEmail,
            subject: "File uploaded successfully",
            text: textLines.join("\n"),
            html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;"><h2 style="color:#111827;margin-bottom:8px;">Upload Successful</h2><p style="font-size:15px;line-height:1.6;color:#374151;">Your file has been uploaded successfully.</p><table style="width:100%;border-collapse:collapse;margin:12px 0 16px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${detailsRows}</table><p style="font-size:15px;line-height:1.6;color:#374151;">Thank you for using CloudFusion.</p></div>`,
        });
        console.log(`[email] Upload notification sent to ${toEmail}`);
        return { sent: true, messageId: emailResult.messageId };
    } catch (err) {
        const detail = err.message || "unknown-email-error";
        console.error("[email] Send failed:", detail);
        if (detail.includes("not configured")) {
            return { sent: false, reason: "not-configured", detail };
        }
        if (detail.toLowerCase().includes("not activated")) {
            return { sent: false, reason: "smtp-not-activated", detail };
        }
        return { sent: false, reason: "send-error", detail };
    }
};

module.exports = { sendUploadSuccessEmail };
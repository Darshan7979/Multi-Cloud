const nodemailer = require("nodemailer");

let cachedTransporter = null;
let cachedFromAddress = null;
let debugLogged = false;

const getEmailConfig = () => {
    const emailUser = String(process.env.EMAIL_USER || "").trim();
    const emailPass = String(process.env.EMAIL_PASS || "").trim();

    if (!debugLogged) {
        console.log(`[email] EMAIL_USER loaded: ${emailUser || "NOT_SET"}`);
        debugLogged = true;
    }

    if (!emailUser || !emailPass) {
        throw new Error("EMAIL_USER and EMAIL_PASS are not configured");
    }

    return {
        emailUser,
        emailPass,
    };
};

const getTransporter = () => {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const { emailUser, emailPass } = getEmailConfig();

    cachedFromAddress = emailUser;
    cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });

    return cachedTransporter;
};

const sendEmail = async({ to, subject, text, html }) => {
    if (!to || !subject || !text) {
        throw new Error("Invalid email payload: to, subject, and text are required");
    }

    try {
        const transporter = getTransporter();

        const info = await transporter.sendMail({
            from: `"CloudFusion" <${cachedFromAddress}>`,
            to,
            subject,
            text,
            html,
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        const message = String(error.message || "");

        if (message.includes("Username and Password not accepted") || message.includes("Invalid login")) {
            error.message = "Gmail SMTP authentication failed. Use EMAIL_USER as your Gmail address and EMAIL_PASS as a Gmail App Password (not your normal Gmail password).";
        } else if (message.includes("EMAIL_USER and EMAIL_PASS are not configured")) {
            error.message = "EMAIL_USER and EMAIL_PASS are not configured";
        }

        console.error("[email] sendEmail failed:", error.message);
        throw error;
    }
};

module.exports = { sendEmail };
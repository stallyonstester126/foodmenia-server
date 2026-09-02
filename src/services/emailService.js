import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class EmailService {
  /**
   * Generic sender function utilizing Brevo (Sendinblue) Transactional API (v3)
   */
  static async sendEmail({ to, name, subject, htmlContent }) {
    const apiKey = (env.BREVO.API_KEY || "").replace(/^["']|["']$/g, "").trim();
    const senderName = (env.BREVO.SENDER_NAME || "FoodMenia").replace(/^["']|["']$/g, "").trim();
    const senderEmail = (env.BREVO.SENDER_EMAIL || "stallyons.tester125@gmail.com").replace(/^["']|["']$/g, "").trim();

    // If BREVO_API_KEY is not configured, log email to console for development/test fallback
    if (!apiKey || apiKey === "") {
      logger.info(`📧 [BREVO SIMULATOR - NO API KEY]`);
      logger.info(`   To: ${name ? `${name} <${to}>` : to}`);
      logger.info(`   Subject: ${subject}`);
      logger.info(`   Sender: ${senderName} <${senderEmail}>`);
      return { success: true, simulated: true };
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: to,
              name: name || to.split("@")[0],
            },
          ],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Brevo API Email Error (${response.status}):`, errorData);
        return { success: false, error: errorData };
      }

      const responseData = await response.json().catch(() => ({}));
      logger.info(`✅ [BREVO EMAIL SENT] To: ${to} | MessageId: ${responseData.messageId || "ok"}`);
      return { success: true, data: responseData };
    } catch (err) {
      logger.error("Failed to send email via Brevo REST API:", err);
      return { success: false, error: err };
    }
  }

  /**
   * Send Account Verification OTP Email
   */
  static async sendAccountVerificationOTP(email, name, otpCode) {
    const subject = `${otpCode} is your FoodMenia Account Verification Code`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2B1B0E; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; tracking-tight: -0.5px;">
                food<span style="color: #FCBA08;">menia</span>
              </h1>
              <p style="margin: 5px 0 0 0; color: #E5E7EB; font-size: 12px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                Account Verification
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1A1A1A; font-size: 20px; font-weight: 700;">
                Hello ${name || "Foodie"},
              </h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                Thank you for joining FoodMenia! Please use the 6-digit verification code below to confirm your email address and complete your registration.
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #FCBA08; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="display: block; color: #2B1B0E; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your Verification OTP Code
                </span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; color: #2B1B0E; letter-spacing: 8px; display: inline-block;">
                  ${otpCode}
                </span>
              </div>

              <p style="margin: 0 0 12px 0; color: #6B7280; font-size: 13px; line-height: 1.5;">
                ⏱ <strong>This code expires in 15 minutes.</strong> If you did not sign up for a FoodMenia account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                © 2026 FoodMenia Delivery Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, name, subject, htmlContent });
  }

  /**
   * Send Forgot Password OTP Email
   */
  static async sendForgotPasswordOTP(email, name, otpCode) {
    const subject = `${otpCode} is your Password Reset Code - FoodMenia`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2B1B0E; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; tracking-tight: -0.5px;">
                food<span style="color: #FCBA08;">menia</span>
              </h1>
              <p style="margin: 5px 0 0 0; color: #FCBA08; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                Security & Password Reset
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1A1A1A; font-size: 20px; font-weight: 700;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                We received a request to reset your FoodMenia account password. Please enter the 6-digit security code below to reset your password.
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #2B1B0E; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px; border: 2px solid #FCBA08;">
                <span style="display: block; color: #FCBA08; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                  Your Password Reset Code
                </span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; display: inline-block;">
                  ${otpCode}
                </span>
              </div>

              <p style="margin: 0 0 12px 0; color: #6B7280; font-size: 13px; line-height: 1.5;">
                ⏱ <strong>This code is valid for 15 minutes.</strong>
              </p>
              <p style="margin: 0; color: #DC2626; font-size: 12px; line-height: 1.5;">
                ⚠️ <strong>Security Note:</strong> Never share this code with anyone. FoodMenia staff will never ask for your security code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                © 2026 FoodMenia Delivery Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, name, subject, htmlContent });
  }
}

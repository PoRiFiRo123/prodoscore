import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || '');

export interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const { to, subject, html, from = 'Prodathon <noreply@prodathon.dev>' } = options;

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk emails to multiple recipients
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string
) {
  const results = [];

  // Send emails in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const batchPromises = batch.map(email =>
      sendEmail({ to: [email], subject, html })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    total: recipients.length,
    success: successCount,
    failed: failureCount,
    results,
  };
}

/**
 * Convert markdown to HTML for email
 */
export function markdownToHtml(markdown: string): string {
  // Basic markdown to HTML conversion
  // For production, you might want to use a library like marked
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 16px 0 8px 0; color: #1f2937;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 20px 0 10px 0; color: #111827;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="margin: 24px 0 12px 0; color: #000000;">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" style="color: #3b82f6; text-decoration: underline;">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/gim, '</p><p style="margin: 8px 0;">');
  html = html.replace(/\n/gim, '<br>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li style="margin-left: 20px;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p style="margin: 8px 0;">${html}</p>`;
  }

  return html;
}

/**
 * Create email template wrapper
 */
export function createEmailTemplate(content: string, title?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Prodathon Notification'}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🏆 Prodathon</h1>
                  <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Hackathon Judging System</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    This email was sent by Prodathon Judging System<br>
                    Developed by Nishit R Kirani | BNM Institute of Technology
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate check-in link email template
 */
export function createCheckinEmailTemplate(
  teamName: string,
  teamNumber: string,
  checkinUrl: string
): string {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #111827;">Hello ${teamName}!</h2>
    <p style="margin: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Welcome to Prodathon! We're excited to have you participate in this amazing hackathon.
    </p>
    <p style="margin: 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Your team has been successfully registered with the following details:
    </p>
    <table style="margin: 16px 0; background-color: #f9fafb; border-radius: 6px; padding: 16px; width: 100%;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Team Name:</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${teamName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Team Number:</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${teamNumber}</td>
      </tr>
    </table>
    <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-left: 4px solid #667eea; border-radius: 4px;">
      <h3 style="margin: 0 0 12px 0; color: #4f46e5; font-size: 18px;">📋 Important: Check-in Required</h3>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        Before your presentation, you must check in using your unique QR code. Click the button below to access your check-in page:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td align="center">
            <a href="${checkinUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Access Your Check-in Page
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 12px;">
        💡 Tip: Bookmark this page or take a screenshot of your QR code for easy access!
      </p>
    </div>
    <p style="margin: 16px 0 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      <strong>Check-in Instructions:</strong>
    </p>
    <ol style="margin: 8px 0 16px 20px; padding: 0; color: #374151; font-size: 14px; line-height: 1.8;">
      <li>Open your check-in page using the button above</li>
      <li>Show your QR code to the admin at the registration desk</li>
      <li>Wait for confirmation of your check-in</li>
      <li>Proceed to your assigned room for presentation</li>
    </ol>
    <p style="margin: 16px 0; color: #374151; font-size: 14px; line-height: 1.6;">
      If you have any questions or need assistance, please don't hesitate to reach out to our team.
    </p>
    <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">
      Best of luck! 🚀<br>
      <span style="color: #6b7280; font-size: 14px;">The Prodathon Team</span>
    </p>
  `;

  return createEmailTemplate(content, `Check-in Information - ${teamName}`);
}

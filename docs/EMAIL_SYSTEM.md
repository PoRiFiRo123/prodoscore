# Email System Documentation

## Overview

The Prodathon Judging System includes a comprehensive email management system that allows administrators to send custom emails to teams and automatically send check-in links.

## Features

### ✅ Custom Email Composer
- **Markdown Editor**: Write emails using Markdown syntax with live preview
- **Visual Preview**: See exactly how your email will look before sending
- **HTML Email Templates**: Professional, responsive email templates
- **Bulk Sending**: Send to multiple teams at once

### ✅ Automated Check-in Links
- Send check-in page links to all teams
- Includes team details and QR code access
- Pre-formatted professional template
- One-click mass distribution

### ✅ Recipient Management
- Select individual teams or send to all
- Filter teams with/without email addresses
- Track email statistics
- Visual status indicators

## Setup Instructions

### 1. Get a Resend API Key

1. Visit [Resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Go to **API Keys** section
4. Create a new API key
5. Copy your API key (starts with `re_`)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Resend API key to `.env`:
   ```env
   VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. (Optional) Configure custom sender:
   ```env
   VITE_EMAIL_FROM=Your Event Name <noreply@yourdomain.com>
   ```

### 3. Verify Domain (Production)

For production use, you need to verify your domain with Resend:

1. Go to Resend Dashboard → Domains
2. Add your domain
3. Add the provided DNS records to your domain
4. Wait for verification (usually a few minutes)

**Note**: For development/testing, you can use Resend's test domain without verification.

## Usage Guide

### Accessing Email Management

1. Log in as an admin
2. Navigate to **Dashboard → Emails**

### Sending Check-in Links

**Option 1: Send to All Teams**
1. Click "Send Check-in Links to All"
2. Confirm the action
3. All teams with email addresses will receive their unique check-in links

**Option 2: Send to Selected Teams**
1. Go to "Manage Recipients" tab
2. Select teams using checkboxes
3. Click "Send to Selected"

### Composing Custom Emails

1. Go to "Compose Custom Email" tab
2. Enter subject line
3. Write your email content using Markdown
4. Switch to "Preview" tab to see the rendered email
5. Go to "Manage Recipients" and select teams
6. Click "Send Email"

### Markdown Syntax Guide

The email composer supports full Markdown formatting:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

[Link text](https://example.com)

* Bullet point 1
* Bullet point 2

1. Numbered item 1
2. Numbered item 2
```

## Email Templates

### Check-in Email Template

Automatically includes:
- Team name and number
- Professional branding
- QR code access button
- Check-in instructions
- Responsive design

### Custom Email Template

Features:
- Branded header with gradient
- Clean, readable content area
- Professional footer
- Mobile-responsive layout
- Dark/light mode compatible

## Technical Details

### Libraries Used

- **Resend**: Email delivery API
- **react-markdown**: Markdown rendering
- **remark-gfm**: GitHub Flavored Markdown support

### Rate Limits

- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Pro Tier**: Custom limits available

### Email Delivery

- Emails are sent in batches of 10
- 1-second delay between batches
- Respects Resend API rate limits
- Error handling and retry logic

### Security

- API keys stored in environment variables
- Server-side validation
- No client-side exposure of sensitive data
- Team email addresses protected

## Best Practices

### ✅ Do

- Test emails with yourself first
- Preview emails before sending
- Use clear, concise subject lines
- Include call-to-action buttons
- Send check-in links well before the event
- Keep email content professional

### ❌ Don't

- Send spam or irrelevant content
- Use ALL CAPS in subject lines
- Include too many links
- Send without previewing
- Forget to add team email addresses

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `VITE_RESEND_API_KEY` is set correctly
2. **Domain Verification**: Ensure domain is verified in production
3. **Team Emails**: Confirm teams have email addresses configured
4. **Rate Limits**: Check if you've hit daily/monthly limits
5. **Browser Console**: Check for error messages

### Teams Not Receiving Emails

1. Check spam/junk folders
2. Verify email address is correct
3. Try sending a test to yourself
4. Check Resend dashboard for delivery status

### Preview Not Showing

1. Ensure you've written content in "Write" tab
2. Refresh the page
3. Check browser console for errors

## API Reference

### `sendEmail(options)`

Send a single email.

```typescript
const result = await sendEmail({
  to: ['team@example.com'],
  subject: 'Your subject',
  html: '<p>HTML content</p>',
  from: 'Prodathon <noreply@prodathon.dev>' // optional
});
```

### `sendBulkEmails(recipients, subject, html)`

Send emails to multiple recipients.

```typescript
const result = await sendBulkEmails(
  ['team1@example.com', 'team2@example.com'],
  'Subject',
  '<p>HTML content</p>'
);

// Returns: { total, success, failed, results }
```

### `markdownToHtml(markdown)`

Convert Markdown to HTML.

```typescript
const html = markdownToHtml('**Bold** and *italic*');
```

### `createEmailTemplate(content, title)`

Wrap content in email template.

```typescript
const fullEmail = createEmailTemplate(htmlContent, 'Email Title');
```

### `createCheckinEmailTemplate(teamName, teamNumber, checkinUrl)`

Generate check-in email.

```typescript
const email = createCheckinEmailTemplate(
  'Team Alpha',
  'T001',
  'https://prodathon.dev/team-checkin/abc123'
);
```

## Support

For issues or questions:
- Check Resend documentation: https://resend.com/docs
- Review browser console for errors
- Verify environment configuration
- Contact system administrator

## Future Enhancements

Potential features for future versions:
- Email scheduling
- Email templates library
- A/B testing
- Analytics and open tracking
- Email attachments
- Rich text editor (WYSIWYG)
- Bulk import recipients from CSV
- Email campaigns
- Automated reminder emails

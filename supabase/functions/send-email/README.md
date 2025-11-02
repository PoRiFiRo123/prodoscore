# Send Email Edge Function

This Supabase Edge Function handles email sending via the Resend API server-side, avoiding CORS issues and keeping API keys secure.

## Setup

### 1. Set Required Secrets

You need to add secrets to your Supabase project:

```bash
# Required: Your Resend API key
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here

# Optional: Custom sender email (defaults to studentclubs.bnmit@gmail.com)
supabase secrets set FROM_EMAIL="Your Name <yourname@yourdomain.com>"
```

Or through the Supabase Dashboard:
1. Go to your project settings
2. Navigate to Edge Functions → Environment Variables
3. Add secrets:
   - `RESEND_API_KEY` - Your Resend API key
   - `FROM_EMAIL` - (Optional) Your verified sender email

### 2. Deploy the Function

```bash
# Deploy all functions
supabase functions deploy

# Or deploy only this function
supabase functions deploy send-email
```

### 3. Configure Sender Email

**CRITICAL**: Resend does NOT allow using Gmail, Yahoo, Outlook, or other public email providers as the sender address!

**Default Behavior (Testing Only):**
- The function uses `onboarding@resend.dev` (Resend's test domain)
- ⚠️ **LIMITATION**: Can ONLY send to your verified email (`studentclubs.bnmit@gmail.com`)
- This is for testing the email system only

**Production Setup (Required for sending to teams):**

To send emails to actual team members, you MUST verify your own domain:

1. **Get a domain** (if you don't have one):
   - Use a free subdomain service, or
   - Purchase a domain from providers like Namecheap, GoDaddy, etc.

2. **Verify your domain in Resend:**
   - Go to [Resend Dashboard → Domains](https://resend.com/domains)
   - Click "Add Domain"
   - Add your domain (e.g., `prodathon.com`)
   - Add the provided DNS records to your domain provider
   - Wait for verification (usually 5-15 minutes)

3. **Configure the sender email:**
   ```bash
   supabase secrets set FROM_EMAIL="Prodathon <noreply@yourdomain.com>"
   supabase functions deploy send-email
   ```

**Email Sending Restrictions:**

| Sender Address | Can Send To | Use Case |
|----------------|-------------|----------|
| `onboarding@resend.dev` | Only `studentclubs.bnmit@gmail.com` | Testing only |
| `name@yourdomain.com` | Anyone | Production |
| ❌ `name@gmail.com` | **NOT ALLOWED** | Won't work |
| ❌ `name@yahoo.com` | **NOT ALLOWED** | Won't work |

**Free Tier Limits:** 100 emails/day, 3,000 emails/month

## Usage

The function is called automatically by the frontend email service (`src/lib/emailService.ts`). It accepts:

```typescript
{
  to: string[];      // Array of recipient email addresses
  subject: string;   // Email subject
  html: string;      // HTML content of the email
}
```

## Testing Locally

You can test the function locally using Supabase CLI:

```bash
# Start local Supabase (including Edge Functions)
supabase start

# Set local secret
supabase secrets set --env-file .env.local RESEND_API_KEY=re_your_key

# Function will be available at:
# http://localhost:54321/functions/v1/send-email
```

## Troubleshooting

### CORS Errors
- The function includes CORS headers to allow frontend requests
- Ensure your frontend is calling the correct function URL

### 401 Unauthorized
- Check that `RESEND_API_KEY` is correctly set as a secret
- Verify the API key is valid in your Resend dashboard

### Email Not Sending
- Check the Resend dashboard for delivery status
- Verify the "from" email domain is verified in Resend
- Check function logs: `supabase functions logs send-email`

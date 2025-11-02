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

**IMPORTANT**: Resend's free tier has restrictions on sender addresses.

**Default Behavior:**
- The function uses `studentclubs.bnmit@gmail.com` as the sender by default
- This works if you're sending to teams, but ideally should be your verified email

**To Use a Custom Sender:**

Option A - Quick Setup (Using your verified email):
```bash
supabase secrets set FROM_EMAIL="studentclubs.bnmit@gmail.com"
supabase functions deploy send-email
```

Option B - Production Setup (Using your own domain):
1. Verify your domain in Resend (https://resend.com/domains)
2. Set the FROM_EMAIL secret:
   ```bash
   supabase secrets set FROM_EMAIL="Prodathon <noreply@yourdomain.com>"
   ```
3. Redeploy the function:
   ```bash
   supabase functions deploy send-email
   ```

**Resend Restrictions:**
- With `onboarding@resend.dev`: Can only send to your own verified email
- With verified domain: Can send to anyone
- Free tier: 100 emails/day, 3,000 emails/month

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

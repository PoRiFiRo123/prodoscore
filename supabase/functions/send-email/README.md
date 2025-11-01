# Send Email Edge Function

This Supabase Edge Function handles email sending via the Resend API server-side, avoiding CORS issues and keeping API keys secure.

## Setup

### 1. Set the Resend API Key as a Secret

You need to add your Resend API key as a secret in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

Or through the Supabase Dashboard:
1. Go to your project settings
2. Navigate to Edge Functions → Environment Variables
3. Add a new secret: `RESEND_API_KEY` with your Resend API key

### 2. Deploy the Function

```bash
# Deploy all functions
supabase functions deploy

# Or deploy only this function
supabase functions deploy send-email
```

### 3. Configure Email From Address

By default, the function uses `Prodathon <onboarding@resend.dev>` as the sender.

To customize this:
1. Verify your domain in Resend
2. Update the `from` field in `index.ts` (line 48)
3. Redeploy the function

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

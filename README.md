# Prodoscore

**Open-source judging, scoring and public voting for hackathons.**

Prodoscore runs the judging side of a hackathon from one web app: teams check in, judges score against your criteria, the audience votes, and organisers watch the results come in live. It was built for **Prodathon**, the hackathon run by the Event Management Committee at BNM Institute of Technology, Bengaluru, to replace paper score sheets and spreadsheets.

## Features

**For organisers (admin dashboard)**
- Set up tracks, rooms, teams and judging criteria
- Create judge accounts and assign judges to rooms or tracks
- Bulk import and export teams
- Team check-in with per-team links and QR codes
- Email teams in bulk with a Markdown composer and personalised variables like `{team_name}` (via [Resend](https://resend.com))
- Live analytics, leaderboard and public-voting analytics
- Finalisation workflow to lock scores, plus an audit log of changes
- Role management (admin and judge)

**For judges**
- Score teams on each criterion, with a "now presenting" view
- Reusable feedback snippets for faster comments
- Score history and live team stats
- Tie-breaker assistant

**For the audience**
- Public voting page and per-team voting links
- Public leaderboard

## Tech stack

React, TypeScript, Vite, Tailwind CSS and shadcn/ui on the frontend. Supabase provides the Postgres database, auth, row-level security and Edge Functions.

## Running your own instance

### 1. Prerequisites

- Node.js 18 or newer and npm
- A free [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli)
- A [Resend](https://resend.com) API key, only if you want to send emails

### 2. Clone and install

```sh
git clone https://github.com/PoRiFiRo123/prodoscore.git
cd prodoscore
npm install
```

### 3. Set up the database

Link the CLI to your Supabase project and apply the migrations:

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Deploy the Edge Functions

These handle judge account management and email:

```sh
supabase functions deploy create-judge
supabase functions deploy update-judge
supabase functions deploy delete-judge
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_your_key   # optional, for email
```

See [docs/EMAIL_SYSTEM.md](docs/EMAIL_SYSTEM.md) for the full email setup.

### 5. Point the app at your project

Open `src/integrations/supabase/client.ts` and replace `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with your project's URL and anon (public) key. You'll find both in Supabase under **Project Settings → API**.

> The app currently ships pointing at the Prodathon project. Moving this to environment variables is on the roadmap.

### 6. Create the first admin

Sign up through the app at `/auth`, then give that account the admin role in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```

After that, you can create judges and manage roles from the dashboard.

### 7. Run it

```sh
npm run dev       # local development
npm run build     # production build
```

The repo includes a `vercel.json`, so it deploys to [Vercel](https://vercel.com) as-is.

## Pages

| Route | Who it's for |
| --- | --- |
| `/` | Landing page |
| `/auth` | Sign-in for admins and judges |
| `/dashboard` | Admin dashboard |
| `/judge` | Judge scoring |
| `/judge/snippets` | Judge feedback snippets |
| `/team-checkin/:teamId` | Team check-in |
| `/public-voting` | Audience voting |
| `/vote/:teamId` | Vote for a single team |

## Roadmap

- Supabase config through environment variables instead of a hardcoded file
- Event-level settings, so the branding and Prodathon-specific text aren't hardcoded
- A seed script for the first admin and sample data
- Tests

## Contributing

Issues and pull requests are welcome. If you run Prodoscore at your own event, I'd love to hear about it. Open an issue and tell me how it went.

## Author

Built by [Nishit R Kirani](https://github.com/PoRiFiRo123) for Prodathon at BNM Institute of Technology.

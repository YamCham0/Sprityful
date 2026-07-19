# FrameFoundry

Sprityful is an original prompt-to-sprite-sheet web app. It uses Cloudflare Workers AI server-side to generate an image sheet, then converts the chroma-keyed source to a transparent PNG in the browser when the user exports it. It also creates starter JSON metadata for a game pipeline.

## Run it locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add the Cloudflare and Supabase values.
3. Start the app: `npm run dev`
4. Open `http://localhost:3000`

## Deploy to Vercel

Import the GitHub repository into Vercel, then add every variable from `.env.example`. `CLOUDFLARE_API_TOKEN` and `SUPABASE_SECRET_KEY` are server-only and never reach the browser.

Create the token in Cloudflare’s Workers AI dashboard. It needs the `Workers AI Read` and `Workers AI Edit` permissions.

## Supabase auth and quota setup

1. Create or choose a Supabase project, then run [`supabase/migrations/20260719000000_add_generation_quota.sql`](supabase/migrations/20260719000000_add_generation_quota.sql) in its SQL Editor.
2. In **Authentication → URL Configuration**, set the Site URL to `https://sprityful.vercel.app` and add `https://sprityful.vercel.app/auth/callback` to Redirect URLs. Add a localhost callback there too for local development.
3. In **Project Connect / API Keys**, copy the Project URL and publishable key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copy the server-only `sb_secret_` key to `SUPABASE_SECRET_KEY` (a legacy `SUPABASE_SERVICE_ROLE_KEY` also works).
4. Add the same variables to Vercel for Production, Preview, and Development, then redeploy.

The migration uses a transaction-safe upsert to reserve a generation before Workers AI is invoked. It cannot increment beyond seven per authenticated, non-anonymous user per UTC date—even with concurrent requests or direct API calls.

## Notes

- The landing-page showcase artwork is an original generated project asset at `public/showcase/nova-runner-spritesheet.png`.
- The generator uses Cloudflare’s `@cf/black-forest-labs/flux-1-schnell` at four steps to fit inside the free Workers AI allocation for small projects.
- Flux returns JPEG output, so Sprityful requests a solid green chroma-key backdrop and removes it in the browser only when exporting the final PNG. Avoid asking for green clothing or props.
- Visitors can browse the site, but only email-authenticated Supabase users can reach the generation endpoint. Supabase anonymous sessions are explicitly rejected.

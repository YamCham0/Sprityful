# FrameFoundry

Sprityful is an original prompt-to-sprite-sheet web app. It uses Cloudflare Workers AI server-side to generate an image sheet, then converts the chroma-keyed source to a transparent PNG in the browser when the user exports it. It also creates starter JSON metadata for a game pipeline.

## Run it locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
3. Start the app: `npm run dev`
4. Open `http://localhost:3000`

## Deploy to Vercel

Import the GitHub repository into Vercel, then add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the project’s environment variables. The token is only used in `app/api/generate/route.ts`, never sent to the browser.

Create the token in Cloudflare’s Workers AI dashboard. It needs the `Workers AI Read` and `Workers AI Edit` permissions.

## Notes

- The landing-page showcase artwork is an original generated project asset at `public/showcase/nova-runner-spritesheet.png`.
- The generator uses Cloudflare’s `@cf/black-forest-labs/flux-1-schnell` at four steps to fit inside the free Workers AI allocation for small projects.
- Flux returns JPEG output, so Sprityful requests a solid green chroma-key backdrop and removes it in the browser only when exporting the final PNG. Avoid asking for green clothing or props.
- For a public launch, add Supabase authentication and per-user quotas before sharing the API-backed generator broadly.

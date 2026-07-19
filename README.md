# FrameFoundry

FrameFoundry is an original prompt-to-sprite-sheet web app. It uses the OpenAI Image API server-side to generate a downloadable PNG sprite sheet and lets the user download starter JSON metadata for their game pipeline.

## Run it locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add an `OPENAI_API_KEY`.
3. Start the app: `npm run dev`
4. Open `http://localhost:3000`

## Deploy to Vercel

Import the GitHub repository into Vercel, then add `OPENAI_API_KEY` to the project’s environment variables. The key is only used in `app/api/generate/route.ts`, never sent to the browser.

## Notes

- The landing-page showcase artwork is an original generated project asset at `public/showcase/nova-runner-spritesheet.png`.
- The generator uses `gpt-image-1.5` because its transparent background support is appropriate for downloadable game sprites. The current `gpt-image-2` model does not accept transparent backgrounds.
- For a public launch, add authentication, per-user quotas, and persistence before sharing the API-backed generator broadly.

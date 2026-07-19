const ADS_TXT_AUTHORITY_ID = "f08c47fec0942fa0";

function getPublisherId() {
  const explicitId = process.env.ADSENSE_PUBLISHER_ID?.trim();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim().replace(/^ca-/, "");
  const publisherId = explicitId || clientId;

  return publisherId && /^pub-\d+$/.test(publisherId) ? publisherId : null;
}

export async function GET() {
  const publisherId = getPublisherId();

  if (!publisherId) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(`google.com, ${publisherId}, DIRECT, ${ADS_TXT_AUTHORITY_ID}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

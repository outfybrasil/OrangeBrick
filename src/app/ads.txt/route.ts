const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";

export const dynamic = "force-dynamic";

export function GET() {
  if (!/^pub-\d{16}$/.test(publisherId)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

import { NextResponse } from "next/server";

export const revalidate = 1800;

const CHANNEL_ID = "UC504RdUAMMSWsNYota1FsTA";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function GET() {
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      next: { revalidate: 1800 },
    });
    if (!response.ok) throw new Error(`YouTube respondeu com ${response.status}`);

    const xml = await response.text();
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 3).flatMap((entry) => {
      const id = entry[1].match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry[1].match(/<title>([\s\S]*?)<\/title>/)?.[1];
      return id && title ? [{ id, title: decodeXml(title).trim() }] : [];
    });
    if (videos.length === 0) throw new Error("O feed do YouTube não retornou vídeos");

    return NextResponse.json({ videos }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar os vídeos" }, { status: 502 });
  }
}

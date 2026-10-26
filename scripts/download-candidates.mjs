import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const outDir = process.env.TEMP + "/opencode";

const candidates = {
  "pb-1": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2809/687fa06eb1afc035d66ff1fe405d266a003d6b2326b430fa.jpg",
  "pb-2": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2809/8d4690a0963e2b57708abb140d9394f10770975eb7780b44.jpg",
  "pb-3": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2809/f067c272843d547aa69386222f5f6ab51b56d9177516b93b.jpg",
  "pb-4": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/403f5d09dbeced62daea7907184de098522d9a5ce1aa4647.jpg",
  "pb-5": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/5d34d0cd910fa48c730a1915b8cf112231c30e667e2169ea.jpg",
  "pb-6": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/911449afb539e0c7c7d0e079b89673a4f05bf7bfce55dfcc.jpg",
  "pb-7": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/e67767421ee26ca1d2f108f5ea12822155213b4e55795ac1.jpg",
  "pb-8": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2822/fcb63ebad3e8aa75b60e8a416e3daa5265dda7ca037eba6e.jpg",
  "pb-png1": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/8ea15bce1b7336894aa364867c03a3ea32ecd2f1455a4333.png",
  "pb-png2": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/2153ee57f7955802d94a6722418315637e8fba8f69eaf064.png",
  "pb-png3": "https://image.api.playstation.com/vulcan/ap/rnd/202607/2810/47fe2387116044b82e119fc31f9c35c52a80f44e29b6ab12.png",
  "mh-4": "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/c00c2147a9a9cae723d01ad82a365702eebd21ca9a273cb6800afb3c5cc4c842",
  "mh-5": "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/393b7d43acae17adf12c693f689a2000d69160b366e7d7b75ab0722fd225ae32",
  "mh-6": "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/fd052f6fd26da1f2aa550890447db086dc738fcf0c40d11e050e792332394dce",
  "mh-7": "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/68e3f5ca3b4ee6cdb4bc493296d717ede5e338dcbb1e7e40352172518b8ff553",
  "pb-trailer": "https://i.ytimg.com/vi/qgJBFa952mY/maxresdefault.jpg",
  "pb-yt-hq": "https://i.ytimg.com/vi/qgJBFa952mY/hqdefault.jpg",
};

for (const [name, url] of Object.entries(candidates)) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!res.ok) { console.log(name, "HTTP", res.status); continue; }
    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    const ext = meta.format === "png" ? "png" : "jpg";
    await writeFile(`${outDir}/cand-${name}.${ext}`, buffer);
    console.log(name, "|", res.status, "|", res.headers.get("content-type"), "|", meta.width, "x", meta.height, "|", meta.format, "|", createHash("sha256").update(buffer).digest("hex").slice(0, 12));
  } catch (err) {
    console.log(name, "ERROR", err.message);
  }
}

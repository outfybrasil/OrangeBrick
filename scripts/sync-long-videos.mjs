import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

export async function syncLongVideos(slugs, options = {}) {
  const root = options.root || process.cwd();
  const client = options.client || createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
  const bucket = client.storage.from('editorial-reels');
  const manifestPath = path.join(root, 'public/long-videos/manifest.json');
  const local = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  async function readRemote(name, fallback) {
    const {data,error} = await bucket.download(`long-videos/${name}`);
    if (error && !/not.?found|does not exist/i.test(error.message)) throw error;
    return data ? JSON.parse(await data.text()) : fallback;
  }
  const deleted = new Set(await readRemote('deleted-slugs.mp4', []));
  const selected = slugs?.length ? slugs : Object.keys(local);
  async function upload(storage, key, file, contentType) {
    const bytes = await fs.readFile(file);
    const {data,error:listError} = await storage.list(path.posix.dirname(key), {search:path.posix.basename(key),limit:100});
    if (listError) throw listError;
    if (data?.some(item => item.name === path.posix.basename(key) && Number(item.metadata?.size) === bytes.length)) return;
    const {error} = await storage.upload(key, bytes, {contentType,upsert:true});
    if (error) throw new Error(`Não foi possível sincronizar ${key}: ${error.message}`);
  }
  for (const slug of selected) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !local[slug] || deleted.has(slug)) continue;
    const video = local[slug];
    for (const [field,suffix,contentType] of [['video_url','.mp4','video/mp4'],['video_no_narration_url','-sem-narracao.mp4','video/mp4'],['video_no_narration_clean_url','-sem-narracao-sem-legenda.mp4','video/mp4'],['srt_url','.srt','application/x-subrip']]) {
      const filename = `${slug}${suffix}`;
      const file = path.join(root,'public/long-videos',slug,filename);
      if (!video[field] || !await fs.stat(file).catch(() => null)) continue;
      await upload(bucket,`long-videos/${slug}/${filename}`,file,contentType);
    }
    const images = client.storage.from('post-images');
    for (const image of [...(video.thumbnails || []), ...(video.preview_sheet_url ? [{url:video.preview_sheet_url,preview:true}] : [])]) {
      if (!image.url?.startsWith(`/long-videos/${slug}/`)) continue;
      const file = path.join(root,'public',image.url);
      if (!await fs.stat(file).catch(() => null)) continue;
      const key = `long-video-assets/${slug}/${path.basename(file)}`;
      await upload(images,key,file,file.endsWith('.png')?'image/png':'image/jpeg');
      const url = images.getPublicUrl(key).data.publicUrl;
      if (image.preview) video.preview_sheet_url = url;
      else image.url = url;
    }
  }
  const remote = await readRemote('manifest-state.mp4', {});
  for (const slug of selected) {
    if (!local[slug] || deleted.has(slug)) continue;
    if (!remote[slug] || Date.parse(local[slug].updated_at) >= Date.parse(remote[slug].updated_at)) remote[slug] = local[slug];
  }
  for (const slug of deleted) delete remote[slug];
  const {error} = await bucket.upload('long-videos/manifest-state.mp4',Buffer.from(JSON.stringify(remote,null,2)),{contentType:'video/mp4',upsert:true});
  if (error) throw error;
  for (const slug of selected) if (remote[slug] && !deleted.has(slug)) local[slug] = remote[slug];
  await fs.writeFile(manifestPath,JSON.stringify(local,null,2));
  for (const slug of selected) {
    const folder = path.join(root,'public/long-videos',slug);
    if (local[slug] && await fs.stat(folder).catch(() => null)) await fs.writeFile(path.join(folder,'youtube-metadata.json'),JSON.stringify(local[slug],null,2));
  }
  return {synced:selected.filter(slug => local[slug] && !deleted.has(slug)),remote_count:Object.keys(remote).length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncLongVideos(process.argv.slice(2)).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode=1; });
}

import { readFileSync, existsSync } from "node:fs";

async function driveRequest(pathname, searchParams) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const query = new URLSearchParams(searchParams);
  query.set("key", apiKey);
  const response = await fetch(`https://www.googleapis.com/drive/v3${pathname}?${query}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erro Drive (${response.status}): ${detail}`);
  }
  return response.json();
}

async function exportDocument(fileId, mimeType) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  let target;
  if (mimeType === "application/vnd.google-apps.document") {
    target = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${apiKey}`;
  } else {
    target = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  }
  const res = await fetch(target);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro export (${res.status}): ${text}`);
  }
  return res.text();
}

const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const rootData = await driveRequest("/files", {
  q: `'${rootFolderId}' in parents and trashed=false`,
  fields: "files(id,name,mimeType,modifiedTime)",
  pageSize: "20",
  orderBy: "name desc",
});

console.log("Root items:", rootData.files.map(f => `${f.name} (${f.id}, ${f.mimeType})`));

for (const folder of rootData.files.filter(f => f.mimeType === "application/vnd.google-apps.folder")) {
  console.log(`\n=== Checking folder: ${folder.name} (${folder.id}) ===`);
  const folderData = await driveRequest("/files", {
    q: `'${folder.id}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: "20",
    orderBy: "modifiedTime desc",
  });
  console.log(`Files in ${folder.name}:`, folderData.files.map(f => `${f.name} (${f.id}, ${f.mimeType})`));

  for (const doc of folderData.files) {
    console.log(`\n--- Document: ${doc.name} (${doc.id}) ---`);
    try {
      const content = await exportDocument(doc.id, doc.mimeType);
      console.log(`Content length: ${content.length}`);
      console.log(`Content preview:\n${content.slice(0, 800)}`);
    } catch (err) {
      console.error(`Export failed: ${err.message}`);
    }
  }
}

const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

async function driveRequest(pathname, searchParams) {
  const query = new URLSearchParams(searchParams);
  query.set("key", apiKey);
  const response = await fetch(`https://www.googleapis.com/drive/v3${pathname}?${query}`);
  if (!response.ok) throw new Error(`Drive error ${response.status}`);
  return response.json();
}

async function exportDoc(fileId) {
  const target = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${apiKey}`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`Export error ${res.status}`);
  return res.text();
}

const folderId = "1lmkPMqotfokdK1osXHUMyBvKp7qJWzSo"; // 13-08-2026
const folderData = await driveRequest("/files", {
  q: `'${folderId}' in parents and trashed=false`,
  fields: "files(id,name,mimeType)",
  pageSize: "20",
});

for (const doc of folderData.files.filter(f => !f.name.startsWith("Roteiro"))) {
  console.log(`\n========================================`);
  console.log(`DOCUMENTO: ${doc.name} (ID: ${doc.id})`);
  console.log(`========================================`);
  const content = await exportDoc(doc.id);
  console.log(content);
}

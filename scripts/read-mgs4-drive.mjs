const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

async function exportDoc(fileId) {
  const target = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${apiKey}`;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`Export error ${res.status}`);
  return res.text();
}

const content = await exportDoc("1yBiIKzSSS13EcjZLL9Z0nqdixeirPDDCJxc-vy8TgVE");
console.log("=== CONTEÚDO DO DRIVE (MGS4) ===");
console.log(content);

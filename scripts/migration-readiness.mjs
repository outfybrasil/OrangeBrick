export function summarizeMigrationReadiness(files, remoteHistoryConfirmed) {
  const versions = new Map();
  for (const name of files) {
    const version = name.match(/^(\d{14})/i)?.[1];
    if (version) versions.set(version, [...(versions.get(version) || []), name]);
  }

  const duplicateVersions = [...versions.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([version, names]) => ({ version, files: names }));
  const localVersionsUnique = duplicateVersions.length === 0;

  return {
    ready: localVersionsUnique && remoteHistoryConfirmed,
    local_versions_unique: localVersionsUnique,
    remote_history_confirmed: remoteHistoryConfirmed,
    confirmation_variable: "PRODUCTION_MIGRATION_HISTORY_CONFIRMED",
    confirmation_scope: "confirmação manual após comparar o histórico remoto e validar o plano em staging",
    count: files.length,
    duplicate_versions: duplicateVersions,
  };
}

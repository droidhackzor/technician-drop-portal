export const BUILD_INFO = {
  branch: 'dev',
  commit: 'local',
  lastEditedIso: new Date().toISOString(),
  lastEditedEpoch: Math.floor(Date.now() / 1000),
  display: 'dev-local',
} as const;

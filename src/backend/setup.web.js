// Instructor-only setup actions, run from the dashboard's setup panel.

import { Permissions, webMethod } from 'wix-web-module';
import { requireInstructor, guarded } from 'backend/access';
import { createMissingCollections, checkSetup } from 'backend/setup';
import { ensureSettingsItem } from 'backend/settings';

export const getSetupStatus = webMethod(
  Permissions.SiteMember,
  guarded(async () => {
    await requireInstructor();
    return checkSetup();
  })
);

export const createCollections = webMethod(
  Permissions.SiteMember,
  guarded(async () => {
    await requireInstructor();
    const result = await createMissingCollections();
    // Settings can only exist once its collection does, so create it in the
    // same step when nothing failed.
    let settings = null;
    if (result.failed.length === 0) settings = await ensureSettingsItem();
    return Object.assign({}, result, { settingsCreated: Boolean(settings && settings.created) });
  })
);

export const ensureSettings = webMethod(
  Permissions.SiteMember,
  guarded(async () => {
    await requireInstructor();
    return ensureSettingsItem();
  })
);

// The single Settings item. Defaults are merged in on every read so fields
// added later always have a value even on an old item.

import wixData from 'wix-data';
import { SETTINGS_DEFAULTS } from 'public/portal-constants';

export async function loadSettings() {
  let item = null;
  try {
    const result = await wixData.query('Settings').limit(1).find({ suppressAuth: true });
    item = result.items[0] || null;
  } catch (error) {
    item = null;
  }
  return { item, settings: Object.assign({}, SETTINGS_DEFAULTS, item || {}) };
}

export async function ensureSettingsItem() {
  const { item } = await loadSettings();
  if (item) return { created: false, settings: Object.assign({}, SETTINGS_DEFAULTS, item) };
  const inserted = await wixData.insert('Settings', Object.assign({}, SETTINGS_DEFAULTS), { suppressAuth: true });
  return { created: true, settings: Object.assign({}, SETTINGS_DEFAULTS, inserted) };
}

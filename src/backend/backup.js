// The weekly backup: every collection as a CSV file in a private Media
// Manager folder, the newest four kept, a short notice emailed to the
// instructor. Runs from the scheduled job and from "Back up now" on
// Settings, so nothing here reads the current member.

import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { loadSettings } from 'backend/settings';
import { collectionCsv } from 'backend/export';
import { sendEmail } from 'backend/messaging';
import { lookupMemberByEmail } from 'backend/pupil-store';
import { londonDate } from 'public/portal-utils';
import { COLLECTIONS, PORTAL_PATHS, SCHOOL } from 'public/portal-constants';

const KEEP = 4;
const FOLDER = '/portal-backups';
const LINK_MINUTES = 60;

async function uploadCsv(date, name, csv) {
  const info = await mediaManager.upload(FOLDER + '/' + date, Buffer.from(csv, 'utf8'), name + '.csv', {
    mediaOptions: { mimeType: 'text/csv', mediaType: 'document' },
    metadataOptions: { isPrivate: true, isVisitorUpload: false }
  });
  return info.fileUrl;
}

async function trashFiles(fileUrls) {
  if (!fileUrls.length) return;
  try {
    await mediaManager.moveFilesToTrash(fileUrls);
  } catch (error) {
    console.warn('[portal] could not trash old backup files', error && error.message ? error.message : error);
  }
}

async function saveSettings(item, changes) {
  return wixData.update('Settings', Object.assign({}, item, changes), { suppressAuth: true });
}

async function notify(settings, summary) {
  const member = await lookupMemberByEmail(settings.instructorEmail);
  const to = member
    ? { memberId: member.memberId, email: settings.instructorEmail }
    : { email: settings.instructorEmail, firstName: 'Instructor', lastName: '' };
  return sendEmail('enquiryAlert', to, {
    name: 'Weekly backup',
    summary,
    link: SCHOOL.siteUrl + PORTAL_PATHS.settings
  }, { pupilId: '', lessonId: 'backup' });
}

// Writes the files, records the run on the Settings item and emails the
// instructor. Returns { ok, date, files, items, error }.
export async function runBackup() {
  const { item, settings } = await loadSettings();
  const date = londonDate();
  const stamp = new Date().toISOString();
  const files = [];
  let items = 0;
  let error = '';
  try {
    for (const name of COLLECTIONS) {
      const built = await collectionCsv(name);
      const fileUrl = await uploadCsv(date, name, built.csv);
      files.push({ collection: name, fileUrl, items: built.items });
      items += built.items;
    }
  } catch (err) {
    error = err && err.message ? err.message : String(err);
    console.error('[portal] backup failed', error);
  }

  const previous = Array.isArray(settings.backups) ? settings.backups : [];
  const backups = files.length ? [{ date, at: stamp, files }].concat(previous.filter((b) => b.date !== date)) : previous;
  const kept = backups.slice(0, KEEP);
  const dropped = backups.slice(KEEP);
  await trashFiles(dropped.reduce((all, b) => all.concat(b.files.map((f) => f.fileUrl)), []));

  const status = error ? 'failed: ' + error : 'ok';
  if (item) {
    try {
      await saveSettings(item, { lastExportAt: stamp, lastExportStatus: status, backups: kept });
    } catch (err) {
      console.error('[portal] could not record the backup', err && err.message ? err.message : err);
    }
  }

  const summary = error
    ? 'Backup failed on ' + date + ': ' + error
    : files.length + ' files, ' + items + ' items, ' + date;
  try {
    await notify(settings, summary);
  } catch (err) {
    console.error('[portal] backup notice failed', err && err.message ? err.message : err);
  }
  return { ok: !error, date, files: files.length, items, error };
}

// Time-limited download links for the newest backup.
export async function latestLinks(settings) {
  const backups = Array.isArray(settings.backups) ? settings.backups : [];
  const latest = backups[0];
  if (!latest) return { date: '', links: [] };
  const links = [];
  for (const file of latest.files) {
    try {
      const url = await mediaManager.getDownloadUrl(file.fileUrl, LINK_MINUTES);
      links.push({ collection: file.collection, items: file.items, url });
    } catch (error) {
      links.push({ collection: file.collection, items: file.items, url: '', error: error && error.message ? error.message : String(error) });
    }
  }
  return { date: latest.date, at: latest.at, minutes: LINK_MINUTES, links };
}

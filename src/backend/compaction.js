// Lesson compaction: lessons older than the retention window become yearly
// totals on the pupil's lessonHistory and are deleted, so the site stays
// under the item limit. Only runs after a successful backup within 8 days,
// so nothing is ever deleted that is not already in a CSV.

import wixData from 'wix-data';
import { loadSettings } from 'backend/settings';
import { compactionPlan, mergeHistory, pruneCutoff, londonDate } from 'public/portal-utils';

const EXPORT_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

export function compactionAllowed(settings, now) {
  const at = Date.parse(settings.lastExportAt || '');
  if (!at) return 'No backup has run yet, so old lessons are kept as they are.';
  if (settings.lastExportStatus !== 'ok') return 'The last backup failed, so old lessons are kept as they are.';
  if ((now || Date.now()) - at > EXPORT_MAX_AGE_MS) return 'The last backup is more than 8 days old, so old lessons are kept as they are.';
  return '';
}

export async function runCompaction() {
  const { settings } = await loadSettings();
  const blocked = compactionAllowed(settings);
  if (blocked) return { ran: false, reason: blocked, pupils: 0, lessons: 0 };
  const cutoff = pruneCutoff(new Date(), settings.lessonRetentionDays).slice(0, 10);
  const result = await wixData.query('Lessons').lt('date', cutoff).limit(1000).find({ suppressAuth: true });
  const plan = compactionPlan(result.items, cutoff);
  const pupilIds = Object.keys(plan.totals);
  for (const pupilId of pupilIds) {
    let pupil = null;
    try {
      pupil = await wixData.get('Pupils', pupilId, { suppressAuth: true });
    } catch (error) {
      pupil = null;
    }
    if (!pupil) continue;
    const history = mergeHistory(pupil.lessonHistory, plan.totals[pupilId]);
    await wixData.update('Pupils', Object.assign({}, pupil, { lessonHistory: history }), { suppressAuth: true });
  }
  // Lessons whose pupil no longer exists are deleted too; their totals have
  // nowhere to go.
  for (let i = 0; i < plan.lessonIds.length; i += 100) {
    await wixData.bulkRemove('Lessons', plan.lessonIds.slice(i, i + 100), { suppressAuth: true });
  }
  const summary = { ran: true, cutoff, today: londonDate(), pupils: pupilIds.length, lessons: plan.lessonIds.length };
  console.log('[portal] compacted', JSON.stringify(summary));
  return summary;
}

// Shared lesson helpers used by lessons.jsw and portal.jsw: the item
// shape, date-range queries, the clash check and pupil name lookups. Every
// caller has already checked the role; reads and writes use suppressAuth.

import wixData from 'wix-data';
import { LESSON_STATUS, PUPIL_STATUS } from 'public/portal-constants';
import { lessonsOverlap, lessonTimeLabel } from 'public/portal-utils';

// forPupil drops the instructor's private notes.
export function shapeLesson(item, options) {
  const forPupil = Boolean(options && options.forPupil);
  const out = {
    _id: item._id,
    pupilId: item.pupilId || '',
    date: item.date || '',
    slot: item.slot || '',
    startTime: item.startTime || '',
    durationMins: Number(item.durationMins) || 0,
    timeLabel: lessonTimeLabel(item),
    pickupLocation: item.pickupLocation || '',
    status: item.status || LESSON_STATUS.PLANNED,
    pupilSummary: item.pupilSummary || ''
  };
  if (!forPupil) out.instructorNotes = item.instructorNotes || '';
  return out;
}

export async function queryLessons(filter) {
  const f = filter || {};
  let query = wixData.query('Lessons');
  if (f.from) query = query.ge('date', f.from);
  if (f.to) query = query.le('date', f.to);
  if (f.pupilId) query = query.eq('pupilId', f.pupilId);
  if (f.status) query = query.eq('status', f.status);
  query = f.descending ? query.descending('date').descending('startTime') : query.ascending('date').ascending('startTime');
  const result = await query.limit(f.limit || 200).find({ suppressAuth: true });
  return result.items;
}

export async function getLessonById(id) {
  if (!id || typeof id !== 'string') return null;
  try {
    return await wixData.get('Lessons', id, { suppressAuth: true });
  } catch (error) {
    return null;
  }
}

// The first planned lesson on the same day whose minutes overlap, or null.
export async function findClash(data, excludeId) {
  const sameDay = await queryLessons({ from: data.date, to: data.date, status: LESSON_STATUS.PLANNED, limit: 50 });
  return sameDay.find((item) => item._id !== excludeId && lessonsOverlap(item, data)) || null;
}

// { pupilId: { firstName, lastName, transmission } } for a set of IDs.
export async function pupilNames(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  const map = {};
  if (!unique.length) return map;
  const result = await wixData.query('Pupils').hasSome('_id', unique).limit(200).find({ suppressAuth: true });
  result.items.forEach((p) => {
    map[p._id] = { firstName: p.firstName || '', lastName: p.lastName || '', transmission: p.transmission || '' };
  });
  return map;
}

export function fullName(person) {
  return person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : '';
}

// Active pupils for the lesson form's pupil choice.
export async function activePupils() {
  const result = await wixData.query('Pupils')
    .eq('status', PUPIL_STATUS.ACTIVE)
    .ascending('firstName').ascending('lastName')
    .limit(200)
    .find({ suppressAuth: true });
  return result.items.map((p) => ({ _id: p._id, name: fullName(p), transmission: p.transmission || '', addressLine1: p.addressLine1 || '', postcode: p.postcode || '' }));
}

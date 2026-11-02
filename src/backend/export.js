// CSV exports: every row of a collection, or one pupil's records, as text.
// Used by the weekly backup job (no caller identity) and by the instructor's
// web modules, so nothing here reads the current member.

import wixData from 'wix-data';
import { toCsv } from 'public/portal-utils';
import { COLLECTIONS } from 'public/portal-constants';

// Every item in a collection, paging through at 1000 a time.
export async function allRows(collection) {
  const rows = [];
  let result = await wixData.query(collection).limit(1000).find({ suppressAuth: true });
  rows.push(...result.items);
  while (result.hasNext()) {
    result = await result.next();
    rows.push(...result.items);
  }
  return rows;
}

export function isCollection(name) {
  return COLLECTIONS.includes(name);
}

// { name, items, csv } for one collection.
export async function collectionCsv(name) {
  if (!isCollection(name)) throw new Error('Unknown collection ' + name);
  const rows = await allRows(name);
  return { name, items: rows.length, csv: toCsv(rows) };
}

async function rowsFor(collection, pupilId) {
  const result = await wixData.query(collection).eq('pupilId', pupilId).limit(1000).find({ suppressAuth: true });
  return result.items;
}

// One CSV with a section per collection for a single pupil: the record,
// then lessons, progress, mock tests, messages and send log rows.
export async function pupilCsv(pupil) {
  const sections = [['Pupils', [pupil]]];
  for (const name of ['Lessons', 'Progress', 'MockTests', 'Messages', 'SendLog']) {
    sections.push([name, await rowsFor(name, pupil._id)]);
  }
  return sections.map(([name, rows]) => '# ' + name + ' (' + rows.length + ')\r\n' + toCsv(rows)).join('\r\n');
}

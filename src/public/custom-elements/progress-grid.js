// The driver's record card: the skills grid shared by the instructor's
// progress editor and the pupil's My progress page. Pure rendering; the
// caller wires the clicks. The skill and level lists come from the backend
// (they live in public/portal-constants.js) so this file never imports
// them.
//
// renderGrid({ skills, levels, data, transmission, editable })
//   skills: [{ key, name, group, manualOnly }], in display order
//   levels: [{ level, name }], five of them
//   data:   { [skillKey]: { level, note, updatedAt } }
//   groups: optional [{ key, name }] for the dashed rules between groups
//
// Each row reads to a screen reader as "Roundabouts, level 3 of 5, prompted".

import { esc } from './portal-base.js';

export const GRID_STYLE = `
.record { list-style: none; margin: 0; padding: 0; }
.record-group { margin: 0; padding: 0; list-style: none; }
.record-group-wrap + .record-group-wrap { margin-top: 20px; }
.record-group-name { display: block; font-family: var(--font-head); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; font-size: 15px; border-bottom: 2px dashed var(--ink); padding: 0 0 4px; margin: 0 0 8px; }
.skill { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; background: var(--paper); border: 1px solid var(--line); padding: 10px 12px; margin: 0 0 8px; }
.skill-name { flex: 1 1 160px; font-weight: 600; }
.sq { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 2px solid var(--ink); font-family: var(--font-head); font-weight: 700; font-size: 16px; background: var(--line); color: var(--ink); flex: 0 0 auto; }
.sq.l1, .sq.l2 { background: var(--plate); }
.sq.l3, .sq.l4 { background: var(--accent); }
.sq.l5 { background: var(--ink); color: #fff; }
.blocks { display: flex; gap: 6px; flex: 0 0 auto; }
.blocks .sq { width: 44px; height: 44px; cursor: pointer; padding: 0; font: inherit; font-family: var(--font-head); font-weight: 700; font-size: 16px; border-radius: 0; }
.blocks .sq:not(.on) { background: var(--paper); color: var(--muted); border-color: var(--line); }
.blocks .sq.current { outline: 3px solid var(--ink); outline-offset: 2px; }
.blocks .sq:hover { border-color: var(--accent); }
.skill-extra { flex: 1 1 100%; }
.skill-note { margin: 4px 0 0; color: var(--muted); white-space: pre-line; }
.skill-updated { margin: 2px 0 0; font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--muted); }
.skill-tools { margin: 4px 0 0; }
.skill-tools .btn-text { min-height: 36px; padding-top: 4px; padding-bottom: 4px; margin-right: 16px; }
.note-form textarea { min-height: 80px; margin-top: 6px; }
.note-form .actions { margin-top: 8px; }
.record-summary { margin: 0 0 4px; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; list-style: none; margin: 0 0 16px; padding: 0; }
.legend li { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
.legend .sq { width: 18px; height: 18px; font-size: 11px; border-width: 1px; }
@media (max-width: 599px) { .blocks { width: 100%; justify-content: space-between; } .blocks .sq { width: 40px; height: 40px; } }
`;

// One coloured square for a level: grey for nothing yet, yellow for 1 and
// 2, orange for 3 and 4, black for 5.
export function levelSquare(level, extra) {
  const n = Number(level) || 0;
  return '<span class="sq l' + n + (extra ? ' ' + extra : '') + '" aria-hidden="true">' + (n || '–') + '</span>';
}

export function renderLegend(levels) {
  const items = [{ level: 0, name: 'Not started' }].concat(levels || []);
  return '<ul class="legend" aria-label="Levels">' + items.map((l) =>
    '<li>' + levelSquare(l.level) + '<span>' + esc(l.level ? l.level + ' ' + l.name : l.name) + '</span></li>'
  ).join('') + '</ul>';
}

export function levelName(levels, level) {
  const found = (levels || []).find((l) => l.level === level);
  return found ? found.name : '';
}

// "updated 4 November" from an ISO timestamp, Europe/London.
export function updatedWords(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return 'updated ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long' }).format(date);
}

export function visibleSkills(skills, transmission) {
  const automatic = transmission === 'automatic';
  return (skills || []).filter((s) => !(automatic && s.manualOnly));
}

function renderSkill(skill, entry, levels, editable) {
  const level = entry && entry.level ? Number(entry.level) : 0;
  const name = level ? levelName(levels, level) : '';
  const summary = skill.name + ', ' + (level ? 'level ' + level + ' of ' + levels.length + ', ' + name.toLowerCase() : 'not started yet');
  const squares = editable
    ? '<div class="blocks" role="group" aria-label="' + esc(summary) + '">' + levels.map((l) => {
      const on = l.level <= level;
      const current = l.level === level;
      return '<button type="button" class="sq l' + l.level + (on ? ' on' : '') + (current ? ' current' : '') + '" data-skill="' + esc(skill.key) + '" data-level="' + l.level + '" aria-label="' + esc('Set ' + skill.name + ' to level ' + l.level + ', ' + l.name.toLowerCase()) + '" aria-pressed="' + current + '">' + l.level + '</button>';
    }).join('') + '</div>'
    : levelSquare(level) + '<span class="sr-only">' + esc(summary) + '</span>';
  const note = entry && entry.note ? '<p class="skill-note">' + esc(entry.note) + '</p>' : '';
  const updated = entry && entry.updatedAt ? '<p class="skill-updated">' + esc(updatedWords(entry.updatedAt)) + '</p>' : '';
  const tools = editable
    ? '<div class="skill-tools"><button type="button" class="btn btn-text" data-note="' + esc(skill.key) + '">' + (entry && entry.note ? 'Edit note' : 'Add note') + '</button></div>' +
      '<div class="note-form" id="note-' + esc(skill.key) + '" hidden></div>'
    : '';
  const extra = note || updated || tools ? '<div class="skill-extra">' + note + updated + tools + '</div>' : '';
  return (
    '<li class="skill" id="skill-' + esc(skill.key) + '">' +
    '<span class="skill-name"' + (editable ? '' : ' aria-hidden="true"') + '>' + esc(skill.name) + '</span>' +
    squares + extra +
    '</li>'
  );
}

export function renderGrid(options) {
  const skills = visibleSkills(options.skills, options.transmission);
  const levels = options.levels || [];
  const data = options.data || {};
  const groups = options.groups && options.groups.length ? options.groups : [{ key: '', name: '' }];
  const sections = groups.map((group) => {
    const rows = skills.filter((s) => !group.key || s.group === group.key);
    if (!rows.length) return '';
    const heading = group.name ? '<span class="record-group-name" aria-hidden="true">' + esc(group.name) + '</span>' : '';
    return '<li class="record-group-wrap">' + heading + '<ul class="record-group" aria-label="' + esc(group.name || 'Skills') + '">' +
      rows.map((skill) => renderSkill(skill, data[skill.key], levels, Boolean(options.editable))).join('') +
      '</ul></li>';
  }).join('');
  return '<ul class="record" aria-label="Driver’s record">' + sections + '</ul>';
}

// "14 of 21 skills at level 4 or above", or '' before anything is set.
export function summaryWords(skills, data, transmission) {
  const visible = visibleSkills(skills, transmission);
  const set = visible.filter((s) => data && data[s.key] && data[s.key].level);
  if (!set.length) return '';
  const strong = visible.filter((s) => data[s.key] && Number(data[s.key].level) >= 4).length;
  return strong + ' of ' + visible.length + ' skills at level 4 or above';
}

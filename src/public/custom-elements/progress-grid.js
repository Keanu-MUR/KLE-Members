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
.record-group-wrap + .record-group-wrap { border-top: 1px dashed var(--kle-line); margin-top: 18px; padding-top: 10px; }
.record-group-name { display: block; font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); margin: 8px 0 2px; }
.skill { padding: 12px 0 10px; }
.skill-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.skill-name { font-weight: 600; }
.skill-level { color: var(--kle-muted); white-space: nowrap; }
.blocks { display: flex; gap: 4px; margin: 8px 0 0; }
.block { flex: 1 1 0; position: relative; height: 14px; border: 1px solid var(--kle-ink); border-radius: 2px; background: transparent; padding: 0; margin: 0; font: inherit; }
.block.filled { background: var(--kle-primary); border-color: var(--kle-primary); }
.blocks.editable .block { height: 44px; cursor: pointer; }
.blocks.editable .block:hover { border-color: var(--kle-primary-dark); }
.lplate { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; width: 12px; height: 12px; background: var(--kle-red); color: #fff; font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 9px; line-height: 1; border-radius: 1px; pointer-events: none; }
.blocks.editable .lplate { width: 22px; height: 22px; font-size: 15px; }
.skill-note { margin: 8px 0 0; color: var(--kle-muted); white-space: pre-line; }
.skill-updated { margin: 4px 0 0; font-variant-caps: all-small-caps; letter-spacing: 0.08em; color: var(--kle-muted); }
.skill-tools { margin: 6px 0 0; }
.skill-tools .btn-text { min-height: 36px; padding-top: 4px; padding-bottom: 4px; margin-right: 16px; }
.note-form textarea { min-height: 80px; margin-top: 6px; }
.note-form .actions { margin-top: 8px; }
.record-summary { margin: 0 0 4px; }
`;

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
  const blocks = levels.map((l) => {
    const filled = l.level <= level;
    const current = l.level === level;
    const label = editable ? 'Set ' + skill.name + ' to level ' + l.level + ', ' + l.name.toLowerCase() : '';
    const inner = current ? '<span class="lplate" aria-hidden="true">L</span>' : '';
    return editable
      ? '<button type="button" class="block' + (filled ? ' filled' : '') + '" data-skill="' + esc(skill.key) + '" data-level="' + l.level + '" aria-label="' + esc(label) + '" aria-pressed="' + current + '">' + inner + '</button>'
      : '<span class="block' + (filled ? ' filled' : '') + '">' + inner + '</span>';
  }).join('');
  const note = entry && entry.note ? '<p class="skill-note">' + esc(entry.note) + '</p>' : '';
  const updated = entry && entry.updatedAt ? '<p class="skill-updated">' + esc(updatedWords(entry.updatedAt)) + '</p>' : '';
  const tools = editable
    ? '<div class="skill-tools"><button type="button" class="btn btn-text" data-note="' + esc(skill.key) + '">' + (entry && entry.note ? 'Edit note' : 'Add note') + '</button></div>' +
      '<div class="note-form" id="note-' + esc(skill.key) + '" hidden></div>'
    : '';
  return (
    '<li class="skill" id="skill-' + esc(skill.key) + '">' +
    '<div class="skill-head"><span class="skill-name" aria-hidden="true">' + esc(skill.name) + '</span><span class="skill-level" aria-hidden="true">' + esc(name || 'Not started') + '</span></div>' +
    '<div class="blocks' + (editable ? ' editable' : '') + '" role="group" aria-label="' + esc(summary) + '">' + blocks + '</div>' +
    note + updated + tools +
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

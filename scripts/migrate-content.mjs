/**
 * 일회성 마이그레이션: src/data/*.json (ko/en 병렬 배열) -> src/content/** (항목당 파일 1개)
 *
 * 원본을 손으로 옮기지 않고 기계적으로 변환해 전사 오류를 배제한다.
 * 파싱할 수 없는 period 문자열은 추측하지 않고 실패시킨다.
 *
 * 실행: node scripts/migrate-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src/data');
const OUT_DIR = path.join(ROOT, 'src/content');

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));

const errors = [];
const fail = (msg) => errors.push(msg);

/* ---------- period 파싱 ---------- */

/** "2026.06" -> "2026-06", "2024.7" -> "2024-07", "2024" -> "2024" */
function parsePoint(raw) {
  const m = String(raw).trim().match(/^(\d{4})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return m[2] ? `${m[1]}-${String(m[2]).padStart(2, '0')}` : m[1];
}

/** 문자열 끝의 "(...)"를 주석으로 분리 */
function splitNote(raw) {
  const s = String(raw).trim();
  const m = s.match(/\s*\(([^)]*)\)\s*$/);
  return m ? { body: s.slice(0, m.index).trim(), note: m[1].trim() } : { body: s, note: null };
}

/**
 * 한국어 period 문자열을 구조화한다. 영어 문자열은 주석 추출에만 사용한다.
 * end: "YYYY[-MM]" | "present" | undefined(단일 시점)
 */
function parsePeriod(koRaw, enRaw, label) {
  const ko = splitNote(koRaw);
  const en = splitNote(enRaw);

  if ((ko.note === null) !== (en.note === null)) {
    fail(`${label}: 괄호 주석이 한쪽 언어에만 존재합니다 (ko="${koRaw}", en="${enRaw}")`);
    return null;
  }
  const note = ko.note ? { ko: ko.note, en: en.note } : undefined;

  const parts = ko.body.split(/\s*[-~]\s*/).filter(Boolean);

  if (parts.length === 1) {
    const start = parsePoint(parts[0]);
    if (!start) {
      fail(`${label}: period를 해석할 수 없습니다 (ko="${koRaw}")`);
      return null;
    }
    return { start, end: undefined, periodNote: note };
  }

  if (parts.length === 2) {
    const start = parsePoint(parts[0]);
    const end = parts[1] === '현재' ? 'present' : parsePoint(parts[1]);
    if (!start || !end) {
      fail(`${label}: period를 해석할 수 없습니다 (ko="${koRaw}")`);
      return null;
    }
    if (end !== 'present' && end < start) {
      fail(`${label}: end가 start보다 빠릅니다 (ko="${koRaw}")`);
      return null;
    }
    return { start, end, periodNote: note };
  }

  fail(`${label}: period 구간 수가 예상과 다릅니다 (ko="${koRaw}")`);
  return null;
}

/* ---------- status 정규화 ---------- */

const STATUS_MAP = {
  '완료': 'completed',
  'Completed': 'completed',
  'completed': 'completed',
  '진행 중': 'in-progress',
  'In Progress': 'in-progress',
  '게재 확정': 'accepted',
  'Accepted': 'accepted',
};

function parseStatus(ko, en, label) {
  const a = STATUS_MAP[ko];
  const b = STATUS_MAP[en];
  if (!a) fail(`${label}: 알 수 없는 ko status "${ko}"`);
  if (!b) fail(`${label}: 알 수 없는 en status "${en}"`);
  if (a && b && a !== b) fail(`${label}: ko/en status가 서로 다른 값으로 해석됩니다 ("${ko}" vs "${en}")`);
  return a ?? null;
}

/* ---------- 유틸 ---------- */

function i18n(ko, en, label, { required = true } = {}) {
  const k = (ko ?? '').trim();
  const e = (en ?? '').trim();
  if (!k && !e) return undefined;
  if (required && (!k || !e)) fail(`${label}: 한쪽 언어가 비어 있습니다 (ko="${k}", en="${e}")`);
  return { ko: k, en: e };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function writeEntry(collection, order, nameSource, body) {
  const dir = path.join(OUT_DIR, collection);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${String(order).padStart(2, '0')}-${slugify(nameSource)}.json`);
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf8');
  return path.relative(ROOT, file);
}

/** undefined 값을 제거해 JSON에 빈 키가 남지 않게 한다 */
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/* ---------- 변환 ---------- */

const experience = read('experience.json');
const projects = read('projects.json');
const research = read('research.json');

const written = [];

// 1) experience: main + sub 를 하나의 컬렉션으로 (kind 로 구분), order 는 전역 연번
let expOrder = 0;
for (const kind of ['main', 'sub']) {
  const ko = experience.ko[kind];
  const en = experience.en[kind];
  if (ko.length !== en.length) fail(`experience.${kind}: ko(${ko.length})/en(${en.length}) 항목 수 불일치`);

  ko.forEach((k, i) => {
    const e = en[i] ?? {};
    const label = `experience.${kind}[${i}] "${k.title}"`;
    const period = parsePeriod(k.period, e.period, label);
    if (!period) return;

    expOrder += 1;
    const nameSource = (e.organization || '').trim() || e.title || k.title;
    written.push(
      writeEntry('experience', expOrder, nameSource, compact({
        kind,
        order: expOrder,
        title: i18n(k.title, e.title, `${label}.title`),
        organization: i18n(k.organization, e.organization, `${label}.organization`),
        location: i18n(k.location, e.location, `${label}.location`),
        start: period.start,
        end: period.end,
        periodNote: period.periodNote,
        description: i18n(k.description, e.description, `${label}.description`),
      }))
    );
  });
}

// 2) education
experience.ko.education.forEach((k, i) => {
  const e = experience.en.education[i] ?? {};
  const label = `education[${i}] "${k.title}"`;
  const period = parsePeriod(k.period, e.period, label);
  if (!period) return;

  written.push(
    writeEntry('education', i + 1, e.organization || k.organization, compact({
      order: i + 1,
      title: i18n(k.title, e.title, `${label}.title`),
      organization: i18n(k.organization, e.organization, `${label}.organization`),
      start: period.start,
      end: period.end,
      periodNote: period.periodNote,
      description: i18n(k.description, e.description, `${label}.description`),
    }))
  );
});

// 3) awards: 연도만 있고 연도 내 순서는 자연 기준이 없으므로 order 를 명시적으로 보존
experience.ko.awards.forEach((k, i) => {
  const e = experience.en.awards[i] ?? {};
  const label = `awards[${i}] "${k.name}"`;
  written.push(
    writeEntry('awards', i + 1, e.name || k.name, compact({
      order: i + 1,
      name: i18n(k.name, e.name, `${label}.name`),
      year: String(k.year),
    }))
  );
});

// 4) memberships
experience.ko.memberships.forEach((k, i) => {
  const e = experience.en.memberships[i] ?? {};
  const label = `memberships[${i}] "${k.title}"`;
  const period = parsePeriod(k.period, e.period, label);
  if (!period) return;

  if ((k.issuer ?? '') !== (e.issuer ?? '')) {
    fail(`${label}: issuer 가 ko/en 간 다릅니다. 단일 문자열로 합칠 수 없습니다.`);
  }

  written.push(
    writeEntry('memberships', i + 1, e.organization || k.organization, compact({
      order: i + 1,
      title: i18n(k.title, e.title, `${label}.title`),
      organization: i18n(k.organization, e.organization, `${label}.organization`),
      start: period.start,
      end: period.end,
      periodNote: period.periodNote,
      description: i18n(k.description, e.description, `${label}.description`),
      issuer: k.issuer || undefined,
    }))
  );
});

// 5) projects: 날짜 필드가 없으므로 order 로 순서를 보존
if (projects.ko.length !== projects.en.length) fail('projects: ko/en 항목 수 불일치');
projects.ko.forEach((k, i) => {
  const e = projects.en[i] ?? {};
  const label = `projects[${i}] "${k.title}"`;
  if (k.tags.length !== e.tags.length) fail(`${label}: tags 길이 불일치`);

  written.push(
    writeEntry('projects', i + 1, e.title || k.title, compact({
      order: i + 1,
      title: i18n(k.title, e.title, `${label}.title`),
      description: i18n(k.description, e.description, `${label}.description`),
      tags: { ko: k.tags, en: e.tags },
      link: k.link,
      status: parseStatus(k.status, e.status, label),
    }))
  );
});

// 6) research
if (research.ko.length !== research.en.length) fail('research: ko/en 항목 수 불일치');
research.ko.forEach((k, i) => {
  const e = research.en[i] ?? {};
  const label = `research[${i}] "${k.title}"`;
  const period = parsePeriod(k.period, e.period, label);
  if (!period) return;
  if (k.tags.length !== e.tags.length) fail(`${label}: tags 길이 불일치`);
  if ((k.link ?? '') !== (e.link ?? '')) fail(`${label}: link 가 ko/en 간 다릅니다`);

  written.push(
    writeEntry('research', i + 1, e.title || k.title, compact({
      order: i + 1,
      title: i18n(k.title, e.title, `${label}.title`),
      organization: i18n(k.organization, e.organization, `${label}.organization`),
      start: period.start,
      end: period.end,
      periodNote: period.periodNote,
      description: i18n(k.description, e.description, `${label}.description`),
      tags: { ko: k.tags, en: e.tags },
      link: k.link,
      status: parseStatus(k.status, e.status, label),
    }))
  );
});

/* ---------- 결과 ---------- */

if (errors.length > 0) {
  console.error('\n마이그레이션 실패. 아래 항목은 자동 변환하지 않았습니다:\n');
  for (const err of errors) console.error(`  - ${err}`);
  console.error('\n수동 확인이 필요합니다.\n');
  process.exit(1);
}

console.log(`생성된 항목 파일 ${written.length}개:\n`);
for (const f of written) console.log(`  ${f}`);

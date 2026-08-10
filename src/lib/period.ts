import { ui } from '../i18n/ui';
import type { Lang } from '../i18n/utils';

const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface Dated {
  /** "YYYY" 또는 "YYYY-MM" */
  start: string;
  /** 날짜, "present"(진행 중), 또는 생략(단일 시점) */
  end?: string;
  periodNote?: { ko: string; en: string };
}

/** "2026-06" -> ko "2026.06" / en "Jun 2026". 연도만 있으면 그대로 둔다. */
export function formatPoint(point: string, lang: Lang): string {
  const [year, month] = point.split('-');
  if (!month) return year;
  return lang === 'ko' ? `${year}.${month}` : `${EN_MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * 표시용 기간 문자열을 로케일에 맞게 생성한다.
 * 언어별로 기간을 따로 입력하지 않으므로 ko/en 이 어긋날 수 없다.
 */
export function formatPeriod(item: Dated, lang: Lang): string {
  let text = formatPoint(item.start, lang);

  if (item.end) {
    const end = item.end === 'present'
      ? ui[lang]['period.present']
      : formatPoint(item.end, lang);
    text = `${text} - ${end}`;
  }

  if (item.periodNote) text = `${text} (${item.periodNote[lang]})`;

  return text;
}

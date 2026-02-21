export function getKstTodayYmd(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function ymdToDayNumber(ymd: string): number {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!matched) return Number.NaN;

  const [, y, m, d] = matched;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return Number.NaN;

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function daysUntil(endYmd: string, fromYmd: string): number {
  const endNum = ymdToDayNumber(endYmd);
  const fromNum = ymdToDayNumber(fromYmd);
  if (Number.isNaN(endNum) || Number.isNaN(fromNum)) return Number.NaN;
  return endNum - fromNum;
}

export function getDeadlineLabel(
  endYmd?: string,
  fromYmd = getKstTodayYmd()
): null | { text: string; kind: 'expired' | 'today' | 'soon' | 'none' } {
  if (!endYmd) return null;

  const days = daysUntil(endYmd, fromYmd);
  if (Number.isNaN(days)) return null;

  if (days < 0) return { text: '마감', kind: 'expired' };
  if (days === 0) return { text: '오늘 마감', kind: 'today' };
  if (days >= 1 && days <= 7) return { text: `D-${days}`, kind: 'soon' };

  return null;
}

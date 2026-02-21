import { getKstTodayYmd, ymdToDayNumber } from './deadline';
import type { Post } from './postSchema';

export function sortByDeadline(posts: Post[]): Post[] {
  const todayNum = ymdToDayNumber(getKstTodayYmd());

  return [...posts].sort((a, b) => {
    const aEnd = a.applicationPeriod?.end;
    const bEnd = b.applicationPeriod?.end;

    const aNum = aEnd ? ymdToDayNumber(aEnd) : Number.NaN;
    const bNum = bEnd ? ymdToDayNumber(bEnd) : Number.NaN;

    const aMissing = Number.isNaN(aNum);
    const bMissing = Number.isNaN(bNum);

    if (aMissing && bMissing) return b.publishedAt.localeCompare(a.publishedAt);
    if (aMissing) return 1;
    if (bMissing) return -1;

    const aExpired = aNum < todayNum;
    const bExpired = bNum < todayNum;

    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    if (aNum !== bNum) return aNum - bNum;

    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

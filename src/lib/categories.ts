export type CategorySlug =
  | 'youth'
  | 'midlife'
  | 'government'
  | 'smallbiz'
  | 'living-economy';

export const CATEGORIES: { slug: CategorySlug; label: string }[] = [
  { slug: 'youth', label: '청년지원금' },
  { slug: 'midlife', label: '중장년지원금' },
  { slug: 'government', label: '정부지원금' },
  { slug: 'smallbiz', label: '소상공인 지원금' },
  { slug: 'living-economy', label: '생활·경제정보' },
];

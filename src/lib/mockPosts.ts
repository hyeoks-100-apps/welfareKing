import type { CategorySlug } from './categories';

export type MockPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: CategorySlug;
  thumbnail: string;
  date: string;
};

export const MOCK_POSTS: MockPost[] = [
  {
    slug: 'youth-rent-support-checklist',
    title: '청년 월세지원 신청 전 체크리스트 5가지',
    excerpt: '신청 전 준비서류와 자주 실수하는 항목을 한 번에 정리했습니다.',
    category: 'youth',
    thumbnail: '/images/placeholders/p1.svg',
    date: '2026-02-20',
  },
  {
    slug: 'midlife-reemployment-grant-guide',
    title: '중장년 재취업 지원금, 올해 바뀐 조건 요약',
    excerpt: '연령 구간별 요건과 신청 가능한 지원사업을 빠르게 확인하세요.',
    category: 'midlife',
    thumbnail: '/images/placeholders/p2.svg',
    date: '2026-02-18',
  },
  {
    slug: 'government-energy-cashback-2026',
    title: '정부 에너지 환급금 2026 신청 캘린더',
    excerpt: '가구 유형별 환급 일정과 온라인 신청 링크 동선을 안내합니다.',
    category: 'government',
    thumbnail: '/images/placeholders/p3.svg',
    date: '2026-02-17',
  },
  {
    slug: 'smallbiz-rent-relief-quickstart',
    title: '소상공인 임대료 지원금 빠른 신청 가이드',
    excerpt: '자주 묻는 매출 기준과 증빙서류를 예시 중심으로 정리했습니다.',
    category: 'smallbiz',
    thumbnail: '/images/placeholders/p1.svg',
    date: '2026-02-15',
  },
  {
    slug: 'living-economy-utility-discount-map',
    title: '생활비 절감: 전기·가스 할인 제도 한눈에 보기',
    excerpt: '가구 조건에 맞는 요금 감면 제도를 지역별로 찾아보세요.',
    category: 'living-economy',
    thumbnail: '/images/placeholders/p2.svg',
    date: '2026-02-14',
  },
  {
    slug: 'youth-startup-voucher-summary',
    title: '청년 창업 바우처, 놓치기 쉬운 가점 항목 정리',
    excerpt: '심사 단계별 가점 포인트와 준비 순서를 이해하기 쉽게 설명합니다.',
    category: 'youth',
    thumbnail: '/images/placeholders/p3.svg',
    date: '2026-02-12',
  },
];

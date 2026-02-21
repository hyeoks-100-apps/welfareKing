# 복지정보.com

GitHub Pages로 배포되는 Astro 정적 사이트입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## 게시글 데이터

- 게시글은 `data/posts/*.json` 파일로 관리합니다.
- 기본 필드 외에 구조화 필드(`regions`, `applicationPeriod`, `benefit`, `eligibility`, `howToApply`, `documents`, `sourceLinks`, `organization`, `contact`)를 지원합니다.
- `status: "draft"` 글은 로컬 개발(`npm run dev`)에서만 보이고, 프로덕션 빌드에서는 제외됩니다.

## 검색 페이지

- `/search/`에서 제목/요약/태그 기반 검색(Fuse.js)과 카테고리/태그 필터를 사용할 수 있습니다.
- URL 쿼리 파라미터를 지원합니다: `q`(검색어), `cat`(카테고리 slug), `tag`(태그).

## 마감 임박 UX

- 홈의 “마감 임박” 섹션과 카드 배지는 KST(Asia/Seoul) 기준으로 계산됩니다.
- 날짜가 바뀌면 schedule 재배포로 상태가 자동 갱신됩니다.

## SEO 출력

- RSS: `/rss.xml`
- Robots: `/robots.txt`
- Sitemap: 정적 라우트로 생성 (`/sitemap-index.xml`)
- 페이지별 OG/canonical/meta/JSON-LD(상세 Article)를 기본 제공

## 로컬 어드민 (MVP)

- 실행: `npm run admin`
- 접속: `http://localhost:4173`
- 글 저장 위치: `data/posts/`
- 이미지 저장 위치: `public/images/posts/`
- 썸네일 업로드는 `kind=thumbnail`로 처리되어 `cover.webp`(또는 SVG면 `cover.svg`)로 저장됩니다.
- `sharp`가 설치된 환경에서는 업로드 이미지를 최대 폭 1400px로 리사이즈하고 webp(quality 82)로 자동 최적화합니다(옵션).
- 어드민에서 커밋&푸시(또는 직접 `git push`)하면 GitHub Actions로 Pages 배포됩니다.


## 404 / Empty State UX

- 전역 `404` 페이지를 제공해 잘못된 링크 접근 시 홈/검색/업데이트로 바로 이동할 수 있습니다.
- 카테고리/태그/지역/검색 결과가 비어 있을 때는 공통 Empty State 카드로 다음 행동(홈/검색/업데이트)을 안내합니다.

## 검색 사용법 (초성 + 부분 검색)

- `/search/`는 Fuse.js 기반 검색에 더해 한글 초성 검색(예: `ㅊㄴ`)을 지원합니다.
- 일반 텍스트 검색은 정규화 문자열 includes + Fuse 결과를 병합해 부분 검색 누락을 줄였습니다.
- 쿼리 파라미터: `q`(검색어), `cat`(카테고리 slug), `tag`(태그).

## 성능/번들 리포트

```bash
npm run perf:dist
# 경고를 실패(exit 1)로 처리
npm run perf:dist:strict
```

- `dist` 총 용량, 상위 큰 파일 20개, HTML/CSS/JS 합계, 이미지 개수를 확인할 수 있습니다.

## 이미지 캐시 버전

- 썸네일 URL에 `?v=YYYYMMDD`를 자동으로 붙여 캐시된 이미지 교체 반영 지연을 완화합니다.
- 버전은 `updatedAt` 또는 `publishedAt` 날짜에서 계산하며, 원본 `data/posts/*.json` 값은 변경하지 않습니다.

## 배포

`main` 브랜치 push, 수동 실행, 매일 KST 00:10(UTC 15:10 cron) 스케줄로 GitHub Actions가 빌드 후 Pages에 배포합니다.

> GitHub 저장소 설정에서 **Pages > Build and deployment > Source**를 **GitHub Actions**로 선택해야 정상 배포됩니다.

### 배포 오류가 날 때

- `Failed to create deployment (status: 404)`가 뜨면 저장소의 **Settings > Pages**에서 Source가 **GitHub Actions**인지 다시 확인하세요.
- 조직/저장소 권한 정책으로 Pages API 접근이 막히면 저장소 관리자 권한으로 Pages를 먼저 활성화해야 할 수 있습니다.

## 콘텐츠 운영 QA/아카이브

### CLI 스크립트

```bash
npm run qa:content   # 필수값/길이/출처 URL/중복 출처 검사
npm run qa:assets    # 썸네일/본문 이미지 누락 + 미사용 이미지 검사
npm run qa:links     # 외부 링크 상태 검사(403은 기본 경고 처리)
npm run archive:dry  # 아카이브 대상 미리보기(실제 이동 없음)
npm run archive:apply
```

- 아카이브는 `data/posts/<slug>.json`을 `data/archive/<slug>.json`으로 이동합니다.
- 사이트는 `data/posts`만 읽으므로, archive로 이동된 글은 자동으로 노출에서 제외됩니다.
- 실제 이동/삭제는 `--apply`가 있을 때만 실행됩니다(안전 장치).

### 로컬 어드민에서 운영 도구 실행

- 어드민 UI의 **운영 도구** 섹션에서 아래 작업을 바로 실행할 수 있습니다.
  - 콘텐츠 검사 / 이미지 검사 / 링크 검사
  - 아카이브 Dry Run / Apply (`olderThanDays`, `deleteImages` 옵션 지원)
- **커밋 & 푸시** 전에 `푸시 전 검사` 체크가 켜져 있으면 콘텐츠/이미지 검사를 선행하고,
  실패 시 커밋/푸시를 중단합니다.

## 아카이브 라우트

- 태그 아카이브: `/tag/<encoded-tag>/`
- 지역 아카이브: `/region/<REGION_CODE>/`
- 업데이트 로그: `/updates/`

지역 페이지는 해당 지역 코드 글과 `ALL`(전국) 대상 글을 함께 보여줍니다.

## 페이지네이션 규칙

- 1페이지는 basePath 자체를 사용합니다. (예: `/c/youth/`)
- 2페이지부터 `page/2/` 형태를 사용합니다. (예: `/c/youth/page/2/`)
- 동일 규칙이 카테고리/마감임박/태그/지역 아카이브에 공통 적용됩니다.

## OG 이미지 자동 생성 (선택)

```bash
npm run og:gen
# 또는 기존 파일 덮어쓰기 + post JSON에 ogImage 기입
npm run og:gen:force
```

- `sharp`가 없는 환경에서는 자동으로 스킵됩니다(빌드 실패 유발 안 함).

## redirects.json (URL 유지)

- `data/redirects.json`은 `{ "old-slug": "new-slug" }` 형태의 리다이렉트 맵입니다.
- 중복 통합/아카이브 시 옛 `/p/<old-slug>/` 요청을 새 canonical 글로 안내합니다.
- 상세 페이지 라우트에서 정적 redirect 페이지를 생성해 기존 링크 깨짐을 줄입니다.

## 로컬 어드민 운영 컨트롤타워

- **중복 탭**: normalize된 출처 URL 기준 중복 그룹을 확인하고 `통합(merge+archive+redirect)` 또는 `아카이브만` 실행.
- **리뷰 탭**: 출처 없음/오래된 업데이트/마감 지남/썸네일 문제 글을 큐로 확인하고 바로 편집 또는 아카이브.
- **편집 탭 SEO 미리보기**: 검색 스니펫 + OG 카드 미리보기 제공, 권장 길이 가이드(`title <= 55`, `description <= 155`) 경고 표시.

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
- `status: "draft"` 글은 로컬 개발(`npm run dev`)에서만 보이고, 프로덕션 빌드에서는 제외됩니다.

## 검색 페이지

- `/search/`에서 제목/요약/태그 기반 검색(Fuse.js)과 카테고리/태그 필터를 사용할 수 있습니다.
- URL 쿼리 파라미터를 지원합니다: `q`(검색어), `cat`(카테고리 slug), `tag`(태그).

## 배포

`main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드 후 Pages에 배포합니다.

> GitHub 저장소 설정에서 **Pages > Build and deployment > Source**를 **GitHub Actions**로 선택해야 정상 배포됩니다.

### 배포 오류가 날 때

- `Failed to create deployment (status: 404)`가 뜨면 저장소의 **Settings > Pages**에서 Source가 **GitHub Actions**인지 다시 확인하세요.
- 조직/저장소 권한 정책으로 Pages API 접근이 막히면 저장소 관리자 권한으로 Pages를 먼저 활성화해야 할 수 있습니다.

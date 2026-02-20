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

## 배포

`main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드 후 Pages에 배포합니다.

> GitHub 저장소 설정에서 **Pages > Build and deployment > Source**를 **GitHub Actions**로 선택해야 정상 배포됩니다.

### 배포 오류가 날 때

- `Failed to create deployment (status: 404)`가 뜨면 저장소의 **Settings > Pages**에서 Source가 **GitHub Actions**인지 다시 확인하세요.
- 조직/저장소 권한 정책으로 Pages API 접근이 막히면 저장소 관리자 권한으로 Pages를 먼저 활성화해야 할 수 있습니다.

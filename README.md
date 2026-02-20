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

`main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드 후 `gh-pages` 브랜치에 배포합니다.

> GitHub 저장소 설정에서 **Pages > Build and deployment > Source**를 **Deploy from a branch**로 설정하고, 브랜치를 **gh-pages / (root)** 로 선택해야 합니다.

### 배포 오류가 날 때

- `actions/deploy-pages` 기반 404/권한 오류가 반복되면, 현재 워크플로우처럼 `gh-pages` 브랜치 배포 방식을 사용하면 우회할 수 있습니다.
- 저장소/조직 정책으로 GitHub Actions 토큰 권한이 제한된 경우, 저장소 관리자에게 `gh-pages` 브랜치 쓰기 권한과 Pages 설정을 확인받아야 합니다.

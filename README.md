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

> GitHub 저장소 설정에서 **Pages > Source**를 **GitHub Actions**로 변경해야 정상 배포됩니다.

### 배포 중 `Failed to create deployment (status: 404)`가 뜰 때

아래를 먼저 확인하세요.

1. 저장소 **Settings > Pages**에서 GitHub Pages가 활성화되어 있는지
2. **Source**가 **GitHub Actions**로 선택되어 있는지
3. 워크플로우를 재실행했는지 (`Actions` 탭 또는 `workflow_dispatch`)

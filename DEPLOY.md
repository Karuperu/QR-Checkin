# PageKite 배포 가이드

## 개발 서버 실행 (터널 포함)

```bash
# 개발 서버와 PageKite 터널을 동시에 실행
npm run dev:tunnel
```

## 프로덕션 빌드 및 배포

```bash
# 프로덕션 빌드 후 PageKite 터널 시작
npm run deploy
```

## 개별 명령어

```bash
# 개발 서버만 실행
npm run dev

# PageKite 터널만 시작
npm run pagekite:start

# PageKite 터널 중지
npm run pagekite:stop
```

## 접속 URL

- **개발 환경**: https://cscheckin.pagekite.me
- **프로덕션**: https://cscheckin.pagekite.me

## 주의사항

1. PageKite 터널이 실행 중일 때만 외부에서 접근 가능합니다.
2. 터널을 중지하려면 `npm run pagekite:stop` 명령어를 사용하세요.
3. SPA 라우팅이 설정되어 있어 모든 경로가 올바르게 작동합니다.

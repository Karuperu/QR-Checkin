# QR 출퇴근 시스템

React + TypeScript + Supabase로 구축된 QR코드 기반 출퇴근 관리 시스템입니다.

## 기능

- 🎯 **QR코드 생성**: 학과/학번/이름으로 개인 QR코드 생성
- 📱 **QR코드 스캔**: 웹캠을 이용한 실시간 QR코드 스캔
- 📊 **출퇴근 기록**: 자동 출퇴근 기록 및 관리
- 👑 **관리자 대시보드**: 전체 출퇴근 기록 조회 및 CSV 내보내기

## 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **QR 라이브러리**: qrcode, qr-scanner
- **빌드 도구**: Vite

## 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

## 데이터베이스 스키마

### students 테이블
```sql
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  department VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### attendance_logs 테이블
```sql
CREATE TABLE attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  scan_time TIMESTAMP WITH TIME ZONE NOT NULL,
  scan_type VARCHAR CHECK (scan_type IN ('checkin', 'checkout')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 사용 방법

1. **QR코드 생성**: 학과, 학번, 이름을 입력하여 개인 QR코드 생성
2. **QR코드 스캔**: 카메라를 시작하고 QR코드를 스캔하여 출퇴근 기록
3. **관리자 페이지**: 전체 출퇴근 기록 조회 및 CSV 파일로 내보내기

## 배포

```bash
npm run build
```

빌드된 파일들은 `dist` 폴더에 생성됩니다.

## 라이선스

MIT License 
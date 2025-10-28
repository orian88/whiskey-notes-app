# Supabase 초보자 완전 가이드

## 1. Supabase 계정 생성 및 프로젝트 생성

### 1-1. Supabase 계정 생성
1. [Supabase 공식 사이트](https://supabase.com/) 방문
2. 우측 상단 **"Start your project"** 클릭
3. GitHub 계정으로 로그인 (권장) 또는 이메일로 회원가입
4. 이메일 인증 완료

### 1-2. 새 프로젝트 생성
1. 대시보드에서 **"New project"** 클릭
2. 프로젝트 설정:
   - **Name**: `whiskey-notes-app` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (기억해두세요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 가까움)
3. **"Create new project"** 클릭
4. 프로젝트 생성 완료까지 2-3분 대기

## 2. 데이터베이스 스키마 생성

### 2-1. SQL Editor 접근
1. Supabase 대시보드에서 왼쪽 메뉴의 **"SQL Editor"** 클릭
2. **"New query"** 클릭

### 2-2. 스키마 생성
1. 다음 파일의 내용을 복사: `Docs/database/supabase-schema.sql`
2. SQL Editor에 붙여넣기
3. **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
4. 모든 테이블이 성공적으로 생성되었는지 확인

### 2-3. 생성된 테이블 확인
1. 왼쪽 메뉴에서 **"Table Editor"** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `whiskeys`
   - `purchases`
   - `tasting_notes`
   - `personal_notes`

## 3. Storage 설정

### 3-1. Storage 버킷 생성
1. 왼쪽 메뉴에서 **"Storage"** 클릭
2. **"Create a new bucket"** 클릭
3. 버킷 설정:
   - **Name**: `whiskey-images`
   - **Public bucket**: ✅ 체크 (공개 버킷으로 설정)
4. **"Create bucket"** 클릭

### 3-2. Storage 정책 설정
1. 생성된 버킷 클릭
2. **"Policies"** 탭 클릭
3. **"New Policy"** 클릭
4. 다음 정책 추가:
   - **Policy name**: `Allow public access`
   - **Policy definition**: `true`
   - **Operation**: `SELECT`, `INSERT`, `UPDATE`, `DELETE` 모두 선택

## 4. API 키 및 URL 확인

### 4-1. 프로젝트 설정 접근
1. 왼쪽 메뉴에서 **"Settings"** 클릭
2. **"API"** 탭 클릭

### 4-2. 필요한 정보 복사
다음 정보를 복사하여 메모장에 저장:
- **Project URL**: `https://your-project-id.supabase.co`
- **anon public** 키: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (긴 문자열)

## 5. 환경 변수 파일 생성

### 5-1. 프로젝트 루트 위치 확인
현재 프로젝트 구조:
```
D:\PJT_IPS3.0\IPS_Blog\
├── whiskey-notes-app\          ← 이 폴더가 프로젝트 루트
│   ├── src\
│   ├── public\
│   ├── package.json
│   └── .env.local              ← 이 위치에 생성해야 함
├── Docs\
└── .cursorrules
```

### 5-2. .env.local 파일 생성
1. **VS Code**에서 `whiskey-notes-app` 폴더 열기
2. 프로젝트 루트에 `.env.local` 파일 생성 (package.json과 같은 레벨)
3. 다음 내용 입력:

```env
# Supabase 설정 (실제 값으로 교체하세요)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 앱 설정
VITE_APP_NAME=Whiskey Notes
VITE_APP_VERSION=1.0.0
```

### 5-3. 파일 생성 방법 (VS Code)
1. VS Code에서 `whiskey-notes-app` 폴더의 빈 공간 우클릭
2. **"New File"** 선택
3. 파일명을 `.env.local`로 입력
4. 위의 내용을 붙여넣기
5. **Ctrl+S**로 저장

## 6. 연결 테스트

### 6-1. 개발 서버 재시작
1. 터미널에서 `Ctrl+C`로 현재 서버 중지
2. `npm run dev`로 서버 재시작

### 6-2. 브라우저에서 확인
1. `http://localhost:5173` 접속
2. 대시보드에서 **"Supabase 연결 상태"** 확인
3. ✅ 연결 성공이 표시되면 설정 완료!

## 7. 문제 해결

### 7-1. 환경 변수가 인식되지 않는 경우
- `.env.local` 파일이 `whiskey-notes-app` 폴더에 있는지 확인
- 파일명이 정확한지 확인 (`.env.local`)
- 개발 서버를 재시작

### 7-2. Supabase 연결 오류
- URL과 API 키가 정확한지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 브라우저 개발자 도구에서 오류 메시지 확인

### 7-3. SQL 실행 오류
- SQL을 한 번에 모두 실행하지 말고 단계별로 실행
- 각 테이블이 순서대로 생성되었는지 확인

## 8. 다음 단계

모든 설정이 완료되면:
1. ✅ Supabase 프로젝트 생성 완료
2. ✅ 데이터베이스 스키마 생성 완료
3. ✅ Storage 설정 완료
4. ✅ 환경 변수 설정 완료
5. ✅ 연결 테스트 성공

**"환경 설정 완료"라고 말씀해주시면 CRUD 기능 구현을 시작하겠습니다!**

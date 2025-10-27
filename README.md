# 위스키 노트 앱 🥃

개인용 위스키 테이스팅 노트 관리 PWA (Progressive Web App)

## 📱 주요 기능

- **위스키 정보 관리**: 위스키 목록, 상세 정보, 이미지 관리
- **테이스팅 노트**: 맛, 향, 여운 기록 및 평점 시스템
- **구매 기록**: 구매 정보 및 가격 추적
- **개인 노트**: 리치 텍스트 에디터를 활용한 개인 노트
- **컬렉션 관리**: 내 위스키 컬렉션 보기
- **PWA 지원**: 오프라인 사용 가능, 앱 설치 지원

## 🚀 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Headless UI
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Rich Text Editor**: TipTap
- **Charts**: Recharts
- **PWA**: Service Worker + Web App Manifest

## 🛠️ 개발 환경 설정

### 필수 요구사항
- Node.js 18+ 
- npm 또는 yarn
- Supabase 계정

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/your-username/whiskey-notes-app.git
cd whiskey-notes-app
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env.local` 파일을 생성하고 Supabase 설정을 추가하세요:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **개발 서버 실행**
```bash
npm run dev
```

5. **브라우저에서 확인**
http://localhost:5173 에서 앱을 확인할 수 있습니다.

## 📦 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

### 빌드 미리보기
```bash
npm run preview
```

### Vercel 배포
1. Vercel 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 완료

## 🔧 사용 가능한 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기
- `npm run lint` - ESLint 실행
- `npm run analyze` - 번들 분석

## 📱 PWA 기능

- **오프라인 지원**: Service Worker를 통한 캐싱
- **앱 설치**: 브라우저에서 앱 설치 가능
- **푸시 알림**: 백그라운드 알림 지원
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `whiskeys` - 위스키 정보
- `purchases` - 구매 기록
- `tasting_notes` - 테이스팅 노트
- `personal_notes` - 개인 노트
- `collection_items` - 컬렉션 아이템

## 🎨 UI/UX 특징

- **다크모드 지원**: 시스템 설정에 따른 자동 전환
- **반응형 그리드**: 화면 크기에 따른 자동 레이아웃 조정
- **이미지 지연 로딩**: 성능 최적화를 위한 Lazy Loading
- **애니메이션**: 부드러운 전환 효과

## 🔒 보안

- **RLS (Row Level Security)**: Supabase에서 데이터 보안
- **환경 변수**: 민감한 정보는 환경 변수로 관리
- **HTTPS**: 프로덕션 환경에서 HTTPS 강제

## 📈 성능 최적화

- **코드 분할**: 페이지별 지연 로딩
- **이미지 최적화**: WebP 포맷 및 압축
- **번들 최적화**: 라이브러리별 청크 분리
- **캐싱 전략**: Service Worker를 통한 효율적인 캐싱

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

---

**위스키 노트 앱**으로 더 나은 위스키 경험을 만들어보세요! 🥃✨
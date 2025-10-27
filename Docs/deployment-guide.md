# 위스키 노트 앱 - 배포 및 업데이트 가이드

## 1. 현재 상태 요약

### 완료된 작업
- ✅ PWA(Progressive Web App) 설정 완료
- ✅ Service Worker 구현 및 오프라인 지원
- ✅ PWA 설치 버튼 추가
- ✅ 빌드 최적화 (경고 제거)
- ✅ 오프라인 캐싱 전략 구현
- ✅ 자동 업데이트 알림 기능

---

## 2. 개발 워크플로우

### 2.1 소스 수정 후 배포 과정

#### Step 1: 코드 수정
```bash
# 개발 서버 실행 (자동 새로고침됨)
npm run dev
```

#### Step 2: 빌드
```bash
cd whiskey-notes-app
npm run build
```

#### Step 3: Service Worker 파일 복사
```powershell
cd D:\PJT_IPS3.0\IPS_Blog\whiskey-notes-app
Copy-Item -Path "public\sw.js" -Destination "dist\sw.js" -Force
Copy-Item -Path "public\manifest.json" -Destination "dist\manifest.json" -Force
```

#### Step 4: 배포
- `dist` 폴더의 모든 파일을 웹 서버에 업로드
- 또는 Vercel, Netlify 등에 자동 배포 설정

---

## 3. 업데이트 메커니즘

### 3.1 Service Worker 버전 관리

Service Worker는 **버전 기반 캐싱**을 사용합니다.

**파일**: `public/sw.js`
```javascript
const CACHE_NAME = 'whiskey-notes-v5';  // 버전 번호 변경
```

#### 업데이트 시 변경 사항

1. **Service Worker 버전 업데이트**
   ```javascript
   const CACHE_NAME = 'whiskey-notes-v6';  // v5 → v6로 변경
   ```

2. **빌드 및 배포**
   ```bash
   npm run build
   Copy-Item -Path "public\sw.js" -Destination "dist\sw.js" -Force
   ```

3. **사용자 측에서 자동 감지**
   - 새 버전 감지 시 "새 버전이 설치되었습니다" 알림
   - 사용자가 새로고침 시 최신 버전 적용

---

## 4. 배포 체크리스트

### 배포 전 확인 사항
- [ ] Service Worker 버전 업데이트
- [ ] 빌드 성공 (경고 없음)
- [ ] `dist/sw.js` 파일 존재 확인
- [ ] `dist/manifest.json` 파일 존재 확인
- [ ] 오프라인 테스트
- [ ] PWA 설치 테스트

---

## 5. 문제 해결

### 5.1 캐시가 남아있는 경우

#### 사용자 측
1. 브라우저 개발자 도구 (F12)
2. Application 탭
3. Storage → Clear site data
4. Service Workers → Unregister
5. 페이지 새로고침 (Ctrl+Shift+R)

### 5.2 PWA 설치 버튼이 나타나지 않는 경우

**조건**:
- HTTPS 환경 (또는 localhost)
- 유효한 manifest.json
- Service Worker 등록됨

---

## 6. 결론

### ✅ 현재 상태
- 모든 기본 기능 구현 완료
- PWA 기능 완전 구현
- 배포 준비 완료

### 📝 이후 작업
1. 소스 코드 수정
2. `npm run build` 실행
3. `dist` 폴더 배포
4. 자동 업데이트 알림으로 사용자에게 배포

모든 것이 준비되었습니다! 🎉

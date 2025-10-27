# Supabase 설정 가이드

## 1. Supabase 프로젝트 설정

### 데이터베이스 스키마 생성
1. Supabase 대시보드에서 **SQL Editor** 탭으로 이동
2. `Docs/database/supabase-schema.sql` 파일의 내용을 복사하여 실행
3. 모든 테이블, 인덱스, 트리거, 뷰가 성공적으로 생성되었는지 확인

### Storage 설정
1. **Storage** 탭으로 이동
2. 새 버킷 생성:
   - 버킷명: `whiskey-images`
   - 공개 버킷으로 설정
   - 파일 크기 제한: 10MB
   - 허용된 파일 형식: `image/*`

## 2. 환경 변수 설정

### 프로젝트 설정에서 API 키 복사
1. Supabase 대시보드에서 **Settings** → **API** 탭으로 이동
2. 다음 정보를 복사:
   - **Project URL**
   - **anon public** 키

### 로컬 환경 변수 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase 설정
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# 앱 설정
VITE_APP_NAME=Whiskey Notes
VITE_APP_VERSION=1.0.0
```

**주의**: 실제 URL과 키로 교체해야 합니다.

## 3. Supabase 클라이언트 설정 확인

`src/lib/supabase.ts` 파일이 올바르게 설정되었는지 확인:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 4. 연결 테스트

### 간단한 연결 테스트 컴포넌트 생성
`src/components/SupabaseTest.tsx` 파일을 생성하여 연결을 테스트:

```typescript
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('whiskeys')
          .select('count')
          .limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setConnectionStatus('error');
        } else {
          console.log('Supabase connected successfully');
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase 연결 상태</h3>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' :
          connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        }`} />
        <span className="text-sm">
          {connectionStatus === 'connected' && '✅ 연결 성공'}
          {connectionStatus === 'error' && '❌ 연결 실패'}
          {connectionStatus === 'testing' && '🔄 연결 테스트 중...'}
        </span>
      </div>
    </div>
  );
};

export default SupabaseTest;
```

## 5. 데이터베이스 초기 데이터 추가 (선택사항)

### 샘플 위스키 데이터
```sql
INSERT INTO whiskeys (name, brand, type, age, abv, region, price, distillery, description) VALUES
('Macallan 18', 'Macallan', 'Single Malt', 18, 43.0, 'Speyside', 500.00, 'Macallan Distillery', 'Rich and complex single malt with notes of dried fruit and spice'),
('Glenfiddich 12', 'Glenfiddich', 'Single Malt', 12, 40.0, 'Speyside', 45.00, 'Glenfiddich Distillery', 'Smooth and mellow single malt with pear and oak notes'),
('Johnnie Walker Black Label', 'Johnnie Walker', 'Blended', 12, 40.0, 'Scotland', 35.00, 'Diageo', 'Rich and complex blended whisky with smoky character');
```

## 6. 문제 해결

### 일반적인 문제들

1. **환경 변수가 인식되지 않는 경우**
   - `.env.local` 파일이 프로젝트 루트에 있는지 확인
   - 파일명이 정확한지 확인 (`.env.local`)
   - 개발 서버를 재시작

2. **RLS 정책 오류**
   - Supabase 대시보드에서 **Authentication** → **Policies** 확인
   - 모든 테이블에 대한 정책이 올바르게 설정되었는지 확인

3. **CORS 오류**
   - Supabase 대시보드에서 **Settings** → **API** → **CORS** 설정 확인
   - 로컬 개발 서버 URL (`http://localhost:5173`) 추가

4. **Storage 접근 오류**
   - Storage 버킷이 공개로 설정되었는지 확인
   - 버킷 정책이 올바르게 설정되었는지 확인

## 7. 다음 단계

Supabase 설정이 완료되면:
1. ✅ 데이터베이스 스키마 생성 완료
2. ✅ 환경 변수 설정 완료
3. ✅ 연결 테스트 완료
4. 🔄 CRUD 기능 구현 시작

**설정이 완료되면 "Supabase 연결 완료"라고 말씀해주세요!**

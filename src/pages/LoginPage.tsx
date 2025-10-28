import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import Input from '../components/Input';
import Button from '../components/Button';
import { saveDevicePreference, getDevicePreference } from '../utils/deviceDetector';
import { getAppVersion } from '../utils/version';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'mobile' | 'desktop'>('mobile');
  
  const { user, signIn, loading, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  // 저장된 선호도를 확인하여 초기값 설정
  useEffect(() => {
    const savedPreference = getDevicePreference();
    if (savedPreference) {
      setSelectedView(savedPreference);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 선택한 디바이스 선호도를 저장
    saveDevicePreference(selectedView);

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
    } else {
      // 로그인 성공 (result.error가 null이면 성공)
      navigate(selectedView === 'mobile' ? '/mobile' : '/dashboard');
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-8">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* 왼쪽: 브랜딩 영역 */}
        <div className="hidden lg:block text-center space-y-8 px-8">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <img 
                src="/img/icons/icon-192.png" 
                alt="Whiskey Notes Icon" 
                className="w-48 h-48 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl opacity-20 blur-xl"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-amber-900 mb-4">
              Whiskey Notes
            </h1>
            <p className="text-xl text-amber-800 font-medium">
              나만의 위스키 컬렉션을<br />
              기록하고 관리하세요
            </p>
          </div>

          <div className="flex flex-col space-y-4 mt-8">
            <div className="flex items-center justify-start space-x-3 text-amber-800">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
              <span className="font-medium">테이스팅 노트 작성</span>
            </div>
            <div className="flex items-center justify-start space-x-3 text-amber-800">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-lg">🛒</span>
              </div>
              <span className="font-medium">구매 기록 관리</span>
            </div>
            <div className="flex items-center justify-start space-x-3 text-amber-800">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-lg">🏛️</span>
              </div>
              <span className="font-medium">내 진열장 구성</span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 */}
        <div className="w-full max-w-md mx-auto flex justify-center">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full">
            {/* 모바일용 제목 */}
            <div className="lg:hidden text-center mb-8">
              <img 
                src="/img/icons/icon-192.png" 
                alt="Whiskey Notes Icon" 
                className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
              />
              <h2 className="text-3xl font-bold text-amber-900 mb-2">로그인</h2>
            </div>

            {/* 데스크톱용 제목 */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-3xl font-bold text-amber-900 mb-2">로그인</h2>
              <p className="text-gray-600">계정에 로그인하세요</p>
            </div>

                                      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                {error && (
                  <div style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    backgroundColor: '#FEE2E2', 
                    borderLeft: '4px solid #DC2626', 
                    color: '#991B1B', 
                    padding: '12px 16px', 
                    borderRadius: '8px',
                    animation: 'shake 0.5s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px', fontSize: '18px' }}>⚠️</span>
                      <span style={{ fontWeight: '500' }}>{error}</span>
                    </div>
                  </div>
                )}

               <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                   이메일
                 </label>
                 <Input
                   type="email"
                   value={email}
                   onChange={setEmail}
                   required
                   placeholder="your@email.com"
                 />
               </div>

               <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                   비밀번호
                 </label>
                 <Input
                   type="password"
                   value={password}
                   onChange={setPassword}
                   required
                   placeholder="••••••••"
                 />
               </div>

               {/* 버전 선택 UI */}
               <div style={{ width: '100%', maxWidth: '400px', marginTop: '16px' }}>
                 <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' }}>
                   접속 버전 선택
                 </label>
                 <div style={{ display: 'flex', gap: '8px', border: '2px solid #d97706', borderRadius: '12px', overflow: 'hidden' }}>
                   <button
                     type="button"
                     onClick={() => setSelectedView('mobile')}
                     style={{
                       flex: 1,
                       padding: '12px',
                       backgroundColor: selectedView === 'mobile' ? '#d97706' : 'white',
                       color: selectedView === 'mobile' ? 'white' : '#d97706',
                       border: 'none',
                       cursor: 'pointer',
                       fontWeight: '600',
                       transition: 'all 0.2s',
                       fontSize: '14px'
                     }}
                   >
                     📱 모바일
                   </button>
                   <button
                     type="button"
                     onClick={() => setSelectedView('desktop')}
                     style={{
                       flex: 1,
                       padding: '12px',
                       backgroundColor: selectedView === 'desktop' ? '#d97706' : 'white',
                       color: selectedView === 'desktop' ? 'white' : '#d97706',
                       border: 'none',
                       cursor: 'pointer',
                       fontWeight: '600',
                       transition: 'all 0.2s',
                       fontSize: '14px'
                     }}
                   >
                     💻 데스크톱
                   </button>
                 </div>
               </div>

               <div style={{ width: '100%', maxWidth: '400px', marginTop: '16px' }}>
                 <Button
                   type="submit"
                   disabled={loading}
                   style={{ width: '100%' }}
                 >
                   {loading ? '로그인 중...' : '로그인'}
                 </Button>
               </div>
                           </form>
           </div>
         </div>
       </div>

       {/* 하단 앱 정보 */}
       <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center' }}>
         <div style={{ paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
           <p style={{ fontSize: '14px', color: '#6b7280' }}>
             개인용 위스키 테이스팅 노트 앱
           </p>
           <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
             버전 v{getAppVersion()}
           </p>
         </div>
       </div>

     </div>
   );
 };

 export default LoginPage;

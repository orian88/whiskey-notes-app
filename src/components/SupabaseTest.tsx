import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');

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
          setErrorMessage(error.message);
        } else {
          console.log('Supabase connected successfully');
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase 연결 상태</h3>
      <div className="flex items-center space-x-2 mb-2">
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
      {errorMessage && (
        <div className="text-sm text-red-600 dark:text-red-400">
          오류: {errorMessage}
        </div>
      )}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        환경 변수가 설정되지 않은 경우 연결에 실패할 수 있습니다.
      </div>
    </div>
  );
};

export default SupabaseTest;

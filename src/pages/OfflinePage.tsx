import React from 'react';

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 오프라인 아이콘 */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" 
              />
            </svg>
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          오프라인 상태입니다
        </h1>
        
        <p className="text-gray-600 mb-8">
          인터넷 연결을 확인하고 다시 시도해주세요.
        </p>

        {/* 위스키 아이콘 */}
        <div className="mb-8">
          <div className="text-6xl">🥃</div>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            다시 시도
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            이전 페이지로
          </button>
        </div>

        {/* 도움말 */}
        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">오프라인에서도 일부 기능을 사용할 수 있습니다:</p>
          <ul className="text-left space-y-1">
            <li>• 캐시된 위스키 정보 보기</li>
            <li>• 이전에 본 테이스팅 노트</li>
            <li>• 오프라인에서 작성한 노트 (동기화 대기)</li>
          </ul>
        </div>

        {/* 연결 상태 표시 */}
        <div className="mt-6 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-500">오프라인</span>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;

import React from 'react';

interface IPullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  canRefresh: boolean;
  pullDistance: number;
  threshold: number;
  style: React.CSSProperties;
}

const PullToRefreshIndicator: React.FC<IPullToRefreshIndicatorProps> = ({
  isPulling,
  isRefreshing,
  canRefresh,
  pullDistance,
  threshold,
  style
}) => {
  const getIndicatorContent = () => {
    if (isRefreshing) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #8B4513',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ fontSize: '14px', color: '#8B4513', fontWeight: '500' }}>
            새로고침 중...
          </span>
        </div>
      );
    }

    if (isPulling) {
      const progress = Math.min(pullDistance / threshold, 1);
      const rotation = progress * 180;
      
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #8B4513',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease'
            }}
          />
          <span style={{ 
            fontSize: '14px', 
            color: canRefresh ? '#8B4513' : '#6B7280',
            fontWeight: '500',
            transition: 'color 0.2s ease'
          }}>
            {canRefresh ? '놓으면 새로고침' : '아래로 당겨서 새로고침'}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '-60px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(139, 69, 19, 0.2)',
        zIndex: 1000,
        minWidth: '200px',
        ...style
      }}
    >
      {getIndicatorContent()}
    </div>
  );
};

export default PullToRefreshIndicator;

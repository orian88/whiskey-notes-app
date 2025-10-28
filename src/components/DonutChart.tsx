import React from 'react';

interface DonutChartProps {
  data: { [key: string]: number };
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  size = 200, 
  strokeWidth = 20,
  showLegend = true
}) => {
  const colors = [
    '#3B82F6', // 파란색
    '#10B981', // 초록색
    '#F59E0B', // 주황색
    '#EF4444', // 빨간색
    '#8B5CF6', // 보라색
    '#06B6D4', // 청록색
    '#84CC16', // 라임색
    '#F97316', // 오렌지색
    '#EC4899', // 핑크색
    '#14B8A6', // 틸색
    '#F43F5E', // 로즈색
    '#6366F1', // 인디고색
  ];

  const entries = Object.entries(data).sort(([,a], [,b]) => b - a);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '16px',
      width: '100%'
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* 배경 원 */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          
          {/* 데이터 원호들 */}
          {entries.map(([label, count], index) => {
            const percentage = (count / total) * 100;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercentage * circumference / 100;
            
            cumulativePercentage += percentage;
            
            return (
              <circle
                key={label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        
        {/* 중앙 텍스트 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {total}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            총 {entries.length}개 타입
          </div>
        </div>
      </div>
      
      {/* 범례 */}
      {showLegend && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
          width: '100%',
          padding: '0 8px'
        }}>
          {entries.map(([label, count], index) => (
            <div key={label} style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center'
            }}>
              {/* 왼쪽 액센트 바 */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: colors[index % colors.length]
              }} />
              
              {/* 색상 인디케이터 */}
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: colors[index % colors.length],
                borderRadius: '50%',
                flexShrink: 0
              }} />
              
              {/* 타입명 */}
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#1F2937',
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {label}
              </div>
              
              {/* 개수와 단위 */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '2px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: colors[index % colors.length]
                }}>
                  {count}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  fontWeight: '500'
                }}>
                  개
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonutChart;

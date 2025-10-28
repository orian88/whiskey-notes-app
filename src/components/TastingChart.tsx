import React, { useCallback, useMemo } from 'react';
import type { ITastingNote } from '../types/index';

interface TastingChartProps {
  tastingNote: ITastingNote;
  className?: string;
}

const TastingChart: React.FC<TastingChartProps> = ({ tastingNote, className = '' }) => {
  // 차트 데이터 메모이제이션
  const chartData = useMemo(() => [
    { label: '전체 평가', value: tastingNote.rating, color: '#8B4513' }
  ], [tastingNote.rating]);

  // 상수값들 메모이제이션
  const chartConfig = useMemo(() => ({
    maxValue: 10,
    chartHeight: 200,
    barWidth: 80
  }), []);

  // Y축 라벨 메모이제이션
  const yAxisLabels = useMemo(() => [10, 8, 6, 4, 2], []);

  // 평가 메시지 메모이제이션
  const ratingMessage = useMemo(() => {
    if (tastingNote.rating >= 9) return '🌟 최고의 위스키!';
    if (tastingNote.rating >= 7) return '👍 좋은 위스키!';
    if (tastingNote.rating >= 5) return '😊 괜찮은 위스키';
    return '🤔 다시 생각해볼 만한 위스키';
  }, [tastingNote.rating]);

  // 마우스 이벤트 핸들러들 최적화
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scaleY(1.1)';
    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scaleY(1)';
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  }, []);

  // 스타일 객체들 메모이제이션
  const containerStyle = useMemo(() => ({
    backgroundColor: '#FEFEFE',
    border: '2px solid #8B4513',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)'
  }), []);

  const titleStyle = useMemo(() => ({
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: '20px',
    textAlign: 'center' as const,
    borderBottom: '2px solid #8B4513',
    paddingBottom: '8px'
  }), []);

  const chartContainerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'center',
    height: `${chartConfig.chartHeight}px`,
    padding: '0 10px',
    position: 'relative' as const
  }), [chartConfig.chartHeight]);

  const yAxisStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: '-10px',
    top: '0',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    width: '20px'
  }), []);

  const barContainerStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: `${chartConfig.barWidth}px`
  }), [chartConfig.barWidth]);

  const barStyle = useMemo(() => ({
    borderRadius: '4px 4px 0 0',
    position: 'relative' as const,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer'
  }), []);

  const valueLabelStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '-25px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const
  }), []);

  const labelStyle = useMemo(() => ({
    marginTop: '8px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#8B4513',
    textAlign: 'center' as const,
    maxWidth: `${chartConfig.barWidth}px`,
    wordWrap: 'break-word' as const
  }), [chartConfig.barWidth]);

  const summaryStyle = useMemo(() => ({
    marginTop: '20px',
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#8B4513',
    color: 'white',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold'
  }), []);

  const subtitleStyle = useMemo(() => ({
    fontSize: '12px',
    marginTop: '4px',
    opacity: 0.9
  }), []);

  const legendStyle = useMemo(() => ({
    marginTop: '15px',
    fontSize: '12px',
    color: '#666',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const
  }), []);

  return (
    <div className={`tasting-chart ${className}`} style={containerStyle}>
      {/* 차트 제목 */}
      <div style={titleStyle}>
        📊 테이스팅 평가 차트
      </div>

      {/* 차트 컨테이너 */}
      <div style={chartContainerStyle}>
        {/* Y축 라벨 */}
        <div style={yAxisStyle}>
          {yAxisLabels.map(value => (
            <div key={value} style={{ textAlign: 'right' }}>{value}</div>
          ))}
        </div>

        {/* 막대 차트 */}
        {chartData.map((item) => {
          const barHeight = (item.value / chartConfig.maxValue) * chartConfig.chartHeight;
          
          return (
            <div key={item.label} style={barContainerStyle}>
              {/* 막대 */}
              <div 
                style={{
                  ...barStyle,
                  width: `${chartConfig.barWidth * 0.6}px`,
                  height: `${barHeight}px`,
                  backgroundColor: item.color
                }}
                title={`${item.label}: ${item.value}점`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* 값 표시 */}
                <div style={{
                  ...valueLabelStyle,
                  color: item.color,
                  border: `1px solid ${item.color}`
                }}>
                  {item.value}
                </div>
              </div>

              {/* 라벨 */}
              <div style={labelStyle}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 전체 평가 점수 표시 */}
      <div style={summaryStyle}>
        🏆 전체 평가: {tastingNote.rating}점
        <div style={subtitleStyle}>
          {ratingMessage}
        </div>
      </div>

      {/* 범례 */}
      <div style={legendStyle}>
        * 평가는 1-10점으로 평가됩니다
      </div>
    </div>
  );
};

export default React.memo(TastingChart);
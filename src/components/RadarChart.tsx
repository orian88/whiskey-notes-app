import React from 'react';

interface RadarChartProps {
  data: {
    nose_rating: number;
    palate_rating: number;
    finish_rating: number;
    sweetness: number;
    smokiness: number;
    fruitiness: number;
    complexity: number;
  };
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ 
  data, 
  size = 300 
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  // 7개 항목의 각도 계산 (0도부터 시작하여 시계방향으로)
  const angles = [0, 51.43, 102.86, 154.29, 205.71, 257.14, 308.57]; // 360/7 = 51.43도씩
  
  // 데이터를 정규화 (0-10을 0-1로 변환)
  const normalizedData = {
    nose_rating: data.nose_rating / 10,
    palate_rating: data.palate_rating / 10,
    finish_rating: data.finish_rating / 10,
    sweetness: data.sweetness / 10,
    smokiness: data.smokiness / 10,
    fruitiness: data.fruitiness / 10,
    complexity: data.complexity / 10
  };
  
  // 각 점의 좌표 계산
  const points = [
    { x: centerX + radius * normalizedData.nose_rating * Math.cos((angles[0] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.nose_rating * Math.sin((angles[0] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.palate_rating * Math.cos((angles[1] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.palate_rating * Math.sin((angles[1] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.finish_rating * Math.cos((angles[2] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.finish_rating * Math.sin((angles[2] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.sweetness * Math.cos((angles[3] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.sweetness * Math.sin((angles[3] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.smokiness * Math.cos((angles[4] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.smokiness * Math.sin((angles[4] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.fruitiness * Math.cos((angles[5] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.fruitiness * Math.sin((angles[5] - 90) * Math.PI / 180) },
    { x: centerX + radius * normalizedData.complexity * Math.cos((angles[6] - 90) * Math.PI / 180), 
      y: centerY + radius * normalizedData.complexity * Math.sin((angles[6] - 90) * Math.PI / 180) }
  ];
  
  // 폴리곤 경로 생성
  const polygonPath = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ') + ' Z';
  
  // 격자선 생성 (5개 레벨)
  const gridLines = [];
  for (let i = 1; i <= 5; i++) {
    const gridRadius = radius * (i / 5);
    const gridPath = angles.map((angle, index) => {
      const x = centerX + gridRadius * Math.cos((angle - 90) * Math.PI / 180);
      const y = centerY + gridRadius * Math.sin((angle - 90) * Math.PI / 180);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
    
    gridLines.push(
      <path
        key={i}
        d={gridPath}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="1"
        opacity="0.5"
      />
    );
  }
  
  // 축선 생성
  const axisLines = angles.map((angle, index) => {
    const x = centerX + radius * Math.cos((angle - 90) * Math.PI / 180);
    const y = centerY + radius * Math.sin((angle - 90) * Math.PI / 180);
    return (
      <line
        key={index}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#D1D5DB"
        strokeWidth="1"
        opacity="0.7"
      />
    );
  });
  
  // 라벨 생성
  const labels = [
    '향 평가', '맛 평가', '여운 평가', '단맛', '스모키함', '과일향', '복합성'
  ];
  
  const labelElements = angles.map((angle, index) => {
    const labelRadius = radius + 20;
    const x = centerX + labelRadius * Math.cos((angle - 90) * Math.PI / 180);
    const y = centerY + labelRadius * Math.sin((angle - 90) * Math.PI / 180);
    
    return (
      <text
        key={index}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="#6B7280"
        fontWeight="500"
      >
        {labels[index]}
      </text>
    );
  });
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ border: '1px solid #E5E7EB', borderRadius: '8px' }}>
        {/* 격자선 */}
        {gridLines}
        
        {/* 축선 */}
        {axisLines}
        
        {/* 데이터 폴리곤 */}
        <path
          d={polygonPath}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        
        {/* 데이터 점들 */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3B82F6"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}
        
        {/* 라벨 */}
        {labelElements}
      </svg>
    </div>
  );
};

export default RadarChart;

import React, { useMemo } from 'react';

interface SevenRadarChartProps {
  values: {
    nose: number;
    palate: number;
    finish: number;
    sweetness: number;
    smokiness: number;
    fruitiness: number;
    complexity: number;
  };
  max?: number;
  size?: number;
}

const SevenRadarChart: React.FC<SevenRadarChartProps> = ({ values, max = 10, size = 260 }) => {
  const keys = ['nose','palate','finish','sweetness','smokiness','fruitiness','complexity'] as const;
  const labels: Record<string,string> = {
    nose: '향', palate: '맛', finish: '여운', sweetness: '단맛', smokiness: '스모키', fruitiness: '과일향', complexity: '복합성'
  };

  const points = useMemo(() => {
    const cx = size/2; const cy = size/2; const r = (size/2) - 24;
    return keys.map((k, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI/2;
      const ratio = Math.max(0, Math.min(max, values[k])) / max;
      const x = cx + Math.cos(angle) * r * ratio;
      const y = cy + Math.sin(angle) * r * ratio;
      return `${x},${y}`;
    }).join(' ');
  }, [values, max, size]);

  const gridLines = useMemo(() => {
    const cx = size/2; const cy = size/2; const r = (size/2) - 24;
    const steps = 5;
    const polygons: string[] = [];
    for(let s=1; s<=steps; s++){
      const ratio = s/steps; const pts: string[] = [];
      for(let i=0;i<keys.length;i++){
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI/2;
        const x = cx + Math.cos(angle) * r * ratio;
        const y = cy + Math.sin(angle) * r * ratio;
        pts.push(`${x},${y}`);
      }
      polygons.push(pts.join(' '));
    }
    return polygons;
  }, [size]);

  const spokes = useMemo(() => {
    const cx = size/2; const cy = size/2; const r = (size/2) - 24;
    return keys.map((k, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI/2;
      const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r;
      return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E7EB" strokeWidth={1}/>;
    });
  }, [size]);

  const labelsPos = useMemo(() => {
    const cx = size/2; const cy = size/2; const r = (size/2) - 12;

    // 점수에 따른 색상 매핑 함수
    const getScoreColor = (score: number) => {
      if (score >= 9) return '#DC2626'; // 빨강
      if (score >= 8) return '#EA580C'; // 주황
      if (score >= 7) return '#D97706'; // 황갈색
      if (score >= 6) return '#65A30D'; // 연두
      if (score >= 5) return '#059669'; // 초록
      if (score >= 4) return '#0891B2'; // 청록
      if (score >= 3) return '#4F46E5'; // 남색
      return '#7C3AED'; // 보라
    };

    return keys.map((k, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI/2;
      const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r;
      const scoreColor = getScoreColor(values[k]);
      
      return (
        <g key={k}>
          <text x={x} y={y - 6} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#374151" style={{ fontWeight: 500 }}>{labels[k]}</text>
          <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill={scoreColor} style={{ fontWeight: 600 }}>({values[k]})</text>
        </g>
      );
    });
  }, [size, values]);

  return (
    <div style={{ width: size, margin: '0 auto' }}>
      <svg width={size} height={size}>
        {/* 그리드 */}
        {gridLines.map((pts, idx) => (
          <polygon key={idx} points={pts} fill="none" stroke="#E5E7EB" strokeWidth={1}/>
        ))}
        {/* 방사형 축 */}
        {spokes}
        {/* 데이터 폴리곤 */}
        <polygon points={points} fill="rgba(59,130,246,0.25)" stroke="#3B82F6" strokeWidth={2}/>
        {/* 라벨 */}
        {labelsPos}
      </svg>
    </div>
  );
};

export default React.memo(SevenRadarChart);

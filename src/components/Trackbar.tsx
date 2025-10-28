import React, { useCallback, useMemo } from 'react';

interface TrackbarProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  color?: string; // thumb color
  colorPattern?: 'default' | 'gradient' | 'rainbow' | 'pastel' | 'vibrant' | 'earth' | 'ocean' | 'sunset';
}

const Trackbar: React.FC<TrackbarProps> = React.memo(({
  min,
  max,
  step,
  value,
  onChange,
  label,
  formatValue = (v: number) => v.toString(),
  disabled = false,
  className = '',
  color = '#8B4513',
  colorPattern = 'default'
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange && onChange(Number(e.target.value));
  }, [onChange]);

  // 색상 패턴에 따른 실제 색상 계산
  const getActualColor = useMemo(() => {
    if (colorPattern === 'default') return color;
    
    const normalizedValue = (value - min) / (max - min); // 0-1 범위로 정규화
    
    switch (colorPattern) {
      case 'gradient':
        // 빨간색에서 녹색으로 그라데이션
        const red = Math.round(255 * (1 - normalizedValue));
        const green = Math.round(255 * normalizedValue);
        return `rgb(${red}, ${green}, 0)`;
        
      case 'rainbow':
        // 무지개 색상 (빨-주-노-초-파-남-보)
        const hue = normalizedValue * 360;
        return `hsl(${hue}, 70%, 50%)`;
        
      case 'pastel':
        // 파스텔 색상
        const pastelHue = normalizedValue * 300; // 0-300도 범위
        return `hsl(${pastelHue}, 60%, 80%)`;
        
      case 'vibrant':
        // 생생한 색상
        const vibrantHue = normalizedValue * 360;
        return `hsl(${vibrantHue}, 90%, 60%)`;
        
      case 'earth':
        // 대지 색상 (갈색 계열)
        const earthHue = 30 + (normalizedValue * 60); // 30-90도 (주황-노랑)
        return `hsl(${earthHue}, 70%, 45%)`;
        
      case 'ocean':
        // 바다 색상 (파란색 계열)
        const oceanHue = 180 + (normalizedValue * 60); // 180-240도 (청록-파랑)
        return `hsl(${oceanHue}, 80%, 50%)`;
        
      case 'sunset':
        // 일몰 색상 (주황-빨강-보라)
        const sunsetHue = 20 + (normalizedValue * 280); // 20-300도
        return `hsl(${sunsetHue}, 85%, 55%)`;
        
      default:
        return color;
    }
  }, [color, colorPattern, value, min, max]);

  const uniqueClass = useMemo(() => {
    return `tb-${getActualColor.replace('#', '').replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 9)}`;
  }, [getActualColor]);

  // 간단한 스타일 객체들 - 메모이제이션으로 최적화
  const styles = useMemo(() => ({
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      width: '100%'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    sliderWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    slider: {
      flex: 1,
      height: '6px',
      background: '#E5E7EB',
      borderRadius: '3px',
      outline: 'none',
      appearance: 'none' as const,
      cursor: disabled ? 'not-allowed' : (onChange ? 'pointer' : 'default')
    },
    valueDisplay: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#111827',
      minWidth: '60px',
      textAlign: 'center' as const
    }
  }), [disabled, onChange]);

  const thumbCss = `
    .${uniqueClass}::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px; 
      height: 16px; 
      border-radius: 50%; 
      background: ${getActualColor} !important;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: ${disabled ? 'not-allowed' : (onChange ? 'pointer' : 'default')};
      margin-top: -5px;
    }
    .${uniqueClass}::-moz-range-thumb {
      width: 16px; 
      height: 16px; 
      border-radius: 50%; 
      background: ${getActualColor} !important;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: ${disabled ? 'not-allowed' : (onChange ? 'pointer' : 'default')};
    }
    .${uniqueClass}::-webkit-slider-track {
      background: #E5E7EB;
      height: 6px;
      border-radius: 3px;
    }
    .${uniqueClass}::-moz-range-track {
      background: #E5E7EB;
      height: 6px;
      border-radius: 3px;
      border: none;
    }
  `;

  return (
    <div className={`trackbar-container ${className}`} style={styles.container}>
      <style>{thumbCss}</style>
      {label && <div style={styles.label}>{label}</div>}
      
      <div style={styles.sliderWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled || !onChange}
          style={styles.slider as React.CSSProperties}
          className={uniqueClass}
        />
        <div style={styles.valueDisplay}>
          {formatValue(value)}
        </div>
      </div>
    </div>
  );
});

Trackbar.displayName = 'Trackbar';

export default Trackbar;
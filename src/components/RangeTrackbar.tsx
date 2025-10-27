import React, { useCallback, useMemo } from 'react';

interface RangeTrackbarProps {
  min: number;
  max: number;
  step: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

const RangeTrackbar: React.FC<RangeTrackbarProps> = React.memo(({
  min,
  max,
  step,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  label,
  formatValue = (v: number) => v.toString(),
  disabled = false,
  className = ''
}) => {
  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value);
    onMinChange(Math.min(newMin, maxValue));
  }, [onMinChange, maxValue]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    onMaxChange(Math.max(newMax, minValue));
  }, [onMaxChange, minValue]);

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
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    valueDisplay: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#111827',
      minWidth: '60px',
      textAlign: 'center' as const
    },
    rangeInfo: {
      fontSize: '12px',
      color: '#6B7280',
      textAlign: 'center' as const,
      marginTop: '4px',
      // GlassCountInput과 동일하게: 좌측 20px 트랙 여백, 우측은 valueDisplay(60) + gap(12)
      marginLeft: '20px',
      marginRight: `${60 + 12}px`
    }
  }), [disabled]);

  return (
    <div className={`range-trackbar-container ${className}`} style={styles.container}>
      {label && <div style={styles.label}>{label}</div>}
      
      <div style={styles.sliderWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          disabled={disabled}
          style={styles.slider}
        />
        <div style={styles.valueDisplay}>
          {formatValue(minValue)}
        </div>
      </div>
      
      <div style={styles.sliderWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          disabled={disabled}
          style={styles.slider}
        />
        <div style={styles.valueDisplay}>
          {formatValue(maxValue)}
        </div>
      </div>
    </div>
  );
});

RangeTrackbar.displayName = 'RangeTrackbar';

export default RangeTrackbar;
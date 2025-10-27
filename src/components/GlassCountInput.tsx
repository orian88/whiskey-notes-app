import React, { useCallback, useMemo } from 'react';

interface GlassCountInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  maxGlasses?: number;
}

const GlassCountInput: React.FC<GlassCountInputProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  maxGlasses = 5
}) => {
  const glassSize = 50; // 1잔 = 50ml
  const valueRounded = Math.round(value * 2) / 2; // 0.5 단위 정규화
  const totalMl = valueRounded * glassSize;

  const formatGlass = useCallback((v: number) => {
    const n = Math.round(v * 2) / 2;
    return Number.isInteger(n) ? `${n}` : n.toFixed(1);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const snapped = Math.round(newValue * 2) / 2;
    onChange(Math.max(0, Math.min(maxGlasses, snapped)));
  }, [onChange, maxGlasses]);

  const handleMlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const mlValueRaw = e.target.value;
    const mlValue = Number(mlValueRaw);
    if (Number.isNaN(mlValue)) return;
    const halfGlassMl = glassSize / 2; // 25ml
    const snappedMl = Math.round(mlValue / halfGlassMl) * halfGlassMl;
    const glassCount = snappedMl / glassSize;
    onChange(Math.max(0, Math.min(maxGlasses, glassCount)));
  }, [onChange, maxGlasses, glassSize]);

  const handleMlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['ArrowUp', 'ArrowDown', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
    if (!allowed.includes(e.key)) e.preventDefault();
  }, []);

  const handleButtonClick = useCallback((glassCount: number) => {
    onChange(Math.min(glassCount, maxGlasses));
  }, [onChange, maxGlasses]);

  const handleButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>, glassCount: number) => {
    if (!disabled && value !== glassCount) {
      e.currentTarget.style.backgroundColor = '#F3F4F6';
    }
  }, [disabled, value]);

  const handleButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>, glassCount: number) => {
    if (!disabled && value !== glassCount) {
      e.currentTarget.style.backgroundColor = 'white';
    }
  }, [disabled, value]);

  const glassCounts = useMemo(() => {
    const arr: number[] = [];
    for (let g = 0; g <= maxGlasses; g += 0.5) arr.push(Number(g.toFixed(1)));
    return arr;
  }, [maxGlasses]);
  const quickSelectButtons = useMemo(() => [0.5, 1, 1.5, 2, 2.5, 3, 4, 5], []);

  const sliderStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '-7px',
    left: '-5px',
    width: 'calc(100% + 10px)',
    height: '20px',
    background: 'transparent',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    opacity: disabled ? 0.5 : 1
  }), [disabled]);

  const activeRangeStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: `${(valueRounded / maxGlasses) * 100}%`,
    height: '6px',
    background: '#3B82F6',
    borderRadius: '3px'
  }), [valueRounded, maxGlasses]);

  const ticksContainerStyle = useMemo(() => ({
    position: 'relative' as const,
    marginTop: '8px',
    height: '16px',
    marginLeft: '10px',
    // 기존 10px + 우측 선택값 표시 영역(minWidth: 60px)을 제외해 트랙 길이까지만 숫자 노출
    marginRight: `${10 + 60}px`
  }), []);

  const tickStyle = useMemo(() => ({
    position: 'absolute' as const,
    transform: 'translateX(-50%)',
    fontSize: '11px',
    color: '#9CA3AF',
    width: '20px',
    textAlign: 'center' as const
  }), []);

  const buttonStyle = useMemo(() => ({
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled ? 0.5 : 1
  }), [disabled]);

  return (
    <div className={`glass-count-input ${className}`} style={{ width: '100%' }}>
      {/* 라벨 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
          글래스 수
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', minWidth: '2rem', textAlign: 'center' }}>
            {formatGlass(valueRounded)}잔
          </span>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {Math.round(totalMl)}ml
          </span>
        </div>
      </div>
      
      {/* Trackbar 스타일 슬라이더 */}
      <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
        {/* 슬라이더 컨테이너 */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '6px', 
          background: '#E5E7EB', 
          borderRadius: '3px',
          margin: '0 10px'
        }}>
          {/* 활성 범위 표시 */}
          <div style={activeRangeStyle} />
          
          {/* 슬라이더 */}
          <input
            type="range"
            min={0}
            max={maxGlasses}
            step={0.5}
            value={valueRounded}
            onChange={handleChange}
            disabled={disabled}
            style={sliderStyle}
          />
        </div>
        
        {/* 선택된 값 표시 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
            {formatGlass(valueRounded)}잔
          </span>
          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>선택된 값</span>
        </div>
      </div>
      
      {/* 하단 글래스 수 표시 - 트랙바 끝점에 정렬 */}
      <div style={ticksContainerStyle}>
        {glassCounts.map((glassCount) => {
          const position = (glassCount / maxGlasses) * 100;
          return (
            <span 
              key={glassCount} 
              style={{ 
                ...tickStyle,
                left: `${position}%`
              }}
            >
              {formatGlass(glassCount)}
            </span>
          );
        })}
      </div>

      {/* 직접 입력 (ml) + 오른쪽 빠른 선택 */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: '#F9FAFB', 
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
          직접 입력 (ml)
        </label>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
          <input
            type="number"
            value={Math.round(totalMl)}
            onChange={handleMlChange}
            onKeyDown={handleMlKeyDown}
            disabled={disabled}
            min={0}
            max={glassSize * maxGlasses}
            step={glassSize / 2}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '12px', color: '#6B7280' }}>ml</span>
          {/* 버튼을 입력 우측에 배치 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {quickSelectButtons.map((glassCount) => (
              <button
                type="button"
                key={glassCount}
                onClick={() => handleButtonClick(glassCount)}
                disabled={disabled}
                style={{
                  ...buttonStyle,
                  backgroundColor: valueRounded === glassCount ? '#3B82F6' : 'white',
                  color: valueRounded === glassCount ? 'white' : '#374151'
                }}
                onMouseEnter={(e) => handleButtonMouseEnter(e, glassCount)}
                onMouseLeave={(e) => handleButtonMouseLeave(e, glassCount)}
              >
                {formatGlass(glassCount)}잔
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GlassCountInput);

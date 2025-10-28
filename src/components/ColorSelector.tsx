import React, { useState } from 'react';

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const colorOptions = [
    { name: '투명', value: 'transparent', color: 'transparent' },
    { name: '연한 황금', value: 'light-gold', color: '#FFD700' },
    { name: '황금', value: 'gold', color: '#FFA500' },
    { name: '호박색', value: 'amber', color: '#FF8C00' },
    { name: '구리색', value: 'copper', color: '#B87333' },
    { name: '적갈색', value: 'mahogany', color: '#8B4513' },
    { name: '갈색', value: 'brown', color: '#A52A2A' },
    { name: '진한 갈색', value: 'dark-brown', color: '#654321' },
    { name: '검은색', value: 'black', color: '#000000' }
  ];

  const selectedColor = colorOptions.find(option => option.value === value) || colorOptions[0];

  const WhiskeySVG = ({ colorValue }: { colorValue: string }) => {
    // 색상 값에 맞는 실제 색상 찾기
    const colorOption = colorOptions.find(option => option.value === colorValue);
    const actualColor = colorOption ? colorOption.color : 'transparent';
    
    return (
      <svg
        width="40"
        height="60"
        viewBox="0 0 40 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 위스키 병 몸체 */}
        <rect
          x="8"
          y="15"
          width="24"
          height="35"
          rx="2"
          fill="white"
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        
        {/* 위스키 액체 */}
        <rect
          x="9"
          y="16"
          width="22"
          height="33"
          rx="1"
          fill={actualColor === 'transparent' ? 'transparent' : actualColor}
          opacity={actualColor === 'transparent' ? 0.3 : 0.8}
        />
        
        {/* 병 목 */}
        <rect
          x="15"
          y="8"
          width="10"
          height="7"
          rx="1"
          fill="white"
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        
        {/* 코르크 */}
        <rect
          x="16"
          y="5"
          width="8"
          height="3"
          rx="1"
          fill="#8B4513"
        />
        
        {/* 라벨 */}
        <rect
          x="10"
          y="20"
          width="20"
          height="8"
          rx="1"
          fill="white"
          stroke="#E5E7EB"
          strokeWidth="0.5"
        />
        
        {/* 라벨 텍스트 */}
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fontSize="3"
          fill="#374151"
          fontFamily="Arial, sans-serif"
        >
          WHISKEY
        </text>
      </svg>
    );
  };

  return (
    <div className="color-selector" style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
        색상
      </label>
      
      {/* 선택된 색상 표시 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          backgroundColor: 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.boxShadow = '0 0 0 1px #3B82F6';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <WhiskeySVG colorValue={selectedColor.value} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
            {selectedColor.name}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            {selectedColor.value}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {/* 색상 선택 드롭다운 */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 50,
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {colorOptions.map((option) => (
            <div
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #F3F4F6',
                transition: 'background-color 0.2s'
              }}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <WhiskeySVG colorValue={option.value} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {option.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {option.value}
                </div>
              </div>
              {value === option.value && (
                <div style={{ fontSize: '16px', color: '#3B82F6' }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 드롭다운 외부 클릭 시 닫기 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ColorSelector;

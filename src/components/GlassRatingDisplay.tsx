import React, { useMemo } from 'react';

interface GlassRatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GlassRatingDisplay: React.FC<GlassRatingDisplayProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  className = ''
}) => {
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          glassSize: '16px',
          fontSize: '12px',
          gap: '4px'
        };
      case 'lg':
        return {
          glassSize: '24px',
          fontSize: '16px',
          gap: '8px'
        };
      default: // md
        return {
          glassSize: '20px',
          fontSize: '14px',
          gap: '6px'
        };
    }
  }, [size]);

  const glasses = useMemo(() => {
    return Array.from({ length: maxRating }, (_, i) => {
      const isFilled = i < Math.floor(rating);
      const isHalfFilled = i === Math.floor(rating) && rating % 1 !== 0;
      
      return (
        <div
          key={i}
          style={{
            width: sizeStyles.glassSize,
            height: sizeStyles.glassSize,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* 글랜캐럿 잔 SVG */}
          <svg
            width={sizeStyles.glassSize}
            height={sizeStyles.glassSize}
            viewBox="0 0 24 24"
            style={{ position: 'absolute' }}
          >
            {/* 글랜캐럿 잔 테두리 - 넓은 입구와 좁은 다리 */}
            <path
              d="M6 2h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z"
              fill="none"
              stroke="#D1D5DB"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 잔 다리 */}
            <path
              d="M10 18h4"
              fill="none"
              stroke="#D1D5DB"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* 액체 채우기 - 위스키 색상 */}
            {(isFilled || isHalfFilled) && (
              <path
                d={isHalfFilled 
                  ? "M7 4h10v8H7z" 
                  : "M7 4h10v10H7z"
                }
                fill="#8B4513"
                opacity={0.8}
              />
            )}
          </svg>
        </div>
      );
    });
  }, [maxRating, rating, sizeStyles]);

  const containerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: sizeStyles.gap
  }), [sizeStyles.gap]);

  const glassesContainerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: sizeStyles.gap
  }), [sizeStyles.gap]);

  const textStyle = useMemo(() => ({
    fontSize: sizeStyles.fontSize,
    fontWeight: '500' as const,
    color: '#374151',
    marginLeft: '4px'
  }), [sizeStyles.fontSize]);

  return (
    <div 
      className={`glass-rating-display ${className}`}
      style={containerStyle}
    >
      {/* 글랜캐럿 잔들 */}
      <div style={glassesContainerStyle}>
        {glasses}
      </div>
      
      {/* 평점 텍스트 */}
      <span style={textStyle}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

export default React.memo(GlassRatingDisplay);

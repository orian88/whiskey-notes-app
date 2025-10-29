import React, { useCallback, useMemo } from 'react';

interface CheckImageButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  image: string | React.ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  accentColor?: string; // 좌측 액센트 바 색상 (선택)
  backgroundImage?: string; // 배경 이미지 경로 (선택)
  height?: number; // 버튼 높이 조정 (선택)
}

const CheckImageButton: React.FC<CheckImageButtonProps> = ({
  checked,
  onChange,
  image,
  label,
  disabled = false,
  className = '',
  accentColor,
  backgroundImage,
  height
}) => {
  const [imageLoadError, setImageLoadError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // 이미지 로딩 상태 리셋
  React.useEffect(() => {
    if (backgroundImage) {
      setImageLoadError(false);
      setImageLoaded(false);
    }
  }, [backgroundImage]);
  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [disabled, onChange, checked]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }
  }, [disabled]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      e.currentTarget.style.transform = '';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    }
  }, [disabled]);

  const containerStyle = useMemo(() => ({
    padding: '6px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    backgroundColor: checked ? '#f8f9fa' : 'white',
    border: checked ? '2px solid #007bff' : '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    opacity: disabled ? 0.5 : 1,
    height: height ? `${height}px` : '56px',
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '6px',
    textAlign: 'left' as const,
    position: 'relative' as const,
    paddingTop: '8px'
  }), [checked, disabled, height]);

  const imageContainerStyle = useMemo(() => ({
    width: height && height <= 42 ? '28px' : height && height < 50 ? '24px' : '20px',
    height: height && height <= 42 ? '28px' : height && height < 50 ? '24px' : '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: height && height <= 42 ? '20px' : height && height < 50 ? '18px' : '14px',
    flexShrink: 0
  }), [height]);

  const labelStyle = useMemo(() => ({
    fontSize: '11px',
    fontWeight: '600' as const,
    color: checked ? '#007bff' : '#374151',
    lineHeight: '1.2',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  }), [checked]);

  const checkMarkStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    backgroundColor: '#007bff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    zIndex: 2
  }), []);

  return (
    <div
      className={`check-image-button ${className}`}
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 배경 이미지 - 로딩 성공한 경우에만 표시 */}
      {backgroundImage && imageLoaded && !imageLoadError && (
        <div
          style={{
            position: 'absolute',
            right: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '52px',
            height: '52px',
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.2,
            zIndex: 1,
            pointerEvents: 'none',
            borderRadius: '6px'
          }}
        />
      )}
      
      {/* 이미지 로딩을 위한 숨겨진 img 태그 */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt={label}
          style={{ display: 'none' }}
          onLoad={() => {
            setImageLoaded(true);
          }}
          onError={() => {
            setImageLoadError(true);
          }}
        />
      )}
      
      {/* 좌측 액센트 바 */}
      {accentColor && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: accentColor,
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            zIndex: 1
          }}
        />
      )}
      
      {/* 이미지 영역 */}
      <div style={imageContainerStyle}>
        {typeof image === 'string' ? (
          image.startsWith('http') || image.startsWith('/') ? (
            <img
              src={image}
              alt={label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <span style={{ fontSize: '14px' }}>{image}</span>
          )
        ) : (
          <span style={{ fontSize: '14px' }}>{image}</span>
        )}
      </div>

      {/* 라벨 */}
      <span style={{
        ...labelStyle,
        position: 'relative',
        zIndex: 2,
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 0 4px rgba(255, 255, 255, 0.5)'
      }}>
        {label}
      </span>

      {/* 체크 표시 */}
      {checked && (
        <div style={checkMarkStyle}>
          ✓
        </div>
      )}
    </div>
  );
};

export default React.memo(CheckImageButton);

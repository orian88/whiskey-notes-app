import React, { useMemo } from 'react';

interface TastingNoteCardProps {
  title: string;
  content: string;
  color?: 'aroma' | 'taste' | 'finish' | 'custom';
  customColor?: string;
  icon?: React.ReactNode;
  className?: string;
}

const TastingNoteCard: React.FC<TastingNoteCardProps> = ({
  title,
  content,
  color = 'custom',
  customColor = '#8B4513',
  icon,
  className = ''
}) => {
  const colorStyles = useMemo(() => {
    switch (color) {
      case 'aroma':
        return {
          accentColor: '#8B4513', // 향 - 갈색
          backgroundColor: '#FDF6E3'
        };
      case 'taste':
        return {
          accentColor: '#D2691E', // 맛 - 주황갈색
          backgroundColor: '#FFF8DC'
        };
      case 'finish':
        return {
          accentColor: '#A0522D', // 여운 - 시에나갈색
          backgroundColor: '#F5F5DC'
        };
      default: // custom
        return {
          accentColor: customColor,
          backgroundColor: '#FFFFFF'
        };
    }
  }, [color, customColor]);

  const cardStyle = useMemo(() => ({
    display: 'flex',
    backgroundColor: colorStyles.backgroundColor,
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    position: 'relative' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
  }), [colorStyles.backgroundColor]);

  const accentStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: '0',
    top: '0',
    bottom: '0',
    width: '4px',
    backgroundColor: colorStyles.accentColor,
    borderRadius: '8px 0 0 8px'
  }), [colorStyles.accentColor]);

  const contentStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    width: '100%',
    paddingLeft: '8px'
  }), []);

  const iconStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    flexShrink: 0,
    marginTop: '2px'
  }), []);

  const textContainerStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1
  }), []);

  const titleStyle = useMemo(() => ({
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#374151',
    margin: 0
  }), []);

  const contentTextStyle = useMemo(() => ({
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
    lineHeight: '1.4'
  }), []);

  return (
    <div 
      className={`tasting-note-card ${className}`}
      style={cardStyle}
    >
      {/* 왼쪽 색상 액센트 */}
      <div style={accentStyle} />
      
      {/* 카드 내용 */}
      <div style={contentStyle}>
        {/* 아이콘 */}
        {icon && (
          <div style={iconStyle}>
            {icon}
          </div>
        )}
        
        {/* 텍스트 컨테이너 */}
        <div style={textContainerStyle}>
          <p style={titleStyle}>{title}</p>
          <p style={contentTextStyle}>{content}</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TastingNoteCard);

import React, { useCallback, useMemo } from 'react';
import CheckImageButton from './CheckImageButton';

interface TastingCardProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onSelectionChange: (options: string[]) => void;
  className?: string;
  disabled?: boolean;
  category?: 'nose' | 'palate' | 'finish'; // 카테고리 추가
}

const TastingCard: React.FC<TastingCardProps> = ({
  label,
  options,
  selectedOptions,
  onSelectionChange,
  className = '',
  disabled = false,
  category = 'nose'
}) => {
  const handleOptionToggle = useCallback((option: string) => {
    if (disabled) return;
    const newSelection = selectedOptions.includes(option)
      ? selectedOptions.filter(opt => opt !== option)
      : [...selectedOptions, option];
    onSelectionChange(newSelection);
  }, [selectedOptions, onSelectionChange, disabled]);

  // 배경 이미지 경로 생성 함수
  const getBackgroundImagePath = useCallback((option: string, category: string) => {
    // 한글 옵션명을 실제 파일명으로 매핑 (실제 파일명과 정확히 일치)
    const optionMap: Record<string, string> = {
      // 향 (aroma) 관련 - 실제 파일명과 일치
      '바닐라': 'Vanilia',
      '카라멜': 'Caramel', 
      '허니': 'Honey',
      '초콜릿': 'Chocolate',
      '커피': 'Coffee',
      '과일': 'Fruit',
      '사과': 'apple',
      '배': 'Pear',
      '복숭아': 'Peach',
      '체리': 'Cherry',
      '꽃향': 'Flower',
      '장미': 'Rose',
      '라벤더': 'Lavender',
      '재스민': 'Jasmine',
      '스파이스': 'Spice',
      '시나몬': 'Cinnamon',
      '정향': 'Clove',
      '후추': 'Pepper',
      '생강': 'ginger',
      '오크': 'Oak',
      '바닐라 오크': 'Vanilla Oak',
      '스모키': 'Smoky',
      '피트': 'Peat',
      '민트': 'Mint',
      '유칼립투스': 'Eucalyptus',
      '허브': 'Hurb',
      '타르': 'Tar',
      '고무': 'Rubber',
      
      // 맛 (taste) 관련 - 실제 파일명과 일치
      '달콤함': 'sweetness',
      '단맛': 'sweetness',
      '과일맛': 'fruit',
      '신맛': 'sour',
      '레몬': 'Lemon',
      '라임': 'Lime',
      '오렌지': 'Orange',
      '쓴맛': 'bitterness',
      '다크 초콜릿': 'Chocolate',
      '호두': 'Walnut',
      '매운맛': 'spicy',
      '짠맛': 'salty',
      '해산물': 'seafood',
      '바다향': 'sea-scent',
      
      // 여운 (aftertaste) 관련 - 실제 파일명과 일치
      '짧음': 'short',
      '보통': 'medium',
      '긴 여운': 'long',
      '따뜻함': 'warm',
      '차가움': 'cool',
      '톡 쏘는 느낌': 'tingling',
      '부드러움': 'smooth',
      '거친 느낌': 'rough',
      '크리미함': 'creamy'
    };

    const fileName = optionMap[option];
    if (!fileName) return undefined;

    // 카테고리별 폴더 경로
    const categoryMap: Record<string, string> = {
      'nose': 'aroma',
      'palate': 'taste', 
      'finish': 'aftertaste'
    };

    const folderName = categoryMap[category] || 'aroma';
    // 파일명에 공백이 있는 경우 URL 인코딩 처리
    const encodedFileName = encodeURIComponent(fileName);
    const imagePath = `/img/icons/${folderName}/${encodedFileName}.png`;
    
    // 디버깅을 위한 임시 로그
    if (fileName.includes(' ')) {
      console.log(`공백이 있는 파일명 처리: "${fileName}" -> "${encodedFileName}" -> "${imagePath}"`);
    }
    
    return imagePath;
  }, []);

  const cardStyle = useMemo(() => ({
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  }), []);

  const headerStyle = useMemo(() => ({ marginBottom: '20px' }), []);

  const titleStyle = useMemo(() => ({
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }), []);

  const subtitleStyle = useMemo(() => ({ fontSize: '14px', color: '#6B7280' }), []);

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '16px'
  }), []);

  // 섹션별 아이콘/색상
  const { sectionEmoji, accentColor } = useMemo(() => {
    if (label.includes('향')) return { sectionEmoji: '👃', accentColor: '#8B4513' };
    if (label.includes('맛')) return { sectionEmoji: '👅', accentColor: '#D2691E' };
    return { sectionEmoji: '🌊', accentColor: '#A0522D' };
  }, [label]);

  // 각 옵션별 아이콘 생성
  const getOptionIcon = useCallback((option: string) => {
    const iconMap: { [key: string]: string } = {
      // 향 (Nose) 아이콘들
      '바닐라': '🍦', '카라멜': '🍯', '허니': '🍯', '초콜릿': '🍫', '커피': '☕',
      '과일': '🍎', '사과': '🍎', '배': '🍐', '복숭아': '🍑', '체리': '🍒',
      '꽃향': '🌸', '장미': '🌹', '라벤더': '💜', '재스민': '🌼',
      '스파이스': '🌶️', '시나몬': '🍂', '정향': '🌿', '후추': '⚫', '생강': '🟤',
      '오크': '🌳', '바닐라 오크': '🌳', '스모키': '💨', '피트': '🔥',
      '민트': '🌿', '유칼립투스': '🌿', '허브': '🌿', '타르': '🖤', '고무': '⚫',
      
      // 맛 (Palate) 아이콘들 - 중복 제거
      '달콤함': '🍯', '단맛': '🍯', '과일맛': '🍎', 
      '신맛': '🍋', '레몬': '🍋', '라임': '🍋', '오렌지': '🍊',
      '쓴맛': '☕', '다크 초콜릿': '🍫', '호두': '🥜',
      '매운맛': '🌶️', '짠맛': '🧂', '해산물': '🦐', '바다향': '🌊',
      
      // 여운 (Finish) 아이콘들
      '짧음': '⏱️', '보통': '⏰', '긴 여운': '⏳',
      '따뜻함': '🔥', '차가움': '❄️', '톡 쏘는 느낌': '⚡',
      '부드러움': '🪶', '거친 느낌': '🪨', '크리미함': '🥛'
    };
    
    return iconMap[option] || '⭐';
  }, []);

  return (
    <div className={`tasting-card ${className}`} style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          <span>{sectionEmoji}</span>
          {label}
        </h3>
        <p style={subtitleStyle}>{disabled ? '위스키 선택 후 사용 가능합니다' : '원하는 항목을 선택하세요'}</p>
      </div>
      
      <div style={gridStyle}>
        {options.map((option) => {
          const optionIcon = getOptionIcon(option);
          const optionIconNode = optionIcon;
          const backgroundImagePath = getBackgroundImagePath(option, category);
          
          return (
            <CheckImageButton
              key={option}
              image={optionIconNode}
              label={option}
              checked={selectedOptions.includes(option)}
              onChange={() => handleOptionToggle(option)}
              disabled={disabled}
              accentColor={accentColor}
              backgroundImage={backgroundImagePath}
            />
          );
        })}
      </div>
      
      {selectedOptions.length > 0 && !disabled && (
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '12px', border: '2px solid #BAE6FD', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
          <p style={{ fontSize: '14px', color: '#0369A1', fontWeight: '600', lineHeight: '1.5' }}>
            선택된 항목: {selectedOptions.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(TastingCard);

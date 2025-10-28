import React, { useState, useCallback, useMemo } from 'react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import LazyImage from './LazyImage';

interface IWhiskey {
  id: string;
  name: string;
  english_name?: string;
  brand?: string;
  type?: string;
  image_url?: string;
}

interface IWhiskeySelectorProps {
  whiskeys: IWhiskey[];
  selectedWhiskeyId: string;
  onSelect: (whiskey: IWhiskey) => void;
  onClose: () => void;
  isOpen: boolean;
}

const WhiskeySelector: React.FC<IWhiskeySelectorProps> = ({
  whiskeys,
  selectedWhiskeyId,
  onSelect,
  onClose,
  isOpen
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 필터링 최적화 - useMemo 사용
  const filteredWhiskeys = useMemo(() => {
    if (!searchTerm) return whiskeys;
    
    const term = searchTerm.toLowerCase();
    return whiskeys.filter(whiskey => 
      whiskey.name.toLowerCase().includes(term) ||
      whiskey.english_name?.toLowerCase().includes(term) ||
      whiskey.brand?.toLowerCase().includes(term) ||
      whiskey.type?.toLowerCase().includes(term)
    );
  }, [whiskeys, searchTerm]);

  // 이벤트 핸들러들 최적화
  const handleWhiskeyDoubleClick = useCallback((whiskey: IWhiskey) => {
    onSelect(whiskey);
    onClose();
  }, [onSelect, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, whiskey: IWhiskey) => {
    if (e.key === 'Enter') {
      handleWhiskeyDoubleClick(whiskey);
    }
  }, [handleWhiskeyDoubleClick]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = '#F3F4F6';
    e.currentTarget.style.borderColor = '#8B4513';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>, whiskey: IWhiskey) => {
    e.currentTarget.style.backgroundColor = 'white';
    e.currentTarget.style.borderColor = selectedWhiskeyId === whiskey.id ? '#8B4513' : '#E5E7EB';
  }, []);

  // 스타일 객체들 메모이제이션
  const modalStyle = useMemo(() => ({
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }), []);

  const cardStyle = useMemo(() => ({
    width: '100%',
    maxWidth: '800px',
    maxHeight: '80vh',
    padding: '24px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const
  }), []);

  const headerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px'
  }), []);

  const searchIconStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9CA3AF'
  }), []);

  const inputStyle = useMemo(() => ({
    paddingLeft: '40px'
  }), []);

  const listContainerStyle = useMemo(() => ({
    flex: 1,
    overflowY: 'auto' as const,
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: '#F9FAFB'
  }), []);

  const emptyStateStyle = useMemo(() => ({
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6B7280'
  }), []);

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
    padding: '16px'
  }), []);

  const whiskeyItemStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }), []);

  const thumbnailStyle = useMemo(() => ({
    width: '60px',
    height: '60px',
    backgroundColor: '#E5E7EB',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden'
  }), []);

  const imageStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '8px'
  }), []);

  const infoStyle = useMemo(() => ({
    flex: 1,
    minWidth: 0
  }), []);

  const titleStyle = useMemo(() => ({
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  }), []);

  const subtitleStyle = useMemo(() => ({
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  }), []);

  const metaStyle = useMemo(() => ({
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#9CA3AF'
  }), []);

  const checkStyle = useMemo(() => ({
    color: '#8B4513',
    fontSize: '20px'
  }), []);

  const footerStyle = useMemo(() => ({
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center' as const
  }), []);

  if (!isOpen) return null;

  return (
    <div style={modalStyle}>
      <Card style={cardStyle}>
        {/* 헤더 */}
        <div style={headerStyle}>
          <h2 className="text-title" style={{ margin: 0 }}>
            위스키 선택
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            ✕ 닫기
          </Button>
        </div>

        {/* 검색 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <span style={searchIconStyle}>🔍</span>
            <Input
              type="text"
              placeholder="위스키 이름, 브랜드, 타입으로 검색..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* 위스키 목록 */}
        <div style={listContainerStyle}>
          {filteredWhiskeys.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div style={gridStyle}>
              {filteredWhiskeys.map((whiskey) => (
                <div
                  key={whiskey.id}
                  onClick={() => handleWhiskeyDoubleClick(whiskey)}
                  onKeyDown={(e) => handleKeyDown(e, whiskey)}
                  tabIndex={0}
                  style={{
                    ...whiskeyItemStyle,
                    border: selectedWhiskeyId === whiskey.id ? '2px solid #8B4513' : '1px solid #E5E7EB'
                  }}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={(e) => handleMouseLeave(e, whiskey)}
                >
                  {/* 썸네일 이미지 */}
                  <div style={thumbnailStyle}>
                    {whiskey.image_url ? (
                      <LazyImage
                        src={whiskey.image_url}
                        alt={whiskey.name}
                        style={imageStyle}
                        placeholder={<div className="animate-pulse bg-gray-200 rounded" style={{ width: '100%', height: '100%' }} />}
                        fallback={<div style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🥃</div>}
                      />
                    ) : (
                      <div style={{ fontSize: '24px' }}>🥃</div>
                    )}
                  </div>

                  {/* 위스키 정보 */}
                  <div style={infoStyle}>
                    <h3 style={titleStyle}>
                      {whiskey.name}
                    </h3>
                    {whiskey.english_name && (
                      <p style={subtitleStyle}>
                        {whiskey.english_name}
                      </p>
                    )}
                    <div style={metaStyle}>
                      {whiskey.brand && <span>{whiskey.brand}</span>}
                      {whiskey.type && <span>• {whiskey.type}</span>}
                    </div>
                  </div>

                  {/* 선택 표시 */}
                  {selectedWhiskeyId === whiskey.id && (
                    <div style={checkStyle}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <div style={footerStyle}>
          💡 위스키를 더블클릭하거나 Enter 키를 눌러 선택하세요
        </div>
      </Card>
    </div>
  );
};

export default React.memo(WhiskeySelector);

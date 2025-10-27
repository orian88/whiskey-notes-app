import React from 'react';
import Card from './Card';
import Button from './Button';

interface PurchaseCardProps {
  purchase: {
    id: string;
    whiskey_name: string;
    whiskey_image_url?: string;
    final_price_krw: number;
    original_price_krw?: number;
    store_name: string;
    purchase_date: string;
    purchase_location: string;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({
  purchase,
  onView,
  onEdit,
  onDelete,
  className = ''
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div
      className={`purchase-card-container ${className}`}
      onMouseEnter={(e) => {
        const card = e.currentTarget.querySelector('.purchase-card') as HTMLElement;
        if (card) {
          card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          card.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget.querySelector('.purchase-card') as HTMLElement;
        if (card) {
          card.style.boxShadow = '';
          card.style.transform = '';
        }
      }}
    >
      <Card 
        className="purchase-card"
        style={{ 
          transition: 'all 0.2s',
          cursor: 'pointer',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* 위스키 이미지 */}
        <div style={{ width: '100%', height: '110px', backgroundColor: 'transparent', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {purchase.whiskey_image_url ? (
            <img
              src={purchase.whiskey_image_url}
              alt={purchase.whiskey_name}
              style={{ width: '110%', height: '110%', objectFit: 'contain', borderRadius: '8px' }}
            />
          ) : (
            <div style={{ fontSize: '40px' }}>🥃</div>
          )}
        </div>

        {/* 구매 정보 */}
        <div className="purchase-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, padding: '0 4px' }}>
          <h3 
            style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#111827', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              cursor: 'pointer'
            }}
            title={purchase.whiskey_name}
          >
            {purchase.whiskey_name}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
            <span>🏪 {purchase.store_name}</span>
            <span>📅 {formatDate(purchase.purchase_date)}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#6B7280' }}>📍 {purchase.purchase_location}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
              <span style={{ fontWeight: '600', color: '#8B4513', fontSize: '14px' }}>
                {formatPrice(purchase.final_price_krw)}
              </span>
              {purchase.original_price_krw && purchase.original_price_krw !== purchase.final_price_krw && (
                <span style={{ fontSize: '11px', color: '#9CA3AF', textDecoration: 'line-through' }}>
                  {formatPrice(purchase.original_price_krw)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 - 호버 시에만 표시 */}
        <div 
          className="purchase-actions"
          style={{ 
            position: 'absolute',
            top: '16px',
            right: '16px',
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 10,
            display: 'flex',
            gap: '8px'
          }}
        >
          {onView && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onView(purchase.id)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              👁️
            </Button>
          )}
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(purchase.id)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              ✏️
            </Button>
          )}
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(purchase.id)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              🗑️
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PurchaseCard;

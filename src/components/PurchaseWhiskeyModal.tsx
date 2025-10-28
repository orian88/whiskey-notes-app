import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../lib/supabase';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import type { IPurchase, IWhiskey } from '../types/index';

interface PurchaseWhiskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (purchaseId: string, whiskey: IWhiskey, meta: { remainingAmount: number; firstTastingDate?: string; lastTastingDate?: string; purchaseDate?: string; color?: string; store_name?: string; purchase_location?: string; final_price_krw?: number }) => void;
}

interface PurchaseWithWhiskey extends IPurchase {
  whiskey: IWhiskey;
  remainingAmount: number;
  firstTastingDate?: string;
  lastTastingDate?: string;
}

const PurchaseWhiskeyModal: React.FC<PurchaseWhiskeyModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [purchases, setPurchases] = useState<PurchaseWithWhiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  // 필터링된 구매 목록 계산
  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return purchases;
    
    const searchLower = searchTerm.toLowerCase();
    return purchases.filter(purchase => {
      const whiskey = purchase.whiskey;
      if (!whiskey) return false;

      return (
        whiskey.name?.toLowerCase().includes(searchLower) ||
        whiskey.brand?.toLowerCase().includes(searchLower) ||
        whiskey.korean_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [purchases, searchTerm]);

  // 모달 컨테이너 생성 및 정리
  useEffect(() => {
    let container = document.getElementById('modal-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-root';
      document.body.appendChild(container);
    }
    setModalRoot(container);

    return () => {
      if (container && container.childNodes.length === 0) {
        document.body.removeChild(container);
      }
    };
  }, []);

  const loadPurchasesWithTastingData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys (*)
        `)
        .is('tasting_finish_date', null) // 완전히 마신 위스키 제외
        .order('purchase_date', { ascending: false });

      if (purchasesError) {
        console.warn('구매 기록 로드 실패:', purchasesError);
        return;
      }

      if (!purchasesData || purchasesData.length === 0) {
        setPurchases([]);
        return;
      }

      // 각 구매에 대해 테이스팅 노트에서 소비한 양을 계산
      const purchasesWithTastingData = await Promise.all(
        purchasesData
          .filter(purchase => purchase.whiskeys)
          .map(async (purchase: any) => {
            const whiskey = purchase.whiskeys;
            const bottleVolume = whiskey?.bottle_volume || 0;
            
            // 해당 구매의 테이스팅 노트에서 소비한 총 양 계산
            // 모든 테이스팅 노트의 소비량을 합산
            const { data: tastingNotes, error: tastingError } = await supabase
              .from('tasting_notes')
              .select('amount_consumed, tasting_date')
              .eq('purchase_id', purchase.id)
              .order('tasting_date', { ascending: true });

            let consumedAmount = 0;
            if (!tastingError && tastingNotes) {
              // 모든 테이스팅 노트의 소비량 합계
              consumedAmount = tastingNotes
                .reduce((sum, note) => sum + (note.amount_consumed || 0), 0);
            } else if (tastingError) {
              console.error(`테이스팅 노트 로드 오류 (${whiskey?.name}):`, tastingError);
            }

            const remainingAmount = Math.max(0, bottleVolume - consumedAmount);

            return {
              ...purchase,
              whiskey,
              remainingAmount,
              firstTastingDate: undefined,
              lastTastingDate: undefined
            } as PurchaseWithWhiskey;
          })
      );

      // 모든 구매를 남은 양 순으로 정렬 (0ml도 포함)
      const filteredPurchases = purchasesWithTastingData
        .sort((a, b) => a.remainingAmount - b.remainingAmount);

      setPurchases(filteredPurchases);
    } catch (error) {
      console.error('구매 기록 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPurchasesWithTastingData();
    }
  }, [isOpen, loadPurchasesWithTastingData]);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '구매일 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  if (!isOpen || !modalRoot) return null;

  console.debug('[PurchaseWhiskeyModal] open:', isOpen, 'modalRoot:', !!modalRoot);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '880px', position: 'relative' }}>
        <Card 
          className="w-full overflow-hidden flex flex-col bg-white"
        >
          {/* 닫기 버튼 - 절대 위치 */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              ✕ 닫기
            </Button>
          </div>

          {/* 헤더 */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">구매한 위스키 선택</h2>
          </div>

          {/* 검색 영역 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Input
                type="text"
                placeholder="🔍 위스키 이름, 브랜드로 검색..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>
          </div>

          {/* 목록: 스크롤 영역 */}
          <div style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🥃</div>
                <p className="text-gray-500 text-lg">로딩 중...</p>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🥃</div>
                <p className="text-gray-500 text-lg">
                  {searchTerm ? '검색 결과가 없습니다' : '구매한 위스키가 없습니다'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {filteredPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    onClick={() => onSelect(
                      purchase.id,
                      purchase.whiskey,
                      {
                        remainingAmount: purchase.remainingAmount,
                        firstTastingDate: purchase.firstTastingDate,
                        lastTastingDate: purchase.lastTastingDate,
                        purchaseDate: purchase.purchase_date as string,
                        color: (purchase as any).color,
                        store_name: (purchase as any).store_name,
                        purchase_location: (purchase as any).purchase_location,
                        final_price_krw: (purchase as any).final_price_krw
                      }
                    )}
                    style={{
                      padding: '8px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: '#ffffff',
                      minHeight: '120px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#60a5fa';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* 배경 이미지 */}
                    {purchase.whiskey?.image_url && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '60px',
                          height: '80px',
                          backgroundImage: `url(${purchase.whiskey.image_url})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          zIndex: 0,
                          borderRadius: '4px'
                        }}
                      />
                    )}
                    
                    {/* 메인 컨텐츠 */}
                    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {/* 위스키 정보 */}
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          color: '#111827', 
                          fontSize: '12px', 
                          lineHeight: '1.2', 
                          marginBottom: '4px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: '100%'
                        }}>
                          {purchase.whiskey?.name}
                        </div>
                        <div style={{ 
                          color: '#059669', 
                          fontSize: '10px', 
                          marginBottom: '2px',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          fontWeight: '500'
                        }}>
                          {purchase.whiskey?.brand}
                        </div>
                        <div style={{ 
                          color: '#7C3AED', 
                          fontSize: '9px',
                          fontWeight: '500'
                        }}>
                          {(purchase.whiskey?.bottle_volume || 0)}ml
                        </div>
                      </div>
                      
                      {/* 하단 정보 */}
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ color: '#9ca3af', fontSize: '9px', marginBottom: '2px' }}>
                          구매: {formatDate(purchase.purchase_date as string)}
                        </div>
                        <div style={{ 
                          color: purchase.remainingAmount > 0 ? '#1E40AF' : '#DC2626', 
                          fontSize: '10px', 
                          fontWeight: '600',
                          backgroundColor: purchase.remainingAmount > 0 ? '#EFF6FF' : '#FEF2F2',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: `1px solid ${purchase.remainingAmount > 0 ? '#DBEAFE' : '#FECACA'}`
                        }}>
                          남은 양: {purchase.remainingAmount}ml
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 안내 */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">💡 위스키를 클릭하여 선택하세요</p>
          </div>
        </Card>
      </div>
    </div>,
    modalRoot
  );
};

export default React.memo(PurchaseWhiskeyModal);
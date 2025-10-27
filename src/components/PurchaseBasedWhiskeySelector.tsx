import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { IPurchase, IWhiskey, ITastingNote } from '../types/index';
import Card from './Card';
import Button from './Button';
import Input from './Input';

interface PurchaseBasedWhiskeySelectorProps {
  selectedPurchaseId: string;
  onPurchaseSelect: (purchaseId: string, whiskey: IWhiskey) => void;
  className?: string;
  isOpen?: boolean; // 외부에서 팝업 열림 제어
  onClose?: () => void; // 외부에서 닫기 제어
  renderAsModalOnly?: boolean; // 트리거/요약 숨기고 모달만 렌더
}

interface PurchaseWithWhiskey extends IPurchase {
  whiskey: IWhiskey;
  tastingNotes: ITastingNote[];
  totalConsumed: number;
  remainingAmount: number;
  firstTastingDate?: string;
  lastTastingDate?: string;
}

const PurchaseBasedWhiskeySelector: React.FC<PurchaseBasedWhiskeySelectorProps> = ({
  selectedPurchaseId,
  onPurchaseSelect,
  className = '',
  isOpen,
  onClose,
  renderAsModalOnly
}) => {
  const [purchases, setPurchases] = useState<PurchaseWithWhiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState<boolean>(!!isOpen);
  // 외부 isOpen과 동기화
  useEffect(() => {
    if (typeof isOpen === 'boolean') {
      setShowPopup(isOpen);
    }
  }, [isOpen]);

  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 로드 최적화 - useCallback으로 메모이제이션
  const loadPurchasesWithTastingData = useCallback(async () => {
    try {
      setLoading(true);

      // 구매 기록과 위스키 정보를 한번에 가져오기 (JOIN 사용)
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys (*)
        `)
        .order('purchase_date', { ascending: false });

      if (purchasesError) {
        console.warn('구매 기록 로드 실패:', purchasesError);
        return;
      }

      if (!purchasesData || purchasesData.length === 0) {
        setPurchases([]);
        return;
      }

      // 테이스팅 노트를 배치로 가져오기 (한번의 쿼리로)
      const whiskeyIds = purchasesData.map(p => p.whiskey_id).filter(Boolean);
      const { data: tastingNotesData, error: tastingError } = await supabase
        .from('tasting_notes')
        .select('*')
        .in('whiskey_id', whiskeyIds)
        .order('tasting_date', { ascending: true });

      if (tastingError) {
        console.warn('테이스팅 노트 로드 실패:', tastingError);
      }

      // 데이터 처리 최적화
      const purchasesWithTastingData = purchasesData
        .filter(purchase => purchase.whiskeys) // 위스키 정보가 있는 것만
        .map((purchase: any) => {
          const whiskey = purchase.whiskeys;
          const tastingNotes = tastingNotesData?.filter(note => note.whiskey_id === purchase.whiskey_id) || [];
          
          // 총 소비량 계산
          const totalConsumed = tastingNotes.reduce((sum, note) => sum + (note.amount_consumed || 0), 0);
          
          // 남은 양 계산
          const bottleVolume = whiskey?.bottle_volume || 0;
          const remainingAmount = Math.max(0, bottleVolume - totalConsumed);

          // 첫 시음일과 마지막 시음일
          const firstTastingDate = tastingNotes[0]?.tasting_date;
          const lastTastingDate = tastingNotes[tastingNotes.length - 1]?.tasting_date;

          return {
            ...purchase,
            whiskey,
            tastingNotes,
            totalConsumed,
            remainingAmount,
            firstTastingDate,
            lastTastingDate
          };
        })
        .filter(purchase => purchase.remainingAmount > 0) // 남은 양이 있는 것만
        .sort((a, b) => a.remainingAmount - b.remainingAmount); // 남은 양이 적은 순으로 정렬

      setPurchases(purchasesWithTastingData);
    } catch (error) {
      console.error('구매 기록 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시에만 데이터 로드
  useEffect(() => {
    loadPurchasesWithTastingData();
  }, [loadPurchasesWithTastingData]);

  // 필터링 최적화 - useMemo 사용
  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return purchases;
    
    const term = searchTerm.toLowerCase();
    return purchases.filter(purchase =>
      purchase.whiskey?.name?.toLowerCase().includes(term) ||
      purchase.whiskey?.brand?.toLowerCase().includes(term)
    );
  }, [purchases, searchTerm]);

  // 선택된 구매 기록 메모이제이션
  const selectedPurchase = useMemo(() => 
    purchases.find(p => p.id === selectedPurchaseId), 
    [purchases, selectedPurchaseId]
  );

  // 포맷팅 함수들 메모이제이션
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '시음 기록 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  }, []);

  const formatAmount = useCallback((ml: number) => {
    return `${ml}ml`;
  }, []);

  // 이벤트 핸들러들 최적화
  const handlePurchaseSelect = useCallback((purchaseId: string, whiskey: IWhiskey) => {
    onPurchaseSelect(purchaseId, whiskey);
    setShowPopup(false);
    setSearchTerm('');
    onClose && onClose();
  }, [onPurchaseSelect, onClose]);

  const handlePopupToggle = useCallback(() => {
    const next = !showPopup;
    setShowPopup(next);
    if (!next && onClose) onClose();
  }, [showPopup, onClose]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  if (loading) {
    if (renderAsModalOnly) return null;
    return (
      <div className={`purchase-selector ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // renderAsModalOnly: 트리거/요약을 숨기고 모달만 렌더링 (오버레이 없이 카드만)
  if (renderAsModalOnly) {
    return (
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-white">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            구매한 위스키 선택
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose && onClose();
            }}
          >
            ✕ 닫기
          </Button>
        </div>

        {/* 검색 */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <Input
              type="text"
              placeholder="위스키 이름, 브랜드로 검색..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* 구매 기록 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🥃</div>
              <p className="text-gray-500 text-lg">
                {searchTerm ? '검색 결과가 없습니다' : '구매한 위스키가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  onClick={() => handlePurchaseSelect(purchase.id, purchase.whiskey)}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* 위스키 이미지 */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {purchase.whiskey?.image_url ? (
                        <img
                          src={purchase.whiskey.image_url}
                          alt={purchase.whiskey.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <span className="text-2xl">🥃</span>
                      )}
                    </div>

                    {/* 위스키 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {purchase.whiskey?.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {purchase.whiskey?.brand} • {formatAmount(purchase.whiskey?.bottle_volume || 0)}
                      </p>
                      <div className="text-xs text-gray-500 mt-1">
                        구매일: {formatDate(purchase.purchase_date)}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        남은 양: {formatAmount(purchase.remainingAmount)}
                      </div>
                      {purchase.firstTastingDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          첫 시음: {formatDate(purchase.firstTastingDate)} • 
                          마지막 시음: {formatDate(purchase.lastTastingDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 위스키를 클릭하여 선택하세요
          </p>
        </div>
      </Card>
    );
  }

  // 기본: 트리거 + 모달
  return (
    <div className={`purchase-selector relative ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          구매한 위스키 선택
        </label>
        
        {/* 선택된 위스키 표시 */}
        <div
          onClick={handlePopupToggle}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {selectedPurchase ? (
            <div className="space-y-1">
              <div className="font-medium text-gray-900">
                {selectedPurchase.whiskey?.name}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPurchase.whiskey?.brand} • {formatAmount(selectedPurchase.whiskey?.bottle_volume || 0)}
              </div>
              <div className="text-xs text-gray-500">
                구매일: {formatDate(selectedPurchase.purchase_date)} • 
                남은 양: {formatAmount(selectedPurchase.remainingAmount)}
              </div>
              {selectedPurchase.firstTastingDate && (
                <div className="text-xs text-blue-600">
                  첫 시음: {formatDate(selectedPurchase.firstTastingDate)} • 
                  마지막 시음: {formatDate(selectedPurchase.lastTastingDate)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              위스키를 선택해주세요
            </div>
          )}
        </div>
      </div>

      {/* 팝업 모달 */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                구매한 위스키 선택
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePopupToggle}
              >
                ✕ 닫기
              </Button>
            </div>

            {/* 검색 */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <Input
                  type="text"
                  placeholder="위스키 이름, 브랜드로 검색..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 구매 기록 목록 */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredPurchases.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🥃</div>
                  <p className="text-gray-500 text-lg">
                    {searchTerm ? '검색 결과가 없습니다' : '구매한 위스키가 없습니다'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPurchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      onClick={() => handlePurchaseSelect(purchase.id, purchase.whiskey)}
                      className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* 위스키 이미지 */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {purchase.whiskey?.image_url ? (
                            <img
                              src={purchase.whiskey.image_url}
                              alt={purchase.whiskey.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-2xl">🥃</span>
                          )}
                        </div>

                        {/* 위스키 정보 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {purchase.whiskey?.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {purchase.whiskey?.brand} • {formatAmount(purchase.whiskey?.bottle_volume || 0)}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            구매일: {formatDate(purchase.purchase_date)}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            남은 양: {formatAmount(purchase.remainingAmount)}
                          </div>
                          {purchase.firstTastingDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              첫 시음: {formatDate(purchase.firstTastingDate)} • 
                              마지막 시음: {formatDate(purchase.lastTastingDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 하단 안내 */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                💡 위스키를 클릭하여 선택하세요
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default React.memo(PurchaseBasedWhiskeySelector);
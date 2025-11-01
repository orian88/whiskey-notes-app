import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import Trackbar from '../components/Trackbar';
import ColorSelector from '../components/ColorSelector';
import GlassCountInput from '../components/GlassCountInput';
import SevenRadarChart from '../components/SevenRadarChart';
import CheckImageButton from '../components/CheckImageButton';
import RichTextEditor from '../components/RichTextEditor';
import { tastingOptions } from '../data/tastingOptions';

interface IPurchase {
  id: string;
  whiskeys: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    region?: string;
    bottle_volume?: number;
    abv?: number;
    price?: number;
  } | null;
  purchase_date: string;
  remaining_amount: number;
  bottle_volume?: number;
  abv?: number;
  store_name?: string;
  purchase_location?: string;
  final_price_krw?: number;
  original_price?: number;
  discount_price?: number;
}

interface MobileTastingNotesFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  tastingId?: string;
}

const MobileTastingNotesForm: React.FC<MobileTastingNotesFormProps> = ({ onClose, onSuccess, tastingId: tastingIdProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [tastingDate, setTastingDate] = useState(new Date().toISOString().split('T')[0]);
  const [color, setColor] = useState('');
  const [rating, setRating] = useState(5);
  const [nose, setNose] = useState('');
  const [palate, setPalate] = useState('');
  const [finish, setFinish] = useState('');
  const [notes, setNotes] = useState('');
  const [amountConsumed, setAmountConsumed] = useState(0);
  const [noseRating, setNoseRating] = useState(0);
  const [palateRating, setPalateRating] = useState(0);
  const [finishRating, setFinishRating] = useState(0);
  const [sweetness, setSweetness] = useState(0);
  const [smokiness, setSmokiness] = useState(0);
  const [fruitiness, setFruitiness] = useState(0);
  const [complexity, setComplexity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tastingId, setTastingId] = useState<string | null>(null);
  
  // 체크된 항목들
  const [selectedNoseOptions, setSelectedNoseOptions] = useState<string[]>([]);
  const [selectedPalateOptions, setSelectedPalateOptions] = useState<string[]>([]);
  const [selectedFinishOptions, setSelectedFinishOptions] = useState<string[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');

  // 위스키 선택 여부에 따른 비활성화 상태
  const isDisabled = !selectedPurchaseId;

  // prop이나 쿼리 파라미터에서 tastingId 가져오기
  useEffect(() => {
    if (tastingIdProp) {
      setTastingId(tastingIdProp);
    } else {
      const params = new URLSearchParams(location.search);
      const tastingIdParam = params.get('tastingId');
      if (tastingIdParam) {
        setTastingId(tastingIdParam);
      }
    }
  }, [tastingIdProp, location.search]);

  useEffect(() => {
    loadPurchases();
  }, []);

  // tastingId가 있으면 수정 모드로 데이터 로드
  useEffect(() => {
    if (tastingId) {
      loadTastingNote();
    }
  }, [tastingId]);

  const loadTastingNote = async () => {
    if (!tastingId) return;
    
    try {
      const { data, error } = await supabase
        .from('tasting_notes')
        .select('*')
        .eq('id', tastingId)
        .single();

      if (error) throw error;
      if (!data) return;

      // 데이터 설정
      setSelectedPurchaseId(data.purchase_id || '');
      setTastingDate(data.tasting_date || new Date().toISOString().split('T')[0]);
      setColor(data.color || '');
      setRating(data.rating || 5);
      setNose(data.nose || '');
      setPalate(data.palate || '');
      setFinish(data.finish || '');
      setNotes(data.notes || '');
      // amount_consumed는 ml 단위로 저장되므로 잔 수로 변환 (1잔 = 50ml)
      setAmountConsumed(data.amount_consumed ? Math.round((data.amount_consumed / 50) * 2) / 2 : 0);
      setNoseRating(data.nose_rating || 0);
      setPalateRating(data.palate_rating || 0);
      setFinishRating(data.finish_rating || 0);
      setSweetness(data.sweetness || 0);
      setSmokiness(data.smokiness || 0);
      setFruitiness(data.fruitiness || 0);
      setComplexity(data.complexity || 0);

      // 체크된 항목 설정
      if (data.nose) setSelectedNoseOptions(data.nose.split(',').map((s: string) => s.trim()));
      if (data.palate) setSelectedPalateOptions(data.palate.split(',').map((s: string) => s.trim()));
      if (data.finish) setSelectedFinishOptions(data.finish.split(',').map((s: string) => s.trim()));
    } catch (error) {
      console.error('테이스팅 노트 로드 오류:', error);
      alert('데이터를 불러올 수 없습니다.');
    }
  };

  // 세부 평가 점수의 평균을 전체 평가값에 자동 반영
  useEffect(() => {
    const average = (
      noseRating + 
      palateRating + 
      finishRating + 
      sweetness + 
      smokiness + 
      fruitiness + 
      complexity
    ) / 7;
    setRating(Math.round(average * 10) / 10); // 소수점 첫째자리까지
  }, [noseRating, palateRating, finishRating, sweetness, smokiness, fruitiness, complexity]);

  // 이모지 매핑 함수
  const getEmojiForOption = (option: string) => {
    const emojiMap: { [key: string]: string } = {
      '바닐라': '🌿', '카라멜': '🍯', '허니': '🍯', '초콜릿': '🍫', '커피': '☕',
      '과일': '🍎', '사과': '🍎', '배': '🍐', '복숭아': '🍑', '체리': '🍒',
      '꽃향': '🌸', '장미': '🌹', '라벤더': '💜', '재스민': '🌼',
      '스파이스': '🌶️', '시나몬': '🍯', '정향': '🌿', '후추': '🌶️', '생강': '🫚',
      '오크': '🌳', '바닐라 오크': '🌿', '스모키': '💨', '피트': '🔥',
      '민트': '🌿', '유칼립투스': '🌿', '허브': '🌿', '타르': '🖤', '고무': '⚫',
      '달콤함': '🍯', '단맛': '🍯', '신맛': '🍋', '레몬': '🍋', '라임': '🍋', '오렌지': '🍊',
      '쓴맛': '☕', '다크 초콜릿': '🍫', '호두': '🥜',
      '매운맛': '🌶️', '짠맛': '🧂', '해산물': '🦐', '바다향': '🌊',
      '짧음': '⚡', '보통': '⏱️', '긴 여운': '⏳',
      '따뜻함': '🔥', '차가움': '❄️', '톡 쏘는 느낌': '⚡',
      '부드러움': '☁️', '거친 느낌': '🌪️', '크리미함': '🥛'
    };
    return emojiMap[option] || '🥃';
  };

  // 한글 옵션명을 영문 파일명으로 매핑하는 함수
  const getImageFileName = (option: string) => {
    const mapping: { [key: string]: string } = {
      // 향 (aroma)
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
      
      // 맛 (taste)
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
      
      // 여운 (aftertaste)
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
    
    return mapping[option] || option;
  };

  // 잔여량 색상 함수
  const getRemainingColor = (remaining: number, bottle: number) => {
    const percentage = bottle > 0 ? (remaining / bottle) * 100 : 0;
    if (percentage >= 80) return { bg: '#D1FAE5', border: '#86EFAC', text: '#065F46' }; // 초록
    if (percentage >= 60) return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }; // 노랑
    if (percentage >= 40) return { bg: '#FED7AA', border: '#FDBA74', text: '#9A3412' }; // 주황
    return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' }; // 빨강
  };

  // 평가 점수에 따른 색상 함수
  const getRatingColor = (score: number) => {
    if (score >= 9) return { text: '#DC2626', bg: '#FEE2E2' }; // 빨강 - 최고
    if (score >= 8) return { text: '#EA580C', bg: '#FFEDD5' }; // 주황 - 우수
    if (score >= 7) return { text: '#F59E0B', bg: '#FEF3C7' }; // 노랑 - 양호
    if (score >= 6) return { text: '#84CC16', bg: '#ECFCCB' }; // 연두 - 보통
    if (score >= 5) return { text: '#10B981', bg: '#D1FAE5' }; // 초록 - 평균
    if (score >= 4) return { text: '#06B6D4', bg: '#CFFAFE' }; // 청록 - 낮음
    if (score >= 3) return { text: '#6366F1', bg: '#E0E7FF' }; // 보라 - 매우 낮음
    return { text: '#8B5CF6', bg: '#EDE9FE' }; // 보라
  };

  // 남은양 재계산 함수 (tasting_finish_date만 업데이트, remaining_amount는 계산으로 사용)
  const recalculateRemainingAmount = async (purchaseId: string) => {
    try {
      // 해당 purchase의 bottle_volume 가져오기
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('bottle_volume, tasting_start_date')
        .eq('id', purchaseId)
        .single();

      if (!purchaseData) return;

      const bottleVolume = purchaseData.bottle_volume || 700;

      // 해당 purchase의 모든 tasting_notes의 amount_consumed 합계 계산
      const { data: tastingNotes } = await supabase
        .from('tasting_notes')
        .select('amount_consumed, tasting_date')
        .eq('purchase_id', purchaseId);

      const totalConsumed = (tastingNotes || [])
        .reduce((sum, note) => sum + (note.amount_consumed || 0), 0);

      const newRemainingAmount = Math.max(0, bottleVolume - totalConsumed);

      // remaining_amount는 계산값을 사용하므로 업데이트하지 않음
      // 남은양이 0이면 tasting_finish_date만 설정
      const updateData: any = {};

      if (newRemainingAmount === 0) {
        // 가장 최근 테이스팅 날짜 가져오기
        const latestTasting = tastingNotes
          ?.sort((a, b) => new Date(b.tasting_date || '').getTime() - new Date(a.tasting_date || '').getTime())[0];
        
        if (latestTasting?.tasting_date) {
          updateData.tasting_finish_date = latestTasting.tasting_date;
        }
      } else {
        // 남은양이 있으면 tasting_finish_date 제거
        updateData.tasting_finish_date = null;
      }

      // tasting_finish_date만 업데이트 (remaining_amount는 계산값 사용)
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('purchases')
          .update(updateData)
          .eq('id', purchaseId);
      }

    } catch (error) {
      console.error('remaining_amount 재계산 오류:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_date,
          bottle_volume,
          abv,
          tasting_finish_date,
          store_name,
          purchase_location,
          final_price_krw,
          original_price,
          discount_price,
          is_gifted,
          is_unavailable,
          whiskeys(
            id,
            name,
            brand,
            image_url,
            type,
            region,
            bottle_volume,
            abv,
            price
          )
        `)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      
      // 각 purchase의 실제 남은양 계산 (tasting_notes 기반)
      const purchasesWithRealRemaining = await Promise.all(((data || [])
        .filter((d: any) => !(d.is_gifted || d.is_unavailable))
      ).map(async (item: any) => {
        // 해당 purchase의 모든 tasting_notes 조회
        const { data: tastingNotes } = await supabase
          .from('tasting_notes')
          .select('amount_consumed')
          .eq('purchase_id', item.id);

        // 실제 남은양 계산
        const totalConsumed = (tastingNotes || [])
          .reduce((sum: number, note: any) => sum + (note.amount_consumed || 0), 0);
        
        const bottleVolume = item.bottle_volume || item.whiskeys?.bottle_volume || 700;
        const realRemainingAmount = Math.max(0, bottleVolume - totalConsumed);

        return {
          ...item,
          remaining_amount: realRemainingAmount, // 실제 계산된 남은양
          total_consumed: totalConsumed // 총 마신 양
        };
      }));
      
      // 남아있는 위스키만 필터링
      const availablePurchases = purchasesWithRealRemaining.filter((item: any) => {
        const hasNoFinishDate = !item.tasting_finish_date;
        const hasRemaining = item.remaining_amount && item.remaining_amount > 0;
        
        return hasNoFinishDate || hasRemaining;
      });
      
      // Supabase 쿼리 결과를 올바른 형식으로 변환
      const formattedPurchases = availablePurchases.map((item: any) => ({
        id: item.id,
        purchase_date: item.purchase_date,
        remaining_amount: item.remaining_amount || 0,
        bottle_volume: item.bottle_volume || 700,
        store_name: item.store_name,
        purchase_location: item.purchase_location,
        final_price_krw: item.final_price_krw,
        original_price: item.original_price,
        discount_price: item.discount_price,
        whiskeys: item.whiskeys ? {
          id: item.whiskeys.id,
          name: item.whiskeys.name,
          brand: item.whiskeys.brand,
          image_url: item.whiskeys.image_url,
          type: item.whiskeys.type,
          region: item.whiskeys.region,
          bottle_volume: item.whiskeys.bottle_volume,
          abv: item.whiskeys.abv,
          price: item.whiskeys.price
        } : null
      }));
      
      setPurchases(formattedPurchases);
    } catch (error) {
      console.error('구매 목록 로드 오류:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPurchaseId) {
      alert('구매한 위스키를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const submitData: any = {
        purchase_id: selectedPurchaseId,
        tasting_date: tastingDate,
        color: color || null,
        nose: selectedNoseOptions.length > 0 ? selectedNoseOptions.join(', ') : (nose || null),
        palate: selectedPalateOptions.length > 0 ? selectedPalateOptions.join(', ') : (palate || null),
        finish: selectedFinishOptions.length > 0 ? selectedFinishOptions.join(', ') : (finish || null),
        rating: Math.round(rating),
        notes: notes || null,
        // 잔수를 ml로 변환: 1잔 = 50ml, 0.5잔 = 25ml
        amount_consumed: amountConsumed * 50,
        nose_rating: Math.round(noseRating),
        palate_rating: Math.round(palateRating),
        finish_rating: Math.round(finishRating),
        sweetness: Math.round(sweetness),
        smokiness: Math.round(smokiness),
        fruitiness: Math.round(fruitiness),
        complexity: Math.round(complexity)
      };

      // 수정 모드인 경우 UPDATE
      if (tastingId) {
        const { error } = await supabase
          .from('tasting_notes')
          .update(submitData)
          .eq('id', tastingId);

        if (error) throw error;
        
        alert('테이스팅 노트가 수정되었습니다.');
      } else {
        // 새로 생성하는 경우 INSERT
        const { error } = await supabase
          .from('tasting_notes')
          .insert([submitData]);

        if (error) throw error;

        // 처음 시음일 설정
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('tasting_start_date')
          .eq('id', selectedPurchaseId)
          .single();

        if (purchaseData && !purchaseData.tasting_start_date) {
          await supabase
            .from('purchases')
            .update({ tasting_start_date: tastingDate })
            .eq('id', selectedPurchaseId);
        }

        alert('테이스팅 노트가 추가되었습니다.');
      }

      // 남은양 재계산 및 업데이트 (tasting_notes의 amount_consumed 합계 기반)
      await recalculateRemainingAmount(selectedPurchaseId);

      // 색상 업데이트
      if (color) {
        await supabase
          .from('purchases')
          .update({ color })
          .eq('id', selectedPurchaseId);
      }

      // onSuccess가 있으면 호출하고 navigate는 하지 않음 (오버레이 방식)
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/mobile/tasting-notes');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
  const maxGlasses = selectedPurchase ? Math.min(5, Math.floor(selectedPurchase.remaining_amount / 50)) : 5;

  // 필터링된 구매 목록
  const filteredPurchases = purchases.filter(purchase => {
    if (!purchaseSearchTerm) return true;
    const searchLower = purchaseSearchTerm.toLowerCase();
    return (
      purchase.whiskeys?.name?.toLowerCase().includes(searchLower) ||
      purchase.whiskeys?.brand?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      {/* 상단 고정 헤더 */}
      <header 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flex: 1
        }}>
          <button
            onClick={onClose}
            style={{ 
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ←
          </button>

          {/* 페이지 제목 */}
          <div style={{ 
            flex: 1,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937',
            textAlign: 'center'
          }}>
            {tastingId ? '테이스팅 노트 수정' : '새 테이스팅 노트'}
          </div>
          
          {/* 우측 빈 공간 (대칭 유지) */}
          <div style={{ width: '32px' }}></div>
        </div>
      </header>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div style={{
        position: 'absolute',
        top: '56px',
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '80px'
      }}>
        <div style={{ padding: '16px' }}>

        {/* 위스키 선택 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            위스키 선택 *
          </label>
          <Button
            variant="secondary"
            onClick={() => setShowPurchaseModal(true)}
            style={{ width: '100%', textAlign: 'left' }}
          >
            {selectedPurchaseId 
              ? `📦 ${selectedPurchase?.whiskeys?.name}` 
              : '위스키를 선택하세요'}
          </Button>
        </div>

        {/* 선택된 위스키 정보 */}
        {selectedPurchase && (
          <div style={{
            padding: '16px',
            backgroundColor: '#F9FAFB',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #E5E7EB'
          }}>
            {/* 위스키 이미지 및 기본 정보 + 잔여량 오른쪽 배치 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {selectedPurchase.whiskeys?.image_url && (
                <div style={{ width: '140px', height: '140px', flexShrink: 0 }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={selectedPurchase.whiskeys.image_url}
                      alt={selectedPurchase.whiskeys.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {/* 위스키 정보 */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#111827' }}>
                    {selectedPurchase.whiskeys?.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '10px' }}>
                    {selectedPurchase.whiskeys?.brand}
                  </div>
                  {/* 모바일: 첫 행에 배지(타입/지역/용량/도수) 자동 감싸기, 둘째 행에 잔여량 전체폭 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {/* 배지 묶음 */}
                    <div
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '0px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {selectedPurchase.whiskeys?.type && (
                        <span style={{
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>{selectedPurchase.whiskeys.type}</span>
                      )}
                      {selectedPurchase.whiskeys?.region && (
                        <span style={{
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>{selectedPurchase.whiskeys.region}</span>
                      )}
                      {(selectedPurchase.bottle_volume || selectedPurchase.whiskeys?.bottle_volume) && (
                        <span style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>{(selectedPurchase.bottle_volume || selectedPurchase.whiskeys?.bottle_volume)}ml</span>
                      )}
                      {(selectedPurchase.abv || selectedPurchase.whiskeys?.abv) && (
                        <span style={{
                          backgroundColor: '#F59E0B',
                          color: '#111827',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>{(selectedPurchase.abv || selectedPurchase.whiskeys?.abv)}%</span>
                      )}
                    </div>

                    {/* 잔여량 - 다음 행 전체 폭 */}
                    <div
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '0px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '4px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#374151'
                      }}
                    >
                      {(() => {
                        const purchaseVolume = selectedPurchase.bottle_volume || null;
                        const whiskeyVolume = selectedPurchase.whiskeys?.bottle_volume || null;
                        const baseVol = purchaseVolume ?? whiskeyVolume ?? 700;
                        const value = selectedPurchase.remaining_amount;
                        const percent = ((value / baseVol) * 100);
                        return (
                          <>
                            <span style={{
                              backgroundColor: '#E0E7EF',
                              color: '#374151',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px'
                            }}>잔여량</span>
                            <span>{value}ml</span>
                            <span style={{ color: '#6B7280', fontWeight: 600, fontSize: '12px' }}>({percent.toFixed(0)}%)</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 구매 정보 */}
            {selectedPurchase.purchase_date && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#6B7280' }}>
                  📅 구매 정보
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPurchase.purchase_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9CA3AF' }}>구매일</span>
                      <span style={{ fontWeight: '600' }}>{new Date(selectedPurchase.purchase_date).toLocaleDateString('ko-KR')}</span>
                    </div>
                  )}
                  {selectedPurchase.store_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9CA3AF' }}>구매처</span>
                      <span style={{ fontWeight: '600' }}>{selectedPurchase.store_name}</span>
                    </div>
                  )}
                  {selectedPurchase.purchase_location && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#9CA3AF' }}>구매위치</span>
                      <span style={{ fontWeight: '600' }}>{selectedPurchase.purchase_location}</span>
                    </div>
                  )}
                  {selectedPurchase.final_price_krw && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#9CA3AF' }}>구매가격</span>
                        <span style={{ fontWeight: '600' }}>₩{selectedPurchase.final_price_krw.toLocaleString('ko-KR')}</span>
                      </div>
                      {selectedPurchase.whiskeys?.price && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#9CA3AF' }}>데일리샷 가격</span>
                          <span style={{ fontWeight: '600' }}>₩{selectedPurchase.whiskeys.price.toLocaleString('ko-KR')}</span>
                        </div>
                      )}
                      {selectedPurchase.whiskeys?.price && (
                        <div style={{
                          marginTop: '4px',
                          padding: '6px 12px',
                          backgroundColor: (selectedPurchase.whiskeys.price - selectedPurchase.final_price_krw) >= 0 ? '#FEF3C7' : '#D1FAE5',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: (selectedPurchase.whiskeys.price - selectedPurchase.final_price_krw) >= 0 ? '#92400E' : '#065F46',
                          textAlign: 'center'
                        }}>
                          {(selectedPurchase.whiskeys.price - selectedPurchase.final_price_krw) >= 0 ? '⬆' : '⬇'} 차액: ₩{Math.abs(selectedPurchase.whiskeys.price - selectedPurchase.final_price_krw).toLocaleString('ko-KR')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 테이스팅 날짜 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            테이스팅 날짜 *
          </label>
          <Input
            type="date"
            value={tastingDate}
            onChange={(value) => setTastingDate(value)}
            disabled={isDisabled}
          />
        </div>

        {/* 마신 양 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            마신 양 {selectedPurchase && `(남은양: ${selectedPurchase.remaining_amount}ml)`}
          </label>
          <GlassCountInput
            value={amountConsumed}
            onChange={(value) => setAmountConsumed(value)}
            maxGlasses={maxGlasses}
            disabled={!selectedPurchaseId}
          />
        </div>

        {/* 색상 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            색상
          </label>
          <ColorSelector
            value={color}
            onChange={setColor}
            disabled={isDisabled}
          />
        </div>

        {/* 향 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            🔥 향
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: '6px',
            padding: '8px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px'
          }}>
            {tastingOptions.nose.map(option => (
              <CheckImageButton
                key={option}
                label={option}
                checked={selectedNoseOptions.includes(option)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedNoseOptions(prev => [...prev, option]);
                  } else {
                    setSelectedNoseOptions(prev => prev.filter(item => item !== option));
                  }
                }}
                image={getEmojiForOption(option)}
                backgroundImage={`/img/icons/aroma/${encodeURIComponent(getImageFileName(option))}.png`}
                accentColor="#3B82F6"
                height={42}
                disabled={isDisabled}
              />
            ))}
          </div>
        </div>

        {/* 맛 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            💜 맛
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: '6px',
            padding: '8px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px'
          }}>
            {tastingOptions.palate.map(option => (
              <CheckImageButton
                key={option}
                label={option}
                checked={selectedPalateOptions.includes(option)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedPalateOptions(prev => [...prev, option]);
                  } else {
                    setSelectedPalateOptions(prev => prev.filter(item => item !== option));
                  }
                }}
                image={getEmojiForOption(option)}
                backgroundImage={`/img/icons/taste/${encodeURIComponent(getImageFileName(option))}.png`}
                accentColor="#8B5CF6"
                height={42}
                disabled={isDisabled}
              />
            ))}
          </div>
        </div>

        {/* 여운 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            ❄️ 여운
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: '6px',
            padding: '8px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px'
          }}>
            {tastingOptions.finish.map(option => (
              <CheckImageButton
                key={option}
                label={option}
                checked={selectedFinishOptions.includes(option)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedFinishOptions(prev => [...prev, option]);
                  } else {
                    setSelectedFinishOptions(prev => prev.filter(item => item !== option));
                  }
                }}
                image={getEmojiForOption(option)}
                backgroundImage={`/img/icons/aftertaste/${encodeURIComponent(getImageFileName(option))}.png`}
                accentColor="#06B6D4"
                height={42}
                disabled={isDisabled}
              />
            ))}
          </div>
        </div>

        {/* 평가 차트 */}
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            📊 평가 차트
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <SevenRadarChart
              values={{
                nose: noseRating,
                palate: palateRating,
                finish: finishRating,
                sweetness: sweetness,
                smokiness: smokiness,
                fruitiness: fruitiness,
                complexity: complexity
              }}
              max={10}
              size={200}
            />
          </div>
          {/* 전체 평가 점수 */}
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: getRatingColor(rating).bg,
            borderRadius: '8px',
            textAlign: 'center',
            border: `2px solid ${getRatingColor(rating).text}`,
          }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>전체 평가</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: getRatingColor(rating).text }}>
              {rating.toFixed(1)}/10
            </div>
          </div>
        </div>

        {/* 세부 평가 */}
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            📊 세부 평가
          </div>
          
          {/* 향 평점 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>🔥 향: {noseRating}/10</div>
            <Trackbar value={noseRating} onChange={setNoseRating} min={0} max={10} step={0.5} color="#EF4444" disabled={isDisabled} />
          </div>

          {/* 맛 평점 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>💜 맛: {palateRating}/10</div>
            <Trackbar value={palateRating} onChange={setPalateRating} min={0} max={10} step={0.5} color="#A855F7" disabled={isDisabled} />
          </div>

          {/* 여운 평점 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>❄️ 여운: {finishRating}/10</div>
            <Trackbar value={finishRating} onChange={setFinishRating} min={0} max={10} step={0.5} color="#06B6D4" disabled={isDisabled} />
          </div>

          {/* 단맛 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>🍯 단맛: {sweetness}/10</div>
            <Trackbar value={sweetness} onChange={setSweetness} min={0} max={10} step={0.5} color="#F59E0B" disabled={isDisabled} />
          </div>

          {/* 스모키함 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>💨 스모키함: {smokiness}/10</div>
            <Trackbar value={smokiness} onChange={setSmokiness} min={0} max={10} step={0.5} color="#64748B" disabled={isDisabled} />
          </div>

          {/* 과일향 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>🍎 과일향: {fruitiness}/10</div>
            <Trackbar value={fruitiness} onChange={setFruitiness} min={0} max={10} step={0.5} color="#EC4899" disabled={isDisabled} />
          </div>

          {/* 복합성 */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>🌟 복합성: {complexity}/10</div>
            <Trackbar value={complexity} onChange={setComplexity} min={0} max={10} step={0.5} color="#8B5CF6" disabled={isDisabled} />
          </div>
        </div>

        {/* 추가 메모 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            📝 추가 메모
          </label>
          <RichTextEditor
            content={notes}
            onChange={setNotes}
            placeholder="추가적인 메모를 작성해주세요"
            disabled={isDisabled}
          />
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <Button
            variant="secondary"
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                navigate('/mobile/tasting-notes');
              }
            }}
            style={{ flex: 1 }}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || isDisabled}
            style={{ flex: 1 }}
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
        </div>

      {/* 구매 선택 모달 */}
      {showPurchaseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 모달 헤더 */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>위스키 선택</h3>
              <Button
                variant="secondary"
                onClick={() => setShowPurchaseModal(false)}
                style={{ minWidth: 'auto', padding: '4px 12px' }}
              >
                ✕
              </Button>
            </div>

            {/* 검색창 */}
            <div style={{ marginBottom: '16px' }}>
              <Input
                type="text"
                placeholder="위스키명 또는 브랜드로 검색..."
                value={purchaseSearchTerm}
                onChange={(value) => setPurchaseSearchTerm(value)}
              />
            </div>

            {/* 위스키 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              {filteredPurchases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                  {purchaseSearchTerm ? '검색 결과가 없습니다' : '선택 가능한 위스키가 없습니다'}
                </div>
              ) : (
                filteredPurchases.map(purchase => (
                  <div
                    key={purchase.id}
                    onClick={() => {
                      setSelectedPurchaseId(purchase.id);
                      setShowPurchaseModal(false);
                    }}
                    style={{
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPurchaseId === purchase.id ? '#EFF6FF' : 'white',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    {/* 왼쪽: 이미지 */}
                    {purchase.whiskeys?.image_url && (
                      <img
                        src={purchase.whiskeys.image_url}
                        alt={purchase.whiskeys.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          objectFit: 'contain'
                        }}
                      />
                    )}
                    {/* 가운데: 기본 정보 */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        {purchase.whiskeys?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {purchase.whiskeys?.brand}
                      </div>
                    </div>
                    {/* 오른쪽: 남은 용량 */}
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '82px', justifyContent: 'flex-end' }}>
                      {(() => {
                        const bottleVolume = purchase.bottle_volume || purchase.whiskeys?.bottle_volume || 700;
                        const color = getRemainingColor(purchase.remaining_amount, bottleVolume);
                        return (
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: color.bg,
                            border: `1px solid ${color.border}`,
                            color: color.text,
                            display: 'inline-block',
                            minWidth: '62px',
                            textAlign: 'center'
                          }}>
                            📦 {purchase.remaining_amount}ml
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

export default MobileTastingNotesForm;


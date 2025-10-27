import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { ITastingNote, ITastingNoteFormData, IWhiskey, ViewMode } from '../types/index';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Trackbar from '../components/Trackbar';
import RichTextEditor from '../components/RichTextEditor';
import { useHeaderControls } from '../components/Layout';
import TastingNoteDetailModal from '../components/TastingNoteDetailModal';
import ColorSelector from '../components/ColorSelector';
import RadarChart from '../components/RadarChart';
import CheckImageButton from '../components/CheckImageButton';
import GlassCountInput from '../components/GlassCountInput';
import Waitform from '../components/Waitform';
import { tastingOptions } from '../data/tastingOptions';
import { useGridLayout, applyGridLayout } from '../utils/gridLayout';
import { useLoadingStore } from '../stores';

const TastingNotes: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoadingStore();
  const [tastingNotes, setTastingNotes] = useState<ITastingNote[]>([]);
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [loading, setLoadingLocal] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<ITastingNote | null>(null);
  const { setHeaderControls } = useHeaderControls();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // 새로운 그리드 레이아웃 시스템 사용
  useGridLayout(gridContainerRef, tastingNotes.length);
  // 선택된 구매 정보 메타(잔여량/시음일/구매일)
  const [selectedPurchaseMeta, setSelectedPurchaseMeta] = useState<{
    remainingAmount: number;
    firstTastingDate?: string;
    lastTastingDate?: string;
    purchaseDate?: string;
    store_name?: string;
    purchase_location?: string;
    final_price_krw?: number;
  } | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [availablePurchases, setAvailablePurchases] = useState<any[]>([]);
  const [showPurchaseSelection, setShowPurchaseSelection] = useState(false);

  // 구매 리스트 로드 (남아있는 위스키만)
  const loadAvailablePurchases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_date,
          remaining_amount,
          bottle_volume,
          whiskey_id,
          tasting_finish_date,
          whiskeys(
            id,
            name,
            brand,
            image_url
          )
        `)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      
      // 각 purchase의 실제 남은양 계산 (tasting_notes 기반)
      const purchasesWithRealRemaining = await Promise.all((data || []).map(async (purchase: any) => {
        // 해당 purchase의 모든 tasting_notes 조회
        const { data: tastingNotes } = await supabase
          .from('tasting_notes')
          .select('amount_consumed')
          .eq('purchase_id', purchase.id);

        // 실제 남은양 계산
        const totalConsumed = (tastingNotes || [])
          .reduce((sum: number, note: any) => sum + (note.amount_consumed || 0), 0);
        
        const bottleVolume = purchase.bottle_volume || 700;
        const realRemainingAmount = Math.max(0, bottleVolume - totalConsumed);

        return {
          ...purchase,
          remaining_amount: realRemainingAmount // 실제 계산된 남은양
        };
      }));
      
      // 남아있는 위스키만 필터링
      const availablePurchases = purchasesWithRealRemaining.filter(purchase => {
        const hasNoFinishDate = !purchase.tasting_finish_date;
        const hasRemaining = purchase.remaining_amount && purchase.remaining_amount > 0;
        
        return hasNoFinishDate || hasRemaining;
      });
      
      setAvailablePurchases(availablePurchases);
    } catch (error) {
      console.error('구매 목록 로드 오류:', error);
    }
  }, []);

  // 잔여량 색상 함수
  const getRemainingColor = useCallback((remaining: number, bottle: number) => {
    const percentage = bottle > 0 ? (remaining / bottle) * 100 : 0;
    if (percentage >= 80) return { bg: '#D1FAE5', border: '#86EFAC', text: '#065F46' }; // 초록
    if (percentage >= 60) return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }; // 노랑
    if (percentage >= 40) return { bg: '#FED7AA', border: '#FDBA74', text: '#9A3412' }; // 주황
    return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' }; // 빨강
  }, []);

  // 남은양 재계산 함수 (purchases 테이블 업데이트)
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

      // remaining_amount 업데이트
      const updateData: any = {
        remaining_amount: newRemainingAmount
      };

      // 남은양이 0이면 tasting_finish_date 설정
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

      await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', purchaseId);

    } catch (error) {
      console.error('remaining_amount 재계산 오류:', error);
    }
  };

  // 남은양 계산 (선택된 구매의 남은양)
  const getRemainingAmount = useMemo(() => {
    if (!selectedPurchaseMeta || !selectedPurchaseMeta.remainingAmount) return 1000; // 기본값
    return selectedPurchaseMeta.remainingAmount;
  }, [selectedPurchaseMeta]);

  // 구매 선택 핸들러
  const handlePurchaseSelect = async (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    
    // 선택된 구매 정보 로드
    try {
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('bottle_volume, tasting_start_date, tasting_finish_date, purchase_date, store_name, purchase_location, final_price_krw')
        .eq('id', purchaseId)
        .single();
      
      if (purchaseData) {
        // 남은양 실시간 계산 (tasting_notes 기반)
        const { data: tastingNotes } = await supabase
          .from('tasting_notes')
          .select('amount_consumed')
          .eq('purchase_id', purchaseId);

        const totalConsumed = (tastingNotes || [])
          .reduce((sum: number, note: any) => sum + (note.amount_consumed || 0), 0);
        
        const bottleVolume = purchaseData.bottle_volume || 700;
        const realRemainingAmount = Math.max(0, bottleVolume - totalConsumed);

        setSelectedPurchaseMeta({
          remainingAmount: realRemainingAmount,
          firstTastingDate: purchaseData.tasting_start_date,
          lastTastingDate: purchaseData.tasting_finish_date,
          purchaseDate: purchaseData.purchase_date,
          store_name: purchaseData.store_name,
          purchase_location: purchaseData.purchase_location,
          final_price_krw: purchaseData.final_price_krw
        });
        
        // 위스키 ID 설정
        const purchase = availablePurchases.find(p => p.id === purchaseId);
        if (purchase?.whiskey_id) {
          handleInputChange('whiskey_id', purchase.whiskey_id);
        }
      }
    } catch (error) {
      console.error('구매 정보 로드 오류:', error);
    }
    
    setShowPurchaseSelection(false);
  };

  // 각 항목에 맞는 이모지 매핑 함수
  const getEmojiForOption = (option: string) => {
    const emojiMap: { [key: string]: string } = {
      // 향 (Nose)
      '바닐라': '🌿', '카라멜': '🍯', '허니': '🍯', '초콜릿': '🍫', '커피': '☕',
      '과일': '🍎', '사과': '🍎', '배': '🍐', '복숭아': '🍑', '체리': '🍒',
      '꽃향': '🌸', '장미': '🌹', '라벤더': '💜', '재스민': '🌼',
      '스파이스': '🌶️', '시나몬': '🍯', '정향': '🌿', '후추': '🌶️', '생강': '🫚',
      '오크': '🌳', '바닐라 오크': '🌿', '스모키': '💨', '피트': '🔥',
      '민트': '🌿', '유칼립투스': '🌿', '허브': '🌿', '타르': '🖤', '고무': '⚫',
      
      // 맛 (Palate)
      '달콤함': '🍯', '단맛': '🍯', '과일맛': '🍎', '신맛': '🍋', '레몬': '🍋', '라임': '🍋', '오렌지': '🍊',
      '쓴맛': '☕', '다크 초콜릿': '🍫', '호두': '🥜',
      '매운맛': '🌶️', '짠맛': '🧂', '해산물': '🦐', '바다향': '🌊',
      
      // 여운 (Finish)
      '짧음': '⚡', '보통': '⏱️', '긴 여운': '⏳',
      '따뜻함': '🔥', '차가움': '❄️', '톡 쏘는 느낌': '⚡',
      '부드러움': '☁️', '거친 느낌': '🌪️', '크리미함': '🥛'
    };
    
    return emojiMap[option] || '🥃'; // 기본값
  };

  // 한글 옵션명을 영문 파일명으로 매핑하는 함수
  const getImageFileName = (option: string) => {
    const mapping: { [key: string]: string } = {
      // 향 (aroma)
      '바닐라': 'Vanilia', '카라멜': 'Caramel', '허니': 'Honey', '초콜릿': 'Chocolate', '커피': 'Coffee',
      '과일': 'Fruit', '사과': 'apple', '배': 'Pear', '복숭아': 'Peach', '체리': 'Cherry',
      '꽃향': 'Flower', '장미': 'Rose', '라벤더': 'Lavender', '재스민': 'Jasmine',
      '스파이스': 'Spice', '시나몬': 'Cinnamon', '정향': 'Clove', '후추': 'Pepper', '생강': 'ginger',
      '오크': 'Oak', '바닐라 오크': 'Vanilla Oak', '스모키': 'Smoky', '피트': 'Peat',
      '민트': 'Mint', '유칼립투스': 'Eucalyptus', '허브': 'Hurb', '타르': 'Tar', '고무': 'Rubber',
      
      // 맛 (taste)
      '달콤함': 'sweetness', '단맛': 'sweetness', '과일맛': 'fruit', '신맛': 'sour', '레몬': 'Lemon', '라임': 'Lime', '오렌지': 'Orange',
      '쓴맛': 'bitterness', '다크 초콜릿': 'Chocolate', '호두': 'Walnut',
      '매운맛': 'spicy', '짠맛': 'salty', '해산물': 'seafood', '바다향': 'sea-scent',
      
      // 여운 (aftertaste)
      '짧음': 'short', '보통': 'medium', '긴 여운': 'long',
      '따뜻함': 'warm', '차가움': 'cool', '톡 쏘는 느낌': 'tingling',
      '부드러움': 'smooth', '거친 느낌': 'rough', '크리미함': 'creamy'
    };
    
    return mapping[option] || option;
  };


  // 종합평가 점수에 따른 액센트 색상 계산
  const getAccentColor = useCallback((rating: number) => {
    if (rating >= 9) return '#10B981'; // 매우 높은 점수 - 진한 녹색
    if (rating >= 8) return '#059669'; // 높은 점수 - 녹색
    if (rating >= 7) return '#047857'; // 좋은 점수 - 중간 녹색
    if (rating >= 6) return '#065F46'; // 보통 점수 - 어두운 녹색
    if (rating >= 5) return '#D97706'; // 중간 점수 - 노란색
    if (rating >= 4) return '#B45309'; // 낮은 점수 - 어두운 노란색
    if (rating >= 3) return '#EA580C'; // 매우 낮은 점수 - 주황색
    return '#DC2626'; // 최저 점수 - 빨간색
  }, []);

  // CSS 기반 반응형 그리드 시스템 사용
  // JavaScript 계산 로직 제거 - CSS 미디어 쿼리로 대체

  // 헤더 컨트롤 설정 - 초기 설정 및 업데이트
  useEffect(() => {
    setHeaderControls({
      search: (
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Input
            type="text"
            placeholder="위스키 이름, 브랜드로 검색..."
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            showClearButton={true}
            showSearchIcon={true}
            style={{ paddingLeft: '40px', paddingRight: '40px' }}
          />
        </div>
      ),
      filters: (
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <img 
            src="/img/main/TopFilter.png" 
            alt="필터" 
            style={{ width: '24px', height: '24px' }}
          />
          필터
        </Button>
      ),
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => setViewMode('card')}
            variant={viewMode === 'card' ? 'primary' : 'secondary'}
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopCardList.png" 
              alt="카드 보기" 
              style={{ width: '24px', height: '24px' }}
            />
            카드 보기
          </Button>
          <Button 
            onClick={() => navigate('/tasting-notes/calendar')}
            variant="secondary"
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopCalendar.png" 
              alt="달력 보기" 
              style={{ width: '24px', height: '24px' }}
            />
            달력 보기
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              resetSelectionStates();
              setEditingNoteId(null);
              setSelectedPurchaseId('');
              setSelectedPurchaseMeta(null);
              setShowForm(true);
            }} 
            variant="primary" 
            size="sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
          >
          <img 
          src="/img/main/additional.png"
            alt="테이스팅 노트 추가" 
            style={{ width: '24px', height: '24px' }}
          />
          테이스팅 노트 추가
          </Button>
        </div>
      )
    });
  }, [searchTerm, showFilters, viewMode, setHeaderControls, navigate]);
  
  // 필터링 및 검색 상태
  const [filterWhiskeyId, setFilterWhiskeyId] = useState('');
  const [filterMinRating, setFilterMinRating] = useState('');
  const [filterMaxRating, setFilterMaxRating] = useState('');
  const [filterNose, setFilterNose] = useState('');
  const [filterPalate, setFilterPalate] = useState('');
  const [filterFinish, setFilterFinish] = useState('');

  // 폼 데이터 상태 (실제 데이터베이스 스키마에 맞게)
  const [formData, setFormData] = useState<ITastingNoteFormData>({
    whiskey_id: '',
    tasting_date: new Date().toISOString().split('T')[0],
    color: '',
    nose: '',
    palate: '',
    finish: '',
    rating: 5,
    notes: '',
    // 추가 평가 항목들
    nose_rating: 0,
    palate_rating: 0,
    finish_rating: 0,
    sweetness: 0,
    smokiness: 0,
    fruitiness: 0,
    complexity: 0,
    amount_consumed: 0
  });

  // 향/맛/여운 선택 상태
  const [selectedNoseOptions, setSelectedNoseOptions] = useState<string[]>([]);
  const [selectedPalateOptions, setSelectedPalateOptions] = useState<string[]>([]);
  const [selectedFinishOptions, setSelectedFinishOptions] = useState<string[]>([]);

  // 필터링 로직 최적화 - useMemo 사용
  const filteredNotes = useMemo(() => {
    if (!tastingNotes || tastingNotes.length === 0) {
      return [];
    }
    
    let filtered = [...tastingNotes];

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note => 
        note.whiskey?.name?.toLowerCase().includes(term) ||
        note.whiskey?.english_name?.toLowerCase().includes(term) ||
        note.whiskey?.brand?.toLowerCase().includes(term) ||
        note.notes?.toLowerCase().includes(term)
      );
    }

    // 위스키 필터
    if (filterWhiskeyId) {
      filtered = filtered.filter(note => note.whiskey_id === filterWhiskeyId);
    }

    // 평점 필터
    filtered = filtered.filter(note => {
      const rating = note.rating || 0;
      const minRating = filterMinRating ? parseInt(filterMinRating) : 0;
      const maxRating = filterMaxRating ? parseInt(filterMaxRating) : 10;
      return rating >= minRating && rating <= maxRating;
    });

    // 노트 필터
    if (filterNose) {
      filtered = filtered.filter(note => 
        note.nose?.toLowerCase().includes(filterNose.toLowerCase())
      );
    }

    if (filterPalate) {
      filtered = filtered.filter(note => 
        note.palate?.toLowerCase().includes(filterPalate.toLowerCase())
      );
    }

    if (filterFinish) {
      filtered = filtered.filter(note => 
        note.finish?.toLowerCase().includes(filterFinish.toLowerCase())
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      const aDate = new Date(a.tasting_date);
      const bDate = new Date(b.tasting_date);
      return bDate.getTime() - aDate.getTime(); // 최신순
    });

    return filtered;
  }, [tastingNotes, searchTerm, filterWhiskeyId, filterMinRating, filterMaxRating, filterNose, filterPalate, filterFinish]);

  // 필터링된 결과가 변경될 때마다 그리드 레이아웃 재적용
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (gridContainerRef.current) {
        applyGridLayout(gridContainerRef);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [filteredNotes]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoadingLocal(true);
      setLoading(true, '테이스팅 노트를 불러오는 중...');
      
      // 구매 리스트도 함께 로드
      await loadAvailablePurchases();

      // 테이스팅 노트 로드 (purchase_id를 통해 whiskeys와 조인)
      const { data: notesData, error: notesError } = await supabase
        .from('tasting_notes')
        .select(`
          id,
          purchase_id,
          tasting_date,
          color,
          nose,
          palate,
          finish,
          rating,
          notes,
          amount_consumed,
          nose_rating,
          palate_rating,
          finish_rating,
          sweetness,
          smokiness,
          fruitiness,
          complexity,
          created_at,
          updated_at,
          purchases!inner(
            whiskey_id,
            tasting_start_date,
            whiskeys!inner(
              id,
              name,
              brand,
              type,
              region,
              abv,
              bottle_volume,
              price,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.warn('테이스팅 노트 로드 실패:', notesError);
        // 오류가 있어도 계속 진행
      }

      // 조인된 데이터에서 위스키 정보 추출 및 정리
      const processedNotes = (notesData || []).map((note: any) => ({
        ...note,
        whiskey_id: note.purchases?.whiskey_id,
        whiskey: note.purchases?.whiskeys
      }));

      console.log('로드된 테이스팅 노트:', processedNotes);
      console.log('첫 번째 노트의 위스키 정보:', processedNotes[0]?.whiskey);

      setTastingNotes(processedNotes as ITastingNote[]);
      
      // 데이터 로드 완료 후 그리드 레이아웃 적용
      setTimeout(() => {
        if (gridContainerRef.current) {
          applyGridLayout(gridContainerRef);
        }
      }, 200);

      // 위스키 목록도 별도로 로드 (필터링용)
      const { data: whiskeysData, error: whiskeysError } = await supabase
        .from('whiskeys')
        .select('id, name, brand, type, region, abv, bottle_volume, price, image_url, created_at, updated_at')
        .order('name');

      if (whiskeysError) {
        console.warn('위스키 목록 로드 실패:', whiskeysError);
      } else {
        setWhiskeys(whiskeysData || []);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      // 오류가 발생해도 빈 배열로 설정하여 앱이 계속 작동하도록 함
      setTastingNotes([]);
      setWhiskeys([]);
    } finally {
      setLoadingLocal(false);
      setLoading(false);
    }
  }, [setLoading, loadAvailablePurchases]);

  // 필터 옵션들을 페이지 로딩 시에만 계산하고 메모이제이션 (한 번만 계산)
  const filterOptions = useMemo(() => {
    if (whiskeys.length === 0) {
      return {
        whiskeys: []
      };
    }

    return {
      whiskeys: whiskeys.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [whiskeys.length]); // whiskeys.length만 의존성으로 설정하여 데이터가 로드된 후 한 번만 계산

  // 세부 평가 평균 → 전체 평가 자동 반영
  useEffect(() => {
    const parts = [
      formData.nose_rating || 0,
      formData.palate_rating || 0,
      formData.finish_rating || 0,
      formData.sweetness || 0,
      formData.smokiness || 0,
      formData.fruitiness || 0,
      formData.complexity || 0
    ];
    const avg = Math.round(parts.reduce((a,b)=>a+b,0) / parts.length); // 정수로 반올림
    if (!Number.isNaN(avg)) {
      setFormData(prev => ({ ...prev, rating: avg }));
    }
  }, [
    formData.nose_rating, formData.palate_rating, formData.finish_rating,
    formData.sweetness, formData.smokiness, formData.fruitiness, formData.complexity
  ]);


  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 폼 입력 핸들러
  const handleInputChange = (field: keyof ITastingNoteFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 폼 제출 (실제 데이터베이스 스키마에 맞게)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseId) {
      alert('구매한 위스키를 선택해주세요.');
      return;
    }
    if (!formData.tasting_date) {
      alert('시음 날짜를 입력해주세요.');
      return;
    }

    try {
      // tasting_notes insert/update payload (실제 DB 스키마에 맞게)
      const submitData: any = {
        purchase_id: selectedPurchaseId, // purchase_id만 사용
        tasting_date: formData.tasting_date,
        color: formData.color || null,
        nose: selectedNoseOptions.join(', ') || null,
        palate: selectedPalateOptions.join(', ') || null,
        finish: selectedFinishOptions.join(', ') || null,
        rating: Math.round(formData.rating || 0), // 정수 보장
        notes: formData.notes || null,
        // 추가 필드들 (실제 DB에 존재하는 필드들)
        // 잔수를 ml로 변환: 1잔 = 50ml, 0.5잔 = 25ml
        amount_consumed: (formData.amount_consumed || 0) * 50,
        nose_rating: Math.round(formData.nose_rating || 0), // 정수 보장
        palate_rating: Math.round(formData.palate_rating || 0), // 정수 보장
        finish_rating: Math.round(formData.finish_rating || 0), // 정수 보장
        sweetness: Math.round(formData.sweetness || 0), // 정수 보장
        smokiness: Math.round(formData.smokiness || 0), // 정수 보장
        fruitiness: Math.round(formData.fruitiness || 0), // 정수 보장
        complexity: Math.round(formData.complexity || 0) // 정수 보장
      };

      if (editingNoteId) {
        const { error } = await supabase
          .from('tasting_notes')
          .update(submitData)
          .eq('id', editingNoteId);
        if (error) throw error;
        alert('테이스팅 노트가 수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('tasting_notes')
          .insert([submitData]);
        if (error) throw error;
        alert('테이스팅 노트가 추가되었습니다.');
      }

      // purchases.color 업데이트 (color는 purchases로 이동)
      if (formData.color && selectedPurchaseId) {
        await supabase
          .from('purchases')
          .update({ color: formData.color })
          .eq('id', selectedPurchaseId);
      }

      // 남은양 재계산 및 업데이트 (tasting_notes의 amount_consumed 합계 기반)
      if (selectedPurchaseId) {
        await recalculateRemainingAmount(selectedPurchaseId);

        // 처음 시음일 설정 (tasting_start_date가 없을 경우)
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('tasting_start_date')
          .eq('id', selectedPurchaseId)
          .single();

        if (purchaseData && !purchaseData.tasting_start_date) {
          await supabase
            .from('purchases')
            .update({ tasting_start_date: formData.tasting_date })
            .eq('id', selectedPurchaseId);
        }
      }

      setShowForm(false);
      setEditingNoteId(null);
      resetForm();
      resetSelectionStates();
      loadData();
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 폼 리셋 (실제 데이터베이스 스키마에 맞게)
  const resetForm = () => {
    setFormData({
      whiskey_id: '',
      tasting_date: new Date().toISOString().split('T')[0],
      color: '',
      nose: '',
      palate: '',
      finish: '',
      rating: 5,
      notes: '',
      nose_rating: 0,
      palate_rating: 0,
      finish_rating: 0,
      sweetness: 0,
      smokiness: 0,
      fruitiness: 0,
      complexity: 0,
      amount_consumed: 0
    });
  };

  // 선택 상태 리셋
  const resetSelectionStates = () => {
    setSelectedNoseOptions([]);
    setSelectedPalateOptions([]);
    setSelectedFinishOptions([]);
  };

  // 새 테이스팅 노트 추가 - resetForm과 resetSelectionStates 이후에 정의
  const handleAddNote = () => {
    resetForm();
    resetSelectionStates();
    setEditingNoteId(null);
    setSelectedPurchaseId('');
    setSelectedPurchaseMeta(null);
    setShowForm(true);
  };

  // 상세 보기 핸들러
  const handleViewDetail = async (note: ITastingNote) => {
    setSelectedNoteForDetail(note);
    setShowDetailModal(true);
    
    // 구매 정보 가져오기
    if (note.purchase_id) {
      try {
        const { data: purchaseData, error } = await supabase
          .from('purchases')
          .select('*, final_price_krw, tasting_start_date')
          .eq('id', note.purchase_id)
          .single();
        
        if (error) {
          console.error('구매 정보 로드 오류:', error);
        } else {
          // 현재 테이스팅 노트 시점의 남은양 계산
          let remainingAmountAtThisDate = purchaseData.bottle_volume || 700;
          
          // 현재 노트의 생성 시간 가져오기
          const { data: currentNote } = await supabase
            .from('tasting_notes')
            .select('created_at')
            .eq('id', note.id)
            .single();
          
          // 현재 노트보다 이전에 생성된 모든 테이스팅 노트 가져오기
          const { data: previousNotes } = await supabase
            .from('tasting_notes')
            .select('amount_consumed, created_at')
            .eq('purchase_id', note.purchase_id)
            .neq('id', note.id);
          
          if (previousNotes && currentNote) {
            const notesBeforeThis = previousNotes.filter(n => 
              new Date(n.created_at) < new Date(currentNote.created_at)
            );
            const totalConsumedBefore = notesBeforeThis.reduce((sum, n) => sum + (n.amount_consumed || 0), 0);
            remainingAmountAtThisDate = (purchaseData.bottle_volume || 700) - totalConsumedBefore;
          }
          
          // 에어링 기간 계산
          const aerationPeriod = purchaseData.tasting_start_date && note.tasting_date
            ? Math.floor((new Date(note.tasting_date).getTime() - new Date(purchaseData.tasting_start_date).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          // 구매 정보를 note 객체에 추가
          setSelectedNoteForDetail({
            ...note,
            purchaseInfo: {
              ...purchaseData,
              remaining_amount_at_this_date: remainingAmountAtThisDate,
              aeration_period: aerationPeriod,
              first_open_date: purchaseData.tasting_start_date
            }
          });
        }
      } catch (error) {
        console.error('구매 정보 로드 오류:', error);
      }
    }
  };

  // 편집 모드 시작 (실제 데이터베이스 스키마에 맞게)
  const handleEdit = (note: ITastingNote) => {
    setEditingNoteId(note.id);
    setFormData({
      whiskey_id: note.whiskey_id || '',
      tasting_date: note.tasting_date,
      color: note.color || '',
      nose: note.nose || '',
      palate: note.palate || '',
      finish: note.finish || '',
      rating: note.rating,
      notes: note.notes || '',
      nose_rating: note.nose_rating || 0,
      palate_rating: note.palate_rating || 0,
      finish_rating: note.finish_rating || 0,
      sweetness: note.sweetness || 0,
      smokiness: note.smokiness || 0,
      fruitiness: note.fruitiness || 0,
      complexity: note.complexity || 0,
      // DB의 ml 값을 잔수로 변환: ml / 50 = 잔수
      amount_consumed: (note.amount_consumed || 0) / 50
    });
    
    // 기존 데이터를 파싱하여 선택 상태 설정
    setSelectedNoseOptions(note.nose ? note.nose.split(', ').filter(Boolean) : []);
    setSelectedPalateOptions(note.palate ? note.palate.split(', ').filter(Boolean) : []);
    setSelectedFinishOptions(note.finish ? note.finish.split(', ').filter(Boolean) : []);
    
    // 구매 정보 설정 (편집 모드에서는 purchase_id를 통해 설정)
    if (note.purchase_id) {
      setSelectedPurchaseId(note.purchase_id);
      // 구매 정보 메타데이터는 별도로 로드해야 함
    }
    
    setShowForm(true);
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 테이스팅 노트를 삭제하시겠습니까?')) return;

    try {
      // 먼저 삭제할 테이스팅 노트의 정보를 가져옴
      const { data: tastingNote, error: fetchError } = await supabase
        .from('tasting_notes')
        .select('purchase_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 테이스팅 노트 삭제
      const { error: deleteError } = await supabase
        .from('tasting_notes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // 남은양 재계산 (tasting_notes의 amount_consumed 합계 기반)
      if (tastingNote?.purchase_id) {
        await recalculateRemainingAmount(tastingNote.purchase_id);
      }

      alert('테이스팅 노트가 삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 로딩 중일 때 Waitform만 표시
  if (isLoading || loading) {
    return <Waitform />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: 'none' }}>
      {/* 헤더 컨트롤을 Layout으로 이동 - 여기서는 페이지 컨텐츠만 렌더링 */}

      {/* 필터 옵션 */}
      {showFilters && (
        <Card style={{ padding: '16px' }}>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* 위스키 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  위스키
                </label>
              <select
                value={filterWhiskeyId}
                onChange={(e) => setFilterWhiskeyId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                  <option value="">전체</option>
                {filterOptions.whiskeys.map(whiskey => (
                  <option key={whiskey.id} value={whiskey.id}>
                    {whiskey.name}
                  </option>
                ))}
              </select>
            </div>

              {/* 최소 평점 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  최소 평점
                </label>
              <select
                value={filterMinRating}
                onChange={(e) => setFilterMinRating(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                  <option value="">전체</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}점 이상
                    </option>
                ))}
              </select>
            </div>
            
              {/* 최대 평점 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  최대 평점
                </label>
                <select
                  value={filterMaxRating}
                  onChange={(e) => setFilterMaxRating(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    minHeight: '40px'
                  }}
                >
                  <option value="">전체</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}점 이하
                    </option>
                ))}
              </select>
            </div>
            
              {/* 향 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  향 (Nose)
                </label>
              <select
                  value={filterNose}
                  onChange={(e) => setFilterNose(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                  <option value="">전체</option>
                  {tastingOptions.nose.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </div>

              {/* 맛 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  맛 (Palate)
                </label>
                <select
                  value={filterPalate}
                  onChange={(e) => setFilterPalate(e.target.value)}
          style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    minHeight: '40px'
                  }}
                >
                  <option value="">전체</option>
                  {tastingOptions.palate.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                  </div>

              {/* 여운 필터 */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  여운 (Finish)
                </label>
                <select
                  value={filterFinish}
                  onChange={(e) => setFilterFinish(e.target.value)}
                      style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    minHeight: '40px'
                  }}
                >
                  <option value="">전체</option>
                  {tastingOptions.finish.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 테이스팅 노트 폼 */}
      {showForm && (
        <Card className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg max-w-full w-full">
            {/* 헤더 */}
            <div className="bg-white px-8 py-6 rounded-t-2xl">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="text-4xl">🥃</span>
                {editingNoteId ? '테이스팅 노트 수정' : '새 테이스팅 노트'}
              </h2>
              <p className="text-gray-600 mt-2">
                위스키의 향, 맛, 여운을 자세히 기록해보세요
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
                style={{ position: 'absolute', top: '24px', right: '24px' }}
              >
                ✕ 닫기
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* 기본 정보 카드 */}
              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  기본 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 위스키 선택 카드 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      위스키 선택 {' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                      type="button"
                        variant="secondary"
                      onClick={() => setShowPurchaseSelection(true)}
                        className="flex-1"
                      >
                        {selectedPurchaseId ? '위스키 변경' : '위스키 선택'}
                      </Button>
                      {selectedPurchaseId && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setSelectedPurchaseId('');
                            handleInputChange('whiskey_id', '');
                            setSelectedPurchaseMeta(null);
                          }}
                        >
                          ✕
                        </Button>
                      )}
                      </div>
                    
                    {/* 선택된 위스키 상세 정보 표시 - 테이스팅 노트 상세보기와 동일한 디자인 */}
                    {formData.whiskey_id && (() => {
                      const whiskey = whiskeys.find(w => w.id === formData.whiskey_id);
                      if (!whiskey) return null;
                      
                      return (
                        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <td style={{ width: '300px', verticalAlign: 'top', paddingRight: '24px' }}>
                                  {/* 위스키 이미지 */}
                                  <div className="bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden" style={{ width: '350px', height: '400px' }}>
                              {whiskey?.image_url ? (
                                <img src={whiskey?.image_url} alt={whiskey?.name} style={{ width: '120%', height: '120%', objectFit: 'contain' }} />
                              ) : (
                                      <span className="text-6xl">🥃</span>
                              )}
                            </div>

                                  {/* 색상 정보 - 위스키 이미지 하단에 표시 */}
                                  {formData.color && (
                                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        {/* 위스키 모양 SVG 아이콘 - 크기 축소 */}
                                        <svg
                                          width="24"
                                          height="36"
                                          viewBox="0 0 24 36"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          {/* 위스키 병 몸체 */}
                                          <rect
                                            x="4"
                                            y="9"
                                            width="16"
                                            height="21"
                                            rx="1.5"
                                            fill="white"
                                            stroke="#D1D5DB"
                                            strokeWidth="0.8"
                                          />
                                          
                                          {/* 위스키 액체 */}
                                          <rect
                                            x="5"
                                            y="10"
                                            width="14"
                                            height="19"
                                            rx="0.8"
                                            fill={(() => {
                                              // 색상 값에 맞는 실제 색상 매핑
                                              const colorMap: Record<string, string> = {
                                                'transparent': 'transparent',
                                                'light-gold': '#FFD700',
                                                'gold': '#FFD700',
                                                'amber': '#FF8C00',
                                                'copper': '#B87333',
                                                'mahogany': '#8B4513',
                                                'brown': '#A52A2A',
                                                'dark-brown': '#654321',
                                                'black': '#000000'
                                              };
                                              const actualColor = colorMap[formData.color] || formData.color;
                                              return actualColor === 'transparent' ? 'transparent' : actualColor;
                                            })()}
                                            opacity={formData.color === 'transparent' ? 0.3 : 0.8}
                                          />
                                          
                                          {/* 병 목 */}
                                          <rect
                                            x="9"
                                            y="4"
                                            width="6"
                                            height="5"
                                            rx="0.8"
                                            fill="white"
                                            stroke="#D1D5DB"
                                            strokeWidth="0.8"
                                          />
                                          
                                          {/* 코르크 */}
                                          <rect
                                            x="9.5"
                                            y="2"
                                            width="5"
                                            height="2"
                                            rx="0.8"
                                            fill="#8B4513"
                                          />
                                          
                                          {/* 라벨 */}
                                          <rect
                                            x="6"
                                            y="14"
                                            width="12"
                                            height="4"
                                            rx="0.8"
                                            fill="white"
                                            stroke="#E5E7EB"
                                            strokeWidth="0.4"
                                          />
                                          
                                          {/* 라벨 텍스트 */}
                                          <text
                                            x="12"
                                            y="16.5"
                                            textAnchor="middle"
                                            fontSize="3"
                                            fill="#374151"
                                            fontFamily="Arial, sans-serif"
                                          >
                                            WHISKEY
                                          </text>
                                        </svg>
                                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>
                                          {(() => {
                                            // 색상 값에 맞는 한글 이름 매핑
                                            const nameMap: Record<string, string> = {
                                              'transparent': '투명',
                                              'light-gold': '연한 황금',
                                              'gold': '황금',
                                              'amber': '호박색',
                                              'copper': '구리색',
                                              'mahogany': '적갈색',
                                              'brown': '갈색',
                                              'dark-brown': '진한 갈색',
                                              'black': '검은색'
                                            };
                                            return nameMap[formData.color] || formData.color;
                                          })()}
                                        </span>
                              </div>
                                    </div>
                                  )}
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                  <div>
                                    <h4 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>{whiskey?.name}</h4>
                                    
                                    {/* 브랜드 정보 */}
                                    <div style={{ marginBottom: '16px' }}>
                                      <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>브랜드</div>
                                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{whiskey?.brand}</div>
                              </div>

                                    {/* 타입, 지역, 용량, 도수 카드 - 값만 표시 */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                      {/* 타입 카드 */}
                                      <div>
                                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Type</div>
                                        <div style={{
                                          backgroundColor: (() => {
                                            // 위스키 타입별 색상 매핑
                                            const typeColorMap: Record<string, string> = {
                                              'Single Malt': '#EF4444',      // 싱글몰트 - 빨간색
                                              'Blended': '#DC2626',         // 블렌디드 - 진한 빨간색
                                              'Bourbon': '#991B1B',         // 버번 - 마룬색
                                              'Rye': '#EA580C',             // 라이 - 주황색
                                              'Cognac': '#7C3AED',          // 꼬냑 - 보라색
                                              'Rum': '#6B21A8',             // 럼 - 진한 보라색
                                              'Vodka': '#0EA5E9',           // 보드카 - 하늘색
                                              'Gin': '#059669',             // 진 - 초록색
                                              'Tequila': '#0891B2'          // 데킬라 - 청록색
                                            };
                                            return typeColorMap[whiskey?.type || ''] || '#F3F4F6';
                                          })(),
                                          color: 'white',
                                          border: '1px solid rgba(255, 255, 255, 0.2)',
                                          borderRadius: '8px',
                                          padding: '12px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{whiskey?.type}</div>
                                </div>
                            </div>
                                      
                                      {/* 지역 카드 */}
                                      <div>
                                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Region</div>
                                        <div style={{
                                          backgroundColor: (() => {
                                            // 지역별 색상 매핑
                                            const regionColorMap: Record<string, string> = {
                                              'Scotland': '#059669',         // 스코틀랜드 - 초록색
                                              'Ireland': '#EA580C',          // 아일랜드 - 주황색
                                              'America': '#1E40AF',          // 미국 - 파란색
                                              'Japan': '#7C3AED',            // 일본 - 보라색
                                              'France': '#6B21A8',          // 프랑스 - 진한 보라색
                                              'Canada': '#DC2626',          // 캐나다 - 빨간색
                                              'Australia': '#0EA5E9',        // 호주 - 하늘색
                                              'Taiwan': '#059669',          // 대만 - 초록색
                                              'Korea': '#DC2626'            // 한국 - 빨간색
                                            };
                                            return regionColorMap[whiskey?.region || ''] || '#EEF2FF';
                                          })(),
                                          color: (() => {
                                            // 지역별 색상에 따른 텍스트 색상 결정
                                            const regionColorMap: Record<string, string> = {
                                              'Scotland': 'white',
                                              'Ireland': 'white',
                                              'America': 'white',
                                              'Japan': 'white',
                                              'France': 'white',
                                              'Canada': 'white',
                                              'Australia': 'white',
                                              'Taiwan': 'white',
                                              'Korea': 'white'
                                            };
                                            return regionColorMap[whiskey?.region || ''] || '#111827';
                                          })(),
                                          border: (() => {
                                            const regionColorMap: Record<string, string> = {
                                              'Scotland': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Ireland': '1px solid rgba(255, 255, 255, 0.2)',
                                              'America': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Japan': '1px solid rgba(255, 255, 255, 0.2)',
                                              'France': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Canada': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Australia': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Taiwan': '1px solid rgba(255, 255, 255, 0.2)',
                                              'Korea': '1px solid rgba(255, 255, 255, 0.2)'
                                            };
                                            return regionColorMap[whiskey?.region || ''] || '1px solid #C7D2FE';
                                          })(),
                                          borderRadius: '8px',
                                          padding: '12px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{whiskey?.region}</div>
                          </div>
                        </div>
                                      
                                      {/* 용량 카드 */}
                                      <div>
                                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Volume</div>
                                        <div style={{
                                          backgroundColor: '#F0FDF4',
                                          border: '1px solid #BBF7D0',
                                          borderRadius: '8px',
                                          padding: '12px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{whiskey?.bottle_volume}ml</div>
                  </div>
                </div>
                                      
                                      {/* 도수 카드 */}
                                      <div>
                                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>ABV</div>
                                        <div style={{
                                          backgroundColor: '#FEF3C7',
                                          border: '1px solid #FDE68A',
                                          borderRadius: '8px',
                                          padding: '12px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{whiskey?.abv}%</div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* 가격 정보 - 통합된 테이블 형태로 표시 */}
                                    <div style={{ marginBottom: '16px' }}>
                                      <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '8px' }}>Price Info</div>
                                      
                                      {/* 가격 정보 테이블 */}
                                      <div style={{ 
                                        backgroundColor: '#F9FAFB', 
                                        border: '1px solid #E5E7EB', 
                                        borderRadius: '8px', 
                                        padding: '12px'
                                      }}>
                                        {/* 위스키 가격 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '12px', color: '#6B7280' }}>데일리샷 가격</span>
                                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                                            ₩{whiskey?.price?.toLocaleString('ko-KR')}
                                          </span>
                                        </div>
                                        
                                        {/* 구매가격과 차액 표시 - 항상 표시 */}
                                        {selectedPurchaseMeta?.final_price_krw ? (
                                          <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                              <span style={{ fontSize: '12px', color: '#6B7280' }}>구매 가격</span>
                                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                                                ₩{(selectedPurchaseMeta?.final_price_krw || 0).toLocaleString('ko-KR')}
                                              </span>
                                            </div>
                                            <div style={{ 
                                              display: 'flex', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center',
                                              paddingTop: '8px',
                                              borderTop: '1px solid #E5E7EB'
                                            }}>
                                              <span style={{ fontSize: '12px', color: '#6B7280' }}>차액</span>
                                              <span style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600', 
                                                color: (() => {
                                                  const difference = (whiskey?.price || 0) - (selectedPurchaseMeta?.final_price_krw || 0);
                                                  return difference >= 0 ? '#DC2626' : '#059669';
                                                })()
                                              }}>
                                                ₩{((whiskey?.price || 0) - (selectedPurchaseMeta?.final_price_krw || 0)).toLocaleString('ko-KR')}
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            paddingTop: '8px',
                                            borderTop: '1px solid #E5E7EB'
                                          }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280' }}>구매 정보</span>
                                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                              구매 기록이 없습니다
                                            </span>
                                          </div>
                                )}
                              </div>
                                </div>

                                    {/* 남은양 카드 */}
                                    {selectedPurchaseMeta && (() => {
                                      const whiskey = whiskeys.find(w => w.id === formData.whiskey_id);
                                      const bottleVolume = whiskey?.bottle_volume || 700;
                                      const color = getRemainingColor(selectedPurchaseMeta.remainingAmount, bottleVolume);
                                      return (
                                        <div style={{ marginBottom: '16px' }}>
                                          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '8px' }}>Remaining Amount</div>
                                          <div style={{
                                            backgroundColor: color.bg,
                                            border: `1px solid ${color.border}`,
                                            borderRadius: '8px',
                                            padding: '16px',
                                            textAlign: 'center'
                                          }}>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: color.text }}>
                                              {selectedPurchaseMeta.remainingAmount}ml
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                              {((selectedPurchaseMeta.remainingAmount / bottleVolume) * 100).toFixed(0)}% remaining
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* 구매 정보 - 테이스팅 노트 상세보기와 동일한 형태로 표시 */}
                                    {selectedPurchaseMeta && (
                                      <div style={{ 
                                        fontSize: '12px', 
                                        color: '#6B7280',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #E5E7EB',
                                        marginTop: '16px'
                                      }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                                          {selectedPurchaseMeta?.purchaseDate && (
                                            <span>구매일: {selectedPurchaseMeta?.purchaseDate}</span>
                                          )}
                                          {selectedPurchaseMeta?.store_name && (
                                            <span>구매처: {selectedPurchaseMeta?.store_name}</span>
                                          )}
                                          {selectedPurchaseMeta?.purchase_location && (
                                            <span>위치: {selectedPurchaseMeta?.purchase_location}</span>
                              )}
                            </div>
                          </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              {/* 시음 정보 카드 */}
                <Card className="p-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  시음 정보
                  </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 시음 날짜 */}
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-2">
                        시음 날짜 <span className="text-red-500">*{' '}</span>
                    </span>
                      <Input
                        type="date"
                        value={formData.tasting_date}
                        onChange={(value) => handleInputChange('tasting_date', value)}
                        required
                        disabled={!selectedPurchaseId}
                        style={{ width: '200px' }}
                      />
                    </div>

                  {/* 색상 */}
                  <div>
                    <br/>
                    <ColorSelector
                      value={formData.color || ''}
                      onChange={(value: string) => handleInputChange('color', value)}
                      disabled={!selectedPurchaseId}
                    />
                  </div>

                  {/* 마신 양 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      마신 양 (남은양: {selectedPurchaseMeta ? `${getRemainingAmount}ml` : '---ml'})
                    </label>
                    <GlassCountInput
                      value={formData.amount_consumed || 0}
                      onChange={(value) => handleInputChange('amount_consumed', value)}
                      maxGlasses={Math.min(5, Math.floor(getRemainingAmount / 50))}
                      disabled={!selectedPurchaseId}
                    />
                  </div>
                  </div>
                </Card>

              {/* 테이스팅 노트 카드 */}
              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-lg">👃</span>
                  테이스팅 노트
                </h3>
                <div className="space-y-6">
                  {/* 향 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">향 (Nose)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
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
                          disabled={!selectedPurchaseId}
                          accentColor="#F59E0B"
                        />
                      ))}
                  </div>
                </div>
                
                  {/* 맛 */}
                        <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">맛 (Palate)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
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
                          disabled={!selectedPurchaseId}
                          accentColor="#8B5CF6"
                        />
                      ))}
                          </div>
                        </div>

                  {/* 여운 */}
                        <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">여운 (Finish)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
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
                          disabled={!selectedPurchaseId}
                          accentColor="#06B6D4"
                        />
                      ))}
                          </div>
                        </div>
                        </div>
              </Card>

              {/* 평가 점수 카드 */}
              <Card className="p-4" style={{ backgroundColor: '#f9f9f9', border: '2px solid #e5e7eb' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                    평가 점수
                </h3>
                  
                  {/* 전체 평가 점수 - 상단 우측 */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: (() => {
                      const score = formData.rating || 0;
                      if (score >= 9) return '#ECFDF5'; // 매우 밝은 녹색
                      if (score >= 8) return '#D1FAE5'; // 밝은 녹색
                      if (score >= 7) return '#A7F3D0'; // 연한 녹색
                      if (score >= 6) return '#6EE7B7'; // 중간 녹색
                      if (score >= 5) return '#FEF3C7'; // 밝은 노란색
                      if (score >= 4) return '#FDE68A'; // 연한 노란색
                      if (score >= 3) return '#FED7AA'; // 연한 주황색
                      return '#FECACA'; // 연한 빨간색
                    })(),
                    border: '2px solid',
                    borderColor: (() => {
                      const score = formData.rating || 0;
                      if (score >= 9) return '#10B981'; // 진한 녹색
                      if (score >= 8) return '#059669'; // 녹색
                      if (score >= 7) return '#047857'; // 중간 녹색
                      if (score >= 6) return '#065F46'; // 어두운 녹색
                      if (score >= 5) return '#D97706'; // 노란색
                      if (score >= 4) return '#B45309'; // 어두운 노란색
                      if (score >= 3) return '#EA580C'; // 주황색
                      return '#DC2626'; // 빨간색
                    })(),
                    minWidth: '120px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      fontWeight: 'bold',
                      lineHeight: '1',
                      color: (() => {
                        const score = formData.rating || 0;
                        if (score >= 9) return '#10B981'; // 진한 녹색
                        if (score >= 8) return '#059669'; // 녹색
                        if (score >= 7) return '#047857'; // 중간 녹색
                        if (score >= 6) return '#065F46'; // 어두운 녹색
                        if (score >= 5) return '#D97706'; // 노란색
                        if (score >= 4) return '#B45309'; // 어두운 노란색
                        if (score >= 3) return '#EA580C'; // 주황색
                        return '#DC2626'; // 빨간색
                      })()
                    }}>
                      {formData.rating || 0}/10
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      marginTop: '4px',
                      fontWeight: '500'
                    }}>
                      전체 평가
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  
                  {/* 세부 평가 항목들 - 좌측 트랙바, 우측 차트 레이아웃 */}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    {/* 좌측: 트랙바들 */}
                    <div style={{ flex: '1', minWidth: '400px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            향 평가 (0-10)
                          </label>
                    <Trackbar
                            value={formData.nose_rating || 0}
                            onChange={(value: number) => handleInputChange('nose_rating', value)}
                      min={0}
                      max={10}
                            disabled={!selectedPurchaseId}
                      step={1}
                            color="#8B4513"
                            colorPattern="earth"
                    />
                  </div>
                  
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            맛 평가 (0-10)
                          </label>
                      <Trackbar
                        value={formData.palate_rating || 0}
                            onChange={(value: number) => handleInputChange('palate_rating', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                            color="#A0522D"
                            colorPattern="sunset"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            여운 평가 (0-10)
                          </label>
                      <Trackbar
                        value={formData.finish_rating || 0}
                            onChange={(value: number) => handleInputChange('finish_rating', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                            color="#CD853F"
                            colorPattern="ocean"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            단맛 (0-10)
                          </label>
                      <Trackbar
                        value={formData.sweetness || 0}
                            onChange={(value: number) => handleInputChange('sweetness', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                            color="#D2691E"
                            colorPattern="pastel"
                      />
                    </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            스모키함 (0-10)
                          </label>
                      <Trackbar
                        value={formData.smokiness || 0}
                            onChange={(value: number) => handleInputChange('smokiness', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                            color="#B22222"
                            colorPattern="vibrant"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            과일향 (0-10)
                          </label>
                      <Trackbar
                        value={formData.fruitiness || 0}
                            onChange={(value: number) => handleInputChange('fruitiness', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                            color="#FF6347"
                            colorPattern="rainbow"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            복합성 (0-10)
                          </label>
                      <Trackbar
                        value={formData.complexity || 0}
                            onChange={(value: number) => handleInputChange('complexity', value)}
                        min={0}
                        max={10}
                            disabled={!selectedPurchaseId}
                        step={1}
                        color="#9370DB"
                        colorPattern="gradient"
                      />
                    </div>
                  </div>
                </div>
                    
                    {/* 우측: 차트 영역 */}
                    <div style={{ flex: '1', minWidth: '300px' }}>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">세부 평가 차트</h4>
                      <div style={{ 
                        width: '100%', 
                        height: '400px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px', 
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                      }}>
                        <RadarChart 
                          data={{
                            nose_rating: formData.nose_rating || 0,
                            palate_rating: formData.palate_rating || 0,
                            finish_rating: formData.finish_rating || 0,
                    sweetness: formData.sweetness || 0,
                    smokiness: formData.smokiness || 0,
                    fruitiness: formData.fruitiness || 0,
                    complexity: formData.complexity || 0
                  }}
                          size={320}
                  />
                  </div>
                  </div>
                  </div>
                </div>
              </Card>

              {/* 추가 노트 카드 */}
              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  추가 노트
                </h3>
                <RichTextEditor
                  content={formData.notes || ''}
                  onChange={(content: string) => handleInputChange('notes', content)}
                  placeholder="테이스팅에 대한 추가적인 생각이나 메모를 작성해보세요..."
                  disabled={!selectedPurchaseId}
                />
              </Card>

              {/* 제출 및 취소 버튼 */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="px-8 py-3"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNoteId(null);
                    resetForm();
                    resetSelectionStates();
                    setSelectedPurchaseId('');
                    setSelectedPurchaseMeta(null);
                  }}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  size="lg"
                  className="px-8 py-3"
                  disabled={!selectedPurchaseId}
                >
                  {editingNoteId ? '수정하기' : '저장하기'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* 테이스팅 노트 목록 */}
      {filteredNotes.length === 0 ? (
        <Card className="empty-container">
          <div style={{ color: '#6B7280' }}>
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">
              {searchTerm || filterWhiskeyId || filterMinRating || filterMaxRating || filterNose || filterPalate || filterFinish
                ? '검색 결과가 없습니다'
                : '아직 작성된 테이스팅 노트가 없습니다'}
            </h3>
            <p className="empty-description">
              {searchTerm || filterWhiskeyId || filterMinRating || filterMaxRating || filterNose || filterPalate || filterFinish
                ? '다른 검색어를 시도해보세요'
                : '첫 번째 테이스팅 노트를 작성해보세요!'}
            </p>
            {!searchTerm && !filterWhiskeyId && !filterMinRating && !filterMaxRating && !filterNose && !filterPalate && !filterFinish && (
              <Button onClick={handleAddNote} variant="primary">
                ➕ 테이스팅 노트 작성하기
              </Button>
            )}
        </div>
        </Card>
      ) : (
        <div 
          ref={gridContainerRef}
          className="tasting-note-grid-container"
        >
          {filteredNotes.map(note => {
            const whiskey = note.whiskey || whiskeys.find(w => w.id === note.whiskey_id);
            
            return (
              <div
                key={note.id}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  const menu = e.currentTarget.querySelector('.card-menu') as HTMLElement;
                  if (menu) menu.style.display = 'flex';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  const menu = e.currentTarget.querySelector('.card-menu') as HTMLElement;
                  if (menu) menu.style.display = 'none';
                }}
              >
                 <Card 
                   className="tasting-note-card"
                   style={{ 
                     transition: 'all 0.2s',
                     cursor: 'pointer',
                     overflow: 'hidden',
                     position: 'relative',
                     width: '240px',
                     maxWidth: '240px',
                     minWidth: '240px',
                     height: '400px',
                     minHeight: '400px',
                     maxHeight: '400px',
                     display: 'flex',
                     flexDirection: 'column',
                     flexShrink: 0,
                     boxSizing: 'border-box',
                     padding: '20px',
                     margin: '8px',
                     backgroundColor: '#ffffff',
                     border: '1px solid #e5e7eb',
                     borderRadius: '8px',
                     boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                   }}
                 >
                  {/* 카드 메뉴 - 우측 상단 (마우스 오버 시에만 표시) */}
                  <div 
                    className="card-menu"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      zIndex: 10,
                      display: 'none',
                      gap: '4px',
                      flexDirection: 'column'
                    }}
                  >
                    <button
                      onClick={() => handleViewDetail(note)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                      title="자세히 보기"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleEdit(note)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEF2F2';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* 위스키 이미지와 정보 레이어 */}
                  <div style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: 'transparent', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'right', justifyContent: 'flex-end', overflow: 'hidden' }}>
                    {/* 위스키 이미지 */}
                    {whiskey?.image_url ? (
                      <img
                        src={whiskey.image_url}
                        alt={whiskey.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', marginRight: '12px' }}
                      />
                    ) : (
                      <div style={{ fontSize: '48px', marginRight: '12px' }}>🥃</div>
                    )}
                    
                    {/* 왼쪽 상단 레이어 - 마신 잔수와 에어링 기간 */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '1px', 
                      left: '1px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '2px',
                      zIndex: 10
                    }}>
                      {/* 마신 잔수 */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '2px 4px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)'
                      }}>
                        {Math.round((note.amount_consumed || 0) / 50)}잔({note.amount_consumed || 0}ml)
                      </div>
                      
                      {/* 에어링 기간 */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '2px 4px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)'
                      }}>
                        에어링 기간({(() => {
                          // 에어링 기간 계산 (tasting_start_date와 tasting_date의 차이) - 날짜만 계산
                          if (note.purchases?.tasting_start_date && note.tasting_date) {
                            const startDate = new Date(note.purchases.tasting_start_date);
                            const tastingDate = new Date(note.tasting_date);
                            
                            // 날짜만 비교 (시간 제거)
                            startDate.setHours(0, 0, 0, 0);
                            tastingDate.setHours(0, 0, 0, 0);
                            
                            const diffTime = Math.abs(tastingDate.getTime() - startDate.getTime());
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            return `${diffDays}일`;
                          }
                          return '0일';
                        })()})
                      </div>
                    </div>
                  </div>

                  {/* 테이스팅 노트 정보 */}
                  <div className="tasting-note-info" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                  }}>
                     <div style={{ marginBottom: '12px', borderBottom: '1px solid #E5E7EB' }}>
                       <h3 
                         style={{ 
                           fontSize: '14px',
                           fontWeight: '600', 
                           color: '#111827', 
                           overflow: 'hidden', 
                           textOverflow: 'ellipsis', 
                           whiteSpace: 'nowrap',
                           maxWidth: '100%',
                           cursor: 'pointer',
                           margin: 0,
                           paddingBottom: '6px',
                           lineHeight: '1.2',
                           height: '1.2em',
                           minHeight: '1.2em',
                           maxHeight: '1.2em'
                         }}
                         title={whiskey?.name || '알 수 없음'}
                       >
                         {whiskey?.name || '알 수 없음'}
                       </h3>
                     </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: '#6B7280'
                        }}>
                          📅 {new Date(note.tasting_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: (() => {
                            const rating = Math.floor(note.rating || 0);
                            if (rating >= 9) return '#22C55E';
                            if (rating >= 7) return '#3B82F6';
                            if (rating >= 5) return '#F59E0B'; 
                            if (rating >= 3) return '#EF4444';
                            return '#6B7280';
                          })()
                        }}>
                          ⭐ {note.rating}/10
                        </span>
                      </div>
                    </div>
                     {/* 테이스팅 노트 미리보기 - 영문 라벨과 내용 분리 표시 */}
                     {(note.nose || note.palate || note.finish) && (
                       <div style={{
                         backgroundColor: '#F3F4F6',
                         borderLeft: `4px solid ${getAccentColor(note.rating)}`,
                         borderRadius: '6px',
                         padding: '4px 4px',
                         marginBottom: '12px',
                         borderBottom: '1px solid #D1D5DB',
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '4px',
                         maxHeight: '120px',
                         overflow: 'hidden',
                         height: '120px',
                         flex: 1,
                         minHeight: 0
                       }}>
                         {note.nose && (
                           <div style={{ 
                             display: 'flex', 
                             flexDirection: 'column',
                             gap: '2px',
                             marginBottom: '4px',
                             height: '40px',
                             overflow: 'hidden'
                           }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '20px' }}>
                               <span style={{ fontSize: '10px' }}>👃</span>
                               <span style={{ fontSize: '9px', fontWeight: '600', color: '#374151' }}>Nose :</span>
                             </div>
                             <div style={{ 
                               fontSize: '9px', 
                               color: '#6B7280',
                               textAlign: 'right',
                               paddingRight: '4px',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap',
                               height: '20px',
                               lineHeight: '1'
                             }}
                             title={note.nose}>
                               {note.nose}
                             </div>
                           </div>
                         )}
                         {note.palate && (
                           <div style={{ 
                             display: 'flex', 
                             flexDirection: 'column',
                             gap: '2px',
                             marginBottom: '4px',
                             height: '40px',
                             overflow: 'hidden'
                           }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '20px' }}>
                               <span style={{ fontSize: '10px' }}>👅</span>
                               <span style={{ fontSize: '9px', fontWeight: '600', color: '#374151' }}>Palate :</span>
                             </div>
                             <div style={{ 
                               fontSize: '9px', 
                               color: '#6B7280',
                               textAlign: 'right',
                               paddingRight: '4px',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap',
                               height: '20px',
                               lineHeight: '1'
                             }}
                             title={note.palate}>
                               {note.palate}
                             </div>
                           </div>
                         )}
                         {note.finish && (
                           <div style={{ 
                             display: 'flex', 
                             flexDirection: 'column',
                             gap: '2px',
                             marginBottom: '4px',
                             height: '40px',
                             overflow: 'hidden'
                           }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '20px' }}>
                               <span style={{ fontSize: '10px' }}>🌊</span>
                               <span style={{ fontSize: '9px', fontWeight: '600', color: '#374151' }}>Finish :</span>
                             </div>
                             <div style={{ 
                               fontSize: '9px', 
                               color: '#6B7280',
                               textAlign: 'right',
                               paddingRight: '4px',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap',
                               height: '20px',
                               lineHeight: '1'
                             }}
                             title={note.finish}>
                               {note.finish}
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* 테이스팅 노트 상세 보기 모달 */}
      {showDetailModal && selectedNoteForDetail && (
        <TastingNoteDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedNoteForDetail(null);
          }}
          note={selectedNoteForDetail}
          whiskey={selectedNoteForDetail?.whiskey || whiskeys.find(w => w.id === selectedNoteForDetail?.whiskey_id) || null}
          purchaseInfo={selectedNoteForDetail?.purchaseInfo}
        />
      )}

      {/* 구매 선택 모달 */}
      {showPurchaseSelection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}
        onClick={() => setShowPurchaseSelection(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{
              backgroundColor: '#1F2937',
              borderBottom: '1px solid #374151',
              padding: '24px 32px',
              borderRadius: '16px 16px 0 0',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: 0
              }}>
                <span style={{ fontSize: '28px' }}>🥃</span>
                위스키 선택
              </h3>
              <button
                onClick={() => setShowPurchaseSelection(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#374151',
                  color: '#F9FAFB',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ✕ 닫기
              </button>
            </div>

            {/* 컨텐츠 */}
            <div style={{
              padding: '24px',
              flex: 1,
              overflow: 'auto'
            }}>
              {availablePurchases.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {availablePurchases.map(purchase => (
                    <div
                      key={purchase.id}
                      onClick={() => handlePurchaseSelect(purchase.id)}
                      style={{
                        padding: '16px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
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
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {purchase.whiskeys?.name || '알 수 없는 위스키'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                          {purchase.whiskeys?.brand}
                        </div>
                        {(() => {
                          const bottleVolume = purchase.bottle_volume || 700;
                          const color = getRemainingColor(purchase.remaining_amount, bottleVolume);
                          return (
                            <div style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: color.text,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: color.bg,
                              border: `1px solid ${color.border}`,
                              display: 'inline-block'
                            }}>
                              📦 {purchase.remaining_amount}ml
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          구매일: {new Date(purchase.purchase_date).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <div>잔여량이 있는 구매 내역이 없습니다.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TastingNotes;

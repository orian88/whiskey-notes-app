import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import RichTextEditor from '../components/RichTextEditor';
import { crawlDailyshot } from '../utils/crawler';
import type { CrawledWhiskeyData } from '../types/index';

interface IWhiskeyFormData {
  name: string;
  brand?: string;
  type?: string;
  age?: number;
  bottle_volume?: number;
  abv?: number;
  region?: string;
  price?: number;
  distillery?: string;
  description?: string;
  cask?: string;
  image_url?: string;
  aroma?: string;
  taste?: string;
  finish?: string;
  country?: string;
}

interface MobileWhiskeyFormProps {
  onClose?: () => void;
  onSuccess?: () => void; // 저장 성공 시 호출될 콜백
  id?: string; // 직접 전달되는 id (오버레이 방식)
}

const MobileWhiskeyForm: React.FC<MobileWhiskeyFormProps> = ({ onClose, onSuccess, id: idProp }) => {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  // prop으로 전달된 id가 있으면 우선 사용, 없으면 useParams 사용
  const id = idProp || idParam;
  const isEdit = Boolean(id);
  
  // 슬라이드 애니메이션 상태
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  useEffect(() => {
    // 마운트 시 슬라이드 인 애니메이션
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  const [formData, setFormData] = useState<IWhiskeyFormData>({
    name: '',
    brand: '',
    type: '',
    age: undefined,
    bottle_volume: undefined,
    abv: undefined,
    region: '',
    price: undefined,
    distillery: '',
    description: '',
    cask: '',
    image_url: '',
    aroma: '',
    taste: '',
    finish: '',
    country: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlMessage, setCrawlMessage] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawledSourceData, setCrawledSourceData] = useState<any>(null);
  // 환경설정에서 크롤링 소스 데이터 표시 옵션 읽기
  const [showSourceData, setShowSourceData] = useState(() => {
    const saved = localStorage.getItem('show_crawlSourceData');
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    if (isEdit && id) {
      loadData();
    }
  }, [isEdit, id]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('whiskeys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || '',
        brand: data.brand || '',
        type: data.type || '',
        age: data.age || undefined,
        bottle_volume: data.bottle_volume || undefined,
        abv: data.abv || undefined,
        region: data.region || '',
        price: data.price || undefined,
        distillery: data.distillery || '',
        description: data.description || '',
        cask: data.cask || '',
        image_url: data.image_url || '',
        aroma: data.aroma || '',
        taste: data.taste || '',
        finish: data.finish || '',
        country: data.country || '',
      });
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '위스키 이름은 필수입니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        name: formData.name.trim(),
      };

      // 중복 체크 (신규 추가시만)
      if (!isEdit && id === undefined) {
        const { data: existingData, error: checkError } = await supabase
          .from('whiskeys')
          .select('id, name')
          .eq('name', formData.name.trim())
          .maybeSingle();

        // 에러가 있고 데이터도 없으면 실제 에러
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        const existing = existingData;
        if (existing) {
          const shouldUpdate = window.confirm(
            `"${existing.name}" 위스키가 이미 존재합니다.\n기존 정보를 업데이트하시겠습니까?`
          );
          
          if (shouldUpdate) {
            // 기존 위스키 업데이트
            const { error } = await supabase
              .from('whiskeys')
              .update(submitData)
              .eq('id', existing.id);
            
            if (error) throw error;
            alert('기존 위스키 정보가 업데이트되었습니다.');
            
            // 저장 시 새로고침 (중복 업데이트 시에는 전체 새로고침)
            window.location.href = '/mobile/whiskeys';
            return;
          }
          // 사용자가 취소하면 계속 진행 (새로 생성)
        }
      }

      if (isEdit && id) {
        const { data, error } = await supabase
          .from('whiskeys')
          .update(submitData)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('수정된 데이터가 없습니다.');
        }
        alert('위스키 정보가 수정되었습니다.');
        
        // 저장 성공 시 콜백 호출 (목록 새로고침용)
        if (onSuccess) {
          onSuccess();
        } else {
          // onSuccess가 없으면 전체 페이지 새로고침 (호환성 유지)
          window.location.href = '/mobile/whiskeys';
        }
        // 오버레이 닫기
        if (onClose) {
          handleClose();
        }
        return;
      } else {
        const { data, error } = await supabase
          .from('whiskeys')
          .insert([submitData])
          .select();
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('저장된 데이터가 없습니다.');
      }
        alert('새 위스키가 추가되었습니다.');
      }
      
      // 저장 성공 시 콜백 호출 (목록 새로고침용)
      if (onSuccess) {
        onSuccess();
      } else {
        // onSuccess가 없으면 전체 페이지 새로고침 (호환성 유지)
        window.location.href = '/mobile/whiskeys';
      }
      // 오버레이 닫기
      if (onClose) {
        handleClose();
      }
    } catch (error) {
      alert(`저장에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      // props로 전달된 onClose가 있으면 사용 (오버레이로 열린 경우)
      // onClose가 없으면 직접 URL 접근한 경우이므로 navigate (상세보기와 동일)
      if (onClose) {
        onClose();
      } else {
        // 직접 URL로 접근한 경우에만 navigate (replace로 새로고침 방지)
        navigate('/mobile/whiskeys', { replace: true });
      }
    }, 300);
  };

  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)'; // 오른쪽으로 슬라이드 아웃
    if (isEntering) return 'translateX(100%)'; // 처음엔 오른쪽에 위치
    return 'translateX(0)'; // 중앙 위치
  };

  const handleInputChange = (field: keyof IWhiskeyFormData, value: string | number | undefined) => {
    // 국가가 변경되면 지역 초기화
    if (field === 'country') {
      setFormData(prev => ({ ...prev, [field]: value, region: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) {
      setCrawlMessage('❌ URL을 입력해주세요.');
      setTimeout(() => setCrawlMessage(''), 3000);
      return;
    }

    if (!crawlUrl.includes('dailyshot.co')) {
      setCrawlMessage('❌ 데일리샷 사이트의 URL만 지원됩니다.');
      setTimeout(() => setCrawlMessage(''), 3000);
      return;
    }

    setCrawling(true);
    try {
      const crawledData = await crawlDailyshot(crawlUrl);
      
      if (crawledData) {
        // 타입 원본 찾기
        let typeRaw = '';
        if (crawledData.debugInfo?.rawInformation) {
          const typeInfo = crawledData.debugInfo.rawInformation.find((info: any) => 
            info.label === '종류' || info.label_ko === '종류'
          );
          typeRaw = typeInfo?.value || '';
        }
        
        // 크롤링된 원본 소스 데이터 저장 (크롤러에서 이미 추출된 brand, age 사용)
        setCrawledSourceData({
          rawData: crawledData,
          debugInfo: crawledData.debugInfo,
          extractedValues: {
            koreanName: crawledData.koreanName,
            englishName: crawledData.englishName,
            brand: crawledData.brand || '', // 크롤러에서 추출된 brand 사용
            age: crawledData.age, // 크롤러에서 추출된 age 사용
            type: crawledData.type,
            typeRaw: typeRaw,
            abv: crawledData.abv,
            volume: crawledData.volume,
            country: crawledData.country,
            region: crawledData.region,
            cask: crawledData.cask,
            price: crawledData.price,
            aroma: crawledData.aroma,
            taste: crawledData.taste,
            finish: crawledData.finish,
            imageUrl: crawledData.imageUrl,
            description: crawledData.description,
            reviewRate: crawledData.reviewRate,
            reviewCount: crawledData.reviewCount,
          }
        });
        // 환경설정 옵션에 따라 자동 표시 여부 결정
        const shouldAutoShow = localStorage.getItem('show_crawlSourceData') === 'true';
        setShowSourceData(shouldAutoShow);
        
        setFormData(prev => ({
          ...prev,
          name: crawledData.koreanName || crawledData.englishName || prev.name,
          brand: crawledData.brand || prev.brand, // 크롤러에서 추출된 brand 사용
          age: crawledData.age || prev.age, // 크롤러에서 추출된 age 사용
          type: crawledData.type || prev.type,
          bottle_volume: crawledData.volume || prev.bottle_volume,
          abv: crawledData.abv || prev.abv,
          region: crawledData.region || prev.region,
          price: crawledData.price || prev.price,
          distillery: crawledData.country || prev.distillery,
          description: crawledData.description || prev.description,
          cask: crawledData.cask || prev.cask,
          image_url: crawledData.imageUrl || prev.image_url,
          aroma: crawledData.aroma || prev.aroma,
          taste: crawledData.taste || prev.taste,
          finish: crawledData.finish || prev.finish,
          country: crawledData.country || prev.country,
        }));
        setCrawlMessage('✅ 크롤링이 완료되었습니다!');
        setCrawlUrl(''); // 성공 시 URL 초기화
        setTimeout(() => setCrawlMessage(''), 3000);
      } else {
        setCrawledSourceData(null);
        setShowSourceData(false);
        setCrawlMessage('❌ 크롤링에 실패했습니다.');
        setTimeout(() => setCrawlMessage(''), 3000);
      }
    } catch (error) {
      console.error('Crawling error:', error);
      setCrawledSourceData(null);
      setShowSourceData(false);
      setCrawlMessage('❌ 크롤링 중 오류가 발생했습니다.');
      setTimeout(() => setCrawlMessage(''), 3000);
    } finally {
      setCrawling(false);
    }
  };

  const whiskeyTypes = [
    'Single Malt', 'Blended Malt', 'Blended', 'Single Grain', 'Blended Grain',
    'Bourbon', 'Rye', 'Tennessee', 'Irish', 'Japanese', 'Canadian',
    'Cognac', 'Armagnac', 'Calvados', 'Brandy', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Liqueur', '기타'
  ];

  // 국가별 지역 매핑
  const regionsByCountry: Record<string, string[]> = {
    'Scotland': ['Highland', 'Lowland', 'Speyside', 'Islay', 'Islands', 'Campbeltown', '기타'],
    'Ireland': ['Ireland', '기타'],
    'United States': ['Kentucky', 'Tennessee', '기타'],
    'Japan': ['Japan', '기타'],
    'Canada': ['Canada', '기타'],
    'France': ['France', '기타'],
    'Mexico': ['기타'],
    'Jamaica': ['기타'],
    'Barbados': ['기타'],
    'Cuba': ['기타'],
    'Dominican Republic': ['기타'],
    'India': ['기타'],
    'Taiwan': ['기타'],
    'South Korea': ['기타'],
    'Australia': ['기타'],
    'New Zealand': ['기타'],
    'South Africa': ['기타'],
    '기타': ['기타'],
  };

  const countries = [
    'Scotland', 'Ireland', 'United States', 'Japan', 'Canada', 'France', 
    'Mexico', 'Jamaica', 'Barbados', 'Cuba', 'Dominican Republic', 'India', 
    'Taiwan', 'South Korea', 'Australia', 'New Zealand', 'South Africa', '기타'
  ];

  // 선택된 국가에 따른 지역 목록 필터링
  const availableRegions = formData.country 
    ? (regionsByCountry[formData.country] || ['기타'])
    : [];

  const content = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 100000, // 상세보기(99999)보다 위에 표시
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Fixed Header */}
      <header 
        style={{ 
          position: 'sticky', top: 0, left: 0, right: 0, height: '56px',
          backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', zIndex: 1001,
          display: 'flex', alignItems: 'center', padding: '0 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <button onClick={handleClose} style={{ 
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' 
          }}>←</button>
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>
            {isEdit ? '위스키 수정' : '위스키 추가'}
          </div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 크롤링 기능 (새 글 등록 시에만) */}
        {!isEdit && (
          <div style={{ backgroundColor: '#E0F2FE', padding: '16px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#0C4A6E' }}>
              🔍 빠른 등록 (데일리샷 크롤링)
            </h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Input
                type="url"
                placeholder="https://dailyshot.co/whiskey/..."
                value={crawlUrl}
                onChange={(value) => setCrawlUrl(value)}
                style={{ flex: 1 }}
              />
              <Button
                type="button"
                onClick={handleCrawl}
                disabled={crawling || !crawlUrl.trim()}
                style={{ minWidth: '100px', height: '44px', padding :  "4px " }}
              ><span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {crawling ? '크롤링 중...' : '🔍 크롤링'}</span>
              </Button>
            </div>
            {crawlMessage && (
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '13px',
                backgroundColor: crawlMessage.includes('✅') ? '#D1FAE5' : '#FEE2E2',
                color: crawlMessage.includes('✅') ? '#065F46' : '#991B1B',
                marginBottom: '8px'
              }}>
                {crawlMessage}
              </div>
            )}
            {crawledSourceData && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSourceData(!showSourceData)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>📋 크롤링 소스 데이터 {showSourceData ? '숨기기' : '보기'}</span>
                  <span>{showSourceData ? '▲' : '▼'}</span>
                </button>
                {showSourceData && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '11px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#374151' }}>
                      추출된 값:
                    </div>
                    <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                      <div><strong>한글명:</strong> {crawledSourceData.extractedValues.koreanName || '없음'}</div>
                      <div><strong>영문명:</strong> {crawledSourceData.extractedValues.englishName || '없음'}</div>
                      <div><strong>브랜드:</strong> {crawledSourceData.extractedValues.brand || '없음'}</div>
                      <div><strong>숙성년수:</strong> {crawledSourceData.extractedValues.age !== undefined ? `${crawledSourceData.extractedValues.age}년` : '없음'}</div>
                      <div><strong>타입:</strong> {crawledSourceData.extractedValues.type || '없음'} {crawledSourceData.extractedValues.typeRaw && `(원본: ${crawledSourceData.extractedValues.typeRaw})`}</div>
                      <div><strong>도수:</strong> {crawledSourceData.extractedValues.abv ? `${crawledSourceData.extractedValues.abv}%` : '없음'}</div>
                      <div><strong>용량:</strong> {crawledSourceData.extractedValues.volume ? `${crawledSourceData.extractedValues.volume}ml` : '없음'}</div>
                      <div><strong>국가:</strong> {crawledSourceData.extractedValues.country || '없음'}</div>
                      <div><strong>지역:</strong> {crawledSourceData.extractedValues.region || '없음'}</div>
                      <div><strong>캐스크:</strong> {crawledSourceData.extractedValues.cask || '없음'}</div>
                      <div><strong>가격:</strong> {crawledSourceData.extractedValues.price ? `${crawledSourceData.extractedValues.price.toLocaleString()}원` : '없음'}</div>
                      <div><strong>향:</strong> {crawledSourceData.extractedValues.aroma || '없음'}</div>
                      <div><strong>맛:</strong> {crawledSourceData.extractedValues.taste || '없음'}</div>
                      <div><strong>여운:</strong> {crawledSourceData.extractedValues.finish || '없음'}</div>
                      <div><strong>이미지 URL:</strong> {crawledSourceData.extractedValues.imageUrl || '없음'}</div>
                      <div><strong>설명:</strong> {crawledSourceData.extractedValues.description ? `${crawledSourceData.extractedValues.description.substring(0, 100)}...` : '없음'}</div>
                      <div><strong>평점:</strong> {crawledSourceData.extractedValues.reviewRate || '없음'}</div>
                      <div><strong>리뷰 개수:</strong> {crawledSourceData.extractedValues.reviewCount || '없음'}</div>
                    </div>
                    
                    {crawledSourceData.debugInfo && (
                      <>
                        <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                          원본 HTML 데이터:
                        </div>
                        <pre style={{
                          padding: '8px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          overflowX: 'auto',
                          overflowY: 'auto',
                          fontSize: '10px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '300px',
                          fontFamily: 'monospace',
                          lineHeight: '1.4'
                        }}>
                          {crawledSourceData.debugInfo.rawHtml || '원본 HTML 데이터가 없습니다.'}
                        </pre>
                        
                        <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                          원본 Information 데이터 (JSON):
                        </div>
                        <pre style={{
                          padding: '8px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          overflowX: 'auto',
                          fontSize: '10px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {JSON.stringify(crawledSourceData.debugInfo.rawInformation || [], null, 2)}
                        </pre>
                        
                        <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                          원본 Tasting Notes 데이터 (JSON):
                        </div>
                        <pre style={{
                          padding: '8px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          overflowX: 'auto',
                          fontSize: '10px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {JSON.stringify(crawledSourceData.debugInfo.rawTastingNotes || [], null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 기본 정보 */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            기본 정보
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                위스키 이름 *
              </label>
              <Input
                type="text"
                placeholder="예: Macallan 18"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                style={{ borderColor: errors.name ? '#DC2626' : undefined }}
              />
              {errors.name && (
                <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                브랜드
              </label>
              <Input
                type="text"
                placeholder="예: Macallan"
                value={formData.brand}
                onChange={(value) => handleInputChange('brand', value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                타입
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">타입 선택</option>
                {whiskeyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  숙성년수
                </label>
                <Input
                  type="number"
                  placeholder="예: 18"
                  value={formData.age?.toString() || ''}
                  onChange={(value) => handleInputChange('age', value ? parseInt(value) : undefined)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  도수 (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="예: 43.0"
                  value={formData.abv?.toString() || ''}
                  onChange={(value) => handleInputChange('abv', value ? parseFloat(value) : undefined)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                국가
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">국가 선택</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                지역
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                disabled={!formData.country}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: formData.country ? 'white' : '#F3F4F6',
                  cursor: formData.country ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">지역 선택</option>
                {availableRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  가격 (원)
                </label>
                <Input
                  type="number"
                  placeholder="예: 500000"
                  value={formData.price?.toString() || ''}
                  onChange={(value) => handleInputChange('price', value ? parseInt(value) : undefined)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  용량 (ml)
                </label>
                <Input
                  type="number"
                  placeholder="예: 700"
                  value={formData.bottle_volume?.toString() || ''}
                  onChange={(value) => handleInputChange('bottle_volume', value ? parseInt(value) : undefined)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                증류소
              </label>
              <Input
                type="text"
                placeholder="예: Macallan Distillery"
                value={formData.distillery}
                onChange={(value) => handleInputChange('distillery', value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                캐스크
              </label>
              <Input
                type="text"
                placeholder="예: Sherry Oak"
                value={formData.cask}
                onChange={(value) => handleInputChange('cask', value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                이미지 URL
              </label>
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.image_url}
                onChange={(value) => handleInputChange('image_url', value)}
              />
              {formData.image_url && (
                <div style={{ marginTop: '8px' }}>
                  <img
                    src={formData.image_url}
                    alt="미리보기"
                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 테이스팅 노트 */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            테이스팅 노트
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                향 (Aroma)
              </label>
              <textarea
                placeholder="향에 대한 설명을 입력하세요..."
                value={formData.aroma || ''}
                onChange={(e) => handleInputChange('aroma', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                맛 (Taste)
              </label>
              <textarea
                placeholder="맛에 대한 설명을 입력하세요..."
                value={formData.taste || ''}
                onChange={(e) => handleInputChange('taste', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                여운 (Finish)
              </label>
              <textarea
                placeholder="여운에 대한 설명을 입력하세요..."
                value={formData.finish || ''}
                onChange={(e) => handleInputChange('finish', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            설명
          </h2>
          <RichTextEditor
            content={formData.description || ''}
            onChange={(content) => handleInputChange('description', content)}
            placeholder="위스키에 대한 설명을 입력하세요..."
          />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            style={{ flex: 1 }}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? '저장 중...' : (isEdit ? '수정하기' : '추가하기')}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );

  // Portal을 사용하여 body에 직접 렌더링 (최상위 레이어 보장)
  return typeof document !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};

export default MobileWhiskeyForm;


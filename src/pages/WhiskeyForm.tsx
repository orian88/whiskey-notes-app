import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWhiskeyStore } from '../stores';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import CrawlingForm from '../components/CrawlingForm';
import RichTextEditor from '../components/RichTextEditor';
import type { IWhiskeyFormData, IWhiskey } from '../types/index';
import { useHeaderControls } from '../components/Layout';
import { crawlDailyshot } from '../utils/crawler';
import { getCurrentExchangeRate, convertKrwToUsd } from '../utils/priceCollector';
import { supabase } from '../lib/supabase';
import type { CrawledWhiskeyData } from '../types/index';
// 아이콘을 이모지로 대체

const WhiskeyForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  
  const { whiskeys, addWhiskey, updateWhiskey } = useWhiskeyStore();
  const { setHeaderControls } = useHeaderControls();
  
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
    ref_url: '',
    aroma: '',
    taste: '',
    finish: '',
    country: '',
    review_rate: undefined,
    review_count: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [crawlMessage, setCrawlMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  useEffect(() => {
    if (isEdit && whiskeys.length > 0) {
      const whiskey = whiskeys.find(w => w.id === id);
      if (whiskey) {
        setFormData({
          name: whiskey.name,
          brand: whiskey.brand || '',
          type: whiskey.type || '',
          age: whiskey.age || undefined,
          bottle_volume: whiskey.bottle_volume || undefined,
          abv: whiskey.abv || undefined,
          region: whiskey.region || '',
          price: whiskey.price || undefined,
          distillery: whiskey.distillery || '',
          description: whiskey.description || '',
          cask: whiskey.cask || '',
          image_url: whiskey.image_url || '',
          ref_url: whiskey.ref_url || '',
          aroma: whiskey.aroma || '',
          taste: whiskey.taste || '',
          finish: whiskey.finish || '',
          country: whiskey.country || '',
          review_rate: whiskey.review_rate || undefined,
          review_count: whiskey.review_count || undefined,
        });
      }
    }
  }, [isEdit, id, whiskeys]);

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => navigate('/whiskeys')}
            variant="secondary" 
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopCardList.png" 
              alt="목록으로" 
              style={{ width: '16px', height: '16px' }}
            />
            목록으로
          </Button>
          <Button 
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                const event = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(event);
              }
            }}
            variant="primary" 
            size="sm"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopFilter.png" 
              alt="저장" 
              style={{ width: '16px', height: '16px' }}
            />
            {loading ? '저장 중...' : '저장'}
          </Button>
        </div>
      )
    });
  }, [loading, setHeaderControls]);

  // 중복 검증 로직
  const checkDuplicateWhiskey = (): IWhiskey | null => {
    if (!formData.name.trim()) {
      return null;
    }

    const duplicate = whiskeys.find(w => {
      // 수정 중인 항목은 제외
      if (w.id === id) {
        return false;
      }

      // 이름 비교
      const nameMatches = w.name.toLowerCase().trim() === formData.name.toLowerCase().trim();
      
      // 숙성년수 비교 (둘 다 있는 경우에만)
      const ageMatches = (!formData.age && !w.age) || 
                         (formData.age && w.age && formData.age === w.age);
      
      // 용량 비교 (둘 다 있는 경우에만)
      const volumeMatches = (!formData.bottle_volume && !w.bottle_volume) || 
                           (formData.bottle_volume && w.bottle_volume && 
                            formData.bottle_volume === w.bottle_volume);

      return nameMatches && ageMatches && volumeMatches;
    });

    return duplicate || null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '위스키 이름은 필수입니다';
    }

    if (formData.age && typeof formData.age === 'number' && (formData.age < 0 || formData.age > 100)) {
      newErrors.age = '숙성년수는 0-100 사이여야 합니다';
    }

    if (formData.abv && typeof formData.abv === 'number' && (formData.abv < 0 || formData.abv > 100)) {
      newErrors.abv = '도수는 0-100 사이여야 합니다';
    }

    if (formData.price && typeof formData.price === 'number' && formData.price < 0) {
      newErrors.price = '가격은 0 이상이어야 합니다';
    }

    if (formData.bottle_volume && typeof formData.bottle_volume === 'number' && formData.bottle_volume < 0) {
      newErrors.bottle_volume = '용량은 0 이상이어야 합니다';
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
        brand: formData.brand?.trim() || undefined,
        type: formData.type?.trim() || undefined,
        region: formData.region?.trim() || undefined,
        distillery: formData.distillery?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        cask: formData.cask?.trim() || undefined,
        image_url: formData.image_url?.trim() || undefined,
        ref_url: formData.ref_url?.trim() || undefined,
        aroma: formData.aroma?.trim() || undefined,
        taste: formData.taste?.trim() || undefined,
        finish: formData.finish?.trim() || undefined,
        country: formData.country?.trim() || undefined,
      };

      // 중복 체크 및 업데이트/신규 처리
      if (!isEdit) {
        const duplicate = checkDuplicateWhiskey();
        if (duplicate) {
          const shouldUpdate = window.confirm(
            `"${duplicate.name}" 위스키가 이미 존재합니다.\n기존 정보를 업데이트하시겠습니까?`
          );
          
          if (shouldUpdate) {
            // 기존 위스키 업데이트
            await updateWhiskey(duplicate.id, submitData);
            alert('기존 위스키 정보가 업데이트되었습니다.');
            navigate('/whiskeys');
            return;
          } else {
            // 사용자가 취소하면 계속 진행 (새로 생성)
          }
        }
      }

      let savedWhiskeyId: string | null = null;
      
      if (isEdit) {
        await updateWhiskey(id!, submitData);
        savedWhiskeyId = id!;
        alert('위스키 정보가 수정되었습니다.');
      } else {
        const addedWhiskey = await addWhiskey(submitData);
        if (addedWhiskey) {
          savedWhiskeyId = addedWhiskey.id;
        }
        alert('새 위스키가 추가되었습니다.');
      }

      // 가격 정보가 있고 출처 URL이 데일리샷인 경우 whiskey_prices 테이블에 저장
      if (savedWhiskeyId && formData.price && formData.price > 0 && formData.ref_url?.includes('dailyshot.co')) {
        try {
          const exchangeRate = await getCurrentExchangeRate();
          const priceUsd = convertKrwToUsd(formData.price, exchangeRate);

          await supabase
            .from('whiskey_prices')
            .insert({
              whiskey_id: savedWhiskeyId,
              price: formData.price,
              price_usd: priceUsd,
              exchange_rate: exchangeRate,
              price_date: new Date().toISOString().split('T')[0],
              source: '데일리샷',
              source_url: formData.ref_url,
              currency: 'KRW'
            });
        } catch (error) {
          console.error('가격 이력 저장 오류:', error);
        }
      }

      navigate('/whiskeys');
    } catch (error) {
      console.error('Error saving whiskey:', error);
      alert(`저장에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof IWhiskeyFormData, value: string | number | undefined) => {
    // 국가가 변경되면 지역 초기화
    if (field === 'country') {
      setFormData(prev => ({ ...prev, [field]: value, region: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // 중복 검증 (이름, 숙성년수, 용량 변경 시)
    if (field === 'name' || field === 'age' || field === 'bottle_volume') {
      const duplicate = checkDuplicateWhiskey();
      if (duplicate) {
        setDuplicateWarning(`⚠️ "${duplicate.name}" 위스키가 이미 등록되어 있습니다.`);
      } else {
        setDuplicateWarning('');
      }
    }
  };

  const handleCrawlSuccess = (data: CrawledWhiskeyData) => {
    // 기존 위스키가 있는지 확인 (이름으로 검색)
    const existingWhiskey = whiskeys.find(w => 
      w.name.toLowerCase().includes(data.koreanName.toLowerCase()) ||
      w.name.toLowerCase().includes(data.englishName.toLowerCase()) ||
      (w.english_name && w.english_name.toLowerCase().includes(data.englishName.toLowerCase()))
    );

    if (existingWhiskey) {
      // 기존 위스키 업데이트
      const confirmUpdate = window.confirm(
        `"${existingWhiskey.name}" 위스키가 이미 존재합니다. 기존 정보를 업데이트하시겠습니까?`
      );
      
      if (confirmUpdate) {
        setFormData(prev => ({
          ...prev,
          name: data.koreanName || data.englishName,
          brand: data.englishName,
          type: data.type,
          bottle_volume: data.volume,
          abv: data.abv,
          region: data.region,
          price: data.price,
          distillery: data.country,
          description: data.description,
          cask: data.cask,
          image_url: data.imageUrl,
          ref_url: data.refUrl,
          aroma: data.aroma,
          taste: data.taste,
          finish: data.finish,
          country: data.country,
          review_rate: data.reviewRate || undefined,
          review_count: data.reviewCount || undefined,
        }));
        setCrawlMessage('✅ 기존 위스키 정보를 업데이트했습니다!');
        setTimeout(() => setCrawlMessage(''), 3000);
        return;
      }
    }

    // 새 위스키 추가
    setFormData(prev => ({
      ...prev,
      name: data.koreanName || data.englishName,
      brand: data.englishName,
      type: data.type,
      bottle_volume: data.volume,
      abv: data.abv,
      region: data.region,
      price: data.price,
      distillery: data.country,
      description: data.description,
      cask: data.cask,
      image_url: data.imageUrl,
      ref_url: data.refUrl,
      aroma: data.aroma,
      taste: data.taste,
      finish: data.finish,
      country: data.country,
      review_rate: data.reviewRate || undefined,
      review_count: data.reviewCount || undefined,
    }));
    setCrawlMessage('✅ 크롤링이 완료되었습니다!');
    setTimeout(() => setCrawlMessage(''), 3000);
  };

  const handleCrawlError = (error: string) => {
    setCrawlMessage(`❌ ${error}`);
    setTimeout(() => setCrawlMessage(''), 5000);
  };

  const whiskeyTypes = [
    'Single Malt',
    'Blended Malt',
    'Blended',
    'Single Grain',
    'Blended Grain',
    'Bourbon',
    'Rye',
    'Tennessee',
    'Irish',
    'Japanese',
    'Canadian',
    'Cognac',
    'Armagnac',
    'Calvados',
    'Brandy',
    'Rum',
    'Vodka',
    'Gin',
    'Tequila',
    'Liqueur',
    '기타'
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
    'Scotland',
    'Ireland',
    'United States',
    'Japan',
    'Canada',
    'France',
    'Mexico',
    'Jamaica',
    'Barbados',
    'Cuba',
    'Dominican Republic',
    'India',
    'Taiwan',
    'South Korea',
    'Australia',
    'New Zealand',
    'South Africa',
    '기타'
  ];

  // 선택된 국가에 따른 지역 목록 필터링
  const availableRegions = formData.country 
    ? (regionsByCountry[formData.country] || ['기타'])
    : [];

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '24px',
      width: '100%',
      boxSizing: 'border-box',
      minHeight: '100vh'
    }}>
      {/* 헤더 컨트롤을 Layout으로 이동 - 여기서는 페이지 컨텐츠만 렌더링 */}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 크롤링 폼 */}
        {!isEdit && (
          <>
            <CrawlingForm 
              onCrawlSuccess={handleCrawlSuccess}
              onCrawlError={handleCrawlError}
            />
            {crawlMessage && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: crawlMessage.includes('✅') ? '#D1FAE5' : '#FEE2E2',
                color: crawlMessage.includes('✅') ? '#065F46' : '#991B1B',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                {crawlMessage}
              </div>
            )}
          </>
        )}
        
        {/* 중복 경고 메시지 */}
        {duplicateWarning && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{duplicateWarning}</span>
          </div>
        )}
        
        {/* 기본 정보 */}
        <Card style={{ padding: '24px', width: '100%' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            기본 정보
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                위스키 이름 *
              </label>
              <Input
                type="text"
                placeholder="예: Macallan 18"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                style={errors.name ? { borderColor: '#DC2626' } : {}}
              />
              {errors.name && (
                <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                타입
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: '#FFFFFF',
                  height: '44px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">타입 선택</option>
                {whiskeyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                국가
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: '#FFFFFF',
                  height: '44px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">국가 선택</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                지역
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                disabled={!formData.country}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: formData.country ? '#FFFFFF' : '#F3F4F6',
                  height: '44px',
                  boxSizing: 'border-box',
                  cursor: formData.country ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">지역 선택</option>
                {availableRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                숙성년수
              </label>
              <Input
                type="number"
                placeholder="예: 18"
                value={formData.age?.toString() || ''}
                onChange={(value) => handleInputChange('age', value ? parseInt(value) : undefined)}
                className={errors.age ? 'border-red-500' : ''}
              />
              {errors.age && (
                <p className="text-red-500 text-sm mt-1">{errors.age}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                도수 (%)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="예: 43.0"
                value={formData.abv?.toString() || ''}
                onChange={(value) => handleInputChange('abv', value ? parseFloat(value) : undefined)}
                className={errors.abv ? 'border-red-500' : ''}
              />
              {errors.abv && (
                <p className="text-red-500 text-sm mt-1">{errors.abv}</p>
              )}
            </div>
          </div>
        </Card>

        {/* 테이스팅 노트 정보 */}
        <Card style={{ padding: '24px', width: '100%' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            테이스팅 노트
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                향 (Aroma)
              </label>
              <textarea
                placeholder="향에 대한 설명을 입력하세요..."
                value={formData.aroma || ''}
                onChange={(e) => handleInputChange('aroma', e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                맛 (Taste)
              </label>
              <textarea
                placeholder="맛에 대한 설명을 입력하세요..."
                value={formData.taste || ''}
                onChange={(e) => handleInputChange('taste', e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                여운 (Finish)
              </label>
              <textarea
                placeholder="여운에 대한 설명을 입력하세요..."
                value={formData.finish || ''}
                onChange={(e) => handleInputChange('finish', e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
        </Card>

        {/* 상세 정보 */}
        <Card style={{ padding: '24px', width: '100%' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            상세 정보
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                용량 (ml)
              </label>
              <Input
                type="number"
                placeholder="예: 700"
                value={formData.bottle_volume?.toString() || ''}
                onChange={(value) => handleInputChange('bottle_volume', value ? parseInt(value) : undefined)}
                className={errors.bottle_volume ? 'border-red-500' : ''}
              />
              {errors.bottle_volume && (
                <p className="text-red-500 text-sm mt-1">{errors.bottle_volume}</p>
              )}
            </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    시중 가격 (원)
                  </label>
                  <Input
                    type="number"
                    placeholder="예: 500000"
                    value={formData.price?.toString() || ''}
                    onChange={(value) => handleInputChange('price', value ? parseInt(value) : undefined)}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    평점 (0.0-5.0)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="예: 4.5"
                    value={formData.review_rate?.toString() || ''}
                    onChange={(value) => handleInputChange('review_rate', value ? parseFloat(value) : undefined)}
                    className={errors.review_rate ? 'border-red-500' : ''}
                  />
                  {errors.review_rate && (
                    <p className="text-red-500 text-sm mt-1">{errors.review_rate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    리뷰 개수
                  </label>
                  <Input
                    type="number"
                    placeholder="예: 150"
                    value={formData.review_count?.toString() || ''}
                    onChange={(value) => handleInputChange('review_count', value ? parseInt(value) : undefined)}
                    className={errors.review_count ? 'border-red-500' : ''}
                  />
                  {errors.review_count && (
                    <p className="text-red-500 text-sm mt-1">{errors.review_count}</p>
                  )}
                </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명
            </label>
            <RichTextEditor
              content={formData.description || ''}
              onChange={(content) => handleInputChange('description', content)}
              placeholder="위스키에 대한 설명을 입력하세요..."
              style={{
                width: '100%',
                border: '1px solid #D1D5DB',
                borderRadius: '8px'
              }}
            />
          </div>
        </Card>

        {/* 이미지 및 참고 링크 */}
        <Card style={{ padding: '24px', width: '100%' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            이미지 및 참고 링크
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                이미지 URL
              </label>
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.image_url}
                onChange={(value) => handleInputChange('image_url', value)}
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="미리보기"
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                참고 URL (크롤링 주소)
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="url"
                    placeholder="https://dailyshot.co.kr/whiskey/..."
                    value={formData.ref_url}
                    onChange={(value) => handleInputChange('ref_url', value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (!formData.ref_url?.trim()) {
                      setCrawlMessage('❌ URL을 입력해주세요.');
                      setTimeout(() => setCrawlMessage(''), 3000);
                      return;
                    }

                    if (!formData.ref_url.includes('dailyshot.co')) {
                      setCrawlMessage('❌ 데일리샷 사이트의 URL만 지원됩니다.');
                      setTimeout(() => setCrawlMessage(''), 3000);
                      return;
                    }

                    try {
                      const crawledData = await crawlDailyshot(formData.ref_url || '');
                      
                      if (crawledData) {
                        setFormData(prev => ({
                          ...prev,
                          name: crawledData.koreanName || crawledData.englishName || prev.name,
                          brand: crawledData.englishName || prev.brand,
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
                        }));
                        setCrawlMessage('✅ 크롤링이 완료되었습니다!');
                        setTimeout(() => setCrawlMessage(''), 3000);
                      } else {
                        setCrawlMessage('❌ 크롤링에 실패했습니다.');
                        setTimeout(() => setCrawlMessage(''), 3000);
                      }
                    } catch (error) {
                      console.error('Crawling error:', error);
                      setCrawlMessage('❌ 크롤링 중 오류가 발생했습니다.');
                      setTimeout(() => setCrawlMessage(''), 3000);
                    }
                  }}
                  style={{ 
                    minWidth: '80px',
                    fontSize : '14px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  🔍 크롤링
                </Button>
              </div>
              {crawlMessage && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  fontSize: '14px',
                  backgroundColor: crawlMessage.includes('✅') ? '#D1FAE5' : '#FEE2E2',
                  color: crawlMessage.includes('✅') ? '#065F46' : '#DC2626',
                  border: `1px solid ${crawlMessage.includes('✅') ? '#A7F3D0' : '#FECACA'}`
                }}>
                  {crawlMessage}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 제출 버튼 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '16px', 
          marginTop: '40px', 
          paddingTop: '20px', 
          borderTop: '1px solid #E5E7EB' 
        }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/whiskeys')}
            disabled={loading}
          >
            취소
          </Button>
          &nbsp;
          <Button
            type="submit"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {loading ? (
              <>
                <div style={{ 
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  height: '16px',
                  width: '16px',
                  borderBottom: '2px solid white',
                  marginRight: '8px'
                }}></div>
                저장 중...
              </>
            ) : (
              <>
                💾 {isEdit ? '수정하기' : '추가하기'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WhiskeyForm;

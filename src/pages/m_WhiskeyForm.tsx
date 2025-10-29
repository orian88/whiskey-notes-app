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
    setFormData(prev => ({ ...prev, [field]: value }));
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
          country: crawledData.country || prev.country,
        }));
        setCrawlMessage('✅ 크롤링이 완료되었습니다!');
        setCrawlUrl(''); // 성공 시 URL 초기화
        setTimeout(() => setCrawlMessage(''), 3000);
      } else {
        setCrawlMessage('❌ 크롤링에 실패했습니다.');
        setTimeout(() => setCrawlMessage(''), 3000);
      }
    } catch (error) {
      console.error('Crawling error:', error);
      setCrawlMessage('❌ 크롤링 중 오류가 발생했습니다.');
      setTimeout(() => setCrawlMessage(''), 3000);
    } finally {
      setCrawling(false);
    }
  };

  const whiskeyTypes = [
    'Single Malt', 'Blended Malt', 'Blended', 'Bourbon', 'Rye', 
    'Irish', 'Japanese', 'Cognac', 'Brandy', 'Rum', '기타'
  ];

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
      
      <div style={{ padding: '16px' }}>
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
              }}>
                {crawlMessage}
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
                지역
              </label>
              <Input
                type="text"
                placeholder="예: Speyside"
                value={formData.region}
                onChange={(value) => handleInputChange('region', value)}
              />
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


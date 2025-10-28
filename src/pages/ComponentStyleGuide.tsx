import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import RatingDisplay from '../components/RatingDisplay';
import GlassRatingDisplay from '../components/GlassRatingDisplay';
import Trackbar from '../components/Trackbar';
import RangeTrackbar from '../components/RangeTrackbar';
import PurchaseCard from '../components/PurchaseCard';
import CheckImageButton from '../components/CheckImageButton';
import TastingNoteCard from '../components/TastingNoteCard';

const ComponentStyleGuide: React.FC = React.memo(() => {
  const [inputValue, setInputValue] = useState('');
  const [trackbarValue, setTrackbarValue] = useState(5);
  const [minPrice, setMinPrice] = useState(100000);
  const [maxPrice, setMaxPrice] = useState(500000);

  // 체크 상태 관리
  const [checkedItems, setCheckedItems] = useState({
    nose: false,
    palate: false,
    finish: false
  });

  // 샘플 데이터를 메모이제이션하여 메모리 효율성 향상
  const samplePurchaseData = useMemo(() => [
    {
      id: '1',
      whiskey_name: '글렌피딕 12년',
      whiskey_image_url: '',
      final_price_krw: 150000,
      store_name: '위스키마트',
      purchase_date: '2024-01-15',
      purchase_location: '서울 강남구'
    },
    {
      id: '2',
      whiskey_name: '맥켈란 18년',
      whiskey_image_url: '',
      final_price_krw: 350000,
      store_name: '위스키샵',
      purchase_date: '2024-01-20',
      purchase_location: '서울 서초구'
    }
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: 'none' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            🎨 컴포넌트 스타일 가이드
          </h1>
          <p style={{ color: '#6B7280', fontSize: '16px' }}>
            위스키 노트 앱에서 사용되는 모든 컴포넌트의 일관된 디자인 시스템
          </p>
        </div>
      </div>

      {/* 기본 컴포넌트 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          📦 기본 컴포넌트
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Card 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <Card style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  기본 카드
                </h4>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  표준 패딩과 그림자 효과가 적용된 기본 카드입니다.
                </p>
              </Card>
              <Card style={{ padding: '20px', backgroundColor: '#f8f9fa', border: '2px solid #007bff' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  강조 카드
                </h4>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  특별한 정보나 중요 내용을 강조할 때 사용합니다.
                </p>
              </Card>
            </div>
          </div>

          {/* Button 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Button 컴포넌트
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Button variant="primary" size="sm">Primary Small</Button>
              <Button variant="primary" size="md">Primary Medium</Button>
              <Button variant="primary" size="lg">Primary Large</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="danger" size="md">Danger</Button>
              <Button variant="primary" size="md" disabled>Disabled</Button>
            </div>
          </div>

          {/* Input 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Input 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  기본 입력
                </label>
                <Input
                  type="text"
                  placeholder="텍스트를 입력하세요"
                  value={inputValue}
                  onChange={setInputValue}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  숫자 입력
                </label>
                <Input
                  type="number"
                  placeholder="숫자를 입력하세요"
                  step="0.1"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  비활성화
                </label>
                <Input
                  type="text"
                  placeholder="비활성화된 입력"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 위스키 관련 컴포넌트 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          🥃 위스키 관련 컴포넌트
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* RatingDisplay 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              RatingDisplay 컴포넌트
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Small Size</span>
                <RatingDisplay rating={4.5} reviewCount={23} size="sm" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Medium Size</span>
                <RatingDisplay rating={4.2} reviewCount={156} size="md" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Large Size</span>
                <RatingDisplay rating={4.8} reviewCount={89} size="lg" />
              </div>
            </div>
          </div>

          {/* GlassRatingDisplay 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              GlassRatingDisplay 컴포넌트
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Small Size</span>
                <GlassRatingDisplay rating={3.5} size="sm" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Medium Size</span>
                <GlassRatingDisplay rating={4.0} size="md" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Large Size</span>
                <GlassRatingDisplay rating={4.5} size="lg" />
              </div>
            </div>
          </div>

          {/* Trackbar 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Trackbar 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  기본 트랙바 (값: {trackbarValue})
                </label>
                <Trackbar
                  value={trackbarValue}
                  onChange={setTrackbarValue}
                  min={0}
                  max={10}
                  step={0.5}
                  label="평점"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  향 강도 (0-5)
                </label>
                <Trackbar
                  value={3}
                  onChange={() => {}}
                  min={0}
                  max={5}
                  step={1}
                  label="향 강도"
                />
              </div>
            </div>
          </div>

          {/* RangeTrackbar 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              RangeTrackbar 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  가격 범위 필터
                </label>
                <RangeTrackbar
                  minValue={minPrice}
                  maxValue={maxPrice}
                  onMinChange={setMinPrice}
                  onMaxChange={setMaxPrice}
                  min={0}
                  max={1000000}
                  step={10000}
                  label="가격 범위"
                  formatValue={(value) => new Intl.NumberFormat('ko-KR', {
                    style: 'currency',
                    currency: 'KRW'
                  }).format(value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  평점 범위 필터
                </label>
                <RangeTrackbar
                  minValue={3}
                  maxValue={8}
                  onMinChange={() => {}}
                  onMaxChange={() => {}}
                  min={1}
                  max={10}
                  step={0.5}
                  label="평점 범위"
                  formatValue={(value) => `${value}/10`}
                />
              </div>
            </div>
          </div>

          {/* CheckImageButton 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              CheckImageButton 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <CheckImageButton
                checked={checkedItems.nose}
                onChange={(checked) => setCheckedItems(prev => ({ ...prev, nose: checked }))}
                image="👃"
                label="향"
              />
              <CheckImageButton
                checked={checkedItems.palate}
                onChange={(checked) => setCheckedItems(prev => ({ ...prev, palate: checked }))}
                image="👅"
                label="맛"
              />
              <CheckImageButton
                checked={checkedItems.finish}
                onChange={(checked) => setCheckedItems(prev => ({ ...prev, finish: checked }))}
                image="🌊"
                label="여운"
              />
            </div>
          </div>

          {/* TastingNoteCard 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              TastingNoteCard 컴포넌트
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <TastingNoteCard
                title="향"
                content="바닐라와 오크의 달콤한 향이 느껴집니다. 살짝 스파이시한 느낌도 있습니다."
                color="aroma"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                    <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
                  </svg>
                }
              />
              <TastingNoteCard
                title="맛"
                content="부드럽고 크리미한 질감. 초콜릿과 견과류의 풍미가 조화롭게 어우러집니다."
                color="taste"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D2691E" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                    <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
                  </svg>
                }
              />
              <TastingNoteCard
                title="여운"
                content="긴 여운이 지속되며 피니시에서 살짝 스모키한 느낌이 남습니다."
                color="finish"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0522D" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                    <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
                  </svg>
                }
              />
              <TastingNoteCard
                title="메모"
                content="와이프가 구매해줌 (잔 세트)"
                color="custom"
                customColor="#6B7280"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 폼 컴포넌트 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          📝 폼 컴포넌트
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 간단한 텍스트 에디터 예시 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              텍스트 에디터 (간단한 버전)
            </h3>
            <div style={{ maxWidth: '600px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                기본 텍스트 에디터
              </label>
              <textarea
                placeholder="텍스트를 입력하세요..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Select 컴포넌트 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Select 컴포넌트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  기본 선택
                </label>
                <select
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
                  <option value="">선택하세요</option>
                  <option value="single-malt">싱글몰트</option>
                  <option value="blended">블렌디드</option>
                  <option value="bourbon">버번</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  정렬 기준
                </label>
                <select
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
                  <option value="name">이름순</option>
                  <option value="price">가격순</option>
                  <option value="rating">평점순</option>
                  <option value="created_at">최신순</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 그리드 레이아웃 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          📐 그리드 레이아웃 시스템
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 그리드 컨테이너 예시 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              카드 그리드 컨테이너 (2컬럼)
            </h3>
            <div 
              className="whiskey-grid-container"
              style={{ 
                display: 'grid', 
                gap: '20px', 
                gridTemplateColumns: 'repeat(2, minmax(280px, 320px))',
                padding: '0 20px',
                marginBottom: '20px'
              }}
            >
              {[1, 2].map((i) => (
                <Card key={i} className="whiskey-card" style={{ height: '420px', padding: '20px' }}>
                  <div style={{ width: '100%', height: '180px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '36px' }}>🥃</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                      샘플 위스키 {i}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6B7280' }}>
                      브랜드명 • 12년
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
                      <span>싱글몰트</span>
                      <span>40%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#6B7280' }}>스코틀랜드</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RatingDisplay rating={4.2} reviewCount={23} size="sm" />
                        <span style={{ fontWeight: '600', color: '#8B4513' }}>
                          ₩150,000
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <Button variant="secondary" size="sm">👁️ 보기</Button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" size="sm">✏️</Button>
                      <Button variant="danger" size="sm">🗑️</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic' }}>
              * 그리드 컨테이너는 JavaScript로 동적으로 컬럼 수가 조정됩니다.
            </p>
          </div>

          {/* 구매 기록 카드 예시 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              구매 기록 카드 (호버 시 액션 버튼 표시)
            </h3>
            <div 
              className="purchase-grid-container"
              style={{ 
                display: 'grid', 
                gap: '20px', 
                gridTemplateColumns: 'repeat(2, minmax(280px, 320px))',
                padding: '0 20px',
                marginBottom: '20px'
              }}
            >
              {samplePurchaseData.map((purchase) => (
                <PurchaseCard
                  key={purchase.id}
                  purchase={purchase}
                  onView={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic' }}>
              * 마우스 호버 시 우측 상단에 액션 버튼들이 나타납니다.
            </p>
          </div>
        </div>
      </Card>

      {/* 색상 시스템 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          🎨 색상 시스템
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 기본 색상 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              기본 색상 팔레트
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '100%', height: '60px', backgroundColor: '#111827', borderRadius: '6px' }}></div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Primary Text</span>
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>#111827</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '100%', height: '60px', backgroundColor: '#6B7280', borderRadius: '6px' }}></div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Secondary Text</span>
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>#6B7280</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '100%', height: '60px', backgroundColor: '#92400e', borderRadius: '6px' }}></div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Primary Button</span>
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>#92400e</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '100%', height: '60px', backgroundColor: '#8B4513', borderRadius: '6px' }}></div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Price Text</span>
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>#8B4513</span>
              </div>
            </div>
          </div>

          {/* 위스키 타입별 색상 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              위스키 타입별 색상
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="whiskey-card-badge type-single-malt">싱글몰트</span>
              <span className="whiskey-card-badge type-blended">블렌디드</span>
              <span className="whiskey-card-badge type-bourbon">버번</span>
              <span className="whiskey-card-badge type-rye">라이</span>
              <span className="whiskey-card-badge type-cognac">꼬냑</span>
              <span className="whiskey-card-badge type-rum">럼</span>
              <span className="whiskey-card-badge type-vodka">보드카</span>
              <span className="whiskey-card-badge type-gin">진</span>
              <span className="whiskey-card-badge type-tequila">데킬라</span>
            </div>
          </div>

          {/* 지역별 색상 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              지역별 색상
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="whiskey-card-badge region-scotland">🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드</span>
              <span className="whiskey-card-badge region-ireland">🇮🇪 아일랜드</span>
              <span className="whiskey-card-badge region-usa">🇺🇸 미국</span>
              <span className="whiskey-card-badge region-japan">🇯🇵 일본</span>
              <span className="whiskey-card-badge region-france">🇫🇷 프랑스</span>
              <span className="whiskey-card-badge region-canada">🇨🇦 캐나다</span>
              <span className="whiskey-card-badge region-australia">🇦🇺 호주</span>
              <span className="whiskey-card-badge region-taiwan">🇹🇼 대만</span>
              <span className="whiskey-card-badge region-korea">🇰🇷 한국</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 타이포그래피 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          📝 타이포그래피
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 className="text-title">제목 텍스트 (text-title)</h1>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 20px, font-weight: 600</p>
          </div>
          <div>
            <h2 className="text-large">큰 텍스트 (text-large)</h2>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 18px, font-weight: 400</p>
          </div>
          <div>
            <p className="text-primary">기본 텍스트 (text-primary)</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 16px, font-weight: 400</p>
          </div>
          <div>
            <p className="text-secondary">보조 텍스트 (text-secondary)</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 14px, font-weight: 400</p>
          </div>
          <div>
            <p className="text-small">작은 텍스트 (text-small)</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 12px, font-weight: 400</p>
          </div>
          <div>
            <p className="text-label">라벨 텍스트 (text-label)</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 14px, font-weight: 500</p>
          </div>
          <div>
            <p className="text-price">가격 텍스트 (text-price)</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>font-size: 16px, font-weight: 600, color: #8B4513</p>
          </div>
        </div>
      </Card>

      {/* 사용 가이드 섹션 */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          📋 사용 가이드
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              컴포넌트 사용 규칙
            </h3>
            <ul style={{ fontSize: '14px', color: '#6B7280', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>모든 컴포넌트는 일관된 패딩과 마진을 사용합니다</li>
              <li>카드 컴포넌트는 최소 16px 패딩을 적용합니다</li>
              <li>버튼은 variant와 size 속성을 명시적으로 지정합니다</li>
              <li>입력 필드는 label과 함께 사용하여 접근성을 보장합니다</li>
              <li>그리드 레이아웃은 JavaScript로 동적 컬럼 수 조정을 지원합니다</li>
            </ul>
          </div>
          
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              스타일 클래스 명명 규칙
            </h3>
            <ul style={{ fontSize: '14px', color: '#6B7280', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li><code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>.whiskey-card</code> - 위스키 카드</li>
              <li><code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>.purchase-card</code> - 구매 기록 카드</li>
              <li><code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>.tasting-note-card</code> - 테이스팅 노트 카드</li>
              <li><code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>.collection-card</code> - 컬렉션 카드</li>
              <li><code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '3px' }}>.whiskey-grid-container</code> - 그리드 컨테이너</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
});

ComponentStyleGuide.displayName = 'ComponentStyleGuide';

export default ComponentStyleGuide;

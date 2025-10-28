import React, { useState, useCallback, useMemo } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { crawlDailyshot } from '../utils/crawler';
import type { CrawledWhiskeyData } from '../types/index';

interface CrawlingFormProps {
  onCrawlSuccess: (data: CrawledWhiskeyData) => void;
  onCrawlError: (error: string) => void;
}

const CrawlingForm: React.FC<CrawlingFormProps> = ({ onCrawlSuccess, onCrawlError }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [enableDebug, setEnableDebug] = useState(false);

  // 크롤링 핸들러 최적화
  const handleCrawl = useCallback(async () => {
    if (!url.trim()) {
      onCrawlError('URL을 입력해주세요.');
      return;
    }

    if (!url.includes('dailyshot.co')) {
      onCrawlError('데일리샷 사이트의 URL만 지원됩니다.');
      return;
    }

    setIsLoading(true);
    try {
      const crawledData = await crawlDailyshot(url);
      if (crawledData) {
        // 디버깅 데이터 저장 (체크박스가 체크된 경우에만)
        if (enableDebug && crawledData.debugInfo) {
          setDebugData(crawledData.debugInfo);
          setShowDebug(true);
        }
        onCrawlSuccess(crawledData);
        setUrl(''); // 성공 시 URL 초기화
      } else {
        onCrawlError('크롤링에 실패했습니다. URL을 확인해주세요.');
      }
    } catch (error) {
      onCrawlError('크롤링 중 오류가 발생했습니다.');
      console.error('Crawling error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [url, enableDebug, onCrawlSuccess, onCrawlError]);

  // 이벤트 핸들러들 최적화
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
  }, []);

  const handleDebugToggle = useCallback((checked: boolean) => {
    setEnableDebug(checked);
  }, []);

  const handleShowDebugToggle = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  // 스타일 객체들 메모이제이션
  const cardStyle = useMemo(() => ({
    padding: '20px',
    marginBottom: '20px'
  }), []);

  const titleStyle = useMemo(() => ({
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827'
  }), []);

  const descriptionStyle = useMemo(() => ({
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '16px'
  }), []);

  const inputContainerStyle = useMemo(() => ({
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  }), []);

  const buttonStyle = useMemo(() => ({
    minWidth: '120px'
  }), []);

  const checkboxContainerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  }), []);

  const checkboxStyle = useMemo(() => ({
    width: '16px',
    height: '16px'
  }), []);

  const labelStyle = useMemo(() => ({
    fontSize: '14px',
    color: '#6B7280',
    cursor: 'pointer'
  }), []);

  const exampleStyle = useMemo(() => ({
    fontSize: '12px',
    color: '#9CA3AF'
  }), []);

  const debugToggleStyle = useMemo(() => ({
    marginTop: '16px'
  }), []);

  const debugButtonStyle = useMemo(() => ({
    fontSize: '12px',
    padding: '6px 12px'
  }), []);

  const debugContainerStyle = useMemo(() => ({
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  }), []);

  const debugTitleStyle = useMemo(() => ({
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#111827'
  }), []);

  const debugSectionStyle = useMemo(() => ({
    marginBottom: '16px'
  }), []);

  const debugSectionTitleStyle = useMemo(() => ({
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151'
  }), []);

  const textareaStyle = useMemo(() => ({
    width: '100%',
    minHeight: '120px',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'monospace',
    backgroundColor: '#FFFFFF',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const
  }), []);

  const largeTextareaStyle = useMemo(() => ({
    ...textareaStyle,
    minHeight: '200px'
  }), [textareaStyle]);

  const debugInfoStyle = useMemo(() => ({
    marginTop: '12px',
    fontSize: '11px',
    color: '#6B7280'
  }), []);

  return (
    <Card style={cardStyle}>
      <h3 style={titleStyle}>
        🔍 위스키 정보 크롤링
      </h3>
      <p style={descriptionStyle}>
        데일리샷 사이트의 위스키 URL을 입력하면 자동으로 정보를 가져옵니다.
      </p>
      
      <div style={inputContainerStyle}>
        <Input
          type="url"
          placeholder="https://dailyshot.co/m/item/2329?item=179128"
          value={url}
          onChange={handleUrlChange}
          style={{ flex: 1 }}
        />
        <Button
          onClick={handleCrawl}
          disabled={isLoading}
          style={buttonStyle}
        >
          {isLoading ? '🔄 크롤링 중...' : '🚀 크롤링'}
        </Button>
      </div>
      
      {/* 디버깅 체크박스 */}
      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="debug-checkbox"
          checked={enableDebug}
          onChange={(e) => handleDebugToggle(e.target.checked)}
          style={checkboxStyle}
        />
        <label htmlFor="debug-checkbox" style={labelStyle}>
          🔍 디버깅 정보 표시 (개발자용)
        </label>
      </div>
      
      <div style={exampleStyle}>
        예시: https://dailyshot.co/m/item/2329?item=179128
      </div>

      {/* 디버깅 정보 토글 버튼 */}
      {debugData && (
        <div style={debugToggleStyle}>
          <Button
            variant="secondary"
            onClick={handleShowDebugToggle}
            style={debugButtonStyle}
          >
            {showDebug ? '🔽 디버깅 정보 숨기기' : '🔼 디버깅 정보 보기'}
          </Button>
        </div>
      )}

      {/* 디버깅 정보 표시 */}
      {showDebug && debugData && (
        <div style={debugContainerStyle}>
          <h4 style={debugTitleStyle}>
            🔍 크롤링 데이터 구조 분석
          </h4>
          
          {/* Information 데이터 */}
          <div style={debugSectionStyle}>
            <h5 style={debugSectionTitleStyle}>
              📋 Information 배열:
            </h5>
            <textarea
              value={JSON.stringify(debugData.rawInformation, null, 2)}
              readOnly
              style={textareaStyle}
            />
          </div>

          {/* Tasting Notes 데이터 */}
          <div style={debugSectionStyle}>
            <h5 style={debugSectionTitleStyle}>
              🍷 Tasting Notes 배열:
            </h5>
            <textarea
              value={JSON.stringify(debugData.rawTastingNotes, null, 2)}
              readOnly
              style={textareaStyle}
            />
          </div>

          {/* 전체 JSON 데이터 */}
          <div>
            <h5 style={debugSectionTitleStyle}>
              📄 전체 JSON 데이터:
            </h5>
            <textarea
              value={JSON.stringify(debugData.rawJsonData, null, 2)}
              readOnly
              style={largeTextareaStyle}
            />
          </div>

          <div style={debugInfoStyle}>
            💡 이 데이터를 분석하여 크롤링 규칙을 개선할 수 있습니다.
          </div>
        </div>
      )}
    </Card>
  );
};

export default React.memo(CrawlingForm);

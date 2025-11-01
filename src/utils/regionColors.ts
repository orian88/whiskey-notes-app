/**
 * 지역별 색상 유틸리티 함수
 * 위스키 목록, 상세보기 등에서 지역명에 따른 색상을 반환합니다.
 */

export interface RegionColor {
  backgroundColor: string;
  color: string;
  borderColor: string;
}

/**
 * 지역명에 따른 색상 스타일 반환
 * @param region - 지역명 (대소문자 무관)
 * @returns 색상 객체 (backgroundColor, color, borderColor)
 */
export function getRegionColor(region?: string): RegionColor {
  const base = {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '9999px',
    border: '1px solid',
  } as React.CSSProperties;

  const normalizedRegion = (region || '').toLowerCase().trim();

  switch (normalizedRegion) {
    // 스코틀랜드 지역
    case 'highland':
    case '하이랜드':
      return {
        ...base,
        backgroundColor: '#EEF2FF',
        color: '#4338CA',
        borderColor: '#E0E7FF',
      };

    case 'speyside':
    case '스페이사이드':
      return {
        ...base,
        backgroundColor: '#ECFEFF',
        color: '#0891B2',
        borderColor: '#CFFAFE',
      };

    case 'islay':
    case '아일라':
      return {
        ...base,
        backgroundColor: '#F5F3FF',
        color: '#6D28D9',
        borderColor: '#DDD6FE',
      };

    case 'lowland':
    case '로우랜드':
      return {
        ...base,
        backgroundColor: '#F0FDFA',
        color: '#0F766E',
        borderColor: '#CCFBF1',
      };

    case 'campbeltown':
    case '캠벨타운':
      return {
        ...base,
        backgroundColor: '#FFF1F2',
        color: '#BE123C',
        borderColor: '#FFE4E6',
      };

    case 'islands':
    case '아일랜즈':
      return {
        ...base,
        backgroundColor: '#F0F9FF',
        color: '#0C4A6E',
        borderColor: '#BAE6FD',
      };

    case 'skye':
    case 'skye island':
    case '스카이섬':
      return {
        ...base,
        backgroundColor: '#F0F9FF',
        color: '#0C4A6E',
        borderColor: '#BAE6FD',
      };

    case 'arran':
    case 'arran island':
    case '아란섬':
      return {
        ...base,
        backgroundColor: '#F0F9FF',
        color: '#0C4A6E',
        borderColor: '#BAE6FD',
      };

    // 아일랜드
    case 'ireland':
    case '아일랜드':
      return {
        ...base,
        backgroundColor: '#ECFDF5',
        color: '#047857',
        borderColor: '#A7F3D0',
      };

    // 일본
    case 'japan':
    case '일본':
      return {
        ...base,
        backgroundColor: '#FFF7F7',
        color: '#B91C1C',
        borderColor: '#FECACA',
      };

    // 미국 지역
    case 'usa':
    case 'united states':
    case 'america':
    case '미국':
    case 'kentucky':
    case '켄터키':
    case 'tennessee':
    case '테네시':
      return {
        ...base,
        backgroundColor: '#EFF6FF',
        color: '#1D4ED8',
        borderColor: '#BFDBFE',
      };

    // 캐나다
    case 'canada':
    case '캐나다':
      return {
        ...base,
        backgroundColor: '#E0F2FE',
        color: '#0369A1',
        borderColor: '#BAE6FD',
      };

    // 프랑스
    case 'france':
    case '프랑스':
      return {
        ...base,
        backgroundColor: '#FDF2F8',
        color: '#BE185D',
        borderColor: '#FBCFE8',
      };

    // 스코틀랜드 (전체)
    case 'scotland':
    case '스코틀랜드':
      return {
        ...base,
        backgroundColor: '#EEF2FF',
        color: '#4338CA',
        borderColor: '#E0E7FF',
      };

    // 기본값
    default:
      return {
        ...base,
        backgroundColor: '#F3F4F6',
        color: '#374151',
        borderColor: '#E5E7EB',
      };
  }
}

/**
 * 지역명 정규화 함수
 * @param input - 지역명
 * @returns 정규화된 지역명 (lowercase)
 */
export function normalizeRegion(input?: string): string | undefined {
  if (!input) return undefined;
  
  const normalized = input.toLowerCase().trim();
  
  // 동의어 처리
  const synonyms: Record<string, string> = {
    'highland': 'highland',
    '하이랜드': 'highland',
    'speyside': 'speyside',
    '스페이사이드': 'speyside',
    'islay': 'islay',
    '아일라': 'islay',
    'lowland': 'lowland',
    '로우랜드': 'lowland',
    'campbeltown': 'campbeltown',
    '캠벨타운': 'campbeltown',
    'islands': 'islands',
    '아일랜즈': 'islands',
    'skye': 'skye',
    'skye island': 'skye',
    '스카이섬': 'skye',
    'arran': 'arran',
    'arran island': 'arran',
    '아란섬': 'arran',
    'japan': 'japan',
    '일본': 'japan',
    'ireland': 'ireland',
    '아일랜드': 'ireland',
    'usa': 'usa',
    'united states': 'usa',
    'america': 'usa',
    '미국': 'usa',
    'kentucky': 'usa',
    '켄터키': 'usa',
    'tennessee': 'usa',
    '테네시': 'usa',
    'canada': 'canada',
    '캐나다': 'canada',
    'scotland': 'scotland',
    '스코틀랜드': 'scotland',
    'france': 'france',
    '프랑스': 'france',
  };

  return synonyms[normalized] || normalized;
}

/**
 * 지역 표시 레이블 (한글/영어) 반환
 */
export const REGION_LABELS: Record<string, { en: string; ko: string }> = {
  highland: { en: 'Highland', ko: '하이랜드' },
  speyside: { en: 'Speyside', ko: '스페이사이드' },
  islay: { en: 'Islay', ko: '아일라' },
  lowland: { en: 'Lowland', ko: '로우랜드' },
  campbeltown: { en: 'Campbeltown', ko: '캠벨타운' },
  islands: { en: 'Islands', ko: '아일랜즈' },
  skye: { en: 'Skye Island', ko: '스카이섬' },
  arran: { en: 'Arran Island', ko: '아란섬' },
  japan: { en: 'Japan', ko: '일본' },
  ireland: { en: 'Ireland', ko: '아일랜드' },
  usa: { en: 'USA', ko: '미국' },
  canada: { en: 'Canada', ko: '캐나다' },
  scotland: { en: 'Scotland', ko: '스코틀랜드' },
  france: { en: 'France', ko: '프랑스' },
};

/**
 * 지역명의 한글/영어 표시 문자열 반환
 * @param input - 지역명
 * @returns "한글 / English" 형식의 문자열
 */
export function getRegionDisplay(input?: string): string {
  if (!input) return '-';
  
  const normalized = normalizeRegion(input);
  if (!normalized) return input;
  
  const label = REGION_LABELS[normalized];
  if (!label) return input;
  
  return `${label.ko} / ${label.en}`;
}


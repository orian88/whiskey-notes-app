import axios from 'axios';
import { supabase } from '../lib/supabase';

export interface PriceInfo {
  price: number;
  priceUsd?: number;
  exchangeRate?: number;
  currency: string;
  source: string;
  sourceUrl: string;
  date: string;
}

/**
 * 현재 USD/KRW 환율 조회
 * 한국은행 API 또는 외부 환율 서비스 사용
 */
export async function getCurrentExchangeRate(): Promise<number> {
  try {
    // 방법 1: ExchangeRate-API 사용 (무료, 1,500 requests/month)
    const apiKey = import.meta.env.VITE_EXCHANGE_API_KEY || '';
    
    if (apiKey) {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      const data = await response.json();
      
      if (data.result === 'success' && data.conversion_rates?.KRW) {
        return data.conversion_rates.KRW; // 1 USD = ? KRW
      }
    }
    
    // 방법 2: 한국은행 API (무료, 제한 없음)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const bankResponse = await fetch(
      `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${import.meta.env.VITE_KOREAEXIM_API_KEY || ''}&searchdate=${dateStr}&data=AP01`
    );
    
    if (bankResponse.ok) {
      const data = await bankResponse.json();
      const usdData = data.find((item: any) => item.cur_unit === 'USD');
      if (usdData && usdData.bkpr) {
        return parseFloat(usdData.bkpr.toString().replace(',', ''));
      }
    }
    
    // 기본값: 약 1,300원 (가장 일반적인 환율)
    return 1300;
  } catch (error) {
    console.error('환율 조회 실패:', error);
    // 기본값 반환
    return 1300;
  }
}

/**
 * 원화를 USD로 변환
 */
export function convertKrwToUsd(krwAmount: number, exchangeRate: number): number {
  return Math.round((krwAmount / exchangeRate) * 100) / 100; // 소수점 2자리
}

/**
 * USD를 원화로 변환
 */
export function convertUsdToKrw(usdAmount: number, exchangeRate: number): number {
  return Math.round(usdAmount * exchangeRate);
}

/**
 * 위스키명으로 가격을 검색하는 함수들
 */

/**
 * 덕덕고를 이용한 위스키 가격 검색 (간단한 웹 검색)
 */
export async function searchWhiskeyPriceDuckDuckGo(whiskeyName: string): Promise<PriceInfo | null> {
  try {
    const searchQuery = `${whiskeyName} 위스키 가격`;
    // DuckDuckGo는 크롤링이 제한적이므로 쿠팡, G마켓 등으로 대체
    return null;
  } catch (error) {
    console.error('DuckDuckGo 검색 실패:', error);
    return null;
  }
}

/**
 * 쿠팡 검색 (가격 정보 포함)
 */
export async function searchWhiskeyPriceCoupang(whiskeyName: string): Promise<PriceInfo | null> {
  try {
    const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(whiskeyName + ' 위스키')}`;
    
    // 쿠팡은 CORS 제한이 있으므로 서버 측 크롤링이 필요
    // 여기서는 기본 URL만 반환
    return null;
  } catch (error) {
    console.error('쿠팡 검색 실패:', error);
    return null;
  }
}

/**
 * G마켓 검색
 */
export async function searchWhiskeyPriceGmarket(whiskeyName: string): Promise<PriceInfo | null> {
  try {
    const searchUrl = `http://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(whiskeyName + ' 위스키')}`;
    
    // G마켓도 CORS 제한이 있음
    return null;
  } catch (error) {
    console.error('G마켓 검색 실패:', error);
    return null;
  }
}

/**
 * 가격 비교 사이트 검색 (예: 네이버페이, 다나와)
 */
export async function searchWhiskeyPriceComparison(whiskeyName: string): Promise<PriceInfo | null> {
  try {
    // 여러 가격 비교 사이트에서 정보를 가져옴
    // 실제 구현은 서버 측에서 해야 함
    return null;
  } catch (error) {
    console.error('가격 비교 사이트 검색 실패:', error);
    return null;
  }
}

/**
 * 네이버 쇼핑 API를 통한 가격 검색
 */
export async function searchWhiskeyPriceNaver(whiskeyName: string): Promise<PriceInfo | null> {
  try {
    const searchQuery = `${whiskeyName} 위스키`;
    const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(searchQuery)}`;
    
    // CORS 프록시를 통해 크롤링 시도
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.log('네이버 쇼핑 크롤링 실패 (프록시 사용)');
        return null;
      }

      const data = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'text/html');
      
      // 가격 정보 찾기
      const priceElement = doc.querySelector('[class*="price"]') || doc.querySelector('[data-price]');
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        const priceMatch = priceText.match(/[\d,]+/);
        if (priceMatch) {
          const price = parseInt(priceMatch[0].replace(/,/g, ''));
          
          return {
            price,
            currency: 'KRW',
            source: '네이버 쇼핑',
            sourceUrl: searchUrl,
            date: new Date().toISOString().split('T')[0]
          };
        }
      }
    } catch (proxyError) {
      console.log('프록시 크롤링 실패:', proxyError);
    }
    
    return null;
  } catch (error) {
    console.error('네이버 쇼핑 검색 실패:', error);
    return null;
  }
}

/**
 * 위스키 가격을 수집하는 범용 함수
 * 실제 웹 크롤링은 서버 측에서 수행해야 하므로,
 * 여기서는 검색 URL을 제공하고 사용자가 수동으로 가격을 입력할 수 있도록 함
 */
export async function collectWhiskeyPrice(
  whiskeyId: string,
  whiskeyName: string
): Promise<PriceInfo | null> {
  try {
    // 여러 소스에서 가격을 검색
    const results = await Promise.allSettled([
      searchWhiskeyPriceNaver(whiskeyName),
      searchWhiskeyPriceDuckDuckGo(whiskeyName),
      searchWhiskeyPriceCoupang(whiskeyName),
      searchWhiskeyPriceGmarket(whiskeyName),
    ]);

    // 첫 번째 성공한 결과를 반환
    let priceInfo: PriceInfo | null = null;
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        priceInfo = result.value;
        break;
      }
    }

    // 가격이 수집된 경우 환율 적용
    if (priceInfo && priceInfo.currency === 'KRW') {
      const exchangeRate = await getCurrentExchangeRate();
      priceInfo.exchangeRate = exchangeRate;
      priceInfo.priceUsd = convertKrwToUsd(priceInfo.price, exchangeRate);
    }

    return priceInfo;
  } catch (error) {
    console.error('가격 수집 실패:', error);
    return null;
  }
}

/**
 * 위스키 가격 검색 URL 생성 (사용자에게 가격 정보 제공)
 */
export function getWhiskeyPriceSearchUrls(whiskeyName: string) {
  const searchQuery = `${whiskeyName} 위스키`;
  
  return {
    naver: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(searchQuery)}`,
    coupang: `https://www.coupang.com/np/search?q=${encodeURIComponent(searchQuery)}`,
    gmarket: `http://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(searchQuery)}`,
    elevenst: `https://www.11st.co.kr/browsing/BestSeller.tmall?method=getBestSellerMain&dispCtgrNo=${encodeURIComponent(searchQuery)}`,
    lottemart: `https://www.ehyundai.com/new/main/display?contentUri=http%3A%2F%2Fwww.ehyundai.com%2Fsearch%3Fkeyword%3D${encodeURIComponent(searchQuery)}`,
    wemakeprice: `https://search.wemakeprice.com/search?keyword=${encodeURIComponent(searchQuery)}`,
  };
}

/**
 * 수동 가격 입력을 위한 UI 제공 함수
 */
export async function searchAndProvidePriceInfo(whiskeyName: string): Promise<PriceInfo | null> {
  const urls = getWhiskeyPriceSearchUrls(whiskeyName);
  
  // 사용자에게 검색 URL들을 제공
  const searchUrls = Object.values(urls);
  
  // 기본 가격 정보 생성 (출처 링크 포함)
  const defaultPriceInfo: PriceInfo = {
    price: 0,
    currency: 'KRW',
    source: 'Manual Search Required',
    sourceUrl: urls.naver,
    date: new Date().toISOString().split('T')[0]
  };

  return defaultPriceInfo;
}

/**
 * 가격 정보를 데이터베이스에 저장
 */
export async function savePriceInfo(
  whiskeyId: string,
  priceInfo: PriceInfo
): Promise<boolean> {
  try {
    // 가격 이력 저장
    const { error: historyError } = await supabase
      .from('whiskey_prices')
      .insert({
        whiskey_id: whiskeyId,
        price: priceInfo.price,
        price_usd: priceInfo.priceUsd,
        exchange_rate: priceInfo.exchangeRate,
        price_date: priceInfo.date,
        source: priceInfo.source,
        source_url: priceInfo.sourceUrl,
        currency: priceInfo.currency,
      });

    if (historyError) throw historyError;

    // whiskeys 테이블의 current_price 업데이트
    const { error: updateError } = await supabase
      .from('whiskeys')
      .update({
        current_price: priceInfo.price,
        current_price_usd: priceInfo.priceUsd,
        exchange_rate: priceInfo.exchangeRate,
        last_price_update: new Date().toISOString(),
        price_source: priceInfo.source,
      })
      .eq('id', whiskeyId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('가격 정보 저장 실패:', error);
    return false;
  }
}

/**
 * 위스키 가격 구간 반환 (5만원 미만, 5~10만원 등)
 */
export function getPriceRange(price: number | null | undefined): string {
  if (!price || price === 0) return '미표시';
  
  if (price < 50000) return '5만원 이내';
  if (price < 100000) return '5~10만원';
  if (price < 150000) return '10~15만원';
  if (price < 200000) return '15~20만원';
  if (price < 250000) return '20~25만원';
  if (price < 300000) return '25~30만원';
  if (price < 400000) return '30~40만원';
  if (price < 500000) return '40~50만원';
  if (price < 600000) return '50~60만원';
  if (price < 1000000) return '60~100만원';
  if (price < 2000000) return '100~200만원';
  if (price >= 2000000) return '200만원 이상';
  
  return '기타';
}

/**
 * 가격대별 카드 배경색 반환
 */
export function getPriceCardColor(price: number | null | undefined): string {
  if (!price || price === 0) return '#F9FAFB';
  
  if (price < 50000) return '#D1FAE5'; // 진한 초록색
  if (price < 100000) return '#FEF08A'; // 진한 노란색
  if (price < 150000) return '#FDBA74'; // 진한 오렌지색
  if (price < 200000) return '#FCA5A5'; // 진한 분홍색
  if (price < 250000) return '#FCA8D4'; // 진한 연분홍
  if (price < 300000) return '#DDD6FE'; // 보라색
  if (price < 400000) return '#C4B5FD'; // 진한 보라색
  if (price < 500000) return '#A5B4FC'; // 진한 파란색
  if (price < 600000) return '#93C5FD'; // 진한 하늘색
  if (price < 1000000) return '#60A5FA'; // 더 진한 파란색
  if (price < 2000000) return '#F472B6'; // 진한 핑크색
  return '#C084FC'; // 진한 보라색
  
}

/**
 * 가격대별 카드 테두리색 반환
 */
export function getPriceBorderColor(price: number | null | undefined): string {
  if (!price || price === 0) return '#E5E7EB';
  
  if (price < 50000) return '#10B981'; // 진한 초록
  if (price < 100000) return '#EAB308'; // 진한 노랑
  if (price < 150000) return '#F97316'; // 진한 오렌지
  if (price < 200000) return '#EF4444'; // 진한 빨강
  if (price < 250000) return '#EC4899'; // 진한 핑크
  if (price < 300000) return '#A855F7'; // 진한 보라
  if (price < 400000) return '#9333EA'; // 더 진한 보라
  if (price < 500000) return '#6366F1'; // 진한 파랑
  if (price < 600000) return '#3B82F6'; // 더 진한 파랑
  if (price < 1000000) return '#2563EB'; // 더욱 진한 파랑
  if (price < 2000000) return '#DB2777'; // 진한 핑크
  return '#7E22CE'; // 진한 보라
}

/**
 * 여러 위스키의 가격을 일괄 업데이트
 */
export async function updateWhiskeyPrices(
  whiskeyIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const whiskeyId of whiskeyIds) {
    try {
      // 위스키 정보 조회
      const { data: whiskey, error: fetchError } = await supabase
        .from('whiskeys')
        .select('id, name')
        .eq('id', whiskeyId)
        .single();

      if (fetchError || !whiskey) {
        failed++;
        continue;
      }

      // 가격 수집
      const priceInfo = await collectWhiskeyPrice(whiskeyId, whiskey.name);

      if (priceInfo) {
        // 가격 정보 저장
        const saved = await savePriceInfo(whiskeyId, priceInfo);
        if (saved) {
          success++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`위스키 ${whiskeyId} 가격 업데이트 실패:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 위스키 가격 이력 조회
 */
export async function getPriceHistory(whiskeyId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('whiskey_prices')
    .select('*')
    .eq('whiskey_id', whiskeyId)
    .order('price_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}



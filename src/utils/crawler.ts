import axios from 'axios';
import * as cheerio from 'cheerio';
import type { CrawledWhiskeyData } from '../types/index';

export async function crawlDailyshot(url: string): Promise<CrawledWhiskeyData | null> {
  try {
    // 프록시를 통해 요청 - 새로운 URL 형식(/m/item/) 지원
    const proxyUrl = `/api/crawl${url.replace('https://dailyshot.co', '')}`;
    
    const response = await axios.get(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });

    // 원본 HTML 저장
    const rawHtml = response.data;

    const $ = cheerio.load(response.data);

    // JSON 데이터에서 정보 추출 - 새로운 구조에 맞게 수정
    const jsonData = extractJsonData($);
    
    // 다양한 구조에서 데이터 찾기
    let data = null;
    
    // 구조 1: dehydratedState.queries 배열을 모두 탐색
    if (jsonData.dehydratedState?.queries) {
      for (const query of jsonData.dehydratedState.queries) {
        if (query?.state?.data) {
          // 여러 형태의 데이터 구조 확인
          const queryData = query.state.data;
          if (queryData.item || queryData.product || queryData.data || queryData.name) {
            data = queryData;
            break;
          }
        }
      }
    }
    
    // 구조 2: props.pageProps (다양한 하위 구조 확인)
    if (!data && jsonData.props?.pageProps) {
      const pageProps = jsonData.props.pageProps;
      if (pageProps.item || pageProps.product || pageProps.data || pageProps.name) {
        data = pageProps.item || pageProps.product || pageProps.data || pageProps;
      } else {
        data = pageProps;
      }
    }
    
    // 구조 3: 직접 props
    if (!data && jsonData.props) {
      if (jsonData.props.item || jsonData.props.product || jsonData.props.data || jsonData.props.name) {
        data = jsonData.props.item || jsonData.props.product || jsonData.props.data || jsonData.props;
      }
    }
    
    // 구조 4: item 필드가 직접 있는 경우 (새로운 모바일 페이지 구조)
    if (!data && jsonData.item) {
      data = jsonData.item;
    }
    
    // 구조 5: product 필드
    if (!data && jsonData.product) {
      data = jsonData.product;
    }
    
    // 구조 6: data 필드가 직접 있는 경우
    if (!data && jsonData.data) {
      if (jsonData.data.item || jsonData.data.product || jsonData.data.name) {
        data = jsonData.data.item || jsonData.data.product || jsonData.data;
      } else {
        data = jsonData.data;
      }
    }
    
    // 구조 7: 직접 jsonData (유효한 필드가 있는 경우만)
    if (!data && jsonData && typeof jsonData === 'object') {
      // 기본 필드가 있는 경우만 데이터로 사용
      if (jsonData.name || jsonData.price || jsonData.information || jsonData.item) {
        data = jsonData;
      }
    }
    
    // HTML에서 직접 추출 시도 (JSON 데이터가 있어도 HTML 파싱 보강)
    const htmlData = extractDataFromHTML($);
    
    // HTML에서 추출한 데이터로 보강
    if (htmlData) {
      // 기존 data가 있으면 병합, 없으면 htmlData 사용
      if (data && Object.keys(data).length > 0) {
        // HTML 데이터로 누락된 필드 보강
        if (!data.name && htmlData.name) data.name = htmlData.name;
        if (!data.en_name && htmlData.en_name) data.en_name = htmlData.en_name;
        if (!data.englishName && htmlData.englishName) data.englishName = htmlData.englishName;
        if (!data.price && htmlData.price) data.price = htmlData.price;
        if (!data.information && htmlData.information) data.information = htmlData.information;
        if (!data.tasting_notes && htmlData.tasting_notes) data.tasting_notes = htmlData.tasting_notes;
        if (!data.description && htmlData.description) data.description = htmlData.description;
        if (!data.review_rate && htmlData.review_rate) data.review_rate = htmlData.review_rate;
        if (!data.review_count && htmlData.review_count) data.review_count = htmlData.review_count;
      } else {
        data = htmlData;
      }
    }
    
    if (!data || Object.keys(data).length === 0) {
      console.error('크롤링 실패: 데이터 구조를 찾을 수 없습니다.');
      return null;
    }

    // 기본 정보 추출
    const englishName = data.en_name || data.englishName || data.enName || data.english_name || '';
    const koreanName = data.name || data.koreanName || data.korean_name || data.title || '';
    
    // 가격 추출 및 파싱 (문자열 또는 숫자 모두 처리, 콤마 제거)
    let price = 0;
    if (data.price) {
      if (typeof data.price === 'string') {
        const priceNum = parseInt(data.price.replace(/,/g, '').replace(/원/g, '').trim());
        price = isNaN(priceNum) ? 0 : priceNum;
      } else if (typeof data.price === 'number') {
        price = data.price;
      }
    }
    
    const reviewRate = data.review_rate || data.reviewRate || data.rating || data.score || 0;
    const reviewCount = data.review_count || data.reviewCount || data.reviews || 0;
    
    // Information 배열에서 정보 추출 - 여러 형태 지원
    let information = data.information || [];
    let tastingNotes = data.tasting_notes || data.tastingNotes || [];
    
    // information이 배열이 아닌 객체인 경우 처리
    if (!Array.isArray(information) && typeof information === 'object') {
      information = Object.keys(information).map(key => ({
        label: key,
        label_ko: key,
        value: information[key]
      }));
    }
    
    // tasting_notes가 배열이 아닌 객체인 경우 처리
    if (!Array.isArray(tastingNotes) && typeof tastingNotes === 'object') {
      tastingNotes = Object.keys(tastingNotes).map(key => ({
        label: key,
        label_ko: key,
        value: tastingNotes[key]
      }));
    }
    
    // 1. 브랜드: 영문 이름에서 년수(예:21yo)를 뺀 내용
    let brand = '';
    if (englishName) {
      // 년수 패턴 제거 (예: "12yo", "21yo", "18 Year Old")
      // 더 강력한 패턴: 앞뒤 공백을 포함한 모든 숫자+yo 패턴 제거
      brand = englishName
        .replace(/\s*\d+\s*yo\b/gi, '') // " 21yo", "21yo", " 21 yo" 패턴 제거
        .replace(/\d+\s*yo\b/gi, '') // 숫자 바로 앞에 붙어있는 경우도 제거
        .replace(/\s*\d+\s*Year\s*Old\b/gi, '') // "18 Year Old" 패턴 제거
        .replace(/\s*\d+\s*Y\.O\./gi, '') // "18 Y.O." 패턴 제거
        .replace(/\s{2,}/g, ' ') // 연속된 공백을 하나로
        .trim();
    }
    
    // 2. 타입: 한글로 종류 표시된 내용, 한글:영어 구분값 반영하여 한 가지만
    const typeRaw = findValueByLabel(information, '종류') || data.type || '';
    // 한글:영어 형태인 경우 한글만 추출
    let typeValue = typeRaw;
    if (typeValue.includes(':')) {
      const parts = typeValue.split(':').map((s: string) => s.trim());
      // 한글이 포함된 부분 찾기
      const koreanPart = parts.find((p: string) => /[가-힣]/.test(p));
      typeValue = koreanPart || parts[0];
    }
    const type = mapKoreanToEnglishType(typeValue);
    
    // 3. 숙성년수: 영문 이름에서 년수(21yo)에서 yo를 뺀 값
    let age: number | undefined = undefined;
    if (englishName) {
      const ageMatch = englishName.match(/\b(\d+)\s*yo\b/i);
      if (ageMatch && ageMatch[1]) {
        age = parseInt(ageMatch[1]);
      } else {
        // 다른 패턴 시도 (예: "18 Year Old")
        const ageMatch2 = englishName.match(/\b(\d+)\s*Year/i);
        if (ageMatch2 && ageMatch2[1]) {
          age = parseInt(ageMatch2[1]);
        }
      }
    }
    
    // 4. 도수: 한글로 "도수"로 표시된 값에서 '%'를 제외한 값
    const abvText = findValueByLabel(information, '도수') || data.abv || data.alcohol || '';
    let abv: number | undefined = undefined;
    if (abvText) {
      const abvValue = typeof abvText === 'number' ? abvText : parseFloat(abvText.toString().replace('%', '').trim());
      if (!isNaN(abvValue)) {
        abv = abvValue;
      }
    }
    
    // 5. 지역: 한글로 "지역"으로 표시된 항목 추출
    let regionRaw = findValueByLabel(information, '지역') || data.region || '';
    
    // 6. 국가: 한글로 "국가"로 표시된 항목 (없으면 지역에서 추론)
    let country = findValueByLabel(information, '국가') || data.country || '';
    
    // 지역이 있고 국가가 없으면 지역으로부터 국가 추론
    if (regionRaw && !country) {
      country = mapRegionToCountry(regionRaw);
    }
    
    // 지역을 영어로 변환
    const region = regionRaw ? mapKoreanToEnglishRegion(regionRaw) : '';
    
    // 7. 캐스크: 빈값 반영
    const cask = '';
    
    const volumeText = findValueByLabel(information, '용량') || data.volume || data.bottle_volume || '700ml';
    const volume = typeof volumeText === 'number' ? volumeText : parseInt(volumeText.toString().replace('ml', '').trim()) || 700;

    // 8. Tasting Notes에서 정보 추출 - 향, 맛, 여운
    const aroma = findTastingNoteValue(tastingNotes, 'Aroma', '향') || data.aroma || '';
    const taste = findTastingNoteValue(tastingNotes, 'Taste', '맛') || data.taste || '';
    const finish = findTastingNoteValue(tastingNotes, 'Finish', '여운') || data.finish || '';

    // 9. 설명 추출 - 여러 소스에서 추출 시도
    let description = '';
    // comments 배열에서 추출
    const comments = data.comments || [];
    if (comments.length > 0) {
      description = extractDescriptionFromComments(comments);
    }
    // description 필드가 직접 있는 경우
    if (!description && data.description) {
      description = typeof data.description === 'string' ? data.description : JSON.stringify(data.description);
    }
    // content 또는 contentHtml 필드
    if (!description && (data.content || data.contentHtml)) {
      description = data.content || data.contentHtml;
    }
    
    // 설명에서 이미지 제거 및 공백 정리 (HTML 태그가 포함된 경우)
    if (description && (description.includes('<img') || description.includes('<style') || description.includes('</'))) {
      let cleanedDescription = description;
      // 이미지 태그 제거
      cleanedDescription = cleanedDescription.replace(/<img[^>]*>/gi, '');
      cleanedDescription = cleanedDescription.replace(/<img[^>]*\/>/gi, '');
      // style 태그 제거
      cleanedDescription = cleanedDescription.replace(/<style[^>]*>.*?<\/style>/gi, '');
      // 이미지 제거로 인한 공백 정리
      cleanedDescription = cleanedDescription.replace(/>\s+</g, '><');
      cleanedDescription = cleanedDescription.replace(/\s{2,}/g, ' ');
      // 빈 태그 제거
      cleanedDescription = cleanedDescription.replace(/<p>\s*<\/p>/gi, '');
      cleanedDescription = cleanedDescription.replace(/<div>\s*<\/div>/gi, '');
      description = cleanedDescription.trim();
    }

    // 7. 이미지 URL 추출 - 여러 필드명 시도
    const imageUrl = data.thumbnail_image || data.thumbnailImage || data.image || data.imageUrl || data.image_url || 
                     data.thumbnail || data.mainImage || data.main_image || '';

    // 크롤링 결과 객체 생성
    const result: CrawledWhiskeyData = {
      englishName,
      koreanName,
      brand, // 브랜드 추가
      age, // 숙성년수 추가
      volume,
      price,
      aroma,
      taste,
      finish,
      type,
      abv: abv || 40, // 기본값 설정
      country,
      region, // 지역 정보 추가 (영어로 변환된 값)
      cask,
      description,
      imageUrl,
      refUrl: url,
      reviewRate,
      reviewCount,
      // 디버깅 정보 추가
      debugInfo: {
        rawInformation: information,
        rawTastingNotes: tastingNotes,
        rawJsonData: jsonData,
        rawHtml: rawHtml // 원본 HTML 저장
      }
    };

    return result;
  } catch (error) {
    console.error('크롤링 오류:', error);
    return null;
  }
}

// JSON 데이터 추출 함수 - 새로운 구조에 맞게 수정
function extractJsonData($: cheerio.CheerioAPI): any {
  try {
    // script 태그에서 JSON 데이터 찾기
    const scripts = $('script').toArray();
    
    for (const script of scripts) {
      const scriptContent = $(script).html();
      if (!scriptContent) continue;
      
      // 여러 패턴으로 시도
      const patterns = [
        // 패턴 1: __NEXT_DATA__ (Next.js 앱)
        /__NEXT_DATA__\s*=\s*(\{.*?\});/s,
        // 패턴 2: window.__INITIAL_STATE__
        /window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s,
        // 패턴 3: dehydratedState (React Query)
        /\{.*"dehydratedState".*?\}/s,
        // 패턴 4: pageProps
        /\{.*"pageProps".*?\}/s,
        // 패턴 5: id="__NEXT_DATA__" 타입의 script 태그 내용
        /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s,
        // 패턴 6: window.__DATA__ 또는 window.__APP_DATA__
        /window\.__\w+__\s*=\s*(\{.*?\});/s,
      ];

      for (const pattern of patterns) {
        const jsonMatch = scriptContent.match(pattern);
        if (jsonMatch) {
          try {
            let jsonData;
            const jsonString = pattern.source.includes('__NEXT_DATA__') && pattern.source.includes('id=') 
              ? jsonMatch[1] 
              : pattern.source.includes('__NEXT_DATA__') || pattern.source.includes('__INITIAL_STATE__') || pattern.source.includes('__\w+__')
              ? jsonMatch[1]
              : jsonMatch[0];
            
            // JSON 문자열 정리
            const cleanedJson = jsonString.trim().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '').trim();
            jsonData = JSON.parse(cleanedJson);
            
            // 유효한 데이터가 있으면 반환
            if (jsonData && typeof jsonData === 'object') {
              return jsonData;
            }
          } catch (e: any) {
            // JSON 파싱 실패 시 다음 패턴 시도
            continue;
          }
        }
      }
      
      // script 내용 전체가 JSON인 경우 시도
      try {
        const trimmed = scriptContent.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const jsonData = JSON.parse(trimmed);
          if (jsonData && typeof jsonData === 'object') {
            return jsonData;
          }
        }
      } catch (e: any) {
        // 무시하고 계속 진행
      }
    }
    
    // JSON 데이터를 찾을 수 없음
    return {};
  } catch (error) {
    console.error('JSON 데이터 추출 오류:', error);
    return {};
  }
}

// HTML에서 직접 데이터 추출 (JSON 파싱 실패 시 fallback)
function extractDataFromHTML($: cheerio.CheerioAPI): any {
  try {
    const data: any = {};
    
    // 1. 위스키 이름, 브랜드명 추출
    // 구조: 같은 div[class*="Stack-root"] 안에 div (영문명) + h1 (한글명)
    
    // h1과 같은 부모 div[class*="Stack-root"] 찾기
    const h1Element = $('h1[class*="Title-root"]').first() || $('h1').first();
    
    if (h1Element.length) {
      // 한글명
      const koreanName = h1Element.text().trim();
      if (koreanName) data.name = koreanName;
      
      // 같은 부모 div[class*="Stack-root"] 안에서 영문명 찾기
      const parentStack = h1Element.closest('div[class*="Stack-root"]');
      if (parentStack.length) {
        parentStack.find('div').each((i, el) => {
          const div = $(el);
          const text = div.text().trim();
          const classes = div.attr('class') || '';
          
          // h1이 아니고, Text-root 클래스가 있고, 영어로만 구성된 경우
          if (!div.is('h1') && classes.includes('Text-root') && 
              /^[A-Za-z0-9\s\-'&]+$/.test(text) && 
              text.length > 3 && text.length < 100 && 
              !text.includes('원') && !text.includes('%')) {
            data.en_name = text;
            data.englishName = text;
            return false;
          }
        });
      }
      
      // 대체: h1의 형제 div에서 찾기
      if (!data.englishName) {
        h1Element.siblings('div').each((i, el) => {
          const text = $(el).text().trim();
          const classes = $(el).attr('class') || '';
          if (classes.includes('Text-root') && /^[A-Za-z0-9\s\-'&]+$/.test(text) && 
              text.length > 3 && text.length < 100) {
            data.en_name = text;
            data.englishName = text;
            return false;
          }
        });
      }
    }
    
    // 2. 가격 추출 - 구조: div[class*="Group-root"] > div > span (숫자) + span (원)
    let price = 0;
    
    // div 안에 숫자 span과 "원" span이 함께 있는 패턴
    $('div').each((i, el) => {
      const div = $(el);
      const divText = div.text();
      
      // "원"이 포함되어 있고 숫자가 있는 경우
      if (divText.includes('원')) {
        // 모든 span 찾기
        const spans = div.find('span');
        let foundPriceText = '';
        let hasWon = false;
        
        spans.each((j, span) => {
          const spanText = $(span).text().trim();
          // 숫자만 있는 span
          if (/^[\d,]+$/.test(spanText)) {
            const numValue = parseInt(spanText.replace(/,/g, ''));
            if (numValue > 10000 && numValue < 100000000) {
              foundPriceText = spanText;
            }
          }
          // "원"이 포함된 span
          if (spanText.includes('원')) {
            hasWon = true;
          }
        });
        
        // 둘 다 있으면 가격으로 인식
        if (foundPriceText && hasWon) {
          price = parseInt(foundPriceText.replace(/,/g, ''));
          return false;
        }
      }
    });
    
    if (price > 0) data.price = price;
    
    // 3. 별점 및 리뷰개수 추출
    // 별점: 숫자만 있는 div (0.0 ~ 5.0 범위)
    $('div').each((i, el) => {
      const text = $(el).text().trim();
      if (/^\d+\.?\d*$/.test(text)) {
        const rating = parseFloat(text);
        if (rating >= 0 && rating <= 5.0 && rating > 0) {
          // "/" 다음에 숫자가 있거나 "개의 리뷰"가 근처에 있는 경우
          const parent = $(el).parent();
          const hasSlash = parent.text().includes('/');
          const hasReviews = parent.text().includes('리뷰');
          if (hasSlash || hasReviews) {
            data.review_rate = rating;
            return false;
          }
        }
      }
    });
    
    // 리뷰 개수: a[href*="reviews"] 안의 "개의 리뷰" 패턴
    const reviewLink = $('a[href*="reviews"]').first();
    if (reviewLink.length) {
      const reviewText = reviewLink.text().trim();
      const reviewMatch = reviewText.match(/(\d+)\s*개의\s*리뷰/);
      if (reviewMatch && reviewMatch[1]) {
        data.review_count = parseInt(reviewMatch[1]);
      }
    }
    
    // 대체 방법: "개의 리뷰" 텍스트 찾기
    if (!data.review_count) {
      $('*').each((i, el) => {
        const text = $(el).text();
        const reviewMatch = text.match(/(\d+)\s*개의\s*리뷰/);
        if (reviewMatch && reviewMatch[1]) {
          data.review_count = parseInt(reviewMatch[1]);
          return false;
        }
      });
    }
    
    // 5. Information 섹션에서 정보 추출
    // 구조: h2:contains("Information") > div[class*="Stack-root"] > div[class*="Group-root"] 
    //      각 Group-root 안에: div[class*="Stack-root"] (h3 라벨) + div (값)
    const information: any[] = [];
    
    // Information 섹션 찾기
    const infoH2 = $('h2').filter((i, el) => {
      return $(el).text().trim() === 'Information';
    }).first();
    
    if (infoH2.length) {
      const infoSection = infoH2.closest('div[class*="Stack-root"]');
      const infoLabels = ['종류', '용량', '도수', '국가', '케이스', '지역'];
      
      infoLabels.forEach(label => {
        // Information 섹션 안의 모든 div[class*="Group-root"] 찾기
        infoSection.find('div[class*="Group-root"]').each((i, groupEl) => {
          const group = $(groupEl);
          
          // 이 Group-root 안에 해당 라벨의 h3가 있는지 확인
          const labelH3 = group.find('h3').filter((j, h3El) => {
            return $(h3El).text().trim() === label;
          }).first();
          
          if (labelH3.length) {
            // 같은 Group-root 안의 모든 요소를 확인
            let foundValue = false;
            
            // 방법 1: h3와 같은 레벨의 형제 div 찾기
            labelH3.siblings('div').each((j, divEl) => {
              const div = $(divEl);
              const text = div.text().trim();
              
              // h3가 아니고, 라벨이 아니며, 값인 경우
              if (!div.is('h3') && text !== label && text.length > 0 && text.length < 200) {
                const hasH3Inside = div.find('h3').length > 0;
                if (!hasH3Inside && !foundValue) {
                  information.push({ label, label_ko: label, value: text });
                  foundValue = true;
                  return false;
                }
              }
            });
            
            // 방법 2: 같은 Group-root의 모든 div에서 찾기 (h3 제외)
            if (!foundValue) {
              group.find('div').each((j, divEl) => {
                const div = $(divEl);
                const text = div.text().trim();
                
                // h3가 아니고, 라벨이 아니며, 값인 경우
                if (!div.is('h3') && text !== label && text.length > 0 && text.length < 200) {
                  const hasH3Inside = div.find('h3').length > 0;
                  const hasStackRoot = div.attr('class')?.includes('Stack-root');
                  
                  // 내부에 h3가 없고, Stack-root가 아닌 순수 값 div
                  if (!hasH3Inside && !hasStackRoot && !foundValue) {
                    information.push({ label, label_ko: label, value: text });
                    foundValue = true;
                    return false;
                  }
                }
              });
            }
            
            // 방법 3: h3의 부모 div[class*="Stack-root"]의 형제 div 찾기
            if (!foundValue) {
              const h3Parent = labelH3.closest('div[class*="Stack-root"]');
              if (h3Parent.length) {
                h3Parent.siblings('div').each((j, divEl) => {
                  const div = $(divEl);
                  const text = div.text().trim();
                  
                  if (!div.is('h3') && text !== label && text.length > 0 && text.length < 200) {
                    const hasH3Inside = div.find('h3').length > 0;
                    if (!hasH3Inside && !foundValue) {
                      information.push({ label, label_ko: label, value: text });
                      foundValue = true;
                      return false;
                    }
                  }
                });
              }
            }
          }
        });
      });
    }
    
    // 대체 방법: h3 텍스트로 직접 찾기
    if (information.length < 3) {
      const infoLabels = ['종류', '용량', '도수', '국가', '케이스', '지역'];
      infoLabels.forEach(label => {
        $('h3').each((i, el) => {
          if ($(el).text().trim() === label) {
            const group = $(el).closest('div[class*="Group-root"]');
            if (group.length) {
              // h3와 같은 Group-root 안의 모든 div 찾기
              group.find('div').each((j, divEl) => {
                const div = $(divEl);
                const text = div.text().trim();
                
                // h3가 아니고, 라벨이 아니며, 값인 경우
                if (!div.is('h3') && text !== label && text.length > 0 && text.length < 200) {
                  const hasChildH3 = div.find('h3').length > 0;
                  if (!hasChildH3) {
                    if (!information.find(info => info.label === label && info.value === text)) {
                      information.push({ label, label_ko: label, value: text });
                      return false;
                    }
                  }
                }
              });
            }
          }
        });
      });
    }
    
    if (information.length > 0) {
      data.information = information;
    }
    
    // 4. Tasting Notes 추출
    // 구조: h2:contains("Tasting Notes") > div[class*="Stack-root"] > div[class*="Group-root"] 
    //      각 Group-root 안에: div[class*="Stack-root"] (h3 라벨 + span 한글) + div (값)
    const tastingNotes: any[] = [];
    
    // Tasting Notes 섹션 찾기
    const tastingH2 = $('h2').filter((i, el) => {
      return $(el).text().trim() === 'Tasting Notes';
    }).first();
    
    if (tastingH2.length) {
      const tastingSection = tastingH2.closest('div[class*="Stack-root"]');
      const tastingLabels = [
        { en: 'Aroma', ko: '향' },
        { en: 'Taste', ko: '맛' },
        { en: 'Finish', ko: '여운' }
      ];
      
      tastingLabels.forEach(({ en, ko }) => {
        // Tasting Notes 섹션 안의 모든 div[class*="Group-root"] 찾기
        tastingSection.find('div[class*="Group-root"]').each((i, groupEl) => {
          const group = $(groupEl);
          
          // 이 Group-root 안에 해당 라벨이 있는지 확인 (h3에 en 또는 span에 ko)
          let hasLabel = false;
          group.find('h3').each((j, h3El) => {
            const h3Text = $(h3El).text().trim();
            const nextSpan = $(h3El).next('span');
            const spanText = nextSpan.text().trim();
            if (h3Text === en || spanText === ko) {
              hasLabel = true;
              let foundValue = false;
              
              // 같은 Group-root 안에서 값 찾기 - 여러 방법 시도
              // 방법 1: h3와 같은 레벨의 형제 div
              $(h3El).closest('div[class*="Stack-root"]').siblings('div').each((k, divEl) => {
                const div = $(divEl);
                const text = div.text().trim();
                
                if (!div.is('h3') && !div.is('span') && text !== en && text !== ko && 
                    text.length > 2 && text.length < 500 && !foundValue) {
                  const hasH3Inside = div.find('h3').length > 0;
                  if (!hasH3Inside) {
                    if (!tastingNotes.find(note => (note.label === en || note.label_ko === ko) && note.value === text)) {
                      tastingNotes.push({ label: en, label_ko: ko, value: text });
                      foundValue = true;
                      return false;
                    }
                  }
                }
              });
              
              // 방법 2: 같은 Group-root의 모든 div에서 찾기
              if (!foundValue) {
                group.find('div').each((k, divEl) => {
                  const div = $(divEl);
                  const text = div.text().trim();
                  
                  // h3가 아니고, span이 아니며, 라벨이 아니며, 값인 경우
                  if (!div.is('h3') && !div.is('span') && 
                      text !== en && text !== ko && 
                      text.length > 2 && text.length < 500 &&
                      !foundValue) {
                    
                    // 내부에 h3나 라벨 span이 없는 순수 값 div
                    const hasH3Inside = div.find('h3').length > 0;
                    const hasStackRoot = div.attr('class')?.includes('Stack-root');
                    const hasLabelSpan = div.find(`span:contains("${ko}")`).length > 0;
                    
                    if (!hasH3Inside && !hasStackRoot && !hasLabelSpan) {
                      if (!tastingNotes.find(note => (note.label === en || note.label_ko === ko) && note.value === text)) {
                        tastingNotes.push({ label: en, label_ko: ko, value: text });
                        foundValue = true;
                        return false;
                      }
                    }
                  }
                });
              }
              
              return false; // 이 Group-root에서 처리 완료
            }
          });
        });
      });
    }
    
    // 대체 방법: h3 + span 패턴으로 직접 찾기
    if (tastingNotes.length < 3) {
      const tastingLabels = [
        { en: 'Aroma', ko: '향' },
        { en: 'Taste', ko: '맛' },
        { en: 'Finish', ko: '여운' }
      ];
      
      tastingLabels.forEach(({ en, ko }) => {
        $('h3').each((i, el) => {
          const h3Text = $(el).text().trim();
          const nextSpan = $(el).next('span');
          const spanText = nextSpan.text().trim();
          
          // h3에 라벨이 있거나 다음 span에 한글 라벨이 있는 경우
          if (h3Text === en || spanText === ko) {
            const group = $(el).closest('div[class*="Group-root"]');
            if (group.length) {
              group.find('div').each((j, divEl) => {
                const div = $(divEl);
                const text = div.text().trim();
                
                // h3가 아니고, span이 아니며, 라벨이 아닌 내용인 경우
                if (!div.is('h3') && !div.is('span') && 
                    text !== en && text !== ko && 
                    text.length > 2 && text.length < 500 &&
                    div.find('h3').length === 0) {
                  
                  if (!tastingNotes.find(note => (note.label === en || note.label_ko === ko) && note.value === text)) {
                    tastingNotes.push({ 
                      label: en,
                      label_ko: ko,
                      value: text 
                    });
                    return false;
                  }
                }
              });
            }
          }
        });
      });
    }
    
    if (tastingNotes.length > 0) {
      data.tasting_notes = tastingNotes;
    }
    
    // 7. 설명 추출
    // 구조: h2[class*="Title-root"] (제목) > div[class*="Stack-root"] > div (내용 div)
    let description = '';
    
    // h2[class*="Title-root"]로 시작하는 섹션들 찾기 (Information, Tasting Notes 제외)
    $('h2[class*="Title-root"]').each((i, el) => {
      const h2Text = $(el).text().trim();
      // Information이나 Tasting Notes 섹션은 제외
      if (h2Text.includes('Information') || h2Text.includes('Tasting Notes')) {
        return;
      }
      
      const section = $(el).closest('div[class*="Stack-root"]');
      if (section.length) {
        // 같은 섹션 내의 div에서 긴 텍스트 내용 찾기
        section.find('div').each((j, divEl) => {
          const div = $(divEl);
          const htmlContent = div.html() || '';
          
          // 긴 HTML 내용이 있고, p 태그나 실제 텍스트가 있는 경우
          if (htmlContent && htmlContent.length > 100 && 
              (htmlContent.includes('<p>') || htmlContent.includes('&') || htmlContent.includes('strong'))) {
            
            // HTML 엔티티 디코딩
            const decodedContent = decodeHtmlEntities(htmlContent);
            // 이미지 태그 제거 (자기 닫는 태그와 일반 태그 모두)
            let cleanedContent = decodedContent.replace(/<img[^>]*>/gi, '');
            cleanedContent = cleanedContent.replace(/<img[^>]*\/>/gi, '');
            // style 태그 제거
            cleanedContent = cleanedContent.replace(/<style[^>]*>.*?<\/style>/gi, '');
            // 이미지 제거로 인한 공백 정리: 태그 사이의 연속된 공백 정리
            cleanedContent = cleanedContent.replace(/>\s+</g, '><'); // 태그 사이 공백 제거
            cleanedContent = cleanedContent.replace(/\s{2,}/g, ' '); // 연속된 공백을 하나로
            // 빈 태그 제거 후 공백 정리
            cleanedContent = cleanedContent.replace(/<p>\s*<\/p>/gi, ''); // 빈 p 태그 제거
            cleanedContent = cleanedContent.replace(/<div>\s*<\/div>/gi, ''); // 빈 div 태그 제거
            const finalContent = cleanedContent.trim();
            
            // 정보 섹션 내용이 아니고, 실제 설명 내용인 경우
            if (finalContent.trim().length > 100 && 
                !finalContent.includes('종류') && !finalContent.includes('용량') && 
                !finalContent.includes('도수') && !finalContent.includes('Aroma') &&
                !finalContent.includes('Taste') && !finalContent.includes('Finish')) {
              
              // 중복 체크
              if (!description || !description.includes(finalContent.substring(0, 100))) {
                description += finalContent.trim() + '\n\n';
              }
            }
          }
        });
      }
    });
    
    // 대체 방법: div[class*="Stack-root"] 내의 긴 텍스트 블록 찾기
    if (!description || description.length < 100) {
      $('div[class*="Stack-root"]').each((i, el) => {
        const section = $(el);
        // h2가 있고 Information이나 Tasting Notes가 아닌 경우
        const h2 = section.find('h2').first();
        if (h2.length) {
          const h2Text = h2.text().trim();
          if (!h2Text.includes('Information') && !h2Text.includes('Tasting Notes')) {
            section.find('div').each((j, divEl) => {
              const div = $(divEl);
              const htmlContent = div.html() || '';
              
              if (htmlContent && htmlContent.length > 100 && 
                  (htmlContent.includes('<p>') || htmlContent.includes('&') || htmlContent.length > 200)) {
                // HTML 엔티티 디코딩
                let decodedContent = decodeHtmlEntities(htmlContent);
                // 이미지 태그 제거
                decodedContent = decodedContent.replace(/<img[^>]*>/gi, '');
                decodedContent = decodedContent.replace(/<img[^>]*\/>/gi, '');
                // style 태그 제거
                decodedContent = decodedContent.replace(/<style[^>]*>.*?<\/style>/gi, '');
                // 이미지 제거로 인한 공백 정리
                decodedContent = decodedContent.replace(/>\s+</g, '><');
                decodedContent = decodedContent.replace(/\s{2,}/g, ' ');
                // 빈 태그 제거
                decodedContent = decodedContent.replace(/<p>\s*<\/p>/gi, '');
                decodedContent = decodedContent.replace(/<div>\s*<\/div>/gi, '');
                const cleanedContent = decodedContent.trim();
                
                if (cleanedContent.length > 100 && 
                    !cleanedContent.includes('종류') && !cleanedContent.includes('용량') && 
                    !cleanedContent.includes('도수')) {
                  if (!description || !description.includes(cleanedContent.substring(0, 50))) {
                    description += cleanedContent.trim() + '\n\n';
                  }
                }
              }
            });
          }
        }
      });
    }
    
    if (description) {
      data.description = description.trim();
    }
    
    // 이미지 URL 추출 - 더 정확한 선택자
    let imageUrl = '';
    const koreanName = data.name || '';
    
    // 패턴 1: 메인 이미지 (alt에 위스키 이름이 포함된 경우)
    if (koreanName) {
      const nameWords = koreanName.split(' ')[0]; // 첫 단어
      $('img').each((i, el) => {
        const alt = $(el).attr('alt') || '';
        const src = $(el).attr('src') || '';
        const dataSrc = $(el).attr('data-src') || '';
        const actualSrc = dataSrc || src;
        
        if (actualSrc && !actualSrc.startsWith('data:') && 
            (alt.includes(nameWords) || alt.includes(koreanName) || 
             actualSrc.includes('product') || actualSrc.includes('item') ||
             actualSrc.includes('whiskey'))) {
          imageUrl = actualSrc;
          return false;
        }
      });
    }
    
    // 패턴 2: 큰 이미지 (width나 height가 큰 경우)
    if (!imageUrl || imageUrl.startsWith('data:')) {
      $('img').each((i, el) => {
        const src = $(el).attr('src') || '';
        const dataSrc = $(el).attr('data-src') || '';
        const actualSrc = dataSrc || src;
        const width = $(el).attr('width');
        const height = $(el).attr('height');
        
        if (actualSrc && !actualSrc.startsWith('data:') && 
            !actualSrc.includes('icon') && !actualSrc.includes('logo') && !actualSrc.includes('avatar') &&
            ((width && parseInt(width) > 200) || (height && parseInt(height) > 200))) {
          imageUrl = actualSrc;
          return false;
        }
      });
    }
    
    // 패턴 3: 메인 이미지 클래스나 ID가 있는 경우
    if (!imageUrl || imageUrl.startsWith('data:')) {
      imageUrl = $('img.main-image, img.product-image, img.item-image, #main-image img, .product-image img, .main-image img')
        .first().attr('src') || 
        $('img[src*="product"], img[src*="item"], img[src*="whiskey"]').first().attr('src') || '';
    }
    
    // 패턴 4: data-src 속성 (lazy loading)
    if (!imageUrl || imageUrl.startsWith('data:')) {
      imageUrl = $('img[data-src]').not('[src*="icon"], [src*="logo"], [src*="avatar"]')
        .first().attr('data-src') || '';
    }
    
    // 패턴 5: 일반적인 이미지 (아이콘/로고 제외)
    if (!imageUrl || imageUrl.startsWith('data:')) {
      $('img').not('[src*="icon"], [src*="logo"], [src*="avatar"], [src*="button"], [src*="arrow"]')
        .each((i, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src') || '';
          if (src && !src.startsWith('data:') && src.length > 10) {
            imageUrl = src;
            return false;
          }
        });
    }
    
    // URL 정규화
    if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http://localhost')) {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        data.thumbnail_image = imageUrl;
      } else if (imageUrl.startsWith('//')) {
        data.thumbnail_image = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        data.thumbnail_image = `https://dailyshot.co${imageUrl}`;
      } else {
        data.thumbnail_image = `https://dailyshot.co/${imageUrl}`;
      }
    }
    
    // 리뷰 평점 및 개수 추출
    const reviewText = $('*').filter((i, el) => {
      const text = $(el).text();
      return /\d+\.?\d*\s*\/\s*\d+/.test(text) || /\/\s*\d+개의 리뷰/.test(text);
    }).first().text().trim();
    
    if (reviewText) {
      // 평점 추출 (예: "5.0 / 303개의 리뷰")
      const rateMatch = reviewText.match(/(\d+\.?\d*)/);
      const countMatch = reviewText.match(/(\d+)\s*개의 리뷰/);
      if (rateMatch) {
        data.review_rate = parseFloat(rateMatch[1]);
      }
      if (countMatch) {
        data.review_count = parseInt(countMatch[1]);
      }
    }
    
    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error('HTML에서 데이터 추출 오류:', error);
    return null;
  }
}

// 테이스팅 노트에서 값 찾기
function findTastingNoteValue(data: any[], englishLabel: string, koreanLabel: string): string {
  if (!Array.isArray(data)) return '';
  
  const item = data.find(item => {
    return (
      item.label === englishLabel || 
      item.label_ko === koreanLabel ||
      item.label === koreanLabel ||
      (item.label && item.label.toLowerCase() === englishLabel.toLowerCase()) ||
      (item.label_ko && item.label_ko === koreanLabel)
    );
  });
  
  return item?.value || '';
}

// comments 배열에서 설명 추출
function extractDescriptionFromComments(comments: any[]): string {
  if (!Array.isArray(comments) || comments.length === 0) return '';
  
  let description = '';
  
  for (const comment of comments) {
    if (comment.title && comment.description) {
      // HTML 엔티티 디코딩
      let decodedDescription = decodeHtmlEntities(comment.description);
      
      // 이미지 태그 제거 (자기 닫는 태그와 일반 태그 모두)
      decodedDescription = decodedDescription.replace(/<img[^>]*>/gi, '');
      decodedDescription = decodedDescription.replace(/<img[^>]*\/>/gi, '');
      // style 태그 제거
      decodedDescription = decodedDescription.replace(/<style[^>]*>.*?<\/style>/gi, '');
      // 이미지 제거로 인한 공백 정리
      decodedDescription = decodedDescription.replace(/>\s+</g, '><');
      decodedDescription = decodedDescription.replace(/\s{2,}/g, ' ');
      // 빈 태그 제거
      decodedDescription = decodedDescription.replace(/<p>\s*<\/p>/gi, '');
      decodedDescription = decodedDescription.replace(/<div>\s*<\/div>/gi, '');
      const cleanedDescription = decodedDescription.trim();
      
      if (cleanedDescription) {
        // 제목을 굵게 표시하고 본문은 HTML 유지
        description += `<h3><strong>${comment.title}</strong></h3>\n\n${cleanedDescription}\n\n`;
      }
    }
  }
  
  return description.trim();
}

// HTML 엔티티 디코딩
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '\\u003c': '<',
    '\\u003e': '>',
    '\\u0026': '&',
    '\\u0027': "'",
    '\\r\\n': '\n',
    '\\n': '\n'
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  return decoded;
}

// 한글 타입을 영어 타입으로 매핑
function mapKoreanToEnglishType(koreanType: string): string {
  const typeMapping: { [key: string]: string } = {
    '싱글몰트 위스키': 'Single Malt',
    '싱글몰트': 'Single Malt',
    '블렌디드 위스키': 'Blended',
    '블렌디드': 'Blended',
    '버번 위스키': 'Bourbon',
    '버번': 'Bourbon',
    '아메리칸 위스키': 'American',
    '아메리칸': 'American',
    '아이리시 위스키': 'Irish',
    '아이리시': 'Irish',
    '캐나디안 위스키': 'Canadian',
    '캐나디안': 'Canadian',
    '재패니즈 위스키': 'Japanese',
    '재패니즈': 'Japanese',
    '라이 위스키': 'Rye',
    '라이': 'Rye',
    '테네시 위스키': 'Tennessee',
    '테네시': 'Tennessee'
  };
  
  return typeMapping[koreanType] || koreanType;
}

// 지역을 국가로 매핑하는 함수 (크롤링시 사용)
function mapRegionToCountry(region: string): string {
  const regionCountryMap: { [key: string]: string } = {
    // 스코틀랜드 지역
    'Highland': 'Scotland',
    '하이랜드': 'Scotland',
    'Lowland': 'Scotland',
    '로우랜드': 'Scotland',
    'Speyside': 'Scotland',
    '스페이사이드': 'Scotland',
    'Islay': 'Scotland',
    '아일라': 'Scotland',
    'Islands': 'Scotland',
    '아일랜즈': 'Scotland',
    'Skye': 'Scotland',
    'Skye Island': 'Scotland',
    '스카이섬': 'Scotland',
    'Arran': 'Scotland',
    'Arran Island': 'Scotland',
    '아란섬': 'Scotland',
    'Campbeltown': 'Scotland',
    '캠벨타운': 'Scotland',
    'Scotland': 'Scotland',
    '스코틀랜드': 'Scotland',
    
    // 아일랜드 지역
    'Ireland': 'Ireland',
    '아일랜드': 'Ireland',
    
    // 미국 지역
    'Kentucky': 'United States',
    '켄터키': 'United States',
    'Tennessee': 'United States',
    '테네시': 'United States',
    
    // 일본 지역
    'Japan': 'Japan',
    '일본': 'Japan',
    
    // 캐나다 지역
    'Canada': 'Canada',
    '캐나다': 'Canada',
    
    // 프랑스 지역
    'France': 'France',
    '프랑스': 'France'
  };
  
  return regionCountryMap[region] || '';
}

// 한글 지역을 영어 지역으로 매핑
function mapKoreanToEnglishRegion(koreanRegion: string): string {
  const regionMapping: { [key: string]: string } = {
    '하이랜드': 'Highland',
    '로우랜드': 'Lowland',
    '스페이사이드': 'Speyside',
    '아일라': 'Islay',
    '아일랜즈': 'Islands',
    '스카이섬': 'Skye Island',
    '아란섬': 'Arran Island',
    '캠벨타운': 'Campbeltown',
    '아일랜드': 'Ireland',
    '켄터키': 'Kentucky',
    '테네시': 'Tennessee',
    '스코틀랜드': 'Scotland',
    '일본': 'Japan',
    '캐나다': 'Canada',
    '프랑스': 'France'
  };
  
  return regionMapping[koreanRegion] || koreanRegion;
}

// 배열에서 label로 value 찾기
function findValueByLabel(data: any[], label: string): string {
  if (!Array.isArray(data)) return '';
  
  const item = data.find(item => 
    item.label === label || 
    item.label_ko === label ||
    item.label?.toLowerCase() === label.toLowerCase()
  );
  
  return item?.value || '';
}



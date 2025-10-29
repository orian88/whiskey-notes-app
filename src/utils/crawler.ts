import axios from 'axios';
import * as cheerio from 'cheerio';
import type { CrawledWhiskeyData } from '../types/index';

export async function crawlDailyshot(url: string): Promise<CrawledWhiskeyData | null> {
  try {
    // 프록시를 통해 요청
    const proxyUrl = `/api/crawl${url.replace('https://dailyshot.co', '')}`;
    
    const response = await axios.get(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        // 'Accept-Encoding'과 'Connection'은 브라우저가 자동으로 관리하므로 제거
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // JSON 데이터에서 정보 추출 - 새로운 구조에 맞게 수정
    const jsonData = extractJsonData($);
    
    // 다양한 구조에서 데이터 찾기
    let data = null;
    
    // 구조 1: dehydratedState.queries[0].state.data
    if (jsonData.dehydratedState?.queries?.[0]?.state?.data) {
      data = jsonData.dehydratedState.queries[0].state.data;
    }
    // 구조 2: props.pageProps
    else if (jsonData.props?.pageProps) {
      data = jsonData.props.pageProps;
    }
    // 구조 3: 직접 props
    else if (jsonData.props) {
      data = jsonData.props;
    }
    // 구조 4: 직접 jsonData
    else if (jsonData && typeof jsonData === 'object') {
      data = jsonData;
    }
    
    if (!data) {
      console.error('크롤링 실패: 데이터 구조를 찾을 수 없습니다.');
      return null;
    }

    // 기본 정보 추출
    const englishName = data.en_name || '';
    const koreanName = data.name || '';
    const price = data.price || 0;
    const reviewRate = data.review_rate || 0;
    const reviewCount = data.review_count || 0;
    
    // Information 배열에서 정보 추출
    const information = data.information || [];
    const tastingNotes = data.tasting_notes || [];
    
    // Information에서 각 필드 추출
    const typeRaw = findValueByLabel(information, '종류') || 'Single Malt';
    const type = mapKoreanToEnglishType(typeRaw);
    const volumeText = findValueByLabel(information, '용량') || '700ml';
    const volume = parseInt(volumeText.replace('ml', '')) || 700;
    const abvText = findValueByLabel(information, '도수') || '40%';
    const abv = parseFloat(abvText.replace('%', '')) || 40;
    const country = findValueByLabel(information, '국가') || 'Scotland';
    const regionRaw = findValueByLabel(information, '지역') || 'Highland';
    const region = mapKoreanToEnglishRegion(regionRaw);
    const cask = findValueByLabel(information, '케이스') || '';

    // Tasting Notes에서 정보 추출
    const aroma = findTastingNoteValue(tastingNotes, 'Aroma', '향') || '';
    const taste = findTastingNoteValue(tastingNotes, 'Taste', '맛') || '';
    const finish = findTastingNoteValue(tastingNotes, 'Finish', '여운') || '';

    // 설명 추출 - comments 배열에서 추출
    const comments = data.comments || [];
    const description = extractDescriptionFromComments(comments) || '';

    // 이미지 URL 추출
    const imageUrl = data.thumbnail_image || '';

    return {
      englishName,
      koreanName,
      volume,
      price,
      aroma,
      taste,
      finish,
      type,
      abv,
      country,
      region,
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
        rawJsonData: jsonData
      }
    };
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
      if (scriptContent) {
        // 여러 패턴으로 시도
        const patterns = [
          // 패턴 1: dehydratedState
          /\{.*"dehydratedState".*\}/s,
          // 패턴 2: pageProps
          /\{.*"pageProps".*\}/s,
          // 패턴 3: __NEXT_DATA__
          /__NEXT_DATA__\s*=\s*(\{.*?\});/s,
          // 패턴 4: window.__INITIAL_STATE__
          /window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s
        ];

        for (const pattern of patterns) {
          const jsonMatch = scriptContent.match(pattern);
          if (jsonMatch) {
            try {
              let jsonData;
              if (pattern.source.includes('__NEXT_DATA__') || pattern.source.includes('__INITIAL_STATE__')) {
                jsonData = JSON.parse(jsonMatch[1]);
              } else {
                jsonData = JSON.parse(jsonMatch[0]);
              }
              
              // 다양한 구조에서 데이터 찾기
              if (jsonData.dehydratedState?.queries?.[0]?.state?.data) {
                return jsonData;
              }
              if (jsonData.props?.pageProps) {
                return jsonData.props.pageProps;
              }
              if (jsonData.props) {
                return jsonData.props;
              }
              if (jsonData) {
                return jsonData;
              }
            } catch (e: any) {
              // JSON 파싱 실패 시 다음 패턴 시도
              continue;
            }
          }
        }
      }
    }
    
    // JSON 데이터를 찾을 수 없음
    return {};
  } catch (error) {
    console.error('JSON 데이터 추출 오류:', error);
    return {};
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
      const decodedDescription = decodeHtmlEntities(comment.description);
      
      // 이미지 태그 제거 (img 태그만 제거)
      const cleanedDescription = decodedDescription.replace(/<img[^>]*>/gi, '');
      
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

// 한글 지역을 영어 지역으로 매핑
function mapKoreanToEnglishRegion(koreanRegion: string): string {
  const regionMapping: { [key: string]: string } = {
    '하이랜드': 'Highland',
    '로우랜드': 'Lowland',
    '스페이사이드': 'Speyside',
    '아일라': 'Islay',
    '캠벨타운': 'Campbeltown',
    '아일랜드': 'Ireland',
    '켄터키': 'Kentucky',
    '테네시': 'Tennessee',
    '스코틀랜드': 'Scotland',
    '일본': 'Japan',
    '캐나다': 'Canada'
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



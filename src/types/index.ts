// 위스키 정보 타입
export interface IWhiskey {
  id: string;
  name: string;
  english_name?: string;
  korean_name?: string;
  brand?: string;
  type?: string;
  age?: number;
  bottle_volume?: number;
  abv?: number;
  region?: string;
  price?: number;
  current_price?: number; // 현재 가격 (가격 추적용)
  current_price_usd?: number; // USD 환산 가격
  exchange_rate?: number; // 환율
  last_price_update?: string; // 마지막 가격 업데이트 날짜
  price_source?: string; // 가격 출처
  distillery?: string;
  description?: string;
  cask?: string;
  image_url?: string;
  ref_url?: string;
  aroma?: string;
  taste?: string;
  finish?: string;
  country?: string;
  review_rate?: number; // 평점 추가
  review_count?: number; // 리뷰 개수 추가
  is_crawled?: boolean;
  crawled_at?: string;
  is_favorite?: boolean; // 즐겨찾기 (버킷 리스트)
  created_at: string;
  updated_at: string;
}

// 구매 정보 타입
export interface IPurchase {
  id: string;
  whiskey_id: string;
  purchase_date: string;
  purchase_price?: number;
  discount_price?: number;
  final_price?: number;
  store_name?: string;
  store_location?: string;
  notes?: string;
  
  // 원래 가격 정보
  original_price: number;
  original_currency: string;
  original_exchange_rate: number;
  
  // 기본 할인 정보
  basic_discount_amount: number;
  basic_discount_currency: string;
  basic_discount_exchange_rate: number;
  
  // 추가 할인 세부 정보
  coupon_discount_amount: number;
  coupon_discount_currency: string;
  coupon_discount_exchange_rate: number;
  
  membership_discount_amount: number;
  membership_discount_currency: string;
  membership_discount_exchange_rate: number;
  
  event_discount_amount: number;
  event_discount_currency: string;
  event_discount_exchange_rate: number;
  
  // 최종 계산된 가격 (KRW 기준)
  final_price_krw: number;
  
  // 구매 장소 및 구매처 정보
  purchase_location?: string;
  
  // 시음 관련 날짜
  tasting_start_date?: string;
  tasting_finish_date?: string;
  
  // 메타데이터
  created_at: string;
  updated_at: string;
}

// 테이스팅 노트 타입 (실제 데이터베이스 스키마에 맞게)
export interface ITastingNote {
  id: string;
  purchase_id: string; // whiskey_id 대신 purchase_id 사용
  whiskey_id?: string; // 조인된 데이터에서 추출된 위스키 ID
  whiskey?: IWhiskey; // 조인된 위스키 정보
  purchaseInfo?: IPurchase; // 구매 정보
  purchases?: { // 조인된 구매 정보 (tasting_start_date 포함)
    whiskey_id: string;
    tasting_start_date?: string;
    whiskeys?: IWhiskey;
  };
  tasting_date: string;
  color?: string;
  nose?: string;
  palate?: string;
  finish?: string;
  rating: number;
  notes?: string;
  amount_consumed?: number;
  // 추가 평가 항목들
  nose_rating?: number;
  palate_rating?: number;
  finish_rating?: number;
  sweetness?: number;
  smokiness?: number;
  fruitiness?: number;
  complexity?: number;
  created_at: string;
  updated_at: string;
}

// 개인 노트 타입 (달력 기반 데일리 메모)
export interface IPersonalNote {
  id: string;
  note_date: string; // YYYY-MM-DD 형식
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// 진열장 아이템 타입
export interface ICollectionItem {
  id: string;
  purchase_id: string;
  whiskey_id: string;
  whiskey?: IWhiskey;
  purchase?: IPurchase;
  remaining_amount: number; // 남은 양 (0-100%)
  current_rating?: number; // 테이스팅 노트의 평균 평점
  tasting_count?: number; // 테이스팅 횟수
  last_tasted?: string; // 마지막 테이스팅 날짜
  position?: { // 진열장 내 위치 (선택사항)
    row: number;
    col: number;
  };
  created_at: string;
  updated_at: string;
}

// 위스키 통계 타입
export interface IWhiskeyStats {
  id: string;
  name: string;
  brand?: string;
  purchase_count: number;
  tasting_count: number;
  avg_rating?: number;
  last_tasted?: string;
  first_purchased?: string;
}

// 컴포넌트 Props 타입
export interface IButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export interface ICardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface IInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// 폼 데이터 타입
export interface IWhiskeyFormData {
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
  ref_url?: string;
  aroma?: string;
  taste?: string;
  finish?: string;
  country?: string;
  review_rate?: number; // 평점 추가
  review_count?: number; // 리뷰 개수 추가
}

export interface IPurchaseFormData {
  whiskey_id: string;
  purchase_date: string;
  
  // 원래 가격 정보
  original_price: number;
  original_currency: string;
  original_exchange_rate: number;
  
  // 기본 할인 정보
  basic_discount_amount: number;
  basic_discount_currency: string;
  basic_discount_exchange_rate: number;
  
  // 추가 할인 세부 정보
  coupon_discount_amount: number;
  coupon_discount_currency: string;
  coupon_discount_exchange_rate: number;
  
  membership_discount_amount: number;
  membership_discount_currency: string;
  membership_discount_exchange_rate: number;
  
  event_discount_amount: number;
  event_discount_currency: string;
  event_discount_exchange_rate: number;
  
  // 구매 장소 및 구매처 정보
  purchase_location?: string;
  store_name?: string;
  
  // 메모
  notes?: string;
}

export interface ITastingNoteFormData {
  whiskey_id: string; // UI에서 사용하지만 DB 저장 시에는 사용하지 않음
  tasting_date: string;
  color?: string;
  nose?: string;
  palate?: string;
  finish?: string;
  rating: number;
  notes?: string;
  // 추가 평가 항목들
  nose_rating?: number;
  palate_rating?: number;
  finish_rating?: number;
  sweetness?: number;
  smokiness?: number;
  fruitiness?: number;
  complexity?: number;
  amount_consumed?: number;
}

export interface IPersonalNoteFormData {
  title: string;
  content?: string;
  category?: string;
  tags: string[];
}

// API 응답 타입
export interface IApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// 페이지네이션 타입
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 검색 및 필터 타입
export interface ISearchFilters {
  query?: string;
  brand?: string;
  type?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

// 크롤링 데이터 타입
export interface CrawledWhiskeyData {
  englishName: string;
  koreanName: string;
  volume: number;
  price: number;
  aroma: string;
  taste: string;
  finish: string;
  type: string;
  abv: number;
  country: string;
  region: string;
  cask: string;
  description: string;
  imageUrl: string;
  refUrl: string;
  reviewRate?: number; // 평점 추가
  reviewCount?: number; // 리뷰 개수 추가
  // 디버깅용 데이터 추가
  debugInfo?: {
    rawInformation: any[];
    rawTastingNotes: any[];
    rawJsonData: any;
  };
}

// 달력 이벤트 타입
export interface ICalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'purchase' | 'tasting' | 'personal_note';
  data?: any;
}

// 달력 컴포넌트 Props 타입
export interface ICalendarProps {
  events: ICalendarEvent[];
  onDateClick?: (date: string) => void;
  onEventClick?: (event: ICalendarEvent) => void;
  className?: string;
}

// 뷰 모드 타입
export type ViewMode = 'card' | 'calendar';
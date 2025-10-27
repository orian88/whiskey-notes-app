# Supabase 샘플 위스키 데이터 추가 SQL

-- 샘플 위스키 데이터 삽입
INSERT INTO whiskeys (name, brand, type, age, bottle_volume, abv, region, price, distillery, description, cask, image_url, ref_url) VALUES
(
  'Macallan 18',
  'Macallan',
  'Single Malt',
  18,
  700,
  43.0,
  'Speyside',
  500000,
  'Macallan Distillery',
  '리치하고 복잡한 싱글몰트 위스키로 건조한 과일과 향신료의 노트가 특징입니다. 18년간 숙성된 이 위스키는 부드럽고 우아한 피니시를 가지고 있습니다.',
  'Sherry Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/macallan-18'
),
(
  'Glenfiddich 12',
  'Glenfiddich',
  'Single Malt',
  12,
  700,
  40.0,
  'Speyside',
  45000,
  'Glenfiddich Distillery',
  '부드럽고 달콤한 싱글몰트 위스키로 배와 오크의 노트가 특징입니다. 초보자에게도 친숙한 맛으로 위스키 입문자에게 추천합니다.',
  'American Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/glenfiddich-12'
),
(
  'Johnnie Walker Black Label',
  'Johnnie Walker',
  'Blended',
  12,
  700,
  40.0,
  'Scotland',
  35000,
  'Diageo',
  '세계적으로 사랑받는 블렌디드 위스키로 스모키한 특성이 특징입니다. 다양한 위스키의 조화로 만들어진 균형잡힌 맛을 제공합니다.',
  'Mixed Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/johnnie-walker-black'
),
(
  'Yamazaki 12',
  'Yamazaki',
  'Single Malt',
  12,
  700,
  43.0,
  'Japan',
  180000,
  'Suntory',
  '일본의 대표적인 싱글몰트 위스키로 우아하고 정교한 맛이 특징입니다. 일본의 독특한 기후와 물로 만들어진 특별한 위스키입니다.',
  'Mizunara Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/yamazaki-12'
),
(
  'Lagavulin 16',
  'Lagavulin',
  'Single Malt',
  16,
  700,
  43.0,
  'Islay',
  120000,
  'Lagavulin Distillery',
  '아일라 섬의 강렬한 피트 스모크가 특징인 위스키입니다. 16년간 숙성된 이 위스키는 진한 스모크와 바다 소금의 노트를 가지고 있습니다.',
  'Ex-Bourbon',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/lagavulin-16'
),
(
  'Hibiki Harmony',
  'Hibiki',
  'Blended',
  NULL,
  700,
  43.0,
  'Japan',
  80000,
  'Suntory',
  '일본의 전통과 현대가 만난 블렌디드 위스키입니다. 다양한 숙성년수의 위스키가 조화를 이루어 복잡하고 우아한 맛을 제공합니다.',
  'Mixed Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/hibiki-harmony'
),
(
  'Glenlivet 18',
  'Glenlivet',
  'Single Malt',
  18,
  700,
  43.0,
  'Speyside',
  150000,
  'Glenlivet Distillery',
  '스페이사이드의 대표적인 싱글몰트 위스키로 부드럽고 과일향이 특징입니다. 18년간 숙성된 이 위스키는 복잡하고 우아한 맛을 제공합니다.',
  'Sherry Oak',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/glenlivet-18'
),
(
  'Ardbeg 10',
  'Ardbeg',
  'Single Malt',
  10,
  700,
  46.0,
  'Islay',
  80000,
  'Ardbeg Distillery',
  '아일라 섬의 강렬한 피트 스모크와 바다 소금의 노트가 특징인 위스키입니다. 10년간 숙성된 이 위스키는 강렬하고 복잡한 맛을 제공합니다.',
  'Ex-Bourbon',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'https://dailyshot.co.kr/whiskey/ardbeg-10'
);

-- 샘플 구매 기록 추가
INSERT INTO purchases (whiskey_id, purchase_date, purchase_price, store_name, store_location, notes) VALUES
(
  (SELECT id FROM whiskeys WHERE name = 'Macallan 18' LIMIT 1),
  '2024-01-15',
  480000,
  '위스키샵 강남점',
  '서울시 강남구',
  '생일 선물로 구매. 박스 상태 양호.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Glenfiddich 12' LIMIT 1),
  '2024-02-20',
  42000,
  '롯데마트 월드타워점',
  '서울시 송파구',
  '일상용으로 구매. 가성비 좋음.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Johnnie Walker Black Label' LIMIT 1),
  '2024-03-10',
  32000,
  '이마트 트레이더스',
  '서울시 서초구',
  '파티용으로 구매. 블렌디드라 접근성 좋음.'
);

-- 샘플 테이스팅 노트 추가
INSERT INTO tasting_notes (whiskey_id, tasting_date, color, nose, palate, finish, rating, notes) VALUES
(
  (SELECT id FROM whiskeys WHERE name = 'Macallan 18' LIMIT 1),
  '2024-01-20',
  '진한 황금색',
  '건조한 과일, 바닐라, 오크의 향',
  '부드럽고 달콤한 맛, 건조한 과일과 견과류의 노트',
  '길고 우아한 피니시, 오크와 바닐라의 여운',
  9,
  '정말 훌륭한 위스키입니다. 18년 숙성의 깊이가 느껴집니다. 특별한 날에 마시기 좋습니다.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Glenfiddich 12' LIMIT 1),
  '2024-02-25',
  '밝은 황금색',
  '배, 사과, 바닐라의 향',
  '부드럽고 달콤한 맛, 과일과 꽃의 노트',
  '깔끔하고 짧은 피니시',
  7,
  '입문자에게 좋은 위스키. 부드럽고 접근하기 쉬운 맛입니다.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Johnnie Walker Black Label' LIMIT 1),
  '2024-03-15',
  '진한 호박색',
  '스모크, 바닐라, 과일의 향',
  '균형잡힌 맛, 스모크와 과일의 조화',
  '중간 길이의 피니시, 스모크의 여운',
  8,
  '블렌디드의 장점이 잘 드러나는 위스키. 다양한 상황에서 마시기 좋습니다.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Yamazaki 12' LIMIT 1),
  '2024-04-01',
  '밝은 황금색',
  '과일, 꽃, 미즈나라 오크의 향',
  '우아하고 정교한 맛, 과일과 꽃의 노트',
  '길고 우아한 피니시, 미즈나라 오크의 특별한 여운',
  9,
  '일본 위스키의 정교함이 느껴집니다. 미즈나라 오크의 특별한 향이 인상적입니다.'
),
(
  (SELECT id FROM whiskeys WHERE name = 'Lagavulin 16' LIMIT 1),
  '2024-04-10',
  '진한 황금색',
  '강렬한 피트 스모크, 바다 소금, 의료용 알코올의 향',
  '강렬하고 복잡한 맛, 스모크와 소금의 조화',
  '매우 긴 피니시, 스모크의 강렬한 여운',
  8,
  '아일라의 강렬함이 잘 드러나는 위스키. 피트를 좋아하는 사람에게 추천합니다.'
);

-- 샘플 개인 노트 추가
INSERT INTO personal_notes (title, content, category, tags) VALUES
(
  '위스키 테이스팅 가이드',
  '# 위스키 테이스팅 방법

## 1. 색상 관찰
- 위스키의 색상을 관찰하여 숙성 정도를 파악합니다.
- 황금색에서 진한 호박색까지 다양한 색상을 가집니다.

## 2. 향 감상
- 위스키를 잔에 따르고 잠시 기다린 후 향을 감상합니다.
- 과일, 꽃, 스모크, 오크 등 다양한 향을 찾아보세요.

## 3. 맛 평가
- 작은 양을 입에 넣고 천천히 맛을 평가합니다.
- 첫 맛, 중간 맛, 피니시를 구분하여 평가합니다.

## 4. 평점 매기기
- 1-10점 척도로 전체적인 만족도를 평가합니다.
- 개인적인 취향을 반영하여 평가하세요.',
  '가이드',
  ARRAY['테이스팅', '가이드', '방법']
),
(
  '위스키 보관 방법',
  '# 위스키 보관 방법

## 적절한 보관 환경
- 직사광선을 피하고 서늘한 곳에 보관
- 온도: 15-20도, 습도: 60-70%
- 수직으로 세워서 보관

## 보관 기간
- 개봉 전: 수년간 보관 가능
- 개봉 후: 1-2년 내에 마시는 것이 좋음
- 공기와의 접촉을 최소화

## 보관 용기
- 원래 병에 보관하는 것이 가장 좋음
- 작은 병으로 분할 보관도 가능
- 밀폐 용기 사용 권장',
  '보관',
  ARRAY['보관', '방법', '팁']
),
(
  '위스키 용어 정리',
  '# 위스키 용어 정리

## 기본 용어
- **Single Malt**: 한 증류소에서 생산된 맥아 위스키
- **Blended**: 여러 증류소의 위스키를 섞은 것
- **Cask Strength**: 캐스크에서 바로 병입한 고도수 위스키
- **Peat**: 이탄, 스모크 향의 원료

## 숙성 관련
- **Age Statement**: 병에 표시된 숙성년수
- **Cask**: 숙성에 사용되는 나무통
- **Angel''s Share**: 숙성 중 증발하는 양

## 테이스팅 용어
- **Nose**: 향
- **Palate**: 맛
- **Finish**: 피니시, 여운
- **Body**: 입안에서 느껴지는 질감',
  '용어',
  ARRAY['용어', '정리', '기초']
);

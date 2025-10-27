-- 구매 기록 테이블에 남은양과 병 용량 컬럼 추가
-- 테이스팅 노트에서 남은양 계산을 위한 스키마 업데이트

-- 병 용량 컬럼 추가 (ml 단위, 기본값 700ml)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS bottle_volume INTEGER DEFAULT 700;

-- 남은양 컬럼 추가 (ml 단위, 기본값은 bottle_volume과 동일)
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS remaining_amount INTEGER DEFAULT 700;

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN purchases.bottle_volume IS '병 용량 (ml 단위)';
COMMENT ON COLUMN purchases.remaining_amount IS '남은 양 (ml 단위)';

-- 기존 데이터에 대한 초기화
-- 남은양이 없으면 병 용량과 동일하게 설정
UPDATE purchases 
SET remaining_amount = COALESCE(bottle_volume, 700) 
WHERE remaining_amount IS NULL;

-- 병 용량이 없으면 기본값 700ml로 설정
UPDATE purchases 
SET bottle_volume = 700 
WHERE bottle_volume IS NULL;


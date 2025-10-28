-- 구매 기록 테이블에 시음 관련 날짜 컬럼 추가
-- 시음 시작일과 마신 날짜를 기록하기 위한 스키마 업데이트

-- 시음 시작일 컬럼 추가 (nullable)
ALTER TABLE purchases 
ADD COLUMN tasting_start_date DATE DEFAULT NULL;

-- 마신 날짜 컬럼 추가 (nullable)
ALTER TABLE purchases 
ADD COLUMN tasting_finish_date DATE DEFAULT NULL;

-- 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN purchases.tasting_start_date IS '시음 시작일 - 위스키를 처음 시음한 날짜';
COMMENT ON COLUMN purchases.tasting_finish_date IS '마신 날짜 - 위스키를 모두 마신 날짜';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_purchases_tasting_start_date ON purchases(tasting_start_date);
CREATE INDEX IF NOT EXISTS idx_purchases_tasting_finish_date ON purchases(tasting_finish_date);

-- 기존 데이터 확인을 위한 쿼리 (실행 후 삭제 가능)
-- SELECT id, whiskey_id, tasting_start_date, tasting_finish_date 
-- FROM purchases 
-- WHERE tasting_start_date IS NOT NULL OR tasting_finish_date IS NOT NULL;

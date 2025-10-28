-- 구매 정보 테이블에 할인금액과 최종금액 필드 추가

-- 할인금액 필드 추가
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2);

-- 최종금액 필드 추가  
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

-- 기존 데이터에 대한 코멘트 추가
COMMENT ON COLUMN purchases.discount_price IS '할인된 금액';
COMMENT ON COLUMN purchases.final_price IS '최종 결제 금액 (구매금액 - 할인금액)';

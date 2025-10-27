-- 할인 금액별 화폐 단위 필드 추가 SQL 스키마
-- 기존 purchases 테이블에 각 할인 유형별 화폐 단위 컬럼 추가

-- 1. 기본 할인 화폐 단위 컬럼 추가
DO $$ 
BEGIN
    -- 기본 할인 화폐 단위 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'basic_discount_currency') THEN
        ALTER TABLE purchases ADD COLUMN basic_discount_currency VARCHAR(3) NOT NULL DEFAULT 'KRW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'basic_discount_exchange_rate') THEN
        ALTER TABLE purchases ADD COLUMN basic_discount_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0;
    END IF;
    
    -- 쿠폰 할인 화폐 단위 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'coupon_discount_currency') THEN
        ALTER TABLE purchases ADD COLUMN coupon_discount_currency VARCHAR(3) NOT NULL DEFAULT 'KRW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'coupon_discount_exchange_rate') THEN
        ALTER TABLE purchases ADD COLUMN coupon_discount_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0;
    END IF;
    
    -- 멤버십 할인 화폐 단위 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'membership_discount_currency') THEN
        ALTER TABLE purchases ADD COLUMN membership_discount_currency VARCHAR(3) NOT NULL DEFAULT 'KRW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'membership_discount_exchange_rate') THEN
        ALTER TABLE purchases ADD COLUMN membership_discount_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0;
    END IF;
    
    -- 이벤트 할인 화폐 단위 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'event_discount_currency') THEN
        ALTER TABLE purchases ADD COLUMN event_discount_currency VARCHAR(3) NOT NULL DEFAULT 'KRW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'event_discount_exchange_rate') THEN
        ALTER TABLE purchases ADD COLUMN event_discount_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0;
    END IF;
    
    RAISE NOTICE 'Discount currency columns added successfully';
END $$;

-- 2. 최종 가격 계산 함수 업데이트
CREATE OR REPLACE FUNCTION calculate_final_price_krw(
    p_original_price NUMERIC,
    p_original_currency VARCHAR(3),
    p_original_exchange_rate NUMERIC,
    p_basic_discount_amount NUMERIC,
    p_basic_discount_currency VARCHAR(3),
    p_basic_discount_exchange_rate NUMERIC,
    p_coupon_discount_amount NUMERIC,
    p_coupon_discount_currency VARCHAR(3),
    p_coupon_discount_exchange_rate NUMERIC,
    p_membership_discount_amount NUMERIC,
    p_membership_discount_currency VARCHAR(3),
    p_membership_discount_exchange_rate NUMERIC,
    p_event_discount_amount NUMERIC,
    p_event_discount_currency VARCHAR(3),
    p_event_discount_exchange_rate NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    original_price_krw NUMERIC;
    basic_discount_krw NUMERIC;
    coupon_discount_krw NUMERIC;
    membership_discount_krw NUMERIC;
    event_discount_krw NUMERIC;
    total_discount_krw NUMERIC;
    final_price NUMERIC;
BEGIN
    -- 원래 가격을 KRW로 변환
    IF p_original_currency = 'KRW' THEN
        original_price_krw := p_original_price;
    ELSE
        original_price_krw := p_original_price * p_original_exchange_rate;
    END IF;
    
    -- 기본 할인 금액을 KRW로 변환
    IF p_basic_discount_currency = 'KRW' THEN
        basic_discount_krw := p_basic_discount_amount;
    ELSE
        basic_discount_krw := p_basic_discount_amount * p_basic_discount_exchange_rate;
    END IF;
    
    -- 쿠폰 할인 금액을 KRW로 변환
    IF p_coupon_discount_currency = 'KRW' THEN
        coupon_discount_krw := p_coupon_discount_amount;
    ELSE
        coupon_discount_krw := p_coupon_discount_amount * p_coupon_discount_exchange_rate;
    END IF;
    
    -- 멤버십 할인 금액을 KRW로 변환
    IF p_membership_discount_currency = 'KRW' THEN
        membership_discount_krw := p_membership_discount_amount;
    ELSE
        membership_discount_krw := p_membership_discount_amount * p_membership_discount_exchange_rate;
    END IF;
    
    -- 이벤트 할인 금액을 KRW로 변환
    IF p_event_discount_currency = 'KRW' THEN
        event_discount_krw := p_event_discount_amount;
    ELSE
        event_discount_krw := p_event_discount_amount * p_event_discount_exchange_rate;
    END IF;
    
    -- 총 할인 금액 계산
    total_discount_krw := basic_discount_krw + coupon_discount_krw + membership_discount_krw + event_discount_krw;
    
    -- 최종 가격 계산
    final_price := original_price_krw - total_discount_krw;
    
    -- 음수가 되지 않도록 보정
    IF final_price < 0 THEN
        final_price := 0;
    END IF;
    
    RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- 3. 최종 가격 자동 계산 트리거 함수 업데이트
CREATE OR REPLACE FUNCTION update_final_price_krw()
RETURNS TRIGGER AS $$
BEGIN
    NEW.final_price_krw := calculate_final_price_krw(
        NEW.original_price,
        NEW.original_currency,
        NEW.original_exchange_rate,
        NEW.basic_discount_amount,
        NEW.basic_discount_currency,
        NEW.basic_discount_exchange_rate,
        NEW.coupon_discount_amount,
        NEW.coupon_discount_currency,
        NEW.coupon_discount_exchange_rate,
        NEW.membership_discount_amount,
        NEW.membership_discount_currency,
        NEW.membership_discount_exchange_rate,
        NEW.event_discount_amount,
        NEW.event_discount_currency,
        NEW.event_discount_exchange_rate
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 기존 데이터의 최종 가격 업데이트
UPDATE purchases 
SET final_price_krw = calculate_final_price_krw(
    original_price,
    original_currency,
    original_exchange_rate,
    basic_discount_amount,
    basic_discount_currency,
    basic_discount_exchange_rate,
    coupon_discount_amount,
    coupon_discount_currency,
    coupon_discount_exchange_rate,
    membership_discount_amount,
    membership_discount_currency,
    membership_discount_exchange_rate,
    event_discount_amount,
    event_discount_currency,
    event_discount_exchange_rate
)
WHERE final_price_krw = 0;

-- 5. 샘플 데이터 업데이트 (테스트용)
UPDATE purchases 
SET 
    basic_discount_currency = 'KRW',
    basic_discount_exchange_rate = 1.0,
    coupon_discount_currency = 'KRW',
    coupon_discount_exchange_rate = 1.0,
    membership_discount_currency = 'KRW',
    membership_discount_exchange_rate = 1.0,
    event_discount_currency = 'KRW',
    event_discount_exchange_rate = 1.0
WHERE basic_discount_currency IS NULL;

-- 완료 메시지
SELECT 'Discount currency fields added successfully!' as message;

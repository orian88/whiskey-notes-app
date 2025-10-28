-- 위스키 가격 추적 테이블 추가 (안전한 버전 - 기존 데이터 보존)
-- 이 SQL 스키마는 기존 데이터를 보존하면서 업데이트합니다

-- 1. 가격 이력 추적 테이블 생성
CREATE TABLE IF NOT EXISTS whiskey_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whiskey_id UUID REFERENCES whiskeys(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  price_usd DECIMAL(10,2), -- USD 가격
  exchange_rate DECIMAL(10,4), -- 환율 (KRW/USD)
  price_date DATE DEFAULT CURRENT_DATE,
  source VARCHAR(255), -- 가격 출처 (웹사이트명)
  source_url VARCHAR(500), -- 가격 출처 URL
  currency VARCHAR(10) DEFAULT 'KRW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 기존 컬럼이 없는 경우에만 추가
DO $$ 
BEGIN
  -- whiskey_prices 테이블에 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskey_prices' AND column_name='price_usd') THEN
    ALTER TABLE whiskey_prices ADD COLUMN price_usd DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskey_prices' AND column_name='exchange_rate') THEN
    ALTER TABLE whiskey_prices ADD COLUMN exchange_rate DECIMAL(10,4);
  END IF;
  
  -- whiskeys 테이블에 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='current_price') THEN
    ALTER TABLE whiskeys ADD COLUMN current_price DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='current_price_usd') THEN
    ALTER TABLE whiskeys ADD COLUMN current_price_usd DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='exchange_rate') THEN
    ALTER TABLE whiskeys ADD COLUMN exchange_rate DECIMAL(10,4);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='price_range_min') THEN
    ALTER TABLE whiskeys ADD COLUMN price_range_min DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='price_range_max') THEN
    ALTER TABLE whiskeys ADD COLUMN price_range_max DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='last_price_update') THEN
    ALTER TABLE whiskeys ADD COLUMN last_price_update TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskeys' AND column_name='price_source') THEN
    ALTER TABLE whiskeys ADD COLUMN price_source VARCHAR(255);
  END IF;
END $$;

-- 3. 인덱스 생성 (이미 존재하지 않는 경우만)
CREATE INDEX IF NOT EXISTS idx_whiskey_prices_whiskey_id ON whiskey_prices(whiskey_id);
CREATE INDEX IF NOT EXISTS idx_whiskey_prices_date ON whiskey_prices(price_date);
CREATE INDEX IF NOT EXISTS idx_whiskey_prices_whiskey_date ON whiskey_prices(whiskey_id, price_date DESC);

-- 4. 최신 가격을 자동으로 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_whiskey_current_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whiskeys
  SET 
    current_price = NEW.price,
    current_price_usd = NEW.price_usd,
    exchange_rate = NEW.exchange_rate,
    last_price_update = NOW(),
    price_source = NEW.source
  WHERE id = NEW.whiskey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 트리거 생성 (기존 트리거 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_whiskey_price_trigger ON whiskey_prices;
CREATE TRIGGER update_whiskey_price_trigger
  AFTER INSERT ON whiskey_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_whiskey_current_price();

-- 6. 가격 통계를 조회하는 뷰 생성
DROP VIEW IF EXISTS whiskey_price_stats;

CREATE VIEW whiskey_price_stats AS
SELECT 
  w.id,
  w.name,
  w.brand,
  w.current_price,
  w.current_price_usd,
  w.exchange_rate,
  w.price_range_min,
  w.price_range_max,
  w.last_price_update,
  COUNT(wp.id) as price_history_count,
  MIN(wp.price) as historical_min_price,
  MAX(wp.price) as historical_max_price,
  AVG(wp.price) as historical_avg_price
FROM whiskeys w
LEFT JOIN whiskey_prices wp ON w.id = wp.whiskey_id
WHERE w.current_price IS NOT NULL
GROUP BY w.id, w.name, w.brand, w.current_price, w.current_price_usd, w.exchange_rate, w.price_range_min, w.price_range_max, w.last_price_update;

-- 7. RLS 정책
ALTER TABLE whiskey_prices ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all operations on whiskey_prices" ON whiskey_prices;

CREATE POLICY "Allow all operations on whiskey_prices" 
ON whiskey_prices FOR ALL 
USING (true) 
WITH CHECK (true);

-- 8. 가격 구간을 반환하는 함수
DROP FUNCTION IF EXISTS get_price_range(DECIMAL);

CREATE FUNCTION get_price_range(price DECIMAL)
RETURNS VARCHAR(50) AS $$
BEGIN
  CASE
    WHEN price IS NULL THEN RETURN '미표시';
    WHEN price < 50000 THEN RETURN '5만원 미만';
    WHEN price < 100000 THEN RETURN '5~10만원';
    WHEN price < 200000 THEN RETURN '10~20만원';
    WHEN price < 300000 THEN RETURN '20~30만원';
    WHEN price < 500000 THEN RETURN '30~50만원';
    WHEN price < 1000000 THEN RETURN '50~100만원';
    WHEN price < 2000000 THEN RETURN '100~200만원';
    WHEN price < 5000000 THEN RETURN '200~500만원';
    WHEN price >= 5000000 THEN RETURN '500만원 이상';
    ELSE RETURN '기타';
  END CASE;
END;
$$ LANGUAGE plpgsql;


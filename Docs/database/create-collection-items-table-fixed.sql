-- 진열장 아이템을 위한 뷰 생성 (수정된 버전)
-- 뷰에는 인덱스를 직접 생성할 수 없으므로 기본 테이블들에 인덱스를 생성

-- 먼저 기본 테이블들에 필요한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_purchases_whiskey_id ON purchases(whiskey_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_whiskeys_id ON whiskeys(id);
CREATE INDEX IF NOT EXISTS idx_whiskeys_name ON whiskeys(name);

CREATE INDEX IF NOT EXISTS idx_tasting_notes_purchase_id ON tasting_notes(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_tasting_date ON tasting_notes(tasting_date);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_rating ON tasting_notes(rating);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_amount_consumed ON tasting_notes(amount_consumed) WHERE amount_consumed IS NOT NULL;

-- 진열장 아이템을 위한 뷰 생성
CREATE OR REPLACE VIEW collection_items AS
SELECT 
  p.id,
  p.id as purchase_id,
  p.whiskey_id,
  p.purchase_date,
  p.created_at,
  p.updated_at,
  
  -- 위스키 정보
  w.name as whiskey_name,
  w.english_name,
  w.korean_name,
  w.brand,
  w.type,
  w.age,
  w.bottle_volume,
  w.abv,
  w.region,
  w.image_url,
  w.description,
  
  -- 테이스팅 통계
  COALESCE(tasting_stats.tasting_count, 0) as tasting_count,
  COALESCE(tasting_stats.avg_rating, 0) as current_rating,
  COALESCE(tasting_stats.last_tasted, NULL) as last_tasted,
  
  -- 남은 양 계산 (테이스팅 노트의 amount_consumed 합계)
  GREATEST(0, 100 - COALESCE(consumed_stats.total_consumed, 0)) as remaining_amount

FROM purchases p
LEFT JOIN whiskeys w ON p.whiskey_id = w.id
LEFT JOIN (
  SELECT 
    purchase_id,
    COUNT(*) as tasting_count,
    AVG(rating) as avg_rating,
    MAX(tasting_date) as last_tasted
  FROM tasting_notes 
  GROUP BY purchase_id
) tasting_stats ON p.id = tasting_stats.purchase_id
LEFT JOIN (
  SELECT 
    purchase_id,
    SUM(COALESCE(amount_consumed, 0)) as total_consumed
  FROM tasting_notes 
  WHERE amount_consumed IS NOT NULL
  GROUP BY purchase_id
) consumed_stats ON p.id = consumed_stats.purchase_id;

-- 진열장 통계를 위한 함수
CREATE OR REPLACE FUNCTION get_collection_stats()
RETURNS TABLE (
  total_items BIGINT,
  total_tastings BIGINT,
  avg_remaining_amount NUMERIC,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    SUM(tasting_count) as total_tastings,
    AVG(remaining_amount) as avg_remaining_amount,
    AVG(CASE WHEN current_rating > 0 THEN current_rating ELSE NULL END) as avg_rating
  FROM collection_items;
END;
$$ LANGUAGE plpgsql;

-- 특정 위스키의 진열장 정보를 가져오는 함수
CREATE OR REPLACE FUNCTION get_whiskey_collection_info(p_whiskey_id UUID)
RETURNS TABLE (
  purchase_id UUID,
  whiskey_name VARCHAR,
  brand VARCHAR,
  type VARCHAR,
  age INTEGER,
  remaining_amount NUMERIC,
  current_rating NUMERIC,
  tasting_count BIGINT,
  last_tasted DATE,
  purchase_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.purchase_id,
    ci.whiskey_name,
    ci.brand,
    ci.type,
    ci.age,
    ci.remaining_amount,
    ci.current_rating,
    ci.tasting_count,
    ci.last_tasted,
    ci.purchase_date
  FROM collection_items ci
  WHERE ci.whiskey_id = p_whiskey_id
  ORDER BY ci.purchase_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 뷰에 대한 권한 설정 (필요한 경우)
-- GRANT SELECT ON collection_items TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_collection_stats() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_whiskey_collection_info(UUID) TO authenticated;

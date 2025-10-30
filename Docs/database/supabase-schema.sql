# Supabase 데이터베이스 스키마 생성 SQL

-- 위스키 정보 테이블
CREATE TABLE whiskeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  type VARCHAR(100),
  age INTEGER,
  bottle_volume INTEGER,
  abv DECIMAL(4,2),
  region VARCHAR(255),
  price DECIMAL(10,2),
  distillery VARCHAR(255),
  description TEXT,
  cask VARCHAR(255),
  image_url VARCHAR(500),
  ref_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 구매 정보 테이블
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whiskey_id UUID REFERENCES whiskeys(id) ON DELETE CASCADE,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  discount_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  store_name VARCHAR(255),
  store_location VARCHAR(255),
  notes TEXT,
  -- 추가: 구매 시점의 용량과 도수 (위스키 테이블과 다를 수 있음)
  bottle_volume INTEGER,
  abv DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테이스팅 노트 테이블
CREATE TABLE tasting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whiskey_id UUID REFERENCES whiskeys(id) ON DELETE CASCADE,
  tasting_date DATE,
  color VARCHAR(100),
  nose TEXT,
  palate TEXT,
  finish TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 개인 노트 테이블
CREATE TABLE personal_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_whiskeys_name ON whiskeys(name);
CREATE INDEX idx_whiskeys_brand ON whiskeys(brand);
CREATE INDEX idx_whiskeys_type ON whiskeys(type);
CREATE INDEX idx_whiskeys_region ON whiskeys(region);

CREATE INDEX idx_purchases_whiskey_id ON purchases(whiskey_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);

CREATE INDEX idx_tasting_notes_whiskey_id ON tasting_notes(whiskey_id);
CREATE INDEX idx_tasting_notes_date ON tasting_notes(tasting_date);
CREATE INDEX idx_tasting_notes_rating ON tasting_notes(rating);

CREATE INDEX idx_personal_notes_title ON personal_notes(title);
CREATE INDEX idx_personal_notes_category ON personal_notes(category);
CREATE INDEX idx_personal_notes_tags ON personal_notes USING GIN(tags);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_whiskeys_updated_at BEFORE UPDATE ON whiskeys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasting_notes_updated_at BEFORE UPDATE ON tasting_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_notes_updated_at BEFORE UPDATE ON personal_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 설정 (개인용이므로 모든 접근 허용)
ALTER TABLE whiskeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON whiskeys FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON purchases FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tasting_notes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON personal_notes FOR ALL USING (true);

-- 위스키 통계 뷰
CREATE VIEW whiskey_stats AS
SELECT 
    w.id,
    w.name,
    w.brand,
    COUNT(DISTINCT p.id) as purchase_count,
    COUNT(DISTINCT tn.id) as tasting_count,
    AVG(tn.rating) as avg_rating,
    MAX(tn.tasting_date) as last_tasted,
    MIN(p.purchase_date) as first_purchased
FROM whiskeys w
LEFT JOIN purchases p ON w.id = p.whiskey_id
LEFT JOIN tasting_notes tn ON w.id = tn.whiskey_id
GROUP BY w.id, w.name, w.brand;

-- 구매 통계 뷰
CREATE VIEW purchase_stats AS
SELECT 
    DATE_TRUNC('month', purchase_date) as month,
    COUNT(*) as purchase_count,
    SUM(purchase_price) as total_spent,
    AVG(purchase_price) as avg_price
FROM purchases
WHERE purchase_date IS NOT NULL
GROUP BY DATE_TRUNC('month', purchase_date)
ORDER BY month DESC;

-- 위스키 검색 함수
CREATE OR REPLACE FUNCTION search_whiskeys(search_term TEXT)
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    brand VARCHAR(255),
    type VARCHAR(100),
    region VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.name, w.brand, w.type, w.region
    FROM whiskeys w
    WHERE 
        w.name ILIKE '%' || search_term || '%' OR
        w.brand ILIKE '%' || search_term || '%' OR
        w.region ILIKE '%' || search_term || '%'
    ORDER BY w.name;
END;
$$ LANGUAGE plpgsql;

-- 평점 통계 함수
CREATE OR REPLACE FUNCTION get_rating_stats(whiskey_uuid UUID)
RETURNS TABLE(
    avg_rating DECIMAL,
    min_rating INTEGER,
    max_rating INTEGER,
    rating_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(tn.rating)::DECIMAL,
        MIN(tn.rating),
        MAX(tn.rating),
        COUNT(tn.rating)
    FROM tasting_notes tn
    WHERE tn.whiskey_id = whiskey_uuid;
END;
$$ LANGUAGE plpgsql;

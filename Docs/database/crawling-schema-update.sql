# Supabase 데이터베이스 스키마 업데이트 SQL (크롤링 기능 추가)

-- 위스키 테이블에 크롤링 정보 컬럼 추가
ALTER TABLE whiskeys 
ADD COLUMN IF NOT EXISTS english_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS korean_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS aroma TEXT,
ADD COLUMN IF NOT EXISTS taste TEXT,
ADD COLUMN IF NOT EXISTS finish TEXT,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_crawled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crawled_at TIMESTAMP WITH TIME ZONE;

-- 기존 데이터 마이그레이션 (name을 korean_name으로 복사)
UPDATE whiskeys 
SET korean_name = name, english_name = name 
WHERE korean_name IS NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_whiskeys_english_name ON whiskeys(english_name);
CREATE INDEX IF NOT EXISTS idx_whiskeys_korean_name ON whiskeys(korean_name);
CREATE INDEX IF NOT EXISTS idx_whiskeys_country ON whiskeys(country);
CREATE INDEX IF NOT EXISTS idx_whiskeys_is_crawled ON whiskeys(is_crawled);

-- 크롤링된 위스키 검색 함수
CREATE OR REPLACE FUNCTION search_crawled_whiskeys(search_term TEXT)
RETURNS TABLE(
    id UUID,
    english_name VARCHAR(255),
    korean_name VARCHAR(255),
    brand VARCHAR(255),
    type VARCHAR(100),
    region VARCHAR(255),
    country VARCHAR(100),
    price DECIMAL(10,2),
    is_crawled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.english_name, w.korean_name, w.brand, w.type, w.region, w.country, w.price, w.is_crawled
    FROM whiskeys w
    WHERE 
        w.english_name ILIKE '%' || search_term || '%' OR
        w.korean_name ILIKE '%' || search_term || '%' OR
        w.brand ILIKE '%' || search_term || '%' OR
        w.region ILIKE '%' || search_term || '%' OR
        w.country ILIKE '%' || search_term || '%'
    ORDER BY w.korean_name;
END;
$$ LANGUAGE plpgsql;

-- 위스키 업데이트 함수 (크롤링 데이터로)
CREATE OR REPLACE FUNCTION update_whiskey_from_crawl(
    whiskey_id UUID,
    english_name_val VARCHAR(255),
    korean_name_val VARCHAR(255),
    volume_val INTEGER,
    price_val DECIMAL(10,2),
    aroma_val TEXT,
    taste_val TEXT,
    finish_val TEXT,
    type_val VARCHAR(100),
    abv_val DECIMAL(4,2),
    country_val VARCHAR(100),
    region_val VARCHAR(255),
    cask_val VARCHAR(255),
    description_val TEXT,
    image_url_val VARCHAR(500),
    ref_url_val VARCHAR(500)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE whiskeys 
    SET 
        english_name = english_name_val,
        korean_name = korean_name_val,
        bottle_volume = volume_val,
        price = price_val,
        aroma = aroma_val,
        taste = taste_val,
        finish = finish_val,
        type = type_val,
        abv = abv_val,
        country = country_val,
        region = region_val,
        cask = cask_val,
        description = description_val,
        image_url = image_url_val,
        ref_url = ref_url_val,
        is_crawled = TRUE,
        crawled_at = NOW(),
        updated_at = NOW()
    WHERE id = whiskey_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 중복 위스키 확인 함수 (ref_url 기준)
CREATE OR REPLACE FUNCTION find_whiskey_by_ref_url(ref_url_val VARCHAR(500))
RETURNS UUID AS $$
DECLARE
    whiskey_uuid UUID;
BEGIN
    SELECT id INTO whiskey_uuid
    FROM whiskeys 
    WHERE ref_url = ref_url_val;
    
    RETURN whiskey_uuid;
END;
$$ LANGUAGE plpgsql;

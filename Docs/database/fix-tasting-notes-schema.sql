-- tasting_notes 테이블 스키마 수정 쿼리
-- 올바른 데이터베이스 구조로 수정

-- 1. 기존 tasting_notes 테이블의 whiskey_id 외래키 제약조건 제거
ALTER TABLE tasting_notes DROP CONSTRAINT IF EXISTS tasting_notes_whiskey_id_fkey;

-- 2. 기존 whiskey_id 컬럼 제거 (만약 존재한다면)
ALTER TABLE tasting_notes DROP COLUMN IF EXISTS whiskey_id;

-- 3. purchase_id 컬럼 추가 (만약 존재하지 않는다면)
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS purchase_id UUID;

-- 4. purchase_id 외래키 제약조건 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasting_notes_purchase_id_fkey' 
        AND table_name = 'tasting_notes'
    ) THEN
        ALTER TABLE tasting_notes ADD CONSTRAINT tasting_notes_purchase_id_fkey 
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. 기존 인덱스 제거 (whiskey_id 기반)
DROP INDEX IF EXISTS idx_tasting_notes_whiskey_id;

-- 6. 새로운 인덱스 생성 (purchase_id 기반)
CREATE INDEX IF NOT EXISTS idx_tasting_notes_purchase_id ON tasting_notes(purchase_id);

-- 7. 추가 필드들 추가 (실제 DB에 존재하는 필드들)
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS amount_consumed DECIMAL(8,2);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS nose_rating INTEGER CHECK (nose_rating >= 0 AND nose_rating <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS palate_rating INTEGER CHECK (palate_rating >= 0 AND palate_rating <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS finish_rating INTEGER CHECK (finish_rating >= 0 AND finish_rating <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS sweetness INTEGER CHECK (sweetness >= 0 AND sweetness <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS smokiness INTEGER CHECK (smokiness >= 0 AND smokiness <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS fruitiness INTEGER CHECK (fruitiness >= 0 AND fruitiness <= 10);
ALTER TABLE tasting_notes ADD COLUMN IF NOT EXISTS complexity INTEGER CHECK (complexity >= 0 AND complexity <= 10);

-- 8. 기존 데이터 마이그레이션 (whiskey_id가 있는 경우 purchase_id로 변환)
-- 주의: 이 부분은 실제 데이터가 있는 경우에만 실행하세요
-- UPDATE tasting_notes 
-- SET purchase_id = (
--     SELECT p.id 
--     FROM purchases p 
--     WHERE p.whiskey_id = tasting_notes.whiskey_id 
--     LIMIT 1
-- )
-- WHERE whiskey_id IS NOT NULL AND purchase_id IS NULL;

-- 9. 기존 통계 뷰 수정 (whiskey_id 대신 purchase_id를 통해 whiskeys와 연결)
DROP VIEW IF EXISTS whiskey_stats;
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
LEFT JOIN tasting_notes tn ON p.id = tn.purchase_id  -- 수정된 부분
GROUP BY w.id, w.name, w.brand;

-- 10. 기존 함수 수정 (whiskey_id 대신 purchase_id 사용)
DROP FUNCTION IF EXISTS get_rating_stats(UUID);
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
    JOIN purchases p ON tn.purchase_id = p.id  -- 수정된 부분
    WHERE p.whiskey_id = whiskey_uuid;
END;
$$ LANGUAGE plpgsql;

-- 11. 새로운 함수: 구매 ID로 테이스팅 노트 조회
CREATE OR REPLACE FUNCTION get_tasting_notes_by_purchase(purchase_uuid UUID)
RETURNS TABLE(
    id UUID,
    tasting_date DATE,
    color VARCHAR(100),
    nose TEXT,
    palate TEXT,
    finish TEXT,
    rating INTEGER,
    notes TEXT,
    amount_consumed DECIMAL(8,2),
    nose_rating INTEGER,
    palate_rating INTEGER,
    finish_rating INTEGER,
    sweetness INTEGER,
    smokiness INTEGER,
    fruitiness INTEGER,
    complexity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.tasting_date,
        tn.color,
        tn.nose,
        tn.palate,
        tn.finish,
        tn.rating,
        tn.notes,
        tn.amount_consumed,
        tn.nose_rating,
        tn.palate_rating,
        tn.finish_rating,
        tn.sweetness,
        tn.smokiness,
        tn.fruitiness,
        tn.complexity,
        tn.created_at,
        tn.updated_at
    FROM tasting_notes tn
    WHERE tn.purchase_id = purchase_uuid
    ORDER BY tn.tasting_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. 새로운 함수: 위스키 ID로 테이스팅 노트 조회 (purchase를 통해)
CREATE OR REPLACE FUNCTION get_tasting_notes_by_whiskey(whiskey_uuid UUID)
RETURNS TABLE(
    id UUID,
    purchase_id UUID,
    tasting_date DATE,
    color VARCHAR(100),
    nose TEXT,
    palate TEXT,
    finish TEXT,
    rating INTEGER,
    notes TEXT,
    amount_consumed DECIMAL(8,2),
    nose_rating INTEGER,
    palate_rating INTEGER,
    finish_rating INTEGER,
    sweetness INTEGER,
    smokiness INTEGER,
    fruitiness INTEGER,
    complexity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.purchase_id,
        tn.tasting_date,
        tn.color,
        tn.nose,
        tn.palate,
        tn.finish,
        tn.rating,
        tn.notes,
        tn.amount_consumed,
        tn.nose_rating,
        tn.palate_rating,
        tn.finish_rating,
        tn.sweetness,
        tn.smokiness,
        tn.fruitiness,
        tn.complexity,
        tn.created_at,
        tn.updated_at
    FROM tasting_notes tn
    JOIN purchases p ON tn.purchase_id = p.id
    WHERE p.whiskey_id = whiskey_uuid
    ORDER BY tn.tasting_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 13. RLS 정책 업데이트 (필요시)
-- 기존 정책이 있다면 그대로 유지

-- 완료 메시지
SELECT 'tasting_notes 테이블 스키마 수정이 완료되었습니다.' as message;

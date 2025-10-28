-- whiskeys 테이블에 is_favorite 필드 추가
-- 즐겨찾기(버킷 리스트) 기능을 위한 컬럼

ALTER TABLE whiskeys ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_whiskeys_is_favorite ON whiskeys(is_favorite);

-- 코멘트 추가
COMMENT ON COLUMN whiskeys.is_favorite IS '위스키 즐겨찾기 여부 (버킷 리스트)';


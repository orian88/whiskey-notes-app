-- 테이스팅 노트 테이블 생성
-- 위스키 시음 기록을 위한 테이블

CREATE TABLE IF NOT EXISTS tasting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whiskey_id UUID NOT NULL REFERENCES whiskeys(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    
    -- 시음 정보
    tasting_date DATE NOT NULL,
    amount_consumed INTEGER NOT NULL DEFAULT 0, -- 마신 양 (ml)
    
    -- 시음 노트
    color TEXT,
    nose TEXT,
    palate TEXT,
    finish TEXT,
    
    -- 평가 점수 (1-10점)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 10),
    nose_rating INTEGER CHECK (nose_rating >= 1 AND nose_rating <= 10),
    palate_rating INTEGER CHECK (palate_rating >= 1 AND palate_rating <= 10),
    finish_rating INTEGER CHECK (finish_rating >= 1 AND finish_rating <= 10),
    
    -- 추가 평가 항목
    sweetness INTEGER CHECK (sweetness >= 1 AND sweetness <= 10),
    smokiness INTEGER CHECK (smokiness >= 1 AND smokiness <= 10),
    fruitiness INTEGER CHECK (fruitiness >= 1 AND fruitiness <= 10),
    complexity INTEGER CHECK (complexity >= 1 AND complexity <= 10),
    
    -- 추가 노트
    notes TEXT,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasting_notes_whiskey_id ON tasting_notes(whiskey_id);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_purchase_id ON tasting_notes(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_tasting_date ON tasting_notes(tasting_date);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_overall_rating ON tasting_notes(overall_rating);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 자신의 데이터에 접근 가능
CREATE POLICY "Users can view their own tasting notes" ON tasting_notes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own tasting notes" ON tasting_notes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own tasting notes" ON tasting_notes
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own tasting notes" ON tasting_notes
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- 업데이트 시 updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_tasting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설정
CREATE TRIGGER update_tasting_notes_updated_at
    BEFORE UPDATE ON tasting_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_tasting_notes_updated_at();

-- 코멘트 추가
COMMENT ON TABLE tasting_notes IS '위스키 테이스팅 노트 테이블';
COMMENT ON COLUMN tasting_notes.whiskey_id IS '위스키 ID (외래키)';
COMMENT ON COLUMN tasting_notes.purchase_id IS '구매 기록 ID (외래키, 선택적)';
COMMENT ON COLUMN tasting_notes.tasting_date IS '시음 날짜';
COMMENT ON COLUMN tasting_notes.amount_consumed IS '마신 양 (ml)';
COMMENT ON COLUMN tasting_notes.overall_rating IS '전체 평가 점수 (1-10점)';
COMMENT ON COLUMN tasting_notes.nose_rating IS '향 평가 점수 (1-10점)';
COMMENT ON COLUMN tasting_notes.palate_rating IS '맛 평가 점수 (1-10점)';
COMMENT ON COLUMN tasting_notes.finish_rating IS '여운 평가 점수 (1-10점)';
COMMENT ON COLUMN tasting_notes.sweetness IS '단맛 정도 (1-10점)';
COMMENT ON COLUMN tasting_notes.smokiness IS '스모키함 정도 (1-10점)';
COMMENT ON COLUMN tasting_notes.fruitiness IS '과일향 정도 (1-10점)';
COMMENT ON COLUMN tasting_notes.complexity IS '복합성 정도 (1-10점)';

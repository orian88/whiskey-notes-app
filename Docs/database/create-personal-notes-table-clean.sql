-- 개인 노트 테이블 생성 (완전히 새로 생성)
-- 기존 테이블이 있다면 삭제하고 새로 생성

-- 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS personal_notes CASCADE;

-- 개인 노트 테이블 생성
CREATE TABLE personal_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(100),
  tags TEXT[], -- 배열 형태로 태그 저장
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 날짜별로 유니크한 제약조건 (하루에 하나의 노트만 허용)
  UNIQUE(note_date)
);

-- 인덱스 생성
CREATE INDEX idx_personal_notes_date ON personal_notes(note_date);
CREATE INDEX idx_personal_notes_category ON personal_notes(category);
CREATE INDEX idx_personal_notes_created_at ON personal_notes(created_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (개인용 앱이므로)
CREATE POLICY "Enable all operations for all users" ON personal_notes
  FOR ALL USING (true) WITH CHECK (true);

-- updated_at 자동 업데이트를 위한 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personal_notes_updated_at 
  BEFORE UPDATE ON personal_notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입 (선택사항)
INSERT INTO personal_notes (note_date, title, content, category, tags) VALUES
  ('2024-01-15', '첫 번째 위스키 테이스팅', '<p>오늘은 맥켈란 12년을 처음 마셔봤다. 꽤 달콤한 맛이 인상적이었다.</p>', '테이스팅', ARRAY['맥켈란', '첫테이스팅', '달콤함']),
  ('2024-01-20', '위스키 쇼핑', '<p>오늘 위스키샵에서 좋은 병들을 발견했다. 다음 달에 구매할 예정이다.</p>', '쇼핑', ARRAY['쇼핑', '계획']),
  ('2024-01-25', '위스키 공부', '<p>스코틀랜드 위스키의 지역별 특성에 대해 공부했다. 매우 흥미로웠다.</p>', '학습', ARRAY['스코틀랜드', '지역별특성', '공부'])
ON CONFLICT (note_date) DO NOTHING;

-- 테이블 생성 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'personal_notes' 
ORDER BY ordinal_position;

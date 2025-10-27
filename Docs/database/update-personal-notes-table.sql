-- 기존 personal_notes 테이블을 수정하는 스키마
-- 'date' 컬럼을 'note_date'로 변경

-- 먼저 기존 테이블이 있는지 확인
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'personal_notes') THEN
        -- 기존 테이블이 있는 경우 컬럼명 변경
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'personal_notes' AND column_name = 'date') THEN
            -- 'date' 컬럼을 'note_date'로 변경
            ALTER TABLE personal_notes RENAME COLUMN date TO note_date;
            RAISE NOTICE 'Column "date" renamed to "note_date" successfully.';
        ELSE
            RAISE NOTICE 'Column "date" does not exist or already renamed.';
        END IF;
    ELSE
        -- 테이블이 없는 경우 새로 생성
        CREATE TABLE personal_notes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          note_date DATE NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          category VARCHAR(100),
          tags TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(note_date)
        );
        
        -- 인덱스 생성
        CREATE INDEX idx_personal_notes_date ON personal_notes(note_date);
        CREATE INDEX idx_personal_notes_category ON personal_notes(category);
        CREATE INDEX idx_personal_notes_created_at ON personal_notes(created_at);
        
        -- RLS 설정
        ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Enable all operations for all users" ON personal_notes
          FOR ALL USING (true) WITH CHECK (true);
        
        -- 트리거 설정
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
        
        RAISE NOTICE 'Table "personal_notes" created successfully.';
    END IF;
END $$;

-- 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'personal_notes' 
ORDER BY ordinal_position;

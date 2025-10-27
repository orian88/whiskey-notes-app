-- Add purchase_id FK to tasting_notes (rename whiskey_id -> purchase_id if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasting_notes' AND column_name='whiskey_id'
  ) THEN
    ALTER TABLE tasting_notes RENAME COLUMN whiskey_id TO purchase_id;
  END IF;
END $$;

-- Ensure purchase_id exists
ALTER TABLE tasting_notes
  ADD COLUMN IF NOT EXISTS purchase_id uuid;

-- Add FK only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasting_notes_purchase_id_fkey'
  ) THEN
    ALTER TABLE tasting_notes
      ADD CONSTRAINT tasting_notes_purchase_id_fkey
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasting_notes_purchase_id ON tasting_notes(purchase_id);

-- Move color to purchases table
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS color varchar;

-- Add amount_consumed (ml) to tasting_notes
ALTER TABLE tasting_notes
  ADD COLUMN IF NOT EXISTS amount_consumed numeric;

-- Add rating columns to tasting_notes
ALTER TABLE tasting_notes
  ADD COLUMN IF NOT EXISTS nose_rating integer,
  ADD COLUMN IF NOT EXISTS palate_rating integer,
  ADD COLUMN IF NOT EXISTS finish_rating integer,
  ADD COLUMN IF NOT EXISTS sweetness integer,
  ADD COLUMN IF NOT EXISTS smokiness integer,
  ADD COLUMN IF NOT EXISTS fruitiness integer,
  ADD COLUMN IF NOT EXISTS complexity integer;

-- Add tasting_start_date, tasting_finish_date to purchases (if not present)
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS tasting_start_date date,
  ADD COLUMN IF NOT EXISTS tasting_finish_date date;

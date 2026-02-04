-- 为 user_accounts 表添加 company_id 字段
-- 如果字段已存在则跳过

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_accounts' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE user_accounts 
    ADD COLUMN company_id UUID REFERENCES data_dictionary(id) ON DELETE SET NULL;
    
    -- 添加索引以提高查询性能
    CREATE INDEX IF NOT EXISTS idx_user_accounts_company ON user_accounts(company_id);
    
    RAISE NOTICE 'Added company_id column to user_accounts table';
  ELSE
    RAISE NOTICE 'company_id column already exists in user_accounts table';
  END IF;
END $$;

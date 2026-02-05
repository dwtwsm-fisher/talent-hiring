-- 初始化企业员工账号库数据
-- 密码统一为：123456（base64编码：MTIzNDU2）

-- 插入员工账号（使用 ON CONFLICT 避免重复插入）
-- 注意：company_id 需要关联到 data_dictionary 表中的公司ID
-- 这里使用子查询获取第一个公司的ID，如果不存在则设为NULL

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'admin',
  '系统管理员',
  'MTIzNDU2',
  '超级管理员',
  '启用',
  '系统超级管理员，拥有所有权限',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'admin');

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'hr_manager',
  '李专家',
  'MTIzNDU2',
  '招聘负责人',
  '启用',
  '负责总部核心管理岗招聘',
  (SELECT id FROM data_dictionary WHERE dict_type = 'company' ORDER BY sort_order LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'hr_manager');

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'tech_interviewer',
  '工程部张工',
  'MTIzNDU2',
  '面试官',
  '启用',
  '负责电梯、水暖技术岗初试',
  (SELECT id FROM data_dictionary WHERE dict_type = 'company' ORDER BY sort_order LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'tech_interviewer');

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'service_interviewer',
  '客服部王总',
  'MTIzNDU2',
  '面试官',
  '启用',
  '负责客服及前台礼仪终面',
  (SELECT id FROM data_dictionary WHERE dict_type = 'company' ORDER BY sort_order LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'service_interviewer');

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'business_manager',
  '业务主管',
  'MTIzNDU2',
  '业务主管',
  '启用',
  '负责业务部门人员面试和管理',
  (SELECT id FROM data_dictionary WHERE dict_type = 'company' ORDER BY sort_order LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'business_manager');

INSERT INTO user_accounts (username, name, password_hash, role, status, description, company_id) 
SELECT 
  'hr_specialist',
  '陈专员',
  'MTIzNDU2',
  '招聘负责人',
  '禁用',
  '前项目招聘专员',
  (SELECT id FROM data_dictionary WHERE dict_type = 'company' ORDER BY sort_order LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM user_accounts WHERE username = 'hr_specialist');

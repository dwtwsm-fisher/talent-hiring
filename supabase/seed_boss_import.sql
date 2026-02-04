-- Boss 直聘示例简历导入（可手动在 SQL Editor 执行）
-- 重复执行前可先执行下方「清理」语句，再执行插入。
-- 需已执行 001_init_schema.sql 中 ALTER（external_source/external_id 及 city/work_years/expected_salary/job_status_desc）。

-- ========== 清理（可选，重复导入时先删再插） ==========
-- DELETE FROM experiences WHERE candidate_id IN ('c3000001-0001-4000-8000-000000000001', 'c3000001-0001-4000-8000-000000000002');
-- DELETE FROM educations WHERE candidate_id IN ('c3000001-0001-4000-8000-000000000001', 'c3000001-0001-4000-8000-000000000002');
-- DELETE FROM candidates WHERE id IN ('c3000001-0001-4000-8000-000000000001', 'c3000001-0001-4000-8000-000000000002');

-- ========== 候选人（2 条，含 Boss 完整信息：城市、工作年限、期望薪资、求职状态） ==========
INSERT INTO candidates (
  id, name, avatar, age, gender, phone, email, current_status, matching_score, matching_reason,
  skills, applied_position, match_degree, source, city, work_years, expected_salary, job_status_desc,
  is_internal_referral, referral_name, ai_summary, is_duplicate, tags, external_source, external_id
) VALUES
(
  'c3000001-0001-4000-8000-000000000001',
  'j',
  'https://img.bosszhipin.com/beijin/upload/avatar/20240117/607f1f3d68754fd02f5f7857b2507fc75a01d377ad2d0d0a6edd3ed4095b8a930db6e463e30d0e6_b.jpg',
  25,
  '男',
  '待补充',
  '待补充',
  '新简历',
  0,
  NULL,
  '[]'::jsonb,
  '运维工程师',
  '中',
  'Boss直聘',
  '重庆',
  '5年',
  '3-5K',
  '离职-随时到岗',
  false,
  NULL,
  '1.熟练使用 java，c#等面向对象编程，具有良好的编程习惯； 2.熟练使用 eclipse/idea 等开发工具； 3.熟练 svn，maven，git 等项目管理工具; 4.掌握监控工具（如zabbix/prometheus）、自动化运维平台（如ansible） 5.掌握 mysql 数据库； 6.熟练使用 windows，linux 等常用操作系统。',
  false,
  '["运维工程师","Java"]'::jsonb,
  'boss_zhipin',
  '30454a78f35721d60n193tq_E1VY'
),
(
  'c3000001-0001-4000-8000-000000000002',
  '王',
  'https://img.bosszhipin.com/beijin/upload/avatar/20230608/607f1f3d68754fd0631d64381f94fddcdfb4a1e42685ac27633d963dccfa7a7a3d7efd71b1a_b.jpg',
  28,
  '女',
  '待补充',
  '待补充',
  '新简历',
  0,
  NULL,
  '[]'::jsonb,
  '运维工程师',
  '中',
  'Boss直聘',
  '重庆',
  '9年',
  '面议',
  '离职-随时到岗',
  false,
  NULL,
  '拥有8年横跨消防、ai科技、游戏等多个行业的linux运维实战经验，熟悉不同业务场景下的运维需求。从传统idc到公有云平台，从ai算法部署到游戏高并发场景，具备全面的技术适应能力和行业理解深度。',
  false,
  '["运维工程师"]'::jsonb,
  'boss_zhipin',
  '41aad082cf77589b0nR739W1EVVY'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar = EXCLUDED.avatar,
  age = EXCLUDED.age,
  gender = EXCLUDED.gender,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  current_status = EXCLUDED.current_status,
  matching_score = EXCLUDED.matching_score,
  matching_reason = EXCLUDED.matching_reason,
  skills = EXCLUDED.skills,
  applied_position = EXCLUDED.applied_position,
  match_degree = EXCLUDED.match_degree,
  source = EXCLUDED.source,
  city = EXCLUDED.city,
  work_years = EXCLUDED.work_years,
  expected_salary = EXCLUDED.expected_salary,
  job_status_desc = EXCLUDED.job_status_desc,
  ai_summary = EXCLUDED.ai_summary,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ========== 若无 external_source/external_id 列，用下面整段替换上面「候选人」整段 ==========
-- INSERT INTO candidates (
--   id, name, avatar, age, gender, phone, email, current_status, matching_score, matching_reason,
--   skills, applied_position, match_degree, source, is_internal_referral, referral_name, ai_summary,
--   is_duplicate, tags
-- ) VALUES
-- ('c3000001-0001-4000-8000-000000000001', 'j', 'https://img.bosszhipin.com/beijin/upload/avatar/20240117/607f1f3d68754fd02f5f7857b2507fc75a01d377ad2d0d0a6edd3ed4095b8a930db6e463e30d0e6_b.jpg', 25, '男', '待补充', '待补充', '新简历', 0, NULL, '[]'::jsonb, '运维工程师', '中', 'Boss直聘', false, NULL, '1.熟练使用 java，c#等面向对象编程，具有良好的编程习惯； 2.熟练使用 eclipse/idea 等开发工具； 3.熟练 svn，maven，git 等项目管理工具; 4.掌握监控工具（如zabbix/prometheus）、自动化运维平台（如ansible） 5.掌握 mysql 数据库； 6.熟练使用 windows，linux 等常用操作系统。', false, '["运维工程师","Java"]'::jsonb),
-- ('c3000001-0001-4000-8000-000000000002', '王', 'https://img.bosszhipin.com/beijin/upload/avatar/20230608/607f1f3d68754fd0631d64381f94fddcdfb4a1e42685ac27633d963dccfa7a7a3d7efd71b1a_b.jpg', 28, '女', '待补充', '待补充', '新简历', 0, NULL, '[]'::jsonb, '运维工程师', '中', 'Boss直聘', false, NULL, '拥有8年横跨消防、ai科技、游戏等多个行业的linux运维实战经验，熟悉不同业务场景下的运维需求。从传统idc到公有云平台，从ai算法部署到游戏高并发场景，具备全面的技术适应能力和行业理解深度。', false, '["运维工程师"]'::jsonb)
-- ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, age = EXCLUDED.age, gender = EXCLUDED.gender, phone = EXCLUDED.phone, email = EXCLUDED.email, current_status = EXCLUDED.current_status, matching_score = EXCLUDED.matching_score, matching_reason = EXCLUDED.matching_reason, skills = EXCLUDED.skills, applied_position = EXCLUDED.applied_position, match_degree = EXCLUDED.match_degree, source = EXCLUDED.source, ai_summary = EXCLUDED.ai_summary, tags = EXCLUDED.tags, updated_at = now();

-- ========== 工作经历（候选人 j：3 条，含具体描述） ==========
INSERT INTO experiences (candidate_id, company, role, duration, details, highlights, sort_order) VALUES
('c3000001-0001-4000-8000-000000000001', '酷牛', '运维工程师', '2021-2023', '在酷牛担任运维工程师，任职时间2021-2023。', '[]'::jsonb, 0),
('c3000001-0001-4000-8000-000000000001', '凌云智谷', 'Java', '2019-2021', '在凌云智谷担任Java，任职时间2019-2021。', '[]'::jsonb, 1),
('c3000001-0001-4000-8000-000000000001', '亚太计算机信息系统', '运维工程师', '2017-2019', '在亚太计算机信息系统担任运维工程师，任职时间2017-2019。', '[]'::jsonb, 2);

-- ========== 工作经历（候选人 王：3 条，含具体描述） ==========
INSERT INTO experiences (candidate_id, company, role, duration, details, highlights, sort_order) VALUES
('c3000001-0001-4000-8000-000000000002', '骁之翼', '运维工程师', '2024-至今', '在骁之翼担任运维工程师，任职时间2024-至今。', '[]'::jsonb, 0),
('c3000001-0001-4000-8000-000000000002', '商汤智能', '运维工程师', '2021-2024', '在商汤智能担任运维工程师，任职时间2021-2024。', '[]'::jsonb, 1),
('c3000001-0001-4000-8000-000000000002', '观云', '运维工程师', '2018-2021', '在观云担任运维工程师，任职时间2018-2021。', '[]'::jsonb, 2);

-- ========== 教育经历（2 条） ==========
INSERT INTO educations (candidate_id, school, major, degree, duration, sort_order) VALUES
('c3000001-0001-4000-8000-000000000001', '重庆邮电大学', '计算机及应用', '本科', '', 0),
('c3000001-0001-4000-8000-000000000002', '中国石油大学（北京）', '计算机科学与技术', '本科', '', 0);

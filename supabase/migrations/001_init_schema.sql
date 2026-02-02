-- Talent Hiring System - 物业管理版
-- Supabase 数据库初始化 Schema（合并 002/003/004/005 所有改动）

-- ============================================================
-- 1. 表结构
-- ============================================================

-- 职位 (JD) 表（status 默认草稿：草稿/已发布/已归档）
CREATE TABLE IF NOT EXISTS jds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  company TEXT,
  location TEXT NOT NULL,
  salary TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT '普通' CHECK (priority IN ('紧急', '普通')),
  status TEXT NOT NULL DEFAULT '草稿' CHECK (status IN ('草稿', '已发布', '已归档')),
  create_time DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]',
  education_requirement TEXT,
  experience_requirement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 确保 jds.status 默认值为草稿（兼容已有表）
ALTER TABLE jds ALTER COLUMN status SET DEFAULT '草稿';

-- 候选人表（含简历库扩展：在职/淘汰/离职再招/标签）
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('男', '女')),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT '新简历' CHECK (current_status IN (
    '新简历', '待测评', '测评中', '待面试', '面试中', '背调中', '待Offer', 'Offer中', '已入职', '已淘汰'
  )),
  matching_score INTEGER NOT NULL DEFAULT 0,
  matching_reason TEXT,
  skills JSONB NOT NULL DEFAULT '[]',
  applied_position TEXT NOT NULL,
  match_degree TEXT NOT NULL CHECK (match_degree IN ('高', '中', '低')),
  source TEXT NOT NULL,
  is_internal_referral BOOLEAN NOT NULL DEFAULT false,
  referral_name TEXT,
  ai_summary TEXT NOT NULL DEFAULT '',
  is_duplicate BOOLEAN DEFAULT false,
  tags JSONB NOT NULL DEFAULT '[]',
  is_in_service BOOLEAN NOT NULL DEFAULT false,
  was_eliminated BOOLEAN NOT NULL DEFAULT false,
  is_rehired_ex_employee BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 兼容已存在数据库：扩展 current_status 约束（支持 待测评/待面试/待Offer）
DO $$
DECLARE conname text;
BEGIN
  FOR conname IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'candidates' AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%current_status%'
  LOOP
    EXECUTE format('ALTER TABLE candidates DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
END $$;
ALTER TABLE candidates ADD CONSTRAINT candidates_current_status_check CHECK (
  current_status IN ('新简历', '待测评', '测评中', '待面试', '面试中', '背调中', '待Offer', 'Offer中', '已入职', '已淘汰')
);

-- 工作经历表
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  duration TEXT NOT NULL,
  details TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 教育经历表
CREATE TABLE IF NOT EXISTS educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  major TEXT NOT NULL,
  degree TEXT NOT NULL,
  duration TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 测评记录表
CREATE TABLE IF NOT EXISTS assessment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('待完成', '已完成', '逾期')),
  score INTEGER,
  result TEXT NOT NULL,
  link TEXT,
  reminder_period TEXT,
  score_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 面试记录表
CREATE TABLE IF NOT EXISTS interview_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  time TEXT NOT NULL,
  interviewer TEXT NOT NULL,
  feedback TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('推进', '淘汰', '待定')),
  method TEXT,
  location TEXT,
  status TEXT,
  conclusion TEXT,
  ratings JSONB,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 背调记录表 (1:1 候选人)
CREATE TABLE IF NOT EXISTS background_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  init_date DATE NOT NULL,
  agency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('进行中', '已完成', '待确认')),
  conclusion TEXT NOT NULL CHECK (conclusion IN ('合格', '不合格', '待确认')),
  report_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offer 记录表 (1:1 候选人)
CREATE TABLE IF NOT EXISTS offer_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  init_date DATE NOT NULL,
  salary_structure TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('已发', '已接受', '已拒绝', '待确认')),
  expected_join_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 简历-岗位关联表（多对多，支持推荐岗位）
CREATE TABLE IF NOT EXISTS candidate_jds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  jd_id UUID NOT NULL REFERENCES jds(id) ON DELETE CASCADE,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, jd_id)
);

-- 数据字典表（公司、工作地点、学历、工作年限、薪资范围、简历标签）
CREATE TABLE IF NOT EXISTS data_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dict_type TEXT NOT NULL CHECK (dict_type IN ('company', 'location', 'education_level', 'work_year', 'salary_range', 'resume_tag')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dict_type, name)
);

-- 兼容已存在数据库：若表为旧约束（仅 company/location），则更新为扩展约束
DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'data_dictionary' AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%dict_type%'
  LOOP
    EXECUTE format('ALTER TABLE data_dictionary DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
END $$;
ALTER TABLE data_dictionary ADD CONSTRAINT data_dictionary_dict_type_check CHECK (
  dict_type IN ('company', 'location', 'education_level', 'work_year', 'salary_range', 'resume_tag')
);

-- ============================================================
-- 2. 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_data_dictionary_type ON data_dictionary(dict_type);
CREATE INDEX IF NOT EXISTS idx_jds_status ON jds(status);
CREATE INDEX IF NOT EXISTS idx_jds_priority ON jds(priority);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(current_status);
CREATE INDEX IF NOT EXISTS idx_candidates_applied_position ON candidates(applied_position);
CREATE INDEX IF NOT EXISTS idx_experiences_candidate ON experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_educations_candidate ON educations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessment_candidate ON assessment_records(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_candidate ON interview_records(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_jds_candidate ON candidate_jds(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_jds_jd ON candidate_jds(jd_id);

-- ============================================================
-- 3. 数据字典预制数据
-- ============================================================

-- 公司
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('company', '万象物业', 1),
('company', '万科物业', 2),
('company', '碧桂园物业', 3),
('company', '绿城服务', 4),
('company', '龙湖物业', 5),
('company', '保利物业', 6),
('company', '中海物业', 7),
('company', '华润物业', 8)
ON CONFLICT (dict_type, name) DO NOTHING;

-- 工作地点
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('location', '上海', 1),
('location', '北京', 2),
('location', '广州', 3),
('location', '深圳', 4),
('location', '杭州', 5),
('location', '南京', 6),
('location', '成都', 7),
('location', '武汉', 8),
('location', '西安', 9),
('location', '苏州', 10)
ON CONFLICT (dict_type, name) DO NOTHING;

-- 学历要求
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('education_level', '高中', 1),
('education_level', '高中及以上', 2),
('education_level', '大专', 3),
('education_level', '大专及以上', 4),
('education_level', '本科', 5),
('education_level', '本科及以上', 6),
('education_level', '硕士', 7)
ON CONFLICT (dict_type, name) DO NOTHING;

-- 工作年限
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('work_year', '1年以下', 1),
('work_year', '1-3年', 2),
('work_year', '2年以上', 3),
('work_year', '3-5年', 4),
('work_year', '5-10年', 5),
('work_year', '10年以上', 6)
ON CONFLICT (dict_type, name) DO NOTHING;

-- 薪资范围建议
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('salary_range', '4k-6k', 1),
('salary_range', '5k-8k', 2),
('salary_range', '6k-9k', 3),
('salary_range', '8k-12k', 4),
('salary_range', '10k-15k', 5),
('salary_range', '12k-18k', 6),
('salary_range', '15k-25k', 7),
('salary_range', '20k-35k', 8),
('salary_range', '25k-40k', 9),
('salary_range', '面议', 10)
ON CONFLICT (dict_type, name) DO NOTHING;

-- 简历标签默认建议（物业行业）
INSERT INTO data_dictionary (dict_type, name, sort_order) VALUES
('resume_tag', '物业经验', 1),
('resume_tag', '业主关系', 2),
('resume_tag', '危机处理', 3),
('resume_tag', '成本控制', 4),
('resume_tag', '团队管理', 5),
('resume_tag', '客服能力', 6),
('resume_tag', '持电工证', 7),
('resume_tag', '持特种设备证', 8),
('resume_tag', '内推', 9),
('resume_tag', '重点培养', 10),
('resume_tag', '大型社区经验', 11),
('resume_tag', '设施维护', 12),
('resume_tag', '合规意识', 13),
('resume_tag', '沟通协调', 14),
('resume_tag', '应急响应', 15),
('resume_tag', '星级物业背景', 16),
('resume_tag', '项目管理', 17),
('resume_tag', '财务预算', 18),
('resume_tag', '业主维护', 19)
ON CONFLICT (dict_type, name) DO NOTHING;

-- ============================================================
-- 4. 示例数据（可选，支持重复执行）
-- ============================================================

-- 清理已有种子数据
DELETE FROM candidate_jds WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM offer_records WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM background_records WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM interview_records WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM assessment_records WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM educations WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM experiences WHERE candidate_id IN (SELECT id FROM candidates WHERE id::text LIKE 'b2000001-%');
DELETE FROM candidates WHERE id::text LIKE 'b2000001-%';
DELETE FROM jds WHERE id::text LIKE 'a1000001-%';

-- 职位 (JD)
INSERT INTO jds (id, title, department, company, location, salary, priority, status, create_time, description, requirements, education_requirement, experience_requirement) VALUES
('a1000001-0001-4000-8000-000000000001', '物业经理', '住宅管理部', '万象物业', '上海', '15k-25k', '紧急', '已发布', '2024-05-10', '全面负责物业项目的日常运营管理，提升业主满意度。', '["5年以上物业管理经验","具备大型社区管理背景","出色的沟通与应急处理能力"]', '本科及以上', '5-10年'),
('a1000001-0001-4000-8000-000000000002', '电梯维修工', '工程部', '万象物业', '北京', '8k-12k', '紧急', '已发布', '2024-05-12', '负责小区电梯的日常巡检、维护与紧急抢修。', '["持有特种设备作业人员证","3年以上电梯维修经验","能接受轮班制"]', '中专及以上', '3年以上'),
('a1000001-0001-4000-8000-000000000003', '客服主管', '客户服务部', '万象物业', '上海', '10k-15k', '普通', '已发布', '2024-05-15', '负责客服团队管理，处理业主投诉与日常咨询。', '["3年以上客服经验","良好的沟通能力","熟悉物业法规"]', '大专及以上', '3-5年'),
('a1000001-0001-4000-8000-000000000004', '水电维修工', '工程部', '万象物业', '广州', '6k-9k', '普通', '草稿', '2024-05-18', '负责小区水电设施日常维修与保养。', '["持有电工证","2年以上相关经验"]', '高中及以上', '2年以上'),
('a1000001-0001-4000-8000-000000000005', '安保主管', '安全管理部', '万象物业', '深圳', '8k-12k', '紧急', '已归档', '2024-04-20', '负责小区安保队伍管理与应急预案制定。', '["退伍军人优先","3年以上安保管理经验"]', '高中及以上', '3年以上');

-- 候选人（skills=技能，tags=简历标签，统一到 tags 持久化可编辑）
INSERT INTO candidates (id, name, avatar, age, gender, phone, email, current_status, matching_score, matching_reason, skills, tags, applied_position, match_degree, source, is_internal_referral, referral_name, ai_summary, is_duplicate) VALUES
('b2000001-0001-4000-8000-000000000001', '张建国', 'https://picsum.photos/seed/user1/200/200', 38, '男', '13812345678', 'zhangjg@example.com', '面试中', 92, '技能完全匹配JD，拥有10年以上大型社区管理背景，危机处理能力出色。', '[]', '["团队管理","财务预算","危机处理","业主维护"]', '物业经理', '高', 'Boss直聘', false, null, '拥有10年物业行业背景，曾管理过1000户以上的住宅小区，匹配度极高，但最近半年跳槽频率稍快。', false),
('b2000001-0001-4000-8000-000000000002', '李小梅', 'https://picsum.photos/seed/user2/200/200', 26, '女', '13987654321', 'lixm@example.com', 'Offer中', 85, '沟通能力强，酒店前台经验与物业客服高度匹配。', '["前台接待","文秘","投诉处理","外语能力"]', '["客服能力","沟通协调"]', '客服主管', '高', '51job', true, 'W.J.', '沟通能力强，具有亲和力，之前在星级酒店有前台经验。', false),
('b2000001-0001-4000-8000-000000000003', '王小伟', null, 32, '男', '13711112222', 'wangxw@example.com', '新简历', 78, null, '["电梯维保","特种设备操作","应急抢修"]', '["持特种设备证","设施维护","应急响应"]', '电梯维修工', '中', '智联招聘', false, null, '持证电梯维修工，5年大型住宅小区电梯维护经验。', false),
('b2000001-0001-4000-8000-000000000004', '陈芳', 'https://picsum.photos/seed/user4/200/200', 29, '女', '13622223333', 'chenf@example.com', '测评中', 80, '学历与岗位匹配，需确认职业稳定性。', '["客户服务","投诉处理","数据分析"]', '["客服能力","沟通协调"]', '客服主管', '高', '拉勾网', false, null, '211院校毕业，曾在物业公司实习，沟通表达流畅。', false),
('b2000001-0001-4000-8000-000000000005', '刘强', null, 35, '男', '13533334444', 'liuq@example.com', '背调中', 90, '管理经验丰富，背调确认履历真实性。', '["项目管理","成本控制","团队建设"]', '["项目管理","成本控制","团队管理"]', '物业经理', '高', '内推', true, '张经理', '8年万科物业经验，擅长大型社区运营，背调进行中。', false),
('b2000001-0001-4000-8000-000000000006', '赵敏', null, 28, '女', '13444445555', 'zhaom@example.com', '已入职', 88, null, '["水电维修","物业报修系统","设备巡检"]', '["持电工证","设施维护"]', '水电维修工', '高', 'Boss直聘', false, null, '持电工证，入职满一个月，表现良好。', false),
('b2000001-0001-4000-8000-000000000007', '孙浩', null, 45, '男', '13355556666', 'sunh@example.com', '已淘汰', 62, null, '["安保管理"]', '["团队管理"]', '安保主管', '低', '前程无忧', false, null, '年龄偏大，薪资期望超出预算，面试未通过。', false),
('b2000001-0001-4000-8000-000000000008', '周婷', 'https://picsum.photos/seed/user8/200/200', 30, '女', '13266667777', 'zhout@example.com', '面试中', 86, '综合素质优秀，等待二面结果。', '["物业管理","业主关系","活动策划"]', '["业主关系","团队管理"]', '物业经理', '高', '猎聘', false, null, '5年物业客服转管理，业主满意度评价高。', false);

-- 工作经历
INSERT INTO experiences (candidate_id, company, role, duration, details, highlights, sort_order) VALUES
('b2000001-0001-4000-8000-000000000001', '万科物业', '项目经理', '2018-2023', '负责某高端社区全方位管理，包括客服、工程及安保。', '["业主满意度提升20%","年度优秀经理"]', 0),
('b2000001-0001-4000-8000-000000000001', '绿城服务', '主管', '2013-2018', '基层服务起步，晋升至项目主管。', '["标准化流程落地"]', 1),
('b2000001-0001-4000-8000-000000000002', '希尔顿酒店', '前台接待', '2020-2024', '处理宾客入住及日常诉求。', '[]', 0),
('b2000001-0001-4000-8000-000000000003', '通力电梯', '维修技师', '2019-2024', '负责住宅小区电梯日常维保与故障处理。', '["持特种设备证","零安全事故"]', 0),
('b2000001-0001-4000-8000-000000000004', '链家地产', '客服专员', '2021-2024', '处理客户咨询与投诉。', '["客户满意度98%"]', 0),
('b2000001-0001-4000-8000-000000000005', '万科物业', '项目副经理', '2018-2024', '协助项目经理负责社区运营。', '["成本节约15%"]', 0),
('b2000001-0001-4000-8000-000000000005', '龙湖物业', '客服主管', '2014-2018', '负责客服团队管理与培训。', '[]', 1),
('b2000001-0001-4000-8000-000000000006', '华润物业', '水电工', '2020-2024', '小区水电维修与设备保养。', '["持电工证"]', 0),
('b2000001-0001-4000-8000-000000000007', '某安保公司', '队长', '2015-2024', '负责安保队伍日常管理。', '[]', 0),
('b2000001-0001-4000-8000-000000000008', '碧桂园物业', '客服经理', '2019-2024', '管理客服团队，处理业主关系。', '["业主活动组织","投诉率下降30%"]', 0);

-- 教育经历
INSERT INTO educations (candidate_id, school, major, degree, duration, sort_order) VALUES
('b2000001-0001-4000-8000-000000000001', '清华大学', '工商管理', '本科', '2008-2012', 0),
('b2000001-0001-4000-8000-000000000002', '浙江传媒学院', '公共关系', '本科', '2016-2020', 0),
('b2000001-0001-4000-8000-000000000003', '武汉职业技术学院', '机电一体化', '大专', '2015-2018', 0),
('b2000001-0001-4000-8000-000000000004', '南京大学', '市场营销', '本科', '2013-2017', 0),
('b2000001-0001-4000-8000-000000000005', '上海财经大学', '物业管理', '本科', '2008-2012', 0),
('b2000001-0001-4000-8000-000000000006', '广州技师学院', '电气自动化', '中专', '2016-2019', 0),
('b2000001-0001-4000-8000-000000000007', '某职业高中', '安保', '高中', '1998-2001', 0),
('b2000001-0001-4000-8000-000000000008', '华东师范大学', '行政管理', '本科', '2012-2016', 0);

-- 测评记录
INSERT INTO assessment_records (candidate_id, type, date, status, score, result, link, reminder_period) VALUES
('b2000001-0001-4000-8000-000000000001', '管理潜质测评', '2024-05-12', '已完成', 88, '建议作为核心管理人才培养', null, null),
('b2000001-0001-4000-8000-000000000004', '人力资源发展取向测评', '2024-05-20', '已完成', 92, '沟通与奉献维度得分突出，适合客服岗位。', 'https://talent-hiring.com/assess/C004', '3天'),
('b2000001-0001-4000-8000-000000000004', '职业性格测评', '2024-05-21', '待完成', null, '', null, '2天'),
('b2000001-0001-4000-8000-000000000005', '管理潜质测评', '2024-05-15', '已完成', 85, '管理能力与规则意识均达标。', null, null);

-- 面试记录
INSERT INTO interview_records (candidate_id, round, time, interviewer, feedback, recommendation, method, location) VALUES
('b2000001-0001-4000-8000-000000000001', 1, '2024-05-14 10:00', '李总', '对物业行业理解深刻，沟通从容。', '推进', '现场', '上海中心 12F 会议室A'),
('b2000001-0001-4000-8000-000000000001', 2, '2024-05-16 14:00', '王副总', '管理思路清晰，应急预案完备。', '推进', '现场', '上海中心 12F 会议室B'),
('b2000001-0001-4000-8000-000000000002', 1, '2024-05-11 09:30', '王经理', '专业性良好，形象气质佳。', '推进', '视频', null),
('b2000001-0001-4000-8000-000000000002', 2, '2024-05-13 10:00', '陈总', '稳定性较好，可发Offer。', '推进', '现场', '万象大厦 8F'),
('b2000001-0001-4000-8000-000000000005', 1, '2024-05-10 14:00', '张总', '经验丰富，推荐进入背调。', '推进', '现场', null),
('b2000001-0001-4000-8000-000000000005', 2, '2024-05-12 10:00', '李总', '综合素质优秀，待背调确认。', '推进', '现场', null),
('b2000001-0001-4000-8000-000000000006', 1, '2024-04-25 09:00', '工程部张工', '技能达标，态度积极。', '推进', '现场', null),
('b2000001-0001-4000-8000-000000000007', 1, '2024-04-22 10:00', '安保部李主管', '年龄偏大，薪资期望过高。', '淘汰', '现场', null),
('b2000001-0001-4000-8000-000000000008', 1, '2024-05-18 14:00', '王经理', '沟通能力强，业主服务经验丰富。', '推进', '现场', '万象大厦 8F'),
('b2000001-0001-4000-8000-000000000008', 2, '2024-05-20 10:00', '陈总', '待定，需与李总商议。', '待定', '视频', null);

-- 背调记录
INSERT INTO background_records (candidate_id, init_date, agency, status, conclusion, report_url) VALUES
('b2000001-0001-4000-8000-000000000001', '2024-05-15', '全信调查', '进行中', '待确认', null),
('b2000001-0001-4000-8000-000000000002', '2024-05-14', '全信调查', '已完成', '合格', 'https://bg.report/xxx'),
('b2000001-0001-4000-8000-000000000005', '2024-05-16', '全景背调', '进行中', '待确认', null),
('b2000001-0001-4000-8000-000000000006', '2024-04-28', '全信调查', '已完成', '合格', null);

-- Offer 记录
INSERT INTO offer_records (candidate_id, init_date, salary_structure, status, expected_join_date) VALUES
('b2000001-0001-4000-8000-000000000002', '2024-05-16', '10k + 2k绩效', '待确认', '2024-06-01'),
('b2000001-0001-4000-8000-000000000006', '2024-04-29', '7k + 500补贴', '已接受', '2024-05-15');

-- 简历-岗位关联（根据 applied_position 匹配 JD 标题）
INSERT INTO candidate_jds (candidate_id, jd_id, is_recommended)
SELECT c.id, j.id, true
FROM candidates c
JOIN jds j ON j.title = c.applied_position
WHERE c.id::text LIKE 'b2000001-%'
ON CONFLICT (candidate_id, jd_id) DO NOTHING;

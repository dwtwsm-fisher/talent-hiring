# 环境配置说明

## 需要配置的参数

在运行项目前，请准备以下参数并填入对应 `.env` 文件。

---

### 1. Supabase 数据库

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| **SUPABASE_URL** | Supabase 项目 URL | Supabase 控制台 → Project Settings → API → Project URL |
| **SUPABASE_SERVICE_ROLE_KEY** | 服务端密钥（拥有完整数据库权限） | 同上 → Project API keys → service_role |

**请确认您已创建 Supabase 项目，并执行数据库迁移：**

在 Supabase 控制台 → SQL Editor 中执行 `supabase/migrations/001_init_schema.sql` 文件内容。

---

### 2. Gemini API（AI 功能）

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| **GEMINI_API_KEY** | Google Gemini API 密钥 | https://aistudio.google.com/apikey |

> 若不配置，JD 生成、简历摘要等 AI 功能将不可用。

---

### 3. 前端 API 地址

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **VITE_API_BASE_URL** | 后端 API 基础地址 | http://localhost:4000/api |

---

## 配置步骤

### 后端（server/）

1. 复制 `server/.env.example` 为 `server/.env`
2. 填入以下必填项：
   - `SUPABASE_URL`：您的 Supabase 项目 URL
   - `SUPABASE_SERVICE_ROLE_KEY`：您的 Supabase service_role 密钥
   - `GEMINI_API_KEY`：您的 Gemini API Key（可选，AI 功能需要）

### 前端（根目录）

1. 复制 `.env.example` 为 `.env.local`
2. 如需修改 API 地址，设置 `VITE_API_BASE_URL`（默认即可）

---

## 运行项目

```bash
# 1. 安装依赖
npm install
cd server && npm install && cd ..

# 2. 执行数据库迁移（含表结构 + 数据字典 + 示例数据）
cd server && npm run db:migrate
cd ..

# 3. 配置 server/.env（见上文）

# 4. 启动后端
cd server && npm run dev

# 5. 新终端启动前端
npm run dev
```

前端默认访问 http://localhost:3000，后端 API 运行在 http://localhost:4000。

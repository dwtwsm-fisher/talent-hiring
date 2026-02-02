# Talent Hiring System - 物业管理版

AI 驱动的招聘管理系统，面向物业管理行业，支持 JD 生成、简历解析及全流程跟踪。

## 架构

- **前端**：React + Vite + TypeScript
- **后端**：Node.js + Express，API 层与数据库隔离
- **数据库**：Supabase (PostgreSQL)

## 环境配置

**首次运行前请配置环境变量**，详见 [ENV_SETUP.md](./ENV_SETUP.md)。

需要准备的参数：
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务端密钥
- `GEMINI_API_KEY` - Gemini API Key（AI 功能）

## 快速启动

1. 安装依赖：
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. 在 Supabase SQL Editor 执行 `supabase/migrations/001_init_schema.sql`

3. 复制 `server/.env.example` 为 `server/.env`，填入 Supabase 和 Gemini 配置

4. 启动后端：
   ```bash
   cd server && npm run dev
   ```

5. 新终端启动前端：
   ```bash
   npm run dev
   ```

- 前端：http://localhost:3000
- 后端 API：http://localhost:4000

import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 加载 server/.env 及 项目根目录 .env.local / .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
dotenv.config();
dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

async function tryConnect(url: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let connectionString: string | undefined;

  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    if (await tryConnect(url)) {
      connectionString = url;
    } else {
      // DATABASE_URL 连不上时，用 SUPABASE 信息尝试 Pooler（多区域）
      const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      const pw = process.env.SUPABASE_DB_PASSWORD && encodeURIComponent(process.env.SUPABASE_DB_PASSWORD.trim());
      if (projectRef && pw) {
        const regions = ['ap-southeast-1', 'ap-northeast-1', 'us-east-1', 'eu-west-1'];
        for (const region of regions) {
          const poolerUrl = `postgresql://postgres.${projectRef}:${pw}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
          if (await tryConnect(poolerUrl)) {
            connectionString = poolerUrl;
            console.log('使用 Pooler 连接:', `aws-0-${region}.pooler.supabase.com:6543`);
            break;
          }
        }
      }
      if (!connectionString) {
        console.error('❌ DATABASE_URL 无法连接，且所有 Pooler 区域均失败。');
        console.error('   请到 Supabase 控制台 → Database → Connection string 复制「Connection pooling」完整 URI 填入 .env.local 的 DATABASE_URL');
        process.exit(1);
      }
    }
  }
  if (!connectionString && process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const url = process.env.SUPABASE_URL;
    const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
    const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);

    // 优先使用直连（db.xxx.supabase.co:5432），pooler 易报 Tenant or user not found
    const directUrl = `postgresql://postgres:${pw}@db.${projectRef}.supabase.co:5432/postgres`;
    const client = new pg.Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.end();
      connectionString = directUrl;
    } catch (directErr) {
      // 直连失败则尝试 pooler
      const regions = (process.env.SUPABASE_DB_REGION || 'ap-northeast-1,us-east-1,eu-west-1').split(',').map((r) => r.trim());
      let lastErr: Error = directErr as Error;
      for (const region of regions) {
        const poolerUrl = `postgresql://postgres.${projectRef}:${pw}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
        const poolerClient = new pg.Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
        try {
          await poolerClient.connect();
          await poolerClient.end();
          connectionString = poolerUrl;
          break;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      if (!connectionString) throw lastErr;
    }
  }
  if (!connectionString) {
    console.error('❌ 请配置以下环境变量之一：');
    console.error('   1. DATABASE_URL - 完整的 PostgreSQL 连接字符串');
    console.error('   2. SUPABASE_DB_PASSWORD - 数据库密码（配合 SUPABASE_URL 使用）');
    console.error('\n获取数据库密码: Supabase 控制台 → Project Settings → Database → Database password');
    process.exit(1);
  }

  const sqlPath = join(rootDir, 'supabase/migrations/001_init_schema.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ 已连接 Supabase');
    await client.query(sql);
    console.log('✅ Schema 执行成功');
  } catch (err) {
    console.error('❌ 执行失败:', (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

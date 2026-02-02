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

async function main() {
  let connectionString: string;

  if (process.env.DATABASE_URL) {
    connectionString = process.env.DATABASE_URL;
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const url = process.env.SUPABASE_URL;
    const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
    const regions = (process.env.SUPABASE_DB_REGION || 'ap-northeast-1,us-east-1,eu-west-1').split(',').map((r) => r.trim());

    // 使用连接池（支持 IPv4），依次尝试各区域
    const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    let lastErr: Error | null = null;
    for (const region of regions) {
      connectionString = `postgresql://postgres.${projectRef}:${pw}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
      const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        await client.end();
        break;
      } catch (e) {
        lastErr = e as Error;
        continue;
      }
    }
    if (lastErr && !connectionString) {
      throw lastErr;
    }
  } else {
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

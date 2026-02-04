/**
 * 模拟调用简历导入接口：将 Boss 直聘示例报文 POST 到 /api/candidates/import，导入示例简历。
 * 使用方式：在项目根目录执行 npm run import:boss，或 cd server && npx tsx scripts/import-boss-sample.ts
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || '4000';
const baseUrl = `http://localhost:${port}`;

async function main() {
  const payloadPath = join(__dirname, 'boss-sample-payload.json');
  const raw = readFileSync(payloadPath, 'utf-8');
  const payload = JSON.parse(raw);

  const url = `${baseUrl}/api/candidates/import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('Response not JSON:', text);
    process.exit(1);
  }

  if (!res.ok) {
    console.error('Import failed:', res.status, data);
    process.exit(1);
  }

  const result = data as { imported: number; skipped: number; failed: number; details: Array<{ index: number; name: string; status: string; id?: string; error?: string }> };
  console.log('导入结果:', result.imported, '条成功,', result.skipped, '条跳过,', result.failed, '条失败');
  console.log('明细:', JSON.stringify(result.details, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

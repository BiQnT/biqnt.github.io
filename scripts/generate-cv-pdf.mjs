/**
 * 빌드 산출물의 /[lang]/cv 를 A4 PDF 로 구워 dist/cv/ 에 넣는다.
 *
 * 사이트와 CV 와 PDF 가 모두 같은 콘텐츠 컬렉션에서 나오므로,
 * 데이터를 한 번 고치면 세 곳이 동시에 갱신된다.
 *
 * 실행: node scripts/generate-cv-pdf.mjs   (npm run build 이후)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(DIST, 'cv');
const LOCALES = ['ko', 'en'];
const BASENAME = 'donghyun-ahn-cv';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveDist() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(DIST, url);

    // 디렉터리 요청은 index.html 로 해석한다 (Astro 정적 출력 구조)
    if (!path.extname(file)) file = path.join(file, 'index.html');

    // dist 밖으로 나가는 경로는 거부한다
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }

    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  if (!fs.existsSync(DIST)) {
    throw new Error('dist/ 가 없습니다. npm run build 를 먼저 실행하세요.');
  }

  const { server, port } = await serveDist();
  const browser = await chromium.launch();
  const created = [];

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const lang of LOCALES) {
      const url = `http://127.0.0.1:${port}/${lang}/cv`;
      const page = await browser.newPage();

      const res = await page.goto(url, { waitUntil: 'networkidle' });
      if (!res || !res.ok()) {
        throw new Error(`${url} 응답이 ${res ? res.status() : '없음'} 입니다.`);
      }

      // 웹폰트가 도착하기 전에 인쇄하면 글자폭이 달라져 줄바꿈이 어긋난다
      await page.evaluate(() => document.fonts.ready);

      const out = path.join(OUT_DIR, `${BASENAME}-${lang}.pdf`);
      await page.pdf({
        path: out,
        // 여백과 용지 크기는 cv.astro 의 @page 규칙을 그대로 따른다
        preferCSSPageSize: true,
        printBackground: false,
      });

      await page.close();
      created.push({ out, bytes: fs.statSync(out).size });
    }
  } finally {
    await browser.close();
    server.close();
  }

  for (const { out, bytes } of created) {
    console.log(`  ${path.relative(ROOT, out)}  ${(bytes / 1024).toFixed(0)} KB`);
  }
  console.log(`CV PDF ${created.length}개 생성 완료`);
}

main().catch((err) => {
  console.error(`[cv-pdf] 생성 실패: ${err.message}`);
  console.error('[cv-pdf] 사이트 배포는 계속됩니다. /[lang]/cv 에서 브라우저 인쇄로 대체할 수 있습니다.');
  process.exit(1);
});

// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://biqnt.github.io',
  output: 'static',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  // 한 페이지로 통합하면서 사라진 예전 라우트를 해당 섹션 앵커로 보낸다.
  // 외부에 공유된 링크나 검색 결과가 죽지 않게 하기 위한 것이다.
  redirects: {
    '/ko/experience': '/ko/#experience',
    '/en/experience': '/en/#experience',
    '/ko/research': '/ko/#research',
    '/en/research': '/en/#research',
    '/ko/github': '/ko/#projects',
    '/en/github': '/en/#projects',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

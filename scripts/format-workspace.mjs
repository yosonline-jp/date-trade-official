import {writeFileSync} from 'node:fs';
import {format} from 'prettier';
import {readFile} from 'node:fs/promises';
const files=[
 'src/app/(client)/page.tsx','src/app/(client)/layout.tsx','src/app/(client)/chart/page.tsx','src/app/(client)/stocks/page.tsx','src/app/(client)/bot-trades/page.tsx','src/app/(client)/news/page.tsx','src/app/(client)/technicals/page.tsx',
 'src/app/(dashboard)/layout.tsx','src/app/(dashboard)/dashboard/page.tsx','src/app/(dashboard)/dashboard/cms/page.tsx','src/app/(dashboard)/dashboard/cms/layout.tsx',
 'src/app/(dashboard)/dashboard/news/edit/page.tsx','src/app/(dashboard)/dashboard/technical/edit/page.tsx','src/app/(auth-pages)/layout.tsx',
 'src/components/workspace/shell.tsx','src/components/workspace/price-chart.tsx','src/components/cms/content-editor.tsx','src/components/content/article-list.tsx','src/components/stock-candle-chart.tsx',
 'src/lib/market/overview.ts','src/lib/auth/admin.ts','src/utils/supabase/server.ts','src/app/actions/news.ts','src/app/actions/technical.ts','src/app/auth/callback/route.ts',
 'src/app/globals.css','next.config.ts','eslint.config.mjs','playwright.config.ts','tests/home.spec.ts','package.json','tsconfig.json',
];
for (const path of files) writeFileSync(path,await format(await readFile(path,'utf8'),{filepath:path,useTabs:false,tabWidth:2}));
console.log(`Formatted ${files.length} files`);

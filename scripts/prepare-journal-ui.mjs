import fs from "node:fs/promises";
import path from "node:path";
const target = path.resolve("src/app/journal-ui-check");
if (!target.startsWith(path.resolve("src/app") + path.sep))
  throw new Error("Invalid fixture path");
if (process.argv[2] === "remove") {
  await fs.unlink(path.join(target, "page.tsx")).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  await fs.rmdir(target).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  for (const dist of ['.next-dev','.next']) {
    const generated = path.resolve(dist, 'types/app/journal-ui-check');
    if (!generated.startsWith(path.resolve(dist, 'types') + path.sep)) throw new Error('Invalid generated path');
    await fs.unlink(path.join(generated,'page.ts')).catch(e => { if (e.code !== 'ENOENT') throw e; });
    await fs.rmdir(generated).catch(e => { if (e.code !== 'ENOENT') throw e; });
  }
} else {
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(
    path.join(target, "page.tsx"),
    "import { notFound } from 'next/navigation';\nimport Harness from '../../../tests/fixtures/journal-ui';\nexport default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){if(process.env.NODE_ENV!=='development')notFound();const {view}=await searchParams;return <Harness initialView={view==='calendar'||view==='watch'?view:'analytics'}/>;}\n",
  );
}

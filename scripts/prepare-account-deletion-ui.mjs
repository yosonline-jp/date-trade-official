import fs from "node:fs/promises";
import path from "node:path";
const target = path.resolve("src/app/account-deletion-ui-check");
if (!target.startsWith(path.resolve("src/app") + path.sep))
  throw new Error("Invalid fixture path");
if (process.argv[2] === "remove") {
  await fs.unlink(path.join(target, "page.tsx")).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  await fs.rmdir(target).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  for (const dist of [".next-dev", ".next"]) {
    const generated = path.resolve(dist, "types/app/account-deletion-ui-check");
    if (!generated.startsWith(path.resolve(dist, "types") + path.sep))
      throw new Error("Invalid generated path");
    await fs.unlink(path.join(generated, "page.ts")).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
    await fs.rmdir(generated).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
} else {
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(
    path.join(target, "page.tsx"),
    "import { notFound } from 'next/navigation';\nimport Harness from '../../../tests/fixtures/account-deletion-ui';\nexport default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <Harness/>;}\n",
  );
}

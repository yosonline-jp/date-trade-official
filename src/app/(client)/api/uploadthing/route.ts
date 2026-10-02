/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import type { FileRouter } from "uploadthing/next";

import { createRouteHandler, createUploadthing } from "uploadthing/next";

const f = createUploadthing();

const ourFileRouter = {
  editorUploader: f(["image", "text", "blob", "pdf", "video", "audio"])
    .middleware(() => {
      return {};
    })
    .onUploadComplete(({ file }) => {
      return { file };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

export async function DELETE(request: Request) {
  const data = await request.json();
  const newUrl = data.url.substring(data.url.lastIndexOf("/") + 1);
  const utapi = new UTApi();
  await utapi.deleteFiles(newUrl);

  return Response.json({ message: "ok" });
}

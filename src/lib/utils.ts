import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_URL || "";


export function isUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const resizeAndConvertToWebp = async (
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width } = img;
      let { height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const webPBlob = await new Promise<Blob | null>((res) => {
                canvas.toBlob((webp) => {
                  res(webp);
                }, "image/webp");
              });

              if (webPBlob) {
                resolve(webPBlob);
              } else {
                reject(new Error("Failed to convert to WebP"));
              }
            } else {
              reject(new Error("Failed to resize image"));
            }
          },
          file.type || "image/jpeg",
          0.7
        );
      } else {
        reject(new Error("Canvas context unavailable"));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
};


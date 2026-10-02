import { createClient } from "@/utils/supabase/client";
import { useCallback, useState } from "react";
import { toast } from "./use-toast";

const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_BUCKET as string;

const resizeAndConvertToWebP = async (
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

const useUpload = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const uploadImage = useCallback(async (file: File, bucket: string) => {
    try {
      const resizedAndConvertedToWebP = await resizeAndConvertToWebP(
        file,
        1430,
        1074
      );
      if (resizedAndConvertedToWebP) {
        const sb = await createClient();
        const { data, error: uploadError } = await sb.storage
          .from(bucket)
          .upload(
            `${bucket}-${new Date().getTime().toString()}`,
            resizedAndConvertedToWebP,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            }
          );

        if (uploadError) {
          throw new Error("Error uploading image");
        }
        return `${BUCKET_NAME}/${bucket}/${data?.path}` || "";
      }
      throw new Error("Error uploading image");
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "An unknown error occurred. Please try again later or contact support if the issue persists";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return "";
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, uploadImage };
};

export default useUpload;

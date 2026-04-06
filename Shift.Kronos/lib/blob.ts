import { put } from "@vercel/blob";

type UploadBody = string | Blob | Buffer | ArrayBuffer | ReadableStream | File;

type UploadArgs = {
  pathname: string;
  body: UploadBody;
  contentType?: string;
};

export async function uploadFile({ pathname, body, contentType }: UploadArgs) {
  return put(pathname, body, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
}

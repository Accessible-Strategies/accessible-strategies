import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/** Public URL for a given R2 object key. */
export function publicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
  return `${base}/${key}`;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function getObject(key: string) {
  const result = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return result.Body;
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function copyObject(sourceKey: string, destKey: string) {
  await r2.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${sourceKey}`,
    Key: destKey,
  }));
}

/** Copy + delete, since R2/S3 has no native rename operation. */
export async function renameObject(oldKey: string, newKey: string) {
  await copyObject(oldKey, newKey);
  await deleteObject(oldKey);
}

export async function listObjects(prefix: string) {
  const result = await r2.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  }));
  return result.Contents ?? [];
}
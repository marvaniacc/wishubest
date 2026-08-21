/**
 * Private document storage. KYC files must NEVER be in a public bucket.
 * Drivers: local (disk, served through authenticated API with short-TTL tokens)
 * or s3 (S3-compatible private bucket — MinIO locally, AWS in prod).
 */
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config.js";

export interface StoredObject {
  storageKey: string;
  sizeBytes: number;
}

export interface StorageDriver {
  put(fileName: string, mimeType: string, data: Buffer): Promise<StoredObject>;
  get(storageKey: string): Promise<{ stream: NodeJS.ReadableStream; mimeType?: string; sizeBytes: number }>;
  delete(storageKey: string): Promise<void>;
}

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB

export function validateUpload(fileName: string, mimeType: string, sizeBytes: number): string | null {
  if (!fileName || fileName.length > 200) return "Invalid file name";
  if (fileName.includes("..") || fileName.includes("/")) return "Invalid file name";
  if (!ALLOWED_MIME.has(mimeType)) return `Unsupported file type: ${mimeType}. Allowed: PDF, PNG, JPEG, WebP`;
  if (sizeBytes > MAX_DOC_BYTES) return "File too large (max 10MB)";
  return null;
}

class LocalDriver implements StorageDriver {
  private root = path.resolve(env.STORAGE_LOCAL_DIR);

  private resolve(storageKey: string): string {
    const full = path.resolve(this.root, storageKey);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Path traversal blocked");
    return full;
  }

  async put(_fileName: string, _mimeType: string, data: Buffer): Promise<StoredObject> {
    await mkdir(this.root, { recursive: true });
    const storageKey = `${randomUUID()}.bin`;
    await writeFile(this.resolve(storageKey), data, { mode: 0o600 });
    return { storageKey, sizeBytes: data.byteLength };
  }

  async get(storageKey: string) {
    const full = this.resolve(storageKey);
    const info = await stat(full);
    return { stream: createReadStream(full), sizeBytes: info.size };
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(this.resolve(storageKey)).catch(() => undefined);
  }
}

class S3Driver implements StorageDriver {
  private async client(): Promise<import("@aws-sdk/client-s3").S3Client> {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  async put(_fileName: string, _mimeType: string, data: Buffer): Promise<StoredObject> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const storageKey = `${randomUUID()}.bin`;
    const bucket = env.S3_BUCKET!;
    await (await this.client()).send(
      new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: data, ContentType: _mimeType }),
    );
    return { storageKey, sizeBytes: data.byteLength };
  }

  async get(storageKey: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await this.client()).send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }),
    );
    return {
      stream: res.Body as unknown as NodeJS.ReadableStream,
      sizeBytes: res.ContentLength ?? 0,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }));
  }
}

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDriver();

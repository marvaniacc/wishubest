import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config.js";

/**
 * Private object storage for KYC documents (never public).
 * Drivers: S3-compatible (MinIO in dev) when S3_* env is set, otherwise
 * a private local directory served only through authorized API streaming.
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType?: string }>;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_KYC_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

class LocalDriver implements StorageDriver {
  constructor(private baseDir: string) {}
  private resolve(key: string): string {
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    return path.join(this.baseDir, safe);
  }
  async put(key: string, body: Buffer, _contentType: string) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  async get(key: string) {
    const p = this.resolve(key);
    const body = await readFile(p);
    return { body, contentType: undefined };
  }
}

class S3Driver implements StorageDriver {
  private client: S3Client;
  constructor(
    private bucket: string,
    endpoint: string | undefined,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
    );
  }
  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return { body: Buffer.from(bytes), contentType: res.ContentType };
  }
}

let driver: StorageDriver | null = null;

function getDriver(): StorageDriver {
  if (driver) return driver;
  const e = env();
  if (e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY && e.S3_REGION) {
    driver = new S3Driver(
      e.S3_BUCKET,
      e.S3_ENDPOINT,
      e.S3_REGION,
      e.S3_ACCESS_KEY_ID,
      e.S3_SECRET_ACCESS_KEY,
    );
  } else {
    driver = new LocalDriver(e.PRIVATE_STORAGE_DIR);
  }
  return driver;
}

export function validateKycUpload(mime: string, sizeBytes: number): string | null {
  if (!ALLOWED_KYC_MIME.includes(mime)) return `unsupported type ${mime}`;
  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) return "file size out of range";
  return null;
}

/** Magic-byte sniffing as second layer after client-declared MIME. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 4).toString("hex") === "25504446") return "application/pdf";
  if (buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

export function newKycKey(providerId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 8).replace(/[^.a-z0-9]/g, "");
  return `kyc/${providerId}/${randomUUID()}${ext}`;
}

export const storage = {
  put: (key: string, body: Buffer, contentType: string) => getDriver().put(key, body, contentType),
  get: (key: string) => getDriver().get(key),
};

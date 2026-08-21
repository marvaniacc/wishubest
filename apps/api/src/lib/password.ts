import { hash, verify } from "@node-rs/argon2";

/** Argon2id — OWASP-recommended parameters. */
const opts = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, opts);
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password);
}

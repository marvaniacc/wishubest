import type { db } from "./client.js";

/** Transaction handle type for passing an open tx into domain helpers. */
export type Tx = Parameters<Parameters<ReturnType<typeof db>["db"]["transaction"]>[0]>[0];

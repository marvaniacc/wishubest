import { NextResponse, type NextRequest } from "next/server";

/** On-demand revalidation hook called by the API after approve/suspend/paid. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-revalidate-token");
  const expected = process.env.REVALIDATE_TOKEN ?? "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let paths: string[] = [];
  try {
    const body = (await req.json()) as { paths?: string[] };
    paths = Array.isArray(body.paths) ? body.paths.slice(0, 50) : [];
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { revalidatePath } = await import("next/cache");
  for (const p of paths) {
    try {
      // Revalidate for both locales (paths arrive without locale prefix).
      revalidatePath(`/en${p}`, "page");
      revalidatePath(`/ar${p}`, "page");
    } catch {
      /* best-effort */
    }
  }
  return NextResponse.json({ ok: true, count: paths.length });
}

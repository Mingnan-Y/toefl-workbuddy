import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas } from "@/db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const stringFields = ["topic", "claim", "example", "phrases", "richContent", "notes", "section"];
    for (const field of stringFields) {
      if (typeof payload[field] === "string") patch[field] = String(payload[field]).trim();
    }
    if (typeof patch.section === "string" && !["speaking", "writing", "both", "interview"].includes(patch.section)) patch.section = "both";
    const [row] = await getDb().update(ideas).set(patch).where(eq(ideas.id, id)).returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ idea: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    await getDb().delete(ideas).where(eq(ideas.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 });
  }
}

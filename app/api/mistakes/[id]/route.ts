import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { mistakes } from "@/db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: sql`datetime('now')` };
    const stringFields = ["title", "section", "questionType", "wrongAnswer", "correctAnswer", "richContent", "notes", "selfReportedWeakness", "analysis", "lesson", "status", "dueAt"];
    for (const field of stringFields) {
      if (typeof payload[field] === "string") patch[field] = String(payload[field]).trim();
    }
    if (Array.isArray(payload.answerParts)) patch.answerParts = JSON.stringify(payload.answerParts);
    const [row] = await getDb().update(mistakes).set(patch).where(eq(mistakes.id, id)).returning();
    return Response.json({ mistake: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    await getDb().delete(mistakes).where(eq(mistakes.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 });
  }
}

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vocabulary } from "@/db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    if (!("rating" in payload)) {
      const patch: Record<string, unknown> = {};
      const stringFields = ["word", "meaning", "contextSentence", "collocation", "example", "level"];
      for (const field of stringFields) {
        if (typeof payload[field] === "string") patch[field] = String(payload[field]).trim();
      }
      if (typeof patch.level === "string" && !["active", "passive"].includes(patch.level)) patch.level = "passive";
      const [row] = await getDb().update(vocabulary).set(patch).where(eq(vocabulary.id, id)).returning();
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ vocabulary: row });
    }
    const days: Record<string, number> = { again: 0, hard: 1, good: 3, easy: 7 };
    const gains: Record<string, number> = { again: -1, hard: 0, good: 1, easy: 2 };
    const ratingValue = typeof payload.rating === "string" ? payload.rating : "good";
    const rating = ratingValue in days ? ratingValue : "good";
    const due = new Date();
    due.setDate(due.getDate() + days[rating]);
    const current = await getDb().select().from(vocabulary).where(eq(vocabulary.id, id)).limit(1);
    if (!current[0]) return Response.json({ error: "Not found" }, { status: 404 });
    const mastery = Math.max(0, Math.min(5, current[0].mastery + gains[rating]));
    const [row] = await getDb().update(vocabulary).set({
      mastery,
      dueAt: due.toISOString(),
    }).where(eq(vocabulary.id, id)).returning();
    return Response.json({ vocabulary: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Review failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    await getDb().delete(vocabulary).where(eq(vocabulary.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 });
  }
}

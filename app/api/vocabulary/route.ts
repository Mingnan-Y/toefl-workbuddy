import { getDb } from "@/db";
import { vocabulary } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const word = typeof payload.word === "string" ? payload.word.trim() : "";
    if (!word) return Response.json({ error: "Word is required" }, { status: 400 });
    const [row] = await getDb().insert(vocabulary).values({
      word,
      meaning: String(payload.meaning || "").trim(),
      contextSentence: String(payload.contextSentence || "").trim(),
      collocation: String(payload.collocation || "").trim(),
      example: String(payload.example || "").trim(),
      level: payload.level === "active" ? "active" : "passive",
      sourceMistakeId: typeof payload.sourceMistakeId === "number" ? payload.sourceMistakeId : null,
    }).returning();
    return Response.json({ vocabulary: row }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 });
  }
}

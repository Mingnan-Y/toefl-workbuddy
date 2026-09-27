import { getDb } from "@/db";
import { ideas } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const topic = String(payload.topic || "").trim();
    const claim = String(payload.claim || "").trim();
    if (!topic || !claim) return Response.json({ error: "Topic and claim are required" }, { status: 400 });
    const [row] = await getDb().insert(ideas).values({
      topic,
      claim,
      example: String(payload.example || "").trim(),
      phrases: String(payload.phrases || "").trim(),
      richContent: String(payload.richContent || "").trim(),
      notes: String(payload.notes || "").trim(),
      section: ["speaking", "writing", "both", "interview"].includes(String(payload.section)) ? String(payload.section) : "both",
    }).returning();
    return Response.json({ idea: row }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 });
  }
}

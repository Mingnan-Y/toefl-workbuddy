import { getDb } from "@/db";
import { mistakes } from "@/db/schema";

const allowedSections = new Set(["Reading", "Listening", "Speaking", "Writing"]);

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const title = String(payload.title || "").trim();
    const sectionValue = String(payload.section || "Reading");
    const answerParts = Array.isArray(payload.answerParts) ? payload.answerParts : [];
    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    const [row] = await getDb().insert(mistakes).values({
      title,
      section: allowedSections.has(sectionValue) ? sectionValue : "Reading",
      questionType: String(payload.questionType || "未分类").trim(),
      wrongAnswer: String(payload.wrongAnswer || "").trim(),
      correctAnswer: String(payload.correctAnswer || "").trim(),
      answerParts: JSON.stringify(answerParts),
      richContent: String(payload.richContent || "").trim(),
      notes: String(payload.notes || "").trim(),
      selfReportedWeakness: String(payload.selfReportedWeakness || "").trim(),
      analysis: String(payload.analysis || "").trim(),
      lesson: String(payload.lesson || "").trim(),
      status: payload.status === "pending" ? "pending" : "organized",
      dueAt: typeof payload.dueAt === "string" ? payload.dueAt : new Date().toISOString(),
    }).returning();
    return Response.json({ mistake: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save mistake";
    return Response.json({ error: message }, { status: 500 });
  }
}

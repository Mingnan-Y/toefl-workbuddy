import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ideas, mistakes, vocabulary } from "@/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const [mistakeRows, vocabularyRows, ideaRows] = await Promise.all([
      db.select().from(mistakes).orderBy(desc(mistakes.createdAt), desc(mistakes.id)),
      db.select().from(vocabulary).orderBy(asc(vocabulary.dueAt), desc(vocabulary.id)),
      db.select().from(ideas).orderBy(desc(ideas.createdAt), desc(ideas.id)),
    ]);
    return Response.json({
      mistakes: mistakeRows,
      vocabulary: vocabularyRows,
      ideas: ideaRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data unavailable";
    return Response.json({ error: message }, { status: 500 });
  }
}

"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenCheck, CalendarDays, ChevronRight, FileText, GraduationCap,
  Lightbulb, LoaderCircle, MessageSquareText, Pencil, Plus, Search, Target, Trash2
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, Toaster } from "sonner";

type View = "today" | "mistakes" | "vocabulary" | "ideas" | "interview";
type Mistake = {
  id: number; title: string; section: string; questionType: string;
  screenshotKey: string | null; screenshotName: string | null;
  wrongAnswer: string; correctAnswer: string; answerParts: string; richContent: string; notes: string; analysis: string; lesson: string;
  selfReportedWeakness: string;
  status: string; dueAt: string; createdAt: string;
};
type Word = {
  id: number; word: string; meaning: string; contextSentence: string;
  collocation: string; example: string; level: string; sourceMistakeId: number | null;
  mastery: number; dueAt: string; createdAt: string;
};
type Idea = {
  id: number; topic: string; claim: string; example: string;
  phrases: string; richContent: string; notes: string; section: string; usageCount: number; createdAt: string;
};
type WorkspaceData = { mistakes: Mistake[]; vocabulary: Word[]; ideas: Idea[] };

const nav = [
  { id: "today" as const, label: "Recent", icon: CalendarDays },
  { id: "mistakes" as const, label: "Mistakes", icon: BookOpenCheck },
  { id: "vocabulary" as const, label: "Vocabulary", icon: GraduationCap },
  { id: "ideas" as const, label: "Writing Templates", icon: FileText },
  { id: "interview" as const, label: "Interview", icon: MessageSquareText },
];

const sectionTone: Record<string, string> = {
  Reading: "bg-blue-50 text-blue-700 border-blue-100",
  Listening: "bg-violet-50 text-violet-700 border-violet-100",
  Speaking: "bg-amber-50 text-amber-700 border-amber-100",
  Writing: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function daysUntilExam() {
  const target = new Date("2026-09-26T09:00:00");
  const diff = Math.ceil((target.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: typeof FileText; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <Empty className="min-h-56 border bg-white">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon /></EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}

export function Workbench() {
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<WorkspaceData>({ mistakes: [], vocabulary: [], ideas: [] });
  const [loading, setLoading] = useState(true);
  const [wordOpen, setWordOpen] = useState(false);
  const [mistakeOpen, setMistakeOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editingMistake, setEditingMistake] = useState<Mistake | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedMistake, setSelectedMistake] = useState<number | null>(null);
  const [revealedWord, setRevealedWord] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load");
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "暂时无法读取数据");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const modelContext = (document as Document & {
      modelContext?: { registerTool?: (tool: unknown) => void | Promise<void> };
    }).modelContext;
    if (!modelContext?.registerTool) return;
    void Promise.resolve(modelContext.registerTool({
      name: "open_toefl_collection",
      title: "Open TOEFL collection",
      description: "Navigate to Recent, Mistakes, Vocabulary, Writing Templates, or Interview in the visible TOEFL WorkBuddy.",
      inputSchema: {
        type: "object",
        properties: { collection: { type: "string", enum: ["today", "mistakes", "vocabulary", "ideas", "interview"] } },
        required: ["collection"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: { collection: View }) {
        setView(input.collection);
        return { opened: input.collection };
      },
    })).catch(() => undefined);
  }, []);

  const pending = data.mistakes.filter((m) => m.status === "pending").length;
  const filteredMistakes = data.mistakes.filter((m) =>
    (m.title + m.section + m.questionType + m.selfReportedWeakness + m.analysis).toLowerCase().includes(query.toLowerCase())
  );
  const currentMistake = data.mistakes.find((m) => m.id === selectedMistake) || filteredMistakes[0];

  async function submitWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch(editingWord ? "/api/vocabulary/" + editingWord.id : "/api/vocabulary", {
        method: editingWord ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      formElement.reset();
      setWordOpen(false);
      setEditingWord(null);
      await refresh();
      toast.success(editingWord ? "单词已更新" : "单词已加入复习");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally { setSaving(false); }
  }

  async function submitMistake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch(editingMistake ? "/api/mistakes/" + editingMistake.id : "/api/mistakes", {
        method: editingMistake ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          ...payload,
          status: "organized",
          selfReportedWeakness: editingMistake?.selfReportedWeakness || "",
          analysis: editingMistake?.analysis || "",
          lesson: editingMistake?.lesson || "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      formElement.reset();
      setMistakeOpen(false);
      setEditingMistake(null);
      await refresh();
      toast.success(editingMistake ? "错题已更新" : "错题已加入 Mistakes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally { setSaving(false); }
  }

  async function submitIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    const richText = stripHtml(String(payload.richContent || "")).trim();
    try {
      const response = await fetch(editingIdea ? "/api/ideas/" + editingIdea.id : "/api/ideas", {
        method: editingIdea ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          ...payload,
          section: editingIdea?.section === "interview" || view === "interview" ? "interview" : "writing",
          claim: editingIdea?.claim || String(payload.topic || "").trim() || richText.slice(0, 90),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      formElement.reset();
      setIdeaOpen(false);
      setEditingIdea(null);
      await refresh();
      toast.success(editingIdea ? "素材已更新" : "素材已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally { setSaving(false); }
  }

  async function reviewWord(id: number, rating: string) {
    const response = await fetch("/api/vocabulary/" + id, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }),
    });
    if (response.ok) {
      setRevealedWord(null);
      await refresh();
      toast.success("已安排下次复习");
    } else toast.error("更新失败");
  }

  function editMistake(mistake: Mistake) {
    setEditingMistake(mistake);
    setMistakeOpen(true);
  }

  function editWord(word: Word) {
    setEditingWord(word);
    setWordOpen(true);
  }

  function editIdea(idea: Idea) {
    setEditingIdea(idea);
    setIdeaOpen(true);
  }

  async function deleteRecord(kind: "mistakes" | "vocabulary" | "ideas", id: number, label: string) {
    if (!window.confirm("确定删除「" + label + "」吗？这个操作不能撤销。")) return;
    const response = await fetch("/api/" + kind + "/" + id, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(result.error || "删除失败");
      return;
    }
    if (kind === "mistakes" && selectedMistake === id) setSelectedMistake(null);
    if (kind === "vocabulary" && revealedWord === id) setRevealedWord(null);
    await refresh();
    toast.success("已删除");
  }

  function openNewMistake() {
    setEditingMistake(null);
    setMistakeOpen(true);
  }

  function openNewWord() {
    setEditingWord(null);
    setWordOpen(true);
  }

  function openNewIdea() {
    setEditingIdea(null);
    setIdeaOpen(true);
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r-0">
        <SidebarHeader className="border-b border-sidebar-border p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-lg font-black text-[#17233b]">T</div>
            <div>
              <div className="font-semibold tracking-tight text-white">TOEFL WorkBuddy</div>
              <div className="text-xs text-[#91a0bb]">Target · 5.0</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-5">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {nav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={view === item.id}
                      onClick={() => setView(item.id)}
                      className="h-11 cursor-pointer rounded-xl px-3 text-[15px] data-[active=true]:bg-white data-[active=true]:text-[#17233b]"
                    >
                      <item.icon className="size-[18px]" />
                      <span>{item.label}</span>
                      {item.id === "mistakes" && pending > 0 && (
                        <span className="ml-auto rounded-full bg-[#75d7ae] px-2 py-0.5 text-xs font-semibold text-[#17233b]">{pending}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-2xl border border-[#344463] bg-[#1d2b47] p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-[#a7b3c8]">
              <span>Exam countdown</span><Target className="size-4" />
            </div>
            <div className="text-3xl font-semibold text-white">{daysUntilExam()}</div>
            <div className="text-xs text-[#a7b3c8]">days to Sep 26</div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f6f9]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <span className="text-sm font-medium text-muted-foreground">{todayLabel()}</span>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1.5">
            <span className="mr-1 size-1.5 rounded-full bg-emerald-500" /> Chat synced
          </Badge>
        </header>

        <main className="mx-auto w-full max-w-[1280px] p-4 md:p-8">
          {loading ? <LoadingState /> : (
            <div className="enter-up">
              {view === "today" && (
                <TodayView
                  recentMistakes={data.mistakes.slice(0, 4)}
                  recentWords={data.vocabulary.slice(0, 6)}
                  goTo={setView}
                />
              )}
              {view === "mistakes" && (
                <MistakesView
                  mistakes={filteredMistakes}
                  current={currentMistake}
                  query={query}
                  setQuery={setQuery}
                  select={setSelectedMistake}
                  add={openNewMistake}
                  edit={editMistake}
                  remove={(mistake) => void deleteRecord("mistakes", mistake.id, mistake.title)}
                />
              )}
              {view === "vocabulary" && (
                <VocabularyView
                  words={data.vocabulary}
                  revealed={revealedWord}
                  reveal={setRevealedWord}
                  review={reviewWord}
                  add={openNewWord}
                  edit={editWord}
                  remove={(word) => void deleteRecord("vocabulary", word.id, word.word)}
                />
              )}
              {(view === "ideas" || view === "interview") && <IdeasView key={view} interview={view === "interview"} ideas={data.ideas.filter((idea) => view === "interview" ? idea.section === "interview" : idea.section !== "interview")} add={openNewIdea} edit={editIdea} remove={(idea) => void deleteRecord("ideas", idea.id, idea.claim || idea.topic)} />}
            </div>
          )}
        </main>
      </SidebarInset>

      <WordDialog open={wordOpen} setOpen={(open) => { setWordOpen(open); if (!open) setEditingWord(null); }} saving={saving} submit={submitWord} word={editingWord} />
      <MistakeDialog open={mistakeOpen} setOpen={(open) => { setMistakeOpen(open); if (!open) setEditingMistake(null); }} saving={saving} submit={submitMistake} mistake={editingMistake} />
      <IdeaDialog interview={view === "interview"} open={ideaOpen} setOpen={(open) => { setIdeaOpen(open); if (!open) setEditingIdea(null); }} saving={saving} submit={submitIdea} idea={editingIdea} />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map((n) => <Skeleton key={n} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function TodayView({ recentMistakes, recentWords, goTo }: {
  recentMistakes: Mistake[]; recentWords: Word[]; goTo: (view: View) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Recent</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">最近更新</h1>
        <p className="mt-2 text-muted-foreground">你在聊天里发来的错题和生词会直接同步到这里。</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgba(31,44,73,0.08)]">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Latest Mistakes</CardTitle>
                <CardDescription className="mt-1">最近整理的错题</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => goTo("mistakes")}>View all <ChevronRight /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {recentMistakes.length ? (
              <div className="space-y-3">
                {recentMistakes.map((mistake) => (
                  <button key={mistake.id} onClick={() => goTo("mistakes")} className="flex w-full cursor-pointer items-center gap-4 rounded-xl border bg-[#fafbfc] p-4 text-left transition hover:border-primary">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><MessageSquareText className="size-5" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{mistake.title}</div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">{mistake.selfReportedWeakness || mistake.questionType}</div>
                    </div>
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-[#fafbfc] px-6 text-center">
                <MessageSquareText className="mb-3 size-7 text-primary" />
                <div className="font-semibold">在聊天里发送第一张错题</div>
                <div className="mt-1 text-sm text-muted-foreground">同时告诉我，你自己认为的弱点是什么。</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgba(31,44,73,0.08)]">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">New Vocabulary</CardTitle>
                <CardDescription className="mt-1">最近加入的生词</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => goTo("vocabulary")}>View all <ChevronRight /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {recentWords.length ? (
              <div className="divide-y">
                {recentWords.map((word) => (
                  <button key={word.id} onClick={() => goTo("vocabulary")} className="flex w-full cursor-pointer items-center gap-4 py-4 text-left first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{word.word}</div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">{word.meaning || "Meaning not added yet"}</div>
                    </div>
                    <Badge variant={word.level === "active" ? "default" : "secondary"}>{word.level === "active" ? "Active" : "Passive"}</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-[#fafbfc] px-6 text-center">
                <GraduationCap className="mb-3 size-7 text-primary" />
                <div className="font-semibold">还没有生词</div>
                <div className="mt-1 text-sm text-muted-foreground">我会从你明确说不认识的词里筛选并添加。</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MistakesView({ mistakes, current, query, setQuery, select, add, edit, remove }: {
  mistakes: Mistake[]; current?: Mistake; query: string; setQuery: (q: string) => void;
  select: (id: number) => void; add: () => void; edit: (mistake: Mistake) => void; remove: (mistake: Mistake) => void;
}) {
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Mistakes" title="错题不是记录，是下一次的提示。" action={<Button onClick={add}><Plus /> Add mistake</Button>} />
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题型、科目或错误原因" className="h-11 bg-white pl-10" /></div>
      {!mistakes.length ? (
        <EmptyState icon={BookOpenCheck} title="还没有错题" description="可以发给我整理，也可以自己手动加入。" action={<Button onClick={add}>添加第一道错题</Button>} />
      ) : (
        <div className="grid min-h-[560px] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {mistakes.map((m) => (
              <button key={m.id} onClick={() => select(m.id)} className={"w-full cursor-pointer rounded-2xl border bg-white p-4 text-left transition " + (current?.id === m.id ? "border-primary shadow-[0_0_0_2px_rgba(33,87,213,.09)]" : "hover:border-[#b9c3d5]")}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge className={sectionTone[m.section] || ""} variant="outline">{m.section}</Badge>
                  <span className={"text-xs font-medium " + (m.status === "pending" ? "text-orange-600" : "text-emerald-600")}>{m.status === "pending" ? "待分析" : "已整理"}</span>
                </div>
                <div className="font-semibold">{m.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{m.questionType}</div>
              </button>
            ))}
          </div>
          {current && (
            <Card className="h-fit border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Badge className={sectionTone[current.section] || ""} variant="outline">{current.section}</Badge><Badge variant="secondary">{current.questionType}</Badge></div>
                    <CardTitle className="pt-2 text-2xl">{current.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => edit(current)}><Pencil /> Edit</Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => remove(current)}><Trash2 /> Delete</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                {current.richContent ? (
                  <RichContentBlock title="Question + Answer" html={current.richContent} />
                ) : hasAnswerParts(current.answerParts) ? (
                  <CompletedPassage answerParts={current.answerParts} />
                ) : (
                  <>
                    <DetailBlock title="Your answer" text={current.wrongAnswer} placeholder="等待补全你的答案" />
                    <DetailBlock title="Correct answer" text={current.correctAnswer} placeholder="等待补全正确答案" />
                  </>
                )}
                <DetailBlock title="What I noticed" text={current.selfReportedWeakness} placeholder="还没有记录你自己判断的弱点。" />
                {current.notes && <DetailBlock title="Notes" text={current.notes} placeholder="" />}
                <DetailBlock title="WorkBuddy analysis" text={current.analysis} placeholder="等待 WorkBuddy 补充分析。" />
                <DetailBlock title="Transferable rule" text={current.lesson} placeholder="整理后会生成可迁移规则。" accent />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

type AnswerPart = { text: string; status?: "correct" | "incorrect" };

function parseAnswerParts(value: string): AnswerPart[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((part): part is AnswerPart =>
      typeof part === "object" && part !== null && typeof (part as AnswerPart).text === "string"
    );
  } catch {
    return [];
  }
}

function hasAnswerParts(value: string) {
  return parseAnswerParts(value).length > 0;
}

function CompletedPassage({ answerParts }: { answerParts: string }) {
  const parts = parseAnswerParts(answerParts);
  return (
    <div className="md:col-span-2 rounded-2xl border bg-white p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">Completed Passage</div>
        <div className="flex gap-3 text-xs font-medium">
          <span className="text-emerald-700">● Correct</span>
          <span className="text-red-700">● Missed</span>
        </div>
      </div>
      <p className="text-[17px] leading-8 text-[#263247]">
        {parts.map((part, index) => (
          <span
            key={index}
            className={part.status === "correct"
              ? "rounded bg-emerald-50 px-0.5 font-semibold text-emerald-700"
              : part.status === "incorrect"
                ? "rounded bg-red-50 px-0.5 font-semibold text-red-700"
                : ""}
          >
            {part.text}
          </span>
        ))}
      </p>
    </div>
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function sanitizeRichHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function RichContentBlock({ title, html, compact }: { title: string; html: string; compact?: boolean }) {
  return (
    <div className={(compact ? "" : "md:col-span-2 ") + "rounded-2xl border bg-white p-5 md:p-6"}>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div
        className="rich-content text-[16px] leading-8 text-[#263247]"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
      />
    </div>
  );
}

function DetailBlock({ title, text, placeholder, accent }: { title: string; text: string; placeholder: string; accent?: boolean }) {
  return (
    <div className={"min-h-32 rounded-xl border p-4 " + (accent ? "border-blue-100 bg-blue-50/70" : "bg-[#fafbfc]")}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">{title}</div>
      <p className={"whitespace-pre-wrap text-sm leading-6 " + (!text ? "text-muted-foreground" : "")}>{text || placeholder}</p>
    </div>
  );
}

function VocabularyView({ words, revealed, reveal, review, add, edit, remove }: {
  words: Word[]; revealed: number | null; reveal: (id: number | null) => void;
  review: (id: number, rating: string) => void; add: () => void; edit: (word: Word) => void; remove: (word: Word) => void;
}) {
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Vocabulary" title="只记真正影响理解和表达的词。" action={<Button onClick={add}><Plus /> 添加单词</Button>} />
      {!words.length ? (
        <EmptyState icon={GraduationCap} title="生词本还是空的" description="从错题中提取语境、搭配和用法，不背孤立词义。" action={<Button onClick={add}>添加第一个单词</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {words.map((word) => (
            <Card key={word.id} className="gap-4 border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between"><Badge variant={word.level === "active" ? "default" : "secondary"}>{word.level === "active" ? "Active" : "Passive"}</Badge><span className="text-xs text-muted-foreground">Level {word.mastery}/5</span></div>
                <CardTitle className="pt-2 text-2xl">{word.word}</CardTitle>
                <Progress value={word.mastery * 20} />
              </CardHeader>
              <CardContent className="space-y-3">
                {revealed !== word.id ? (
                  <button onClick={() => reveal(word.id)} className="flex min-h-36 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed bg-[#fafbfc] text-sm font-medium text-primary hover:bg-blue-50">显示答案</button>
                ) : (
                  <div className="min-h-36 space-y-3">
                    <p className="font-medium">{word.meaning || "尚未填写释义"}</p>
                    {word.contextSentence && <p className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">{word.contextSentence}</p>}
                    {word.example && <p className="whitespace-pre-wrap break-words text-sm"><span className="text-muted-foreground">Notes：</span>{word.example}</p>}
                    {word.collocation && <p className="text-sm"><span className="text-muted-foreground">搭配：</span>{word.collocation}</p>}
                    <div className="grid grid-cols-4 gap-1.5 pt-2">
                      {["again", "hard", "good", "easy"].map((rating) => <Button key={rating} size="sm" variant={rating === "good" ? "default" : "outline"} onClick={() => void review(word.id, rating)} className="capitalize">{rating}</Button>)}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => edit(word)}><Pencil /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => remove(word)}><Trash2 /> Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeasView({ ideas, add, edit, remove, interview }: { ideas: Idea[]; add: () => void; edit: (idea: Idea) => void; remove: (idea: Idea) => void; interview: boolean }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = ideas.find((idea) => idea.id === selectedId);
  const title = interview ? "Interview" : "Writing Templates";
  return (
    <div className="space-y-6">
      <PageTitle eyebrow={title} title={interview ? "口语面试素材" : "写作模板"} action={<Button onClick={add}><Plus /> {interview ? "Add topic" : "Add template"}</Button>} />
      {!ideas.length ? (
        <EmptyState icon={interview ? MessageSquareText : FileText} title={interview ? "还没有口语素材" : "还没有写作模板"} description={interview ? "每个主题的 Q1–Q4 放在同一张卡片里。" : "保存范文、句式和自己的 Notes。"} action={<Button onClick={add}>添加第一条</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {ideas.map((idea) => (
            <button key={idea.id} type="button" onClick={() => setSelectedId(idea.id)} className="flex w-full items-center justify-between gap-4 rounded-xl border bg-white px-6 py-5 text-left text-lg font-semibold shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary">
              <span className="min-w-0 break-words">{idea.topic}</span><ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle className="pr-6 text-xl leading-8">{selected?.topic}</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader>
          {selected && <div className="space-y-5">
            {selected.claim && selected.claim !== selected.topic && !interview && <p className="text-lg font-semibold">{selected.claim}</p>}
            {selected.richContent && <RichContentBlock title={interview ? "Q1–Q4" : "Content"} html={selected.richContent} compact />}
            {selected.notes && <DetailBlock title="Notes" text={selected.notes} placeholder="" />}
            {selected.example && <DetailBlock title="Example" text={selected.example} placeholder="" />}
            {selected.phrases && <DetailBlock title="Useful language" text={selected.phrases} placeholder="" />}
            <div className="flex gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setSelectedId(null); edit(selected); }}><Pencil /> Edit</Button>
              <Button variant="outline" className="text-red-600" onClick={() => remove(selected)}><Trash2 /> Delete</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1></div>
      {action}
    </div>
  );
}

function WordDialog({ open, setOpen, saving, submit, word }: { open: boolean; setOpen: (v: boolean) => void; saving: boolean; submit: (e: FormEvent<HTMLFormElement>) => void; word: Word | null }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{word ? "编辑单词" : "添加单词"}</DialogTitle><DialogDescription>English、中文和自己的 Notes。</DialogDescription></DialogHeader>
        <form key={word?.id || "new-word"} onSubmit={submit} className="space-y-4">
          <Field label="English"><Input required name="word" defaultValue={word?.word || ""} /></Field>
          <Field label="中文"><Input name="meaning" defaultValue={word?.meaning || ""} /></Field>
          <Field label="Notes"><Textarea name="example" defaultValue={word?.example || ""} className="min-h-24 max-h-64 overflow-y-auto" /></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={saving}>{saving && <LoaderCircle className="animate-spin" />}保存</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MistakeDialog({ open, setOpen, saving, submit, mistake }: { open: boolean; setOpen: (v: boolean) => void; saving: boolean; submit: (e: FormEvent<HTMLFormElement>) => void; mistake: Mistake | null }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mistake ? "编辑错题" : "手动添加错题"}</DialogTitle>
          <DialogDescription>把题目原文 + 正确答案放进正文框。选中文字后可以改颜色或加 highlight。</DialogDescription>
        </DialogHeader>
        <form key={mistake?.id || "new-mistake"} onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Title"><Input required name="title" defaultValue={mistake?.title || ""} placeholder="例如 Fill in the Missing Letters" /></Field>
            <Field label="Section"><select name="section" defaultValue={mistake?.section || "Reading"} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option>Reading</option><option>Listening</option><option>Speaking</option><option>Writing</option></select></Field>
            <Field label="Type"><Input name="questionType" defaultValue={mistake?.questionType || ""} placeholder="Fill missing letters" /></Field>
          </div>
          <Field label="Question + correct answer"><RichTextInput name="richContent" initialHtml={mistake?.richContent || ""} /></Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={mistake?.notes || ""} placeholder="这里随便写：为什么错、下次怎么判断、哪些词不熟……" className="min-h-24" /></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={saving}>{saving && <LoaderCircle className="animate-spin" />}保存</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IdeaDialog({ open, setOpen, saving, submit, idea, interview }: { interview: boolean; open: boolean; setOpen: (v: boolean) => void; saving: boolean; submit: (e: FormEvent<HTMLFormElement>) => void; idea: Idea | null }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{idea ? "编辑素材" : interview ? "添加 Interview" : "添加写作模板"}</DialogTitle><DialogDescription>{interview ? "同一主题的 Q1–Q4 和回答放在一起，可以用颜色标重点。" : "粘贴写作模板或范文，再用颜色标重点。"}</DialogDescription></DialogHeader>
        <form key={idea?.id || "new-idea"} onSubmit={submit} className="space-y-4">
          <Field label="Topic"><Input required name="topic" defaultValue={idea?.topic || ""} placeholder={interview ? "例如 Personal Growth" : "例如 Email · Request / Academic Discussion"} /></Field>

          <Field label="Content"><RichTextInput name="richContent" initialHtml={idea?.richContent || ""} /></Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={idea?.notes || ""} placeholder="这里随便写：怎么用、适合什么题、哪些表达可以复用……" className="min-h-24" /></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={saving}>{saving && <LoaderCircle className="animate-spin" />}保存</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RichTextInput({ name, initialHtml = "" }: { name: string; initialHtml?: string }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<Range | null>(null);

  // The browser owns editable DOM. React must never replace it on input or formatting.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml;
    if (inputRef.current) inputRef.current.value = initialHtml;
    selectionRef.current = null;
  }, [initialHtml]);

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)
      && editorRef.current.contains(selection.focusNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  useEffect(() => {
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, []);

  function sync() {
    if (inputRef.current) inputRef.current.value = editorRef.current?.innerHTML || "";
    rememberSelection();
  }

  function format(command: "foreColor" | "hiliteColor", value: string) {
    const editor = editorRef.current;
    const range = selectionRef.current;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      toast.message("先选中要标记的文字");
      return;
    }
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    sync();
  }

  function paste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const plain = event.clipboardData.getData("text/plain");
    const rich = event.clipboardData.getData("text/html");
    // Retain text, paragraphs and simple marks; discard source-page layout and active content.
    const doc = new DOMParser().parseFromString(rich || "", "text/html");
    const clean = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (!(node instanceof HTMLElement)) return "";
      const tag = node.tagName.toLowerCase();
      if (["script", "style", "iframe", "object", "svg", "img", "head"].includes(tag)) return "";
      if (tag === "br") return "<br>";
      let text = Array.from(node.childNodes).map(clean).join("");
      const styles: string[] = [];
      for (const key of ["color", "background-color"] as const) {
        const value = node.style.getPropertyValue(key);
        if (/^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(value)) styles.push(`${key}:${value}`);
      }
      if (styles.length) text = `<span style="${styles.join(";")}">${text}</span>`;
      if (["b", "strong", "i", "em", "u"].includes(tag)) text = `<${tag}>${text}</${tag}>`;
      if (["p", "div", "li", "h1", "h2", "h3", "blockquote", "tr"].includes(tag)) text = `<div>${text || "<br>"}</div>`;
      return text;
    };
    if (rich && doc.body.textContent?.trim()) {
      document.execCommand("insertHTML", false, Array.from(doc.body.childNodes).map(clean).join(""));
    } else {
      document.execCommand("insertText", false, plain);
    }
    sync();
  }

  return (
    <div className="rounded-xl border bg-white text-[#263247]">
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-white p-2">
        <div className="mr-1 flex items-center gap-1 rounded-lg bg-[#f6f8fb] px-2 py-1 text-xs font-medium text-muted-foreground">Text</div>
        <ColorButton label="green" color="#15803d" onClick={() => format("foreColor", "#15803d")} />
        <ColorButton label="red" color="#dc2626" onClick={() => format("foreColor", "#dc2626")} />
        <ColorButton label="blue" color="#2563eb" onClick={() => format("foreColor", "#2563eb")} />
        <ColorButton label="black" color="#263247" onClick={() => format("foreColor", "#263247")} />
        <div className="mx-1 h-7 w-px bg-border" />
        <HighlightButton label="yellow" color="#fef08a" onClick={() => format("hiliteColor", "#fef08a")} />
        <HighlightButton label="green" color="#bbf7d0" onClick={() => format("hiliteColor", "#bbf7d0")} />
        <HighlightButton label="red" color="#fecaca" onClick={() => format("hiliteColor", "#fecaca")} />
        <HighlightButton label="blue" color="#bfdbfe" onClick={() => format("hiliteColor", "#bfdbfe")} />
      </div>
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="正文"
        aria-multiline="true"
        onPaste={paste}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onInput={sync}
        onBlur={sync}
        className="h-[36vh] min-h-56 max-h-[42vh] w-full overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-b-xl px-4 py-3 text-[16px] leading-8 text-[#263247] outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        style={{ color: "#263247" }}
        data-placeholder="粘贴或输入题目原文、正确答案；选中文字后点上面的颜色或 highlight。"
      />
    </div>
  );
}

function ColorButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="h-8 px-2"><span className="mr-1 size-3 rounded-full" style={{ backgroundColor: color }} />{label}</Button>;
}

function HighlightButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="h-8 px-2"><span className="mr-1 size-4 rounded-sm border" style={{ backgroundColor: color }} />{label}</Button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="group" aria-label={label} className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</div>;
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AskInput = z.object({ message: z.string().min(1).max(4000) });

export const askAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    // Load profile + recent history for context
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(30);

    const profileSummary = profile
      ? `Student profile:
- Account type: ${profile.account_type}
- Name: ${profile.full_name ?? "(not set)"}
- Grade level: ${profile.grade_level ?? "(unknown)"}
- Target major: ${profile.undecided ? "Undecided/exploring" : profile.target_major ?? "(not set)"}
- Target college: ${profile.target_college ?? "(not set)"}
- GPA: ${profile.gpa ?? "(not set)"}
- Test scores: ${profile.test_scores ?? "(none listed)"}
- Extracurriculars: ${profile.extracurriculars ?? "(none listed)"}
- First-generation: ${profile.first_gen ? "Yes" : "No/unspecified"}
- Immigration status: ${profile.immigration_status ?? "(unspecified)"}`
      : "No profile on file.";

    const systemPrompt = `You are PathFinder, a warm, calm college-prep coach for US students in grades 6–12 and their parents.
You give concrete, encouraging, grade-appropriate advice. You use plain language, avoid jargon, and never overwhelm.
Tailor every answer to the user's profile below. If information is missing, ask one gentle clarifying question.

${profileSummary}`;

    // Save user message
    await context.supabase.from("chat_messages").insert({
      user_id: context.userId,
      role: "user",
      content: data.message,
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "google/gemini-3.5-flash", messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Slow down for a moment — try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI error: ${text}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content ?? "…";

    await context.supabase.from("chat_messages").insert({
      user_id: context.userId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  });
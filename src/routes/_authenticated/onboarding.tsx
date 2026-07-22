import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — PathFinder" },
      { name: "description", content: "Tell PathFinder about your goals so we can tailor your roadmap." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    grade_level: 9,
    target_major: "",
    target_college: "",
    undecided: false,
    gpa: "",
    extracurriculars: "",
    test_scores: "",
    first_gen: false,
    immigration_status: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        grade_level: form.grade_level,
        target_major: form.undecided ? null : form.target_major || null,
        target_college: form.undecided ? null : form.target_college || null,
        undecided: form.undecided,
        gpa: form.gpa ? Number(form.gpa) : null,
        extracurriculars: form.extracurriculars || null,
        test_scores: form.test_scores || null,
        first_gen: form.first_gen,
        immigration_status: form.immigration_status || null,
        onboarding_complete: true,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("You're all set!");
    navigate({ to: "/roadmap" });
  }

  const steps = [
    {
      title: "What grade are you in?",
      subtitle: "Parents — pick your student's grade.",
      body: (
        <div className="grid grid-cols-4 gap-2">
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setForm({ ...form, grade_level: g })}
              className={`aspect-square rounded-2xl border-2 text-lg font-bold transition ${
                form.grade_level === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Where are you headed?",
      subtitle: "It's okay to not know yet.",
      body: (
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-border bg-card cursor-pointer">
            <Checkbox checked={form.undecided} onCheckedChange={(v) => setForm({ ...form, undecided: !!v })} />
            <span className="font-medium">I'm still exploring</span>
          </label>
          {!form.undecided && (
            <>
              <div>
                <Label htmlFor="major">Target major or field</Label>
                <Input id="major" value={form.target_major} onChange={(e) => setForm({ ...form, target_major: e.target.value })} placeholder="e.g. Computer Science" className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="college">Dream college (optional)</Label>
                <Input id="college" value={form.target_college} onChange={(e) => setForm({ ...form, target_college: e.target.value })} placeholder="e.g. UCLA" className="mt-1.5 h-11 rounded-xl" />
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      title: "How's the academic picture?",
      subtitle: "Rough estimates are fine — you can update anytime.",
      body: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="gpa">Current GPA</Label>
            <Input id="gpa" type="number" step="0.01" min="0" max="5" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} placeholder="e.g. 3.8" className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="tests">Test scores</Label>
            <Textarea id="tests" value={form.test_scores} onChange={(e) => setForm({ ...form, test_scores: e.target.value })} placeholder="SAT 1420, PSAT 1310, AP Calc 5…" className="mt-1.5 rounded-xl min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="ecs">Extracurriculars</Label>
            <Textarea id="ecs" value={form.extracurriculars} onChange={(e) => setForm({ ...form, extracurriculars: e.target.value })} placeholder="Debate team captain, robotics club, volunteer tutor…" className="mt-1.5 rounded-xl min-h-[100px]" />
          </div>
        </div>
      ),
    },
    {
      title: "A few final things",
      subtitle: "Optional — this helps us give better guidance.",
      body: (
        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-border bg-card cursor-pointer">
            <Checkbox checked={form.first_gen} onCheckedChange={(v) => setForm({ ...form, first_gen: !!v })} className="mt-0.5" />
            <div>
              <div className="font-medium">I'll be a first-generation college student</div>
              <div className="text-sm text-muted-foreground">Unlocks tailored resources and support.</div>
            </div>
          </label>
          <div>
            <Label htmlFor="imm">Immigration status (optional)</Label>
            <Input id="imm" value={form.immigration_status} onChange={(e) => setForm({ ...form, immigration_status: e.target.value })} placeholder="e.g. US citizen, international, DACA" className="mt-1.5 h-11 rounded-xl" />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">PathFinder</span>
        </div>
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
        <p className="text-muted-foreground mt-1">{current.subtitle}</p>
      </div>
      <div className="flex-1 px-5 pb-6">{current.body}</div>
      <div className="sticky bottom-0 border-t border-border bg-card p-5 flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-xl">
            Back
          </Button>
        )}
        <Button
          onClick={() => (last ? save() : setStep(step + 1))}
          disabled={saving}
          className="flex-[2] h-12 rounded-xl font-semibold"
        >
          {last ? (saving ? "Saving…" : "Finish") : "Continue"}
        </Button>
      </div>
    </div>
  );
}
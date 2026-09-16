import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/data";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

export const Route = createFileRoute("/requests/new")({ component: NewRequestPage });

function NewRequestPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [type, setType] = useState("AI图片");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, navigate]);

  function toggleRequirement(value: string) {
    setRequirements((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function submit(status: "draft" | "recruiting") {
    if (!user) return;
    setSubmitting(true);
    setMessage("");

    const { data, error } = await supabase
      .from("requests")
      .insert({
        client_id: user.id,
        title,
        type,
        category,
        description,
        budget_min: Number(budgetMin),
        budget_max: Number(budgetMax),
        deadline,
        commercial_use: requirements.includes("商业使用") ? "commercial" : "unknown",
        special_requirements: requirements,
        status,
      })
      .select("id")
      .single();

    if (error) {
      setMessage("提交失败：" + error.message);
      setSubmitting(false);
      return;
    }

    navigate({ to: "/requests/$requestId", params: { requestId: data.id } });
  }

  if (authLoading || !user) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在确认登录状态…</div>;
  }

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">发布需求</h1>
        <p className="mt-2 text-sm text-muted-foreground">把交付目标说清楚，让合适的 AI 创作者来找你。</p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit("recruiting");
          }}
        >
          <Field title="需求标题" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例如：需要一套红酒品牌 AI 商品图 + 15s 视频" />
          </Field>

          <Field title="需求类型" required>
            <div className="flex gap-2">
              {["AI图片", "AI视频", "AI设计"].map((x) => (
                <button key={x} type="button" onClick={() => setType(x)} className={cn("rounded-full px-4 py-2 text-sm", type === x ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {x}
                </button>
              ))}
            </div>
          </Field>

          <Field title="细分类别" required>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.label} type="button" onClick={() => setCategory(c.label)} className={cn("rounded-full px-3.5 py-2 text-xs", category === c.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="详细需求" required>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-40 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="交付数量、画面方向、使用场景、必须保持一致的内容……" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field title="预算范围" required>
              <div className="grid grid-cols-2 gap-2">
                <Input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} required placeholder="最低预算" type="number" min="0" />
                <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required placeholder="最高预算" type="number" min={budgetMin || "0"} />
              </div>
            </Field>
            <Field title="期望交付日期" required>
              <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} required type="date" />
            </Field>
          </div>

          <Field title="特殊要求">
            <div className="flex flex-wrap gap-2">
              {["商业使用", "人工精修", "产品一致性", "真人一致性", "提供源文件"].map((x) => (
                <label key={x} className="rounded-full bg-secondary px-3.5 py-2 text-xs">
                  <input type="checkbox" checked={requirements.includes(x)} onChange={() => toggleRequirement(x)} className="mr-2" />
                  {x}
                </label>
              ))}
            </div>
          </Field>

          {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}

          <div className="flex justify-end gap-2 border-t border-border pt-6">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => submit("draft")}>保存草稿</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "提交中…" : "立即发布"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return <div className="card-surface p-5"><div className="mb-3 text-sm font-medium">{title}{required ? <span className="ml-1 text-clay">*</span> : null}</div>{children}</div>;
}

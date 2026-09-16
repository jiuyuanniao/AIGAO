import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { CATEGORIES } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/action-errors";

type RequestEditRow = {
  id: string;
  client_id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  budget_min: number;
  budget_max: number;
  deadline: string;
  commercial_use: string;
  special_requirements: string[];
  status: "draft" | "recruiting" | "matched" | "in_progress" | "completed" | "cancelled";
};

export const Route = createFileRoute("/requests/$requestId/edit")({ component: EditRequestPage });

function EditRequestPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [row, setRow] = useState<RequestEditRow | null>(null);
  const [type, setType] = useState("AI图片");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("requests")
        .select("id,client_id,title,type,category,description,budget_min,budget_max,deadline,commercial_use,special_requirements,status")
        .eq("id", requestId)
        .single();

      if (error || !data || data.client_id !== user.id) {
        setMessage("需求不存在，或你没有权限编辑。");
        setLoading(false);
        return;
      }

      const request = data as RequestEditRow;
      if (!["draft", "recruiting"].includes(request.status)) {
        setMessage("这条需求已经进入合作流程，不能再修改内容。");
        setLoading(false);
        return;
      }

      setRow(request);
      setType(request.type);
      setCategory(request.category);
      setTitle(request.title);
      setDescription(request.description);
      setBudgetMin(String(request.budget_min));
      setBudgetMax(String(request.budget_max));
      setDeadline(request.deadline);
      setRequirements(request.special_requirements ?? []);
      setLoading(false);
    })();
  }, [user?.id, requestId]);

  function toggleRequirement(value: string) {
    setRequirements((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function save(nextStatus?: "draft" | "recruiting") {
    if (!row || !user) return;
    if (!title.trim() || !description.trim() || !budgetMin || !budgetMax || !deadline) {
      setMessage("请把必填内容填写完整。");
      return;
    }
    if (Number(budgetMin) > Number(budgetMax)) {
      setMessage("最低预算不能高于最高预算。");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("requests")
      .update({
        title: title.trim(),
        type,
        category,
        description: description.trim(),
        budget_min: Number(budgetMin),
        budget_max: Number(budgetMax),
        deadline,
        commercial_use: requirements.includes("商业使用") ? "commercial" : "unknown",
        special_requirements: requirements,
        status: nextStatus ?? row.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      setMessage(actionErrorMessage(error, "保存失败，请稍后重试。"));
      setSaving(false);
      return;
    }

    navigate({ to: "/requests/$requestId", params: { requestId } });
  }

  if (authLoading || loading) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载需求编辑器…</div>;
  }

  if (!row) {
    return (
      <div className="container-page py-20">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">暂时不能编辑</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{message || "请返回需求详情查看当前状态。"}</p>
          <Button className="mt-5" variant="outline" onClick={() => navigate({ to: "/requests/$requestId", params: { requestId } })}>返回需求详情</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <form
        className="mx-auto max-w-3xl space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <div className="text-sm text-muted-foreground">需求管理 / 编辑</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">编辑需求</h1>
          <p className="mt-2 text-sm text-muted-foreground">草稿和招募中的需求可以修改；选定创作者后，订单会以当时内容生成快照。</p>
        </div>

        <Block title="需求标题"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Block>

        <Block title="需求类型">
          <div className="flex flex-wrap gap-2">
            {["AI图片", "AI视频", "AI设计"].map((x) => (
              <button key={x} type="button" onClick={() => setType(x)} className={cn("rounded-full px-4 py-2 text-sm", type === x ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{x}</button>
            ))}
          </div>
        </Block>

        <Block title="细分类别">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.label} type="button" onClick={() => setCategory(c.label)} className={cn("rounded-full px-3.5 py-2 text-xs", category === c.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{c.label}</button>
            ))}
          </div>
        </Block>

        <Block title="详细需求">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-40 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </Block>

        <div className="grid gap-4 md:grid-cols-2">
          <Block title="预算范围">
            <div className="grid grid-cols-2 gap-2">
              <Input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} type="number" min="0" required />
              <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} type="number" min="0" required />
            </div>
          </Block>
          <Block title="期望交付日期">
            <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" required />
          </Block>
        </div>

        <Block title="特殊要求">
          <div className="flex flex-wrap gap-2">
            {["商业使用", "人工精修", "产品一致性", "真人一致性", "提供源文件"].map((x) => (
              <label key={x} className="rounded-full bg-secondary px-3.5 py-2 text-xs">
                <input type="checkbox" checked={requirements.includes(x)} onChange={() => toggleRequirement(x)} className="mr-2" />
                {x}
              </label>
            ))}
          </div>
        </Block>

        {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate({ to: "/requests/$requestId", params: { requestId } })}>取消</Button>
          {row.status === "draft" ? <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => save("recruiting")}>保存并发布</Button> : null}
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "保存中…" : "保存修改"}</Button>
        </div>
      </form>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card-surface p-4 sm:p-5"><div className="mb-3 text-sm font-medium">{title}</div>{children}</section>;
}

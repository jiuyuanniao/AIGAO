import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/creator/services/new")({ component: NewServicePage });

function NewServicePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [subCategory, setSubCategory] = useState("");
  const [price, setPrice] = useState("299");
  const [days, setDays] = useState("3");
  const [quantity, setQuantity] = useState("5 张成片");
  const [revisions, setRevisions] = useState("1");
  const [commercial, setCommercial] = useState(true);
  const [sourceFile, setSourceFile] = useState<"included" | "add_on" | "no">("add_on");
  const [retouch, setRetouch] = useState(true);
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) navigate({ to: "/creator/onboarding" });
      else setCreatorId(data.id);
    });
  }, [user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !creatorId || !cover) return;
    setSaving(true);
    setMessage("");

    try {
      const safeName = cover.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/service/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("creator-assets").upload(path, cover);
      if (uploadError) throw uploadError;
      const coverUrl = supabase.storage.from("creator-assets").getPublicUrl(path).data.publicUrl;

      const { error } = await supabase.from("services").insert({
        creator_id: creatorId,
        title,
        category,
        sub_category: subCategory || null,
        cover_url: coverUrl,
        gallery_urls: [coverUrl],
        price_from: Number(price),
        delivery_days: Number(days),
        quantity_desc: quantity,
        revision_count: Number(revisions),
        commercial_use: commercial,
        source_file: sourceFile,
        manual_retouch: retouch,
        consistency_flags: [],
        tools: [],
        description,
        status: "published",
      });
      if (error) throw error;

      navigate({ to: "/me" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || !creatorId) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在准备创作者服务编辑器…</div>;
  }

  return (
    <div className="container-page py-10">
      <form className="mx-auto max-w-3xl space-y-5" onSubmit={submit}>
        <div>
          <h1 className="font-display text-3xl font-semibold">发布新服务</h1>
          <p className="mt-2 text-sm text-muted-foreground">把“买到什么”说清楚，需求方不需要先理解 AI 工具。</p>
        </div>

        <Block title="服务标题"><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例如：AI 商品场景图 · 电商主图与详情页整套" /></Block>

        <Block title="交付类型">
          <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button type="button" key={c.label} onClick={() => setCategory(c.label)} className={cn("rounded-full px-3.5 py-2 text-xs", category === c.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{c.label}</button>)}</div>
          <Input className="mt-3" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="细分用途，例如：护肤品、电商主图、品牌 KV" />
        </Block>

        <Block title="价格与交付">
          <div className="grid gap-3 md:grid-cols-4">
            <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="起价" required />
            <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="交付天数" required />
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="5 张 / 15s" required />
            <Input type="number" min="0" value={revisions} onChange={(e) => setRevisions(e.target.value)} placeholder="修改次数" required />
          </div>
        </Block>

        <Block title="服务说明">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36 w-full rounded-xl border border-input bg-background p-4 text-sm" required placeholder="交付范围、适用场景、工作方式、注意事项…" />
        </Block>

        <Block title="交付权限">
          <div className="flex flex-wrap gap-5 text-sm">
            <label><input type="checkbox" className="mr-2" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />支持商用</label>
            <label><input type="checkbox" className="mr-2" checked={retouch} onChange={(e) => setRetouch(e.target.checked)} />人工精修</label>
            <label>源文件
              <select className="ml-2 rounded-lg border border-input bg-background px-2 py-1.5" value={sourceFile} onChange={(e) => setSourceFile(e.target.value as typeof sourceFile)}>
                <option value="included">包含</option><option value="add_on">可加购</option><option value="no">不提供</option>
              </select>
            </label>
          </div>
        </Block>

        <Block title="服务封面">
          <input type="file" accept="image/*" required onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </Block>

        {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}

        <div className="flex justify-end"><Button disabled={saving}>{saving ? "发布中…" : "发布服务"}</Button></div>
      </form>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card-surface p-5"><div className="mb-3 text-sm font-medium">{title}</div>{children}</section>;
}

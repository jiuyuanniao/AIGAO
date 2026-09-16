import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/creator/portfolio/new")({ component: NewPortfolioPage });

function NewPortfolioPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [tags, setTags] = useState("");
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
      const path = `${user.id}/portfolio/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("creator-assets").upload(path, cover);
      if (uploadError) throw uploadError;
      const coverUrl = supabase.storage.from("creator-assets").getPublicUrl(path).data.publicUrl;

      const { error } = await supabase.from("portfolios").insert({
        creator_id: creatorId,
        title,
        cover_url: coverUrl,
        media_urls: [coverUrl],
        category,
        tags: tags.split(/[、,，]/).map((x) => x.trim()).filter(Boolean),
        description,
        is_published: true,
      });
      if (error) throw error;
      navigate({ to: "/me" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || !creatorId) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在准备作品编辑器…</div>;
  }

  return (
    <div className="container-page py-10">
      <form className="mx-auto max-w-3xl space-y-5" onSubmit={submit}>
        <div><h1 className="font-display text-3xl font-semibold">上传作品</h1><p className="mt-2 text-sm text-muted-foreground">作品是创作者主页最重要的可信信息。</p></div>

        <Block title="作品名称"><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例如：威士忌品牌秋季产品视觉" /></Block>

        <Block title="作品分类">
          <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button type="button" key={c.label} onClick={() => setCategory(c.label)} className={cn("rounded-full px-3.5 py-2 text-xs", category === c.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{c.label}</button>)}</div>
          <Input className="mt-3" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，用顿号分隔：酒水、质感光影、产品一致性" />
        </Block>

        <Block title="作品说明"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="项目背景、负责内容、制作方法或交付结果…" /></Block>

        <Block title="作品封面"><input type="file" accept="image/*" required onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></Block>

        {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}
        <div className="flex justify-end"><Button disabled={saving}>{saving ? "上传中…" : "发布作品"}</Button></div>
      </form>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card-surface p-5"><div className="mb-3 text-sm font-medium">{title}</div>{children}</section>;
}

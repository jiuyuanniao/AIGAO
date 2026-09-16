import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { CATEGORIES } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { actionErrorMessage } from "@/lib/action-errors";

type ServiceRow = {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  sub_category: string | null;
  cover_url: string | null;
  gallery_urls: string[];
  price_from: number;
  delivery_days: number;
  quantity_desc: string | null;
  revision_count: number;
  commercial_use: boolean;
  source_file: "included" | "add_on" | "no";
  manual_retouch: boolean;
  description: string | null;
  status: "draft" | "published" | "paused" | "removed";
};

export const Route = createFileRoute("/creator/services/$serviceId/edit")({ component: EditServicePage });

function EditServicePage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [service, setService] = useState<ServiceRow | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [subCategory, setSubCategory] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [quantity, setQuantity] = useState("");
  const [revisions, setRevisions] = useState("");
  const [commercial, setCommercial] = useState(true);
  const [sourceFile, setSourceFile] = useState<"included" | "add_on" | "no">("add_on");
  const [retouch, setRetouch] = useState(true);
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
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
        .from("services")
        .select("id,creator_id,title,category,sub_category,cover_url,gallery_urls,price_from,delivery_days,quantity_desc,revision_count,commercial_use,source_file,manual_retouch,description,status")
        .eq("id", serviceId)
        .single();

      if (error || !data) {
        setMessage("服务不存在，或你没有权限编辑。");
        setLoading(false);
        return;
      }

      const cp = await supabase.from("creator_profiles").select("user_id").eq("id", data.creator_id).single();
      if (!cp.data || cp.data.user_id !== user.id || data.status === "removed") {
        setMessage("服务不存在，或你没有权限编辑。");
        setLoading(false);
        return;
      }

      const row = data as ServiceRow;
      setService(row);
      setTitle(row.title);
      setCategory(row.category);
      setSubCategory(row.sub_category ?? "");
      setPrice(String(row.price_from));
      setDays(String(row.delivery_days));
      setQuantity(row.quantity_desc ?? "");
      setRevisions(String(row.revision_count));
      setCommercial(row.commercial_use);
      setSourceFile(row.source_file);
      setRetouch(row.manual_retouch);
      setDescription(row.description ?? "");
      setLoading(false);
    })();
  }, [user?.id, serviceId]);

  async function save(nextStatus?: "published" | "paused") {
    if (!user || !service) return;
    setSaving(true);
    setMessage("");

    try {
      let coverUrl = service.cover_url;
      let galleryUrls = service.gallery_urls ?? [];

      if (cover) {
        const safeName = cover.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/service/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("creator-assets").upload(path, cover, { upsert: false });
        if (uploadError) throw uploadError;
        coverUrl = supabase.storage.from("creator-assets").getPublicUrl(path).data.publicUrl;
        galleryUrls = [coverUrl, ...galleryUrls.filter((url) => url !== service.cover_url)];
      }

      const { error } = await supabase
        .from("services")
        .update({
          title: title.trim(),
          category,
          sub_category: subCategory.trim() || null,
          cover_url: coverUrl,
          gallery_urls: galleryUrls,
          price_from: Number(price),
          delivery_days: Number(days),
          quantity_desc: quantity.trim(),
          revision_count: Number(revisions),
          commercial_use: commercial,
          source_file: sourceFile,
          manual_retouch: retouch,
          description: description.trim(),
          status: nextStatus ?? service.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId);

      if (error) throw error;
      navigate({ to: "/me" });
    } catch (error) {
      setMessage(actionErrorMessage(error, "保存服务失败，请稍后重试。"));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载服务编辑器…</div>;
  }

  if (!service) {
    return (
      <div className="container-page py-20">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">暂时不能编辑</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
          <Button className="mt-5" variant="outline" onClick={() => navigate({ to: "/me" })}>返回创作者中心</Button>
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
          <div className="text-sm text-muted-foreground">创作者中心 / 服务管理</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">编辑服务</h1>
          <p className="mt-2 text-sm text-muted-foreground">修改不会影响已经生成的历史订单，订单仍保留成交时的服务快照。</p>
        </div>

        <Block title="服务标题"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Block>

        <Block title="交付类型">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.label} onClick={() => setCategory(c.label)} className={cn("rounded-full px-3.5 py-2 text-xs", category === c.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{c.label}</button>
            ))}
          </div>
          <Input className="mt-3" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="细分用途" />
        </Block>

        <Block title="价格与交付">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="起价" required />
            <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="交付天数" required />
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="交付数量" required />
            <Input type="number" min="0" value={revisions} onChange={(e) => setRevisions(e.target.value)} placeholder="修改次数" required />
          </div>
        </Block>

        <Block title="服务说明">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36 w-full rounded-xl border border-input bg-background p-4 text-sm" required />
        </Block>

        <Block title="交付权限">
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-5">
            <label><input type="checkbox" className="mr-2" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />支持商用</label>
            <label><input type="checkbox" className="mr-2" checked={retouch} onChange={(e) => setRetouch(e.target.checked)} />人工精修</label>
            <label>源文件
              <select className="ml-2 rounded-lg border border-input bg-background px-2 py-1.5" value={sourceFile} onChange={(e) => setSourceFile(e.target.value as typeof sourceFile)}>
                <option value="included">包含</option>
                <option value="add_on">可加购</option>
                <option value="no">不提供</option>
              </select>
            </label>
          </div>
        </Block>

        <Block title="服务封面">
          {service.cover_url ? <img src={service.cover_url} alt="" className="mb-4 aspect-video w-full max-w-sm rounded-xl object-cover" /> : null}
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          <div className="mt-2 text-xs text-muted-foreground">不重新上传则保留原封面。</div>
        </Block>

        {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate({ to: "/me" })}>取消</Button>
          {service.status === "published" ? (
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => save("paused")}>保存并下架</Button>
          ) : (
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => save("published")}>保存并上架</Button>
          )}
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "保存中…" : "保存修改"}</Button>
        </div>
      </form>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card-surface p-4 sm:p-5"><div className="mb-3 text-sm font-medium">{title}</div>{children}</section>;
}

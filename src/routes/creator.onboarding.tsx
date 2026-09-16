import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/creator/onboarding")({ component: CreatorOnboardingPage });

type ExistingCreator = {
  id: string;
  handle: string | null;
  headline: string | null;
  bio: string | null;
  tags: string[];
  cover_url: string | null;
  profile_status: "draft" | "published" | "hidden";
};

function CreatorOnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [creator, setCreator] = useState<ExistingCreator | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [roleFlags, setRoleFlags] = useState<string[]>(["client"]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("display_name,avatar_url,role_flags").eq("id", user.id).single(),
      supabase.from("creator_profiles").select("id,handle,headline,bio,tags,cover_url,profile_status").eq("user_id", user.id).maybeSingle(),
    ]).then(([profileResult, creatorResult]) => {
      if (profileResult.data) {
        setDisplayName(profileResult.data.display_name ?? "");
        setAvatarUrl(profileResult.data.avatar_url ?? null);
        setRoleFlags(profileResult.data.role_flags ?? ["client"]);
      }
      if (creatorResult.data) {
        const c = creatorResult.data as ExistingCreator;
        setCreator(c);
        setHandle(c.handle ?? "");
        setHeadline(c.headline ?? "");
        setBio(c.bio ?? "");
        setTags((c.tags ?? []).join("、"));
        setCoverUrl(c.cover_url ?? null);
      }
    });
  }, [user]);

  async function uploadAsset(file: File, folder: "avatar" | "cover") {
    if (!user) throw new Error("请先登录");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("creator-assets").upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from("creator-assets").getPublicUrl(path).data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      let nextAvatar = avatarUrl;
      let nextCover = coverUrl;

      if (avatarFile) nextAvatar = await uploadAsset(avatarFile, "avatar");
      if (coverFile) nextCover = await uploadAsset(coverFile, "cover");

      const nextRoles = Array.from(new Set([...roleFlags, "client", "creator"]));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: nextAvatar, role_flags: nextRoles })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const payload = {
        user_id: user.id,
        handle: handle.trim().toLowerCase().replace(/\s+/g, "-"),
        headline,
        bio,
        tags: tags.split(/[、,，]/).map((x) => x.trim()).filter(Boolean),
        cover_url: nextCover,
        profile_status: "published" as const,
      };

      if (creator) {
        const { error } = await supabase.from("creator_profiles").update(payload).eq("id", creator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("creator_profiles").insert(payload);
        if (error) throw error;
      }

      setMessage("创作者主页已发布。");
      navigate({ to: "/me" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在确认登录状态…</div>;
  }

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">{creator ? "编辑创作者主页" : "成为 AI 创作者"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">先建立最基础的公开主页，就可以进入需求大厅应征项目。</p>

        <form className="mt-8 space-y-5" onSubmit={save}>
          <Block title="公开身份">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="昵称 / 工作室名称" required />
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="主页短名，例如 mori-studio" required />
            </div>
          </Block>

          <Block title="擅长方向">
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="例如：商业级 AI 商品视觉 / 品牌短片" required />
            <Input className="mt-3" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，用顿号分隔：商品摄影、品牌短片、产品一致性" />
          </Block>

          <Block title="创作者简介">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-36 w-full rounded-xl border border-input bg-background p-4 text-sm" placeholder="介绍你的工作经验、擅长风格、交付方式…" required />
          </Block>

          <Block title="头像与主页封面">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-xl border border-dashed border-border p-4 text-sm">
                <div className="font-medium">头像</div>
                {avatarUrl ? <img src={avatarUrl} alt="" className="mt-3 size-20 rounded-full object-cover" /> : null}
                <input className="mt-3 block w-full text-xs" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className="rounded-xl border border-dashed border-border p-4 text-sm">
                <div className="font-medium">主页封面</div>
                {coverUrl ? <img src={coverUrl} alt="" className="mt-3 h-20 w-full rounded-lg object-cover" /> : null}
                <input className="mt-3 block w-full text-xs" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </Block>

          {message ? <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{message}</div> : null}

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" disabled={saving}>{saving ? "保存中…" : creator ? "保存主页" : "发布创作者主页"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card-surface p-5"><div className="mb-3 text-sm font-medium">{title}</div>{children}</section>;
}

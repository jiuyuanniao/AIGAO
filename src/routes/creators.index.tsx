import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreatorCard } from "@/components/site/cards";
import { CATEGORIES, creators as mockCreators } from "@/lib/data";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Pill, Rating } from "@/components/site/common";

type RealCreator = {
  id: string;
  handle: string | null;
  headline: string | null;
  tags: string[];
  is_verified: boolean;
  avg_rating: number;
  completed_orders: number;
  on_time_rate: number;
  cover_url: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export const Route = createFileRoute("/creators/")({
  component: CreatorsPage,
});

function CreatorsPage() {
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"rating" | "orders">("rating");
  const [realCreators, setRealCreators] = useState<RealCreator[]>([]);

  useEffect(() => {
    supabase
      .from("creator_profiles")
      .select("id,handle,headline,tags,is_verified,avg_rating,completed_orders,on_time_rate,cover_url,user_id")
      .eq("profile_status", "published")
      .then(async ({ data }) => {
        const rows = data ?? [];
        const enriched = await Promise.all(rows.map(async (row) => {
          const p = await supabase.from("profiles").select("display_name,avatar_url").eq("id", row.user_id).single();
          return {
            ...row,
            display_name: p.data?.display_name || "AI 创作者",
            avatar_url: p.data?.avatar_url ?? null,
          } as RealCreator;
        }));
        setRealCreators(enriched);
      });
  }, []);

  const filteredReal = useMemo(() => {
    return realCreators
      .filter((c) => !tag || c.tags.includes(tag))
      .slice()
      .sort((a, b) => sort === "rating" ? Number(b.avg_rating) - Number(a.avg_rating) : b.completed_orders - a.completed_orders);
  }, [realCreators, tag, sort]);

  const filteredMock = mockCreators
    .filter((c) => !tag || c.specialties.includes(tag))
    .slice()
    .sort((a, b) => sort === "rating" ? b.rating - a.rating : b.completed_orders - a.completed_orders);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">找创作者</h1>
      <p className="mt-2 text-sm text-muted-foreground">看主页、看作品、看服务，再决定合作。</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[{ label: "全部" }, ...CATEGORIES.slice(0, 6)].map((c) => {
          const active = c.label === "全部" ? tag === null : tag === c.label;
          return (
            <button key={c.label} onClick={() => setTag(c.label === "全部" ? null : c.label)}
              className={cn("rounded-full px-4 py-2 text-xs transition-colors", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
              {c.label}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          {[["rating","按评分"],["orders","按成交"]].map(([v,l]) => (
            <button key={v} onClick={() => setSort(v as "rating" | "orders")}
              className={cn("rounded-full border px-3.5 py-1.5 text-xs", sort === v ? "border-foreground text-foreground" : "border-border text-muted-foreground")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filteredReal.length ? (
        <section className="mt-8">
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">平台真实创作者</div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredReal.map((c) => (
              <Link key={c.id} to="/creators/$handle" params={{ handle: c.handle ?? c.id }} className="card-surface hover-lift block overflow-hidden">
                <div className="h-24 overflow-hidden bg-muted">{c.cover_url ? <img src={c.cover_url} alt="" className="size-full object-cover" /> : null}</div>
                <div className="px-5 pb-5">
                  <div className="-mt-8 size-16 overflow-hidden rounded-full border-4 border-card bg-secondary">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="size-full object-cover" /> : null}
                  </div>
                  <div className="mt-3 flex items-center gap-2"><h3 className="text-[15px] font-medium">{c.display_name}</h3>{c.is_verified ? <Pill tone="brand">已认证</Pill> : null}</div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.headline || "AI 视觉创作者"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{c.tags.slice(0,3).map((t) => <Pill key={t} tone="muted">{t}</Pill>)}</div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
                    <Rating value={Number(c.avg_rating)} />
                    <span>完成 {c.completed_orders} 单</span>
                    <span>{Number(c.on_time_rate).toFixed(0)}% 按时</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">示例创作者</div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredMock.map((c) => <CreatorCard key={c.id} creator={c} />)}</div>
      </section>
    </div>
  );
}

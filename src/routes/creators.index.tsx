import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreatorCard } from "@/components/site/cards";
import { CATEGORIES, creators } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/creators/")({
  head: () => ({
    meta: [
      { title: "找创作者 · AIGAO" },
      { name: "description", content: "按擅长方向、评分与按时率浏览平台 AI 创作者，查看主页、作品与服务。" },
      { property: "og:title", content: "找创作者 · AIGAO" },
      { property: "og:description", content: "认证 AI 创作者列表，含评分、完成单数与响应速度。" },
    ],
  }),
  component: CreatorsPage,
});

function CreatorsPage() {
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"rating" | "orders" | "price">("rating");

  const list = creators
    .filter((c) => !tag || c.specialties.includes(tag))
    .slice()
    .sort((a, b) =>
      sort === "rating"
        ? b.rating - a.rating
        : sort === "orders"
          ? b.completed_orders - a.completed_orders
          : a.price_from - b.price_from,
    );

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">找创作者</h1>
      <p className="mt-2 text-sm text-muted-foreground">看主页、看作品、看评价，再决定约稿。</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[{ label: "全部" }, ...CATEGORIES.slice(0, 6)].map((c) => {
          const active = c.label === "全部" ? tag === null : tag === c.label;
          return (
            <button
              key={c.label}
              onClick={() => setTag(c.label === "全部" ? null : c.label)}
              className={cn(
                "rounded-full px-4 py-2 text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          {(
            [
              ["rating", "按评分"],
              ["orders", "按成交"],
              ["price", "按价格"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setSort(v)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                sort === v ? "border-foreground text-foreground" : "border-border text-muted-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((c) => (
          <CreatorCard key={c.id} creator={c} />
        ))}
      </div>
    </div>
  );
}
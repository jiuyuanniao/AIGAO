import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkCard } from "@/components/site/cards";
import { CATEGORIES, portfolios } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/works")({
  head: () => ({
    meta: [
      { title: "作品广场 · AIGAO" },
      { name: "description", content: "浏览 AI 创作者的商业作品：商品场景图、人物写真、品牌短片与 IP 动态。" },
      { property: "og:title", content: "作品广场 · AIGAO" },
      { property: "og:description", content: "从作品找到创作者，再看他的服务与报价。" },
    ],
  }),
  component: WorksPage,
});

function WorksPage() {
  const [cat, setCat] = useState<string | null>(null);
  const list = portfolios.filter((p) => !cat || p.category === cat);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">作品广场</h1>
      <p className="mt-2 text-sm text-muted-foreground">从一张喜欢的画面开始，找到背后的创作者。</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ label: "全部" }, ...CATEGORIES].map((c) => {
          const active = c.label === "全部" ? cat === null : cat === c.label;
          return (
            <button
              key={c.label}
              onClick={() => setCat(c.label === "全部" ? null : c.label)}
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
      </div>

      <div className="mt-8 columns-2 gap-5 md:columns-3 lg:columns-4">
        {list.map((p) => (
          <WorkCard key={p.id} work={p} />
        ))}
      </div>
    </div>
  );
}
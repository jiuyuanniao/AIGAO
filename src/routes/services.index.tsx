import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/site/cards";
import { CATEGORIES, USAGES, services } from "@/lib/data";
import { cn } from "@/lib/utils";

type ServiceSearch = { category?: string };

export const Route = createFileRoute("/services/")({
  validateSearch: (search: Record<string, unknown>): ServiceSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "找服务 · AIGAO 服务广场" },
      { name: "description", content: "按类型、用途与预算筛选 AI 图片与视频制作服务，明码标价，周期清晰。" },
      { property: "og:title", content: "找服务 · AIGAO 服务广场" },
      { property: "og:description", content: "AI 商品图、人物写真、品牌短片等服务橱窗，支持类型与预算筛选。" },
    ],
  }),
  component: ServicesPage,
});

const BUDGETS = [
  { label: "不限", min: 0, max: Infinity },
  { label: "¥500 以下", min: 0, max: 500 },
  { label: "¥500–1000", min: 500, max: 1000 },
  { label: "¥1000 以上", min: 1000, max: Infinity },
];

function ServicesPage() {
  const { category } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [usage, setUsage] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [mediaType, setMediaType] = useState<"all" | "image" | "video">("all");

  const list = useMemo(() => {
    const b = BUDGETS[budget];
    return services.filter(
      (s) =>
        (!category || s.category === category) &&
        (!usage || s.usage.includes(usage)) &&
        (mediaType === "all" || s.media_type === mediaType) &&
        s.price_from >= b.min &&
        s.price_from < b.max &&
        (keyword.trim() === "" || s.title.includes(keyword.trim())),
    );
  }, [category, usage, budget, mediaType, keyword]);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">服务广场</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        明码标价的 AI 制作服务，点击服务可查看交付范围、修改次数与商用权限。
      </p>

      <div className="card-surface mt-7 p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索服务标题，如：商品场景图"
              className="h-11 pl-10"
            />
          </div>
          <Button className="h-11 px-6">搜索</Button>
        </div>

        <FilterRow label="类型">
          <Chip active={!category} onClick={() => navigate({ to: "/services", search: {} })}>
            全部
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.slug}
              active={category === c.label}
              onClick={() => navigate({ to: "/services", search: { category: c.label } })}
            >
              {c.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="用途">
          <Chip active={!usage} onClick={() => setUsage(null)}>
            全部
          </Chip>
          {USAGES.map((u) => (
            <Chip key={u} active={usage === u} onClick={() => setUsage(u)}>
              {u}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="预算">
          {BUDGETS.map((b, i) => (
            <Chip key={b.label} active={budget === i} onClick={() => setBudget(i)}>
              {b.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="形式">
          {(
            [
              ["all", "全部"],
              ["image", "图片"],
              ["video", "视频"],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={mediaType === v} onClick={() => setMediaType(v)}>
              {l}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">共 {list.length} 个服务</div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card-surface mt-6 p-12 text-center text-sm text-muted-foreground">
          没有符合条件的服务，试试放宽筛选条件。
        </div>
      ) : null}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-4 border-t border-border pt-4">
      <span className="w-10 shrink-0 pt-1.5 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
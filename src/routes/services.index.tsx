import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/site/cards";
import { CATEGORIES, USAGES, services as mockServices } from "@/lib/data";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Pill } from "@/components/site/common";

type ServiceSearch = { category?: string };
type RealService = {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  sub_category: string | null;
  cover_url: string | null;
  price_from: number;
  delivery_days: number;
  quantity_desc: string | null;
  revision_count: number;
  commercial_use: boolean;
  source_file: string;
  manual_retouch: boolean;
  description: string | null;
  creator_name: string;
  creator_handle: string | null;
};

export const Route = createFileRoute("/services/")({
  validateSearch: (search: Record<string, unknown>): ServiceSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
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
  const [realServices, setRealServices] = useState<RealService[]>([]);

  useEffect(() => {
    supabase.from("services")
      .select("id,creator_id,title,category,sub_category,cover_url,price_from,delivery_days,quantity_desc,revision_count,commercial_use,source_file,manual_retouch,description")
      .eq("status","published")
      .order("created_at",{ascending:false})
      .then(async ({data}) => {
        const enriched = await Promise.all((data ?? []).map(async (s) => {
          const cp = await supabase.from("creator_profiles").select("user_id,handle").eq("id",s.creator_id).single();
          const p = cp.data ? await supabase.from("profiles").select("display_name").eq("id",cp.data.user_id).single() : {data:null};
          return {...s, creator_name:p.data?.display_name || "AI 创作者", creator_handle:cp.data?.handle ?? null} as RealService;
        }));
        setRealServices(enriched);
      });
  }, []);

  const b = BUDGETS[budget];
  const realList = useMemo(() => realServices.filter((s) =>
    (!category || s.category === category) &&
    s.price_from >= b.min && s.price_from < b.max &&
    (!keyword.trim() || s.title.includes(keyword.trim()))
  ), [realServices, category, budget, keyword]);

  const mockList = useMemo(() => mockServices.filter((s) =>
    (!category || s.category === category) &&
    (!usage || s.usage.includes(usage)) &&
    s.price_from >= b.min && s.price_from < b.max &&
    (!keyword.trim() || s.title.includes(keyword.trim()))
  ), [category, usage, budget, keyword]);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">服务广场</h1>
      <p className="mt-2 text-sm text-muted-foreground">按交付结果找服务，不按 AI 工具找服务。</p>

      <div className="card-surface mt-7 p-5">
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="搜索服务标题" className="h-11 pl-10" /></div>
          <Button className="h-11 px-6">搜索</Button>
        </div>
        <FilterRow label="类型"><Chip active={!category} onClick={()=>navigate({to:"/services",search:{}})}>全部</Chip>{CATEGORIES.map((c)=><Chip key={c.slug} active={category===c.label} onClick={()=>navigate({to:"/services",search:{category:c.label}})}>{c.label}</Chip>)}</FilterRow>
        <FilterRow label="用途"><Chip active={!usage} onClick={()=>setUsage(null)}>全部</Chip>{USAGES.map((u)=><Chip key={u} active={usage===u} onClick={()=>setUsage(u)}>{u}</Chip>)}</FilterRow>
        <FilterRow label="预算">{BUDGETS.map((x,i)=><Chip key={x.label} active={budget===i} onClick={()=>setBudget(i)}>{x.label}</Chip>)}</FilterRow>
      </div>

      {realList.length ? (
        <section className="mt-8">
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">平台真实服务</div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {realList.map((s)=>(
              <Link key={s.id} to="/services/$serviceId" params={{serviceId:s.id}} className="card-surface hover-lift block overflow-hidden">
                <div className="aspect-4/3 overflow-hidden bg-muted">{s.cover_url ? <img src={s.cover_url} alt="" className="size-full object-cover" /> : null}</div>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">{s.creator_name}</div>
                  <h3 className="mt-2 line-clamp-2 text-[15px] font-medium">{s.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone="muted">{s.delivery_days} 天</Pill><Pill tone="muted">{s.revision_count} 次修改</Pill>{s.commercial_use ? <Pill tone="brand">支持商用</Pill> : null}</div>
                  <div className="mt-4 border-t border-border pt-3.5"><span className="font-display text-lg font-semibold">¥{Number(s.price_from).toLocaleString("zh-CN")}</span><span className="ml-1 text-xs text-muted-foreground">起 · {s.quantity_desc || "按需求交付"}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">示例服务</div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{mockList.map((s)=><ServiceCard key={s.id} service={s} />)}</div>
      </section>
    </div>
  );
}

function FilterRow({label,children}:{label:string;children:React.ReactNode}){return <div className="mt-4 flex gap-4 border-t border-border pt-4"><span className="w-10 shrink-0 pt-1.5 text-xs text-muted-foreground">{label}</span><div className="flex flex-wrap gap-2">{children}</div></div>}
function Chip({active,onClick,children}:{active?:boolean;onClick:()=>void;children:React.ReactNode}){return <button type="button" onClick={onClick} className={cn("rounded-full px-3.5 py-1.5 text-xs transition-colors",active?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground")}>{children}</button>}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { WorkCard } from "@/components/site/cards";
import { CATEGORIES, portfolios as mockPortfolios } from "@/lib/data";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type RealWork={id:string;creator_id:string;title:string;cover_url:string|null;category:string|null;tags:string[];description:string|null;creator_name:string};

export const Route = createFileRoute("/works")({ component: WorksPage });

function WorksPage() {
  const [cat,setCat]=useState<string|null>(null);
  const [realWorks,setRealWorks]=useState<RealWork[]>([]);

  useEffect(()=>{
    supabase.from("portfolios").select("id,creator_id,title,cover_url,category,tags,description").eq("is_published",true).order("created_at",{ascending:false}).then(async({data})=>{
      const rows=await Promise.all((data??[]).map(async(w)=>{
        const cp=await supabase.from("creator_profiles").select("user_id").eq("id",w.creator_id).single();
        const p=cp.data?await supabase.from("profiles").select("display_name").eq("id",cp.data.user_id).single():{data:null};
        return {...w,creator_name:p.data?.display_name||"AI 创作者"} as RealWork;
      }));
      setRealWorks(rows);
    });
  },[]);

  const realList=useMemo(()=>realWorks.filter((w)=>!cat||w.category===cat),[realWorks,cat]);
  const mockList=mockPortfolios.filter((p)=>!cat||p.category===cat);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">作品广场</h1>
      <p className="mt-2 text-sm text-muted-foreground">从一张喜欢的画面开始，找到背后的创作者。</p>
      <div className="mt-6 flex flex-wrap gap-2">{[{label:"全部"},...CATEGORIES].map((c)=>{const active=c.label==="全部"?cat===null:cat===c.label;return <button key={c.label} onClick={()=>setCat(c.label==="全部"?null:c.label)} className={cn("rounded-full px-4 py-2 text-xs",active?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground")}>{c.label}</button>})}</div>

      {realList.length ? <section className="mt-8"><div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">平台真实作品</div><div className="columns-2 gap-5 md:columns-3 lg:columns-4">{realList.map((w)=><div key={w.id} className="card-surface mb-5 break-inside-avoid overflow-hidden">{w.cover_url?<img src={w.cover_url} alt={w.title} className="w-full object-cover" />:null}<div className="p-4"><div className="text-sm font-medium">{w.title}</div><div className="mt-2 text-xs text-muted-foreground">{w.creator_name}</div></div></div>)}</div></section>:null}

      <section className="mt-10"><div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">示例作品</div><div className="columns-2 gap-5 md:columns-3 lg:columns-4">{mockList.map((p)=><WorkCard key={p.id} work={p} />)}</div></section>
    </div>
  );
}

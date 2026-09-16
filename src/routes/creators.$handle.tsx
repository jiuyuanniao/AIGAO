import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ServiceCard, WorkCard } from "@/components/site/cards";
import { Pill, Rating } from "@/components/site/common";
import { getCreatorByHandle, portfoliosByCreator, reviewsByCreator, servicesByCreator } from "@/lib/data";
import { supabase } from "@/lib/supabase";

type RealCreator={id:string;user_id:string;handle:string|null;headline:string|null;bio:string|null;tags:string[];is_verified:boolean;avg_rating:number;completed_orders:number;on_time_rate:number;avg_response_hours:number;cover_url:string|null;display_name:string;avatar_url:string|null};
type RealService={id:string;title:string;cover_url:string|null;price_from:number;delivery_days:number;quantity_desc:string|null};
type RealWork={id:string;title:string;cover_url:string|null;category:string|null};
type RealReview={id:string;rating:number;content:string|null;tags:string[]};

export const Route = createFileRoute("/creators/$handle")({ component: CreatorProfilePage });

function CreatorProfilePage(){
  const {handle}=Route.useParams();
  const mock=getCreatorByHandle(handle);
  const [creator,setCreator]=useState<RealCreator|null>(null);
  const [services,setServices]=useState<RealService[]>([]);
  const [works,setWorks]=useState<RealWork[]>([]);
  const [reviews,setReviews]=useState<RealReview[]>([]);
  const [loading,setLoading]=useState(!mock);

  useEffect(()=>{
    if(mock) return;
    (async()=>{
      let cp=await supabase.from("creator_profiles").select("id,user_id,handle,headline,bio,tags,is_verified,avg_rating,completed_orders,on_time_rate,avg_response_hours,cover_url").eq("handle",handle).eq("profile_status","published").maybeSingle();
      if(!cp.data) cp=await supabase.from("creator_profiles").select("id,user_id,handle,headline,bio,tags,is_verified,avg_rating,completed_orders,on_time_rate,avg_response_hours,cover_url").eq("id",handle).eq("profile_status","published").maybeSingle();
      if(!cp.data){setLoading(false);return;}
      const p=await supabase.from("profiles").select("display_name,avatar_url").eq("id",cp.data.user_id).single();
      setCreator({...cp.data,display_name:p.data?.display_name||"AI 创作者",avatar_url:p.data?.avatar_url??null} as RealCreator);
      const [s,w,r]=await Promise.all([
        supabase.from("services").select("id,title,cover_url,price_from,delivery_days,quantity_desc").eq("creator_id",cp.data.id).eq("status","published").order("created_at",{ascending:false}),
        supabase.from("portfolios").select("id,title,cover_url,category").eq("creator_id",cp.data.id).eq("is_published",true).order("created_at",{ascending:false}),
        supabase.from("reviews").select("id,rating,content,tags").eq("reviewee_id",cp.data.user_id).order("created_at",{ascending:false}),
      ]);
      setServices((s.data??[]) as RealService[]); setWorks((w.data??[]) as RealWork[]); setReviews((r.data??[]) as RealReview[]);
      setLoading(false);
    })();
  },[handle,mock]);

  if(mock){
    const works=portfoliosByCreator(mock.id),services=servicesByCreator(mock.id),reviews=reviewsByCreator(mock.id);
    return <div><div className="h-56 overflow-hidden bg-muted"><img src={mock.cover_url} alt="" className="size-full object-cover"/></div><div className="container-page"><section className="-mt-12 card-surface relative p-7"><div className="flex flex-col gap-6 md:flex-row md:items-end"><img src={mock.avatar_url} alt="" className="size-24 rounded-full border-4 border-card object-cover"/><div className="flex-1"><div className="flex items-center gap-2"><h1 className="font-display text-3xl font-semibold">{mock.display_name}</h1>{mock.verified?<Pill tone="brand">已认证</Pill>:null}</div><p className="mt-2 text-muted-foreground">{mock.tagline}</p></div>{services[0]?<Button asChild><Link to="/services/$serviceId" params={{serviceId:services[0].id}}>立即约稿</Link></Button>:null}</div><p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{mock.bio}</p></section><section className="py-14"><h2 className="font-display text-2xl font-semibold">作品</h2><div className="mt-6 columns-2 gap-5 md:columns-3">{works.map(w=><WorkCard key={w.id} work={w}/>)}</div></section><section className="pb-14"><h2 className="font-display text-2xl font-semibold">服务橱窗</h2><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map(s=><ServiceCard key={s.id} service={s}/>)}</div></section><section className="pb-14"><h2 className="font-display text-2xl font-semibold">评价</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{reviews.map(r=><div key={r.id} className="card-surface p-5"><Rating value={r.rating}/><p className="mt-3 text-sm">{r.content}</p></div>)}</div></section></div></div>;
  }

  if(loading) return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载创作者主页…</div>;
  if(!creator) return <div className="container-page py-20 text-center">创作者不存在或主页未公开。</div>;

  return (
    <div>
      <div className="h-56 overflow-hidden bg-muted">{creator.cover_url?<img src={creator.cover_url} alt="" className="size-full object-cover"/>:null}</div>
      <div className="container-page">
        <section className="-mt-12 card-surface relative p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <div className="size-24 overflow-hidden rounded-full border-4 border-card bg-secondary">{creator.avatar_url?<img src={creator.avatar_url} alt="" className="size-full object-cover"/>:null}</div>
            <div className="flex-1"><div className="flex items-center gap-2"><h1 className="font-display text-3xl font-semibold">{creator.display_name}</h1>{creator.is_verified?<Pill tone="brand">已认证</Pill>:null}</div><p className="mt-2 text-muted-foreground">{creator.headline||"AI 视觉创作者"}</p><div className="mt-3 flex flex-wrap gap-2">{creator.tags.map(t=><Pill key={t} tone="muted">{t}</Pill>)}</div></div>
            {services[0]?<Button asChild><Link to="/services/$serviceId" params={{serviceId:services[0].id}}>立即约稿</Link></Button>:null}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-6 md:grid-cols-4"><Metric label="评分" value={Number(creator.avg_rating).toFixed(1)}/><Metric label="完成订单" value={creator.completed_orders+" 单"}/><Metric label="按时交付" value={Number(creator.on_time_rate).toFixed(0)+"%"}/><Metric label="平均响应" value={Number(creator.avg_response_hours).toFixed(1)+" 小时"}/></div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{creator.bio||"创作者暂未补充详细简介。"}</p>
        </section>
        <section className="py-14"><h2 className="font-display text-2xl font-semibold">作品</h2><div className="mt-6 columns-2 gap-5 md:columns-3">{works.map(w=><div key={w.id} className="card-surface mb-5 break-inside-avoid overflow-hidden">{w.cover_url?<img src={w.cover_url} alt={w.title} className="w-full object-cover"/>:null}<div className="p-4"><div className="text-sm font-medium">{w.title}</div><div className="mt-1 text-xs text-muted-foreground">{w.category}</div></div></div>)}</div>{works.length===0?<div className="mt-5 text-sm text-muted-foreground">暂无公开作品。</div>:null}</section>
        <section className="pb-14"><h2 className="font-display text-2xl font-semibold">服务橱窗</h2><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map(s=><Link key={s.id} to="/services/$serviceId" params={{serviceId:s.id}} className="card-surface overflow-hidden"><div className="aspect-4/3 bg-muted">{s.cover_url?<img src={s.cover_url} alt="" className="size-full object-cover"/>:null}</div><div className="p-4"><div className="font-medium">{s.title}</div><div className="mt-2 text-sm text-muted-foreground">¥{Number(s.price_from).toLocaleString("zh-CN")} 起 · {s.delivery_days} 天 · {s.quantity_desc||"按需求交付"}</div></div></Link>)}</div></section>
        <section className="pb-14"><h2 className="font-display text-2xl font-semibold">评价</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{reviews.map(r=><div key={r.id} className="card-surface p-5"><Rating value={Number(r.rating)}/><p className="mt-3 text-sm leading-6">{r.content||"用户未填写文字评价。"}</p></div>)}</div>{reviews.length===0?<div className="mt-5 text-sm text-muted-foreground">暂无评价。</div>:null}</section>
      </div>
    </div>
  );
}

function Metric({label,value}:{label:string;value:string}){return <div><div className="font-display text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>}

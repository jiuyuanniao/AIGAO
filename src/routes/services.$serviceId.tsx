import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Clock, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill, Rating } from "@/components/site/common";
import { getCreator, getService, formatCNY } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { actionErrorMessage } from "@/lib/action-errors";

type RealService = {
  id:string; creator_id:string; title:string; category:string; sub_category:string|null;
  cover_url:string|null; gallery_urls:string[]; price_from:number; delivery_days:number;
  quantity_desc:string|null; revision_count:number; commercial_use:boolean; source_file:string;
  manual_retouch:boolean; consistency_flags:string[]; tools:string[]; description:string|null;
};
type RealCreator = { user_id:string; handle:string|null; headline:string|null; is_verified:boolean; avg_rating:number; display_name:string };

export const Route = createFileRoute("/services/$serviceId")({ component: ServiceDetailPage });

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mock = getService(serviceId);
  const mockCreator = mock ? getCreator(mock.creator_id) : undefined;
  const [service,setService]=useState<RealService|null>(null);
  const [creator,setCreator]=useState<RealCreator|null>(null);
  const [loading,setLoading]=useState(!mock);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    if (mock) return;
    (async()=>{
      const s=await supabase.from("services")
        .select("id,creator_id,title,category,sub_category,cover_url,gallery_urls,price_from,delivery_days,quantity_desc,revision_count,commercial_use,source_file,manual_retouch,consistency_flags,tools,description")
        .eq("id",serviceId).eq("status","published").single();
      if (!s.data){ setLoading(false); return; }
      const row=s.data as RealService; setService(row);
      const cp=await supabase.from("creator_profiles").select("user_id,handle,headline,is_verified,avg_rating").eq("id",row.creator_id).single();
      if (cp.data){
        const p=await supabase.from("profiles").select("display_name").eq("id",cp.data.user_id).single();
        setCreator({...cp.data,display_name:p.data?.display_name||"AI 创作者"} as RealCreator);
      }
      setLoading(false);
    })();
  },[serviceId,mock]);

  const isOwner=!!user && creator?.user_id===user.id;

  async function buyRealService(){
    if(!user){ navigate({to:"/auth"}); return; }
    if(isOwner){ navigate({to:"/creator/services/$serviceId/edit",params:{serviceId}}); return; }
    setWorking(true); setMessage("");
    const {data,error}=await supabase.rpc("create_service_order",{p_service_id:serviceId});
    if(error) setMessage(actionErrorMessage(error,"创建订单失败，请稍后重试。"));
    else if(data) navigate({to:"/orders/$orderId",params:{orderId:data as string}});
    setWorking(false);
  }

  if (mock) {
    return (
      <div className="container-page py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="text-sm text-muted-foreground">找服务 / {mock.category}</div>
            <h1 className="mt-3 font-display text-3xl font-semibold">{mock.title}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{mock.description}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">{mock.gallery.slice(0,4).map((src,i)=><img key={src} src={src} alt={"案例 "+(i+1)} className="aspect-4/3 w-full rounded-2xl object-cover" />)}</div>
            <section className="mt-12"><h2 className="font-display text-2xl font-semibold">交付流程</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{mock.process.map((step,i)=><div key={step.title} className="card-surface p-5"><div className="text-xs text-muted-foreground">STEP {String(i+1).padStart(2,"0")}</div><div className="mt-2 font-medium">{step.title}</div><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p></div>)}</div></section>
          </div>
          <aside><div className="card-surface lg:sticky lg:top-24 p-6"><PriceBlock price={mock.price_from} days={mock.delivery_days} revisions={mock.revisions} quantity={mock.quantity} commercial={mock.commercial_use}/><Button asChild className="mt-6 w-full rounded-full" size="lg"><Link to="/orders/$orderId" params={{orderId:mock.id==="s1"?"o2":"o1"}}>立即约稿</Link></Button>{mockCreator?<Button variant="outline" className="mt-2 w-full rounded-full" asChild><Link to="/creators/$handle" params={{handle:mockCreator.handle}}>查看创作者主页</Link></Button>:null}</div></aside>
        </div>
      </div>
    );
  }

  if(loading) return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载服务…</div>;
  if(!service) {
    return (
      <div className="container-page py-20">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">服务不存在或已下架</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">创作者可能暂时停止接单，你可以返回服务广场查看其他选择。</p>
          <Button className="mt-5" variant="outline" asChild><Link to="/services">返回服务广场</Link></Button>
        </div>
      </div>
    );
  }

  const gallery=(service.gallery_urls?.length?service.gallery_urls:[service.cover_url].filter(Boolean)) as string[];

  function ActionButtons(){
    return (
      <>
        {isOwner ? (
          <Button className="mt-6 w-full rounded-full" size="lg" asChild>
            <Link to="/creator/services/$serviceId/edit" params={{serviceId}}>编辑我的服务</Link>
          </Button>
        ) : (
          <Button className="mt-6 w-full rounded-full" size="lg" disabled={working} onClick={buyRealService}>{working?"创建订单中…":"立即约稿"}</Button>
        )}
        {creator?.handle?<Button variant="outline" className="mt-2 w-full rounded-full" asChild><Link to="/creators/$handle" params={{handle:creator.handle}}>查看创作者主页</Link></Button>:null}
      </>
    );
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">找服务 / {service.category}</div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{service.title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{service.description||"创作者暂未补充详细说明。"}</p>

          <div className="mt-6 card-surface p-5 lg:hidden">
            <PriceBlock price={Number(service.price_from)} days={service.delivery_days} revisions={service.revision_count} quantity={service.quantity_desc||"按需求交付"} commercial={service.commercial_use}/>
            <ActionButtons />
            {message?<div className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">{message}</div>:null}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">{gallery.map((src,i)=><img key={src+i} src={src} alt={"案例 "+(i+1)} className="aspect-4/3 w-full rounded-2xl object-cover" />)}</div>
          <section className="mt-10 card-surface p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold">服务包含</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill tone="muted">{service.quantity_desc||"按需求交付"}</Pill>
              <Pill tone="muted">{service.delivery_days} 天交付</Pill>
              <Pill tone="muted">{service.revision_count} 次修改</Pill>
              {service.commercial_use?<Pill tone="brand">支持商用</Pill>:null}
              {service.manual_retouch?<Pill tone="muted">人工精修</Pill>:null}
              <Pill tone="muted">源文件：{service.source_file==="included"?"包含":service.source_file==="add_on"?"可加购":"不提供"}</Pill>
            </div>
          </section>
        </div>
        <aside className="hidden lg:block">
          <div className="card-surface sticky top-24 p-6">
            <PriceBlock price={Number(service.price_from)} days={service.delivery_days} revisions={service.revision_count} quantity={service.quantity_desc||"按需求交付"} commercial={service.commercial_use}/>
            <ActionButtons />
            {message?<div className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">{message}</div>:null}
            {creator?<div className="mt-6 border-t border-border pt-5"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{creator.display_name}</div><div className="mt-1 text-xs text-muted-foreground">{creator.headline||"AI 视觉创作者"}</div></div>{creator.is_verified?<Pill tone="brand">已认证</Pill>:null}</div><div className="mt-3"><Rating value={Number(creator.avg_rating)} /></div></div>:null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PriceBlock({price,days,revisions,quantity,commercial}:{price:number;days:number;revisions:number;quantity:string;commercial:boolean}){
  return <><div className="flex items-end gap-1"><span className="font-display text-3xl font-semibold">{formatCNY(price)}</span><span className="pb-1 text-sm text-muted-foreground">起</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Info icon={<Clock className="size-4"/>} label={days+" 天交付"}/><Info icon={<RefreshCw className="size-4"/>} label={revisions+" 次修改"}/><Info icon={<Check className="size-4"/>} label={quantity}/><Info icon={<ShieldCheck className="size-4"/>} label={commercial?"支持商用":"个人使用"}/></div></>;
}
function Info({icon,label}:{icon:React.ReactNode;label:string}){return <div className="flex min-w-0 items-center gap-2 rounded-xl bg-secondary p-3 text-muted-foreground">{icon}<span className="min-w-0 break-words">{label}</span></div>}

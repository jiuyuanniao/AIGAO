import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, Stat } from "@/components/site/common";
import { currentUser, formatCNY, orders, services, getCreator } from "@/lib/data";

export const Route = createFileRoute("/me")({ component: MePage });

function MePage() {
  const creator = getCreator(currentUser.creator_id);
  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-semibold">创作者中心</h1><p className="mt-2 text-sm text-muted-foreground">今天有 3 件事需要处理</p></div>
        <Button className="rounded-full">发布新服务</Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[176px_1fr_260px]">
        <aside className="card-surface h-fit p-3">
          {["总览","我的订单","我的需求","我的应征","收藏","主页管理","作品管理","服务橱窗","收入"].map((x, i) => <button key={x} className={"w-full rounded-lg px-3 py-2.5 text-left text-sm " + (i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>{x}</button>)}
        </aside>

        <main>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="待处理订单" value="3" hint="2 个待回复" />
            <Stat label="本月成交" value="¥8,460" hint="+18%" />
            <Stat label="进行中订单" value="5" hint="1 个明天到期" />
            <Stat label="主页浏览" value="1,286" hint="近 30 天" />
          </div>

          <section className="mt-6 card-surface p-5">
            <h2 className="font-medium">最近订单</h2>
            <div className="mt-4 divide-y divide-border">
              {orders.map((o) => <div key={o.id} className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_140px_100px_80px] md:items-center"><div>{o.title}</div><div className="text-muted-foreground">{o.buyer_name}</div><OrderStatusBadge status={o.status} /><Link to="/orders/$orderId" params={{ orderId: o.id }} className="text-right">查看 →</Link></div>)}
            </div>
          </section>

          <section className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="card-surface p-5"><h2 className="font-medium">我的服务</h2><div className="mt-4 space-y-4">{services.filter((s) => s.creator_id === currentUser.creator_id).map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><div><div>{s.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatCNY(s.price_from)} 起 · {s.orders_count} 单</div></div><Link to="/services/$serviceId" params={{ serviceId: s.id }}>管理 →</Link></div>)}</div></div>
            <div className="card-surface p-5"><h2 className="font-medium">创作者表现</h2><div className="mt-4 space-y-4 text-sm"><Row label="综合评分" value={(creator?.rating ?? 0) + " / 5"} /><Row label="按时交付" value={(creator?.on_time_rate ?? 0) + "%"} /><Row label="平均响应" value={(creator?.response_minutes ?? 0) + " 分钟"} /><Row label="完成订单" value={(creator?.completed_orders ?? 0) + " 单"} /></div></div>
          </section>
        </main>

        <aside className="space-y-5">
          <div className="card-surface p-5"><div className="text-sm font-medium">主页完成度</div><div className="mt-3 font-display text-3xl font-semibold">82%</div><p className="mt-2 text-xs leading-5 text-muted-foreground">补充 3 个案例和服务说明，可提升主页可信度。</p><Link to="/creators/$handle" params={{ handle: creator?.handle ?? "mori-ai-studio" }} className="mt-3 inline-block text-sm">查看公开主页 →</Link></div>
          <div className="card-surface p-5"><div className="text-sm font-medium">收入概览</div><div className="mt-3 font-display text-2xl font-semibold">¥8,460</div><div className="mt-1 text-xs text-muted-foreground">本月成交</div></div>
          <div className="card-surface p-5"><div className="text-sm font-medium">平台提醒</div><p className="mt-3 text-sm leading-6 text-muted-foreground">1 个订单将在明天到期，建议今天完成最终版本确认。</p></div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-border pb-3 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

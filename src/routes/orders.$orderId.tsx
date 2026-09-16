import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, Pill } from "@/components/site/common";
import { formatCNY, getCreator, getOrder } from "@/lib/data";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderPage });

function OrderPage() {
  const { orderId } = Route.useParams();
  const order = getOrder(orderId);
  if (!order) return <div className="container-page py-20 text-center">订单不存在。</div>;
  const creator = getCreator(order.creator_id);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><OrderStatusBadge status={order.status} /><span className="text-xs text-muted-foreground">{order.order_no}</span></div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{order.title}</h1>
        </div>
        <div className="text-right"><div className="font-display text-2xl font-semibold">{formatCNY(order.amount)}</div><div className="mt-1 text-xs text-muted-foreground">成交金额</div></div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="card-surface p-6">
            <h2 className="font-medium">订单约定</h2>
            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <Info label="交付范围" value={order.scope} />
              <Info label="截止日期" value={order.deadline} />
              <Info label="修改次数" value={order.revisions_used + " / " + order.revisions_total} />
              <Info label="商用权限" value={order.commercial_use ? "支持商业使用" : "仅个人使用"} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">交付版本</h2>
            <div className="mt-5 space-y-4">
              {order.deliveries.map((d) => (
                <div key={d.id} className="card-surface p-5">
                  <div className="flex justify-between"><div className="font-medium">V{d.version}</div><div className="text-xs text-muted-foreground">{d.created_at}</div></div>
                  <p className="mt-2 text-sm text-muted-foreground">{d.note}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{d.files.map((f) => <div key={f.name}><img src={f.thumb} alt="" className="aspect-square w-full rounded-xl object-cover" /><div className="mt-1 truncate text-xs text-muted-foreground">{f.name}</div></div>)}</div>
                </div>
              ))}
              {order.deliveries.length === 0 ? <div className="card-surface p-8 text-center text-sm text-muted-foreground">创作者还没有提交版本。</div> : null}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">订单留言</h2>
            <div className="mt-5 card-surface divide-y divide-border">
              {order.messages.map((m) => <div key={m.id} className="p-4"><div className="text-xs text-muted-foreground">{m.author_name} · {m.created_at}</div><div className="mt-1.5 text-sm">{m.content}</div></div>)}
              <div className="p-4"><textarea className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="写一条订单留言…" /><Button className="mt-2">发送</Button></div>
            </div>
          </section>
        </div>

        <aside>
          <div className="card-surface sticky top-24 p-5">
            <div className="font-medium">合作双方</div>
            <div className="mt-4 space-y-4 text-sm">
              <div><div className="text-xs text-muted-foreground">需求方</div><div className="mt-1">{order.buyer_name}</div></div>
              <div><div className="text-xs text-muted-foreground">创作者</div><div className="mt-1">{creator?.display_name}</div></div>
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-3 text-sm font-medium">验收操作</div>
              <Button className="w-full">确认完成</Button>
              <Button variant="outline" className="mt-2 w-full">申请修改</Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><Pill tone="muted">版本留痕</Pill><Pill tone="muted">订单快照</Pill><Pill tone="muted">修改次数记录</Pill></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 leading-6">{value}</div></div>;
}

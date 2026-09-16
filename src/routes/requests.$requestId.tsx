import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge, Pill, RequestStatusBadge } from "@/components/site/common";
import { applicationsByRequest, formatCNY, getCreator, getRequest } from "@/lib/data";

export const Route = createFileRoute("/requests/$requestId")({ component: RequestDetailPage });

function RequestDetailPage() {
  const { requestId } = Route.useParams();
  const request = getRequest(requestId);
  if (!request) return <div className="container-page py-20 text-center">需求不存在或已关闭。</div>;

  const apps = applicationsByRequest(request.id);

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><RequestStatusBadge status={request.status} /><Pill tone="muted">{request.category}</Pill></div>
          <h1 className="mt-4 font-display text-3xl font-semibold">{request.title}</h1>
          <div className="mt-3 text-sm text-muted-foreground">预算 {formatCNY(request.budget_min)}–{request.budget_max.toLocaleString("zh-CN")} · 截止 {request.deadline} · {request.applications_count} 人应征</div>

          <section className="mt-8 card-surface p-6">
            <h2 className="font-medium">需求说明</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{request.description}</p>
            <div className="mt-5">
              <div className="text-sm font-medium">交付内容</div>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">{request.deliverables.map((x) => <li key={x}>• {x}</li>)}</ul>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">收到的应征</h2>
            <div className="mt-5 space-y-4">
              {apps.map((a) => {
                const c = getCreator(a.creator_id);
                return (
                  <div key={a.id} className="card-surface p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <img src={c?.avatar_url} alt="" className="size-12 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium">{c?.display_name}</span><ApplicationStatusBadge status={a.status} /></div>
                        <div className="mt-2 text-sm text-muted-foreground">报价 {formatCNY(a.quote)} · {a.duration_days} 天交付</div>
                        <p className="mt-3 text-sm leading-6">{a.plan}</p>
                      </div>
                      <Button asChild><Link to="/orders/$orderId" params={{ orderId: "o1" }}>选择合作</Link></Button>
                    </div>
                  </div>
                );
              })}
              {apps.length === 0 ? <div className="card-surface p-8 text-center text-sm text-muted-foreground">暂时还没有应征。</div> : null}
            </div>
          </section>
        </div>

        <aside>
          <div className="card-surface sticky top-24 p-5">
            <div className="font-medium">我要应征</div>
            <div className="mt-4 space-y-3">
              <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="报价金额" />
              <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="交付天数" />
              <textarea className="min-h-28 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="简单说说你的制作方案和相关经验" />
            </div>
            <Button className="mt-4 w-full">提交应征</Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">V1 原型：提交后将进入待选择状态，同一需求仅允许一条有效应征。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

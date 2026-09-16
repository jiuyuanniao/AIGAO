import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CreatorCard, ServiceCard, WorkCard } from "@/components/site/cards";
import { Pill, Rating } from "@/components/site/common";
import { creators, getCreatorByHandle, portfoliosByCreator, reviewsByCreator, servicesByCreator } from "@/lib/data";

export const Route = createFileRoute("/creators/$handle")({ component: CreatorProfilePage });

function CreatorProfilePage() {
  const { handle } = Route.useParams();
  const creator = getCreatorByHandle(handle);

  if (!creator) return <div className="container-page py-20 text-center">创作者不存在。</div>;

  const works = portfoliosByCreator(creator.id);
  const services = servicesByCreator(creator.id);
  const reviews = reviewsByCreator(creator.id);

  return (
    <div>
      <div className="h-56 overflow-hidden bg-muted">
        <img src={creator.cover_url} alt="" className="size-full object-cover" />
      </div>
      <div className="container-page">
        <section className="-mt-12 card-surface relative p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <img src={creator.avatar_url} alt={creator.display_name} className="size-24 rounded-full border-4 border-card object-cover" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-semibold">{creator.display_name}</h1>
                {creator.verified ? <Pill tone="brand">已认证</Pill> : null}
              </div>
              <p className="mt-2 text-muted-foreground">{creator.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-2">{creator.specialties.map((x) => <Pill key={x} tone="muted">{x}</Pill>)}</div>
            </div>
            <Button asChild className="rounded-full"><Link to="/services/$serviceId" params={{ serviceId: services[0]?.id ?? "s1" }}>立即约稿</Link></Button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-6 md:grid-cols-4">
            <Metric label="评分" value={creator.rating.toFixed(1)} />
            <Metric label="完成订单" value={creator.completed_orders + " 单"} />
            <Metric label="按时交付" value={creator.on_time_rate + "%"} />
            <Metric label="平均响应" value={creator.response_minutes + " 分钟"} />
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">{creator.bio}</p>
        </section>

        <section className="py-14">
          <h2 className="font-display text-2xl font-semibold">作品</h2>
          <div className="mt-6 columns-2 gap-5 md:columns-3">{works.map((w) => <WorkCard key={w.id} work={w} />)}</div>
        </section>

        <section className="pb-14">
          <h2 className="font-display text-2xl font-semibold">服务橱窗</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        </section>

        <section className="pb-14">
          <h2 className="font-display text-2xl font-semibold">评价</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card-surface p-5">
                <Rating value={r.rating} />
                <p className="mt-3 text-sm leading-6">{r.content}</p>
                <div className="mt-3 flex flex-wrap gap-2">{r.tags.map((t) => <Pill key={t} tone="muted">{t}</Pill>)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-14">
          <h2 className="font-display text-2xl font-semibold">制作方式</h2>
          <div className="mt-5 card-surface p-6">
            <div className="flex flex-wrap gap-2">{creator.tools.map((t) => <Pill key={t}>{t}</Pill>)}</div>
            <ol className="mt-5 space-y-3 text-sm text-muted-foreground">{creator.workflow.map((x, i) => <li key={x}>{i + 1}. {x}</li>)}</ol>
          </div>
        </section>

        <div className="hidden">{creators.length}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="font-display text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, Rating } from "@/components/site/common";
import { getCreator, getService, formatCNY } from "@/lib/data";

export const Route = createFileRoute("/services/$serviceId")({
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const service = getService(serviceId);
  const creator = service ? getCreator(service.creator_id) : undefined;

  if (!service) {
    return <div className="container-page py-20 text-center">服务不存在或已下架。</div>;
  }

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="text-sm text-muted-foreground">找服务 / {service.category}</div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{service.title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{service.description}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {service.gallery.slice(0, 4).map((src, i) => (
              <img key={src} src={src} alt={"案例 " + (i + 1)} className="aspect-4/3 w-full rounded-2xl object-cover" />
            ))}
          </div>

          {service.before_after ? (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-semibold">Before / After</h2>
              <p className="mt-2 text-sm text-muted-foreground">{service.before_after.note}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <img src={service.before_after.before} alt="原始素材" className="aspect-square w-full rounded-2xl object-cover" />
                <img src={service.before_after.after} alt="最终效果" className="aspect-square w-full rounded-2xl object-cover" />
              </div>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">交付流程</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {service.process.map((step, i) => (
                <div key={step.title} className="card-surface p-5">
                  <div className="text-xs text-muted-foreground">STEP {String(i + 1).padStart(2, "0")}</div>
                  <div className="mt-2 font-medium">{step.title}</div>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <div className="card-surface sticky top-24 p-6">
            <div className="flex items-end gap-1">
              <span className="font-display text-3xl font-semibold">{formatCNY(service.price_from)}</span>
              <span className="pb-1 text-sm text-muted-foreground">起</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Info icon={<Clock className="size-4" />} label={service.delivery_days + " 天交付"} />
              <Info icon={<RefreshCw className="size-4" />} label={service.revisions + " 次修改"} />
              <Info icon={<Check className="size-4" />} label={service.quantity} />
              <Info icon={<ShieldCheck className="size-4" />} label={service.commercial_use ? "支持商用" : "个人使用"} />
            </div>
            <Button asChild className="mt-6 w-full rounded-full" size="lg">
              <Link to="/orders/$orderId" params={{ orderId: service.id === "s1" ? "o2" : "o1" }}>立即约稿</Link>
            </Button>
            <Button variant="outline" className="mt-2 w-full rounded-full" asChild>
              <Link to="/creators/$handle" params={{ handle: creator?.handle ?? "mori-ai-studio" }}>查看创作者主页</Link>
            </Button>

            {creator ? (
              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{creator.display_name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{creator.tagline}</div>
                  </div>
                  {creator.verified ? <Pill tone="brand">已认证</Pill> : null}
                </div>
                <div className="mt-3"><Rating value={creator.rating} count={creator.reviews_count} /></div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-muted-foreground">{icon}<span>{label}</span></div>;
}

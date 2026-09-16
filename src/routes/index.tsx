import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader, MoreLink, Pill } from "@/components/site/common";
import { CreatorCard, RequestCard, ServiceCard, WorkCard } from "@/components/site/cards";
import { CATEGORIES, creators, portfolios, requests, services } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIGAO · AI 图片与视频约稿平台" },
      {
        name: "description",
        content: "AIGAO 连接需求方与 AI 创作者：浏览服务橱窗、发布需求、应征合作、在线交付与验收。",
      },
      { property: "og:title", content: "AIGAO · AI 图片与视频约稿平台" },
      {
        property: "og:description",
        content: "AI 商品场景图、AI 人物写真、品牌 AI 短片，一站找到合适的 AI 创作者。",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div className="flex flex-col justify-center">
            <Pill tone="clay" className="w-fit">
              双边约稿 · 图片 / 视频 / 商业视觉
            </Pill>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.15] md:text-[52px]">
              找到能把想法
              <br />
              做成画面的 AI 创作者
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              从服务橱窗直接约稿，或发布需求让创作者来应征。AIGAO 不生成图片，只负责让合作这件事更可靠：
              成交快照、版本化交付、验收与评价，全流程留痕。
            </p>

            <div className="mt-8 flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="试试搜索：红酒产品图 / 潮玩动态 / 品牌短片"
                  className="h-12 rounded-full bg-card pl-10"
                />
              </div>
              <Button asChild size="lg" className="h-12 rounded-full px-6">
                <Link to="/services">搜索</Link>
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 6).map((c) => (
                <Link
                  key={c.slug}
                  to="/services"
                  search={{ category: c.label }}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              ))}
            </div>

            <div className="mt-10 flex gap-10">
              {[
                { k: "2,400+", v: "认证 AI 创作者" },
                { k: "18,600+", v: "完成订单" },
                { k: "97.4%", v: "按时交付率" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-2xl font-semibold">{s.k}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {portfolios.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                className={`card-surface overflow-hidden ${i % 2 === 0 ? "mt-0" : "mt-8"}`}
              >
                <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeader
          title="精选作品"
          desc="来自平台创作者的近期商业交付"
          action={<MoreLink to="/works" />}
        />
        <div className="columns-2 gap-5 md:columns-3 lg:columns-4">
          {portfolios.slice(0, 8).map((p) => (
            <WorkCard key={p.id} work={p} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeader
          title="热门服务"
          desc="价格、数量、周期与修改次数一目了然"
          action={<MoreLink to="/services" />}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.slice(0, 4).map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeader
          title="优秀创作者"
          desc="按评分、按时率与响应速度筛选"
          action={<MoreLink to="/creators" />}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {creators.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeader
          title="最新需求"
          desc="正在招募创作者的商业需求"
          action={<MoreLink to="/requests" label="进入需求大厅" />}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.slice(0, 4).map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>

      <section className="container-page pb-8 pt-8">
        <div className="card-surface flex flex-col items-center gap-5 bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-semibold">有明确的项目？直接发布需求</h2>
          <p className="max-w-xl text-sm opacity-80">
            写清楚类型、预算与截止日期，创作者会带着报价、周期与过往案例来应征，你只需选择一位开始合作。
          </p>
          <Button asChild size="lg" variant="secondary" className="rounded-full">
            <Link to="/requests/new">
              免费发布需求
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
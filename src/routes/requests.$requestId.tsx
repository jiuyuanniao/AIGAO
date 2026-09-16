import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge, Pill, RequestStatusBadge } from "@/components/site/common";
import { applicationsByRequest, formatCNY, getCreator, getRequest } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { CreatorRequest } from "@/lib/types";

type DbRequest = {
  id: string;
  title: string;
  category: string;
  type: string;
  description: string;
  budget_min: number;
  budget_max: number;
  deadline: string;
  created_at: string;
  status: CreatorRequest["status"];
  commercial_use: string;
  special_requirements: string[];
  attachments: string[];
};

function normalize(row: DbRequest): CreatorRequest {
  return {
    id: row.id,
    title: row.title,
    owner_name: "AIGAO 用户",
    owner_avatar: "",
    owner_kind: "需求方",
    category: row.category,
    media_type: row.type === "AI视频" ? "video" : row.type === "AI图片" ? "image" : "mixed",
    description: row.description,
    deliverables: row.special_requirements ?? [],
    budget_min: Number(row.budget_min),
    budget_max: Number(row.budget_max),
    deadline: row.deadline,
    created_at: row.created_at,
    status: row.status,
    applications_count: 0,
    views: 0,
    attachments: row.attachments ?? [],
    requirements: {
      commercial_use: row.commercial_use === "commercial",
      retouch: row.special_requirements?.includes("人工精修") ?? false,
      consistency: row.special_requirements?.some((x) => x.includes("一致性")) ?? false,
      source_files: row.special_requirements?.includes("提供源文件") ?? false,
    },
  };
}

export const Route = createFileRoute("/requests/$requestId")({ component: RequestDetailPage });

function RequestDetailPage() {
  const { requestId } = Route.useParams();
  const local = getRequest(requestId);
  const [request, setRequest] = useState<CreatorRequest | undefined>(local);
  const [loading, setLoading] = useState(!local);

  useEffect(() => {
    if (local) return;
    supabase
      .from("requests")
      .select("id,title,category,type,description,budget_min,budget_max,deadline,created_at,status,commercial_use,special_requirements,attachments")
      .eq("id", requestId)
      .single()
      .then(({ data }) => {
        if (data) setRequest(normalize(data as DbRequest));
        setLoading(false);
      });
  }, [requestId, local]);

  if (loading) return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载需求…</div>;
  if (!request) return <div className="container-page py-20 text-center">需求不存在或已关闭。</div>;

  const apps = applicationsByRequest(request.id);

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><RequestStatusBadge status={request.status} /><Pill tone="muted">{request.category}</Pill></div>
          <h1 className="mt-4 font-display text-3xl font-semibold">{request.title}</h1>
          <div className="mt-3 text-sm text-muted-foreground">预算 {formatCNY(request.budget_min)}–{request.budget_max.toLocaleString("zh-CN")} · 截止 {request.deadline}</div>

          <section className="mt-8 card-surface p-6">
            <h2 className="font-medium">需求说明</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{request.description}</p>
            {request.deliverables.length ? (
              <div className="mt-5">
                <div className="text-sm font-medium">特殊要求</div>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">{request.deliverables.map((x) => <li key={x}>• {x}</li>)}</ul>
              </div>
            ) : null}
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
              {apps.length === 0 ? <div className="card-surface p-8 text-center text-sm text-muted-foreground">暂时还没有应征。下一步会把这里接成真实应征数据。</div> : null}
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
            <p className="mt-3 text-xs leading-5 text-muted-foreground">应征功能下一步接入 CreatorProfile 与 Applications。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

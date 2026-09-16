import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, Stat, Pill } from "@/components/site/common";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { actionErrorMessage } from "@/lib/action-errors";
import type { OrderStatus } from "@/lib/types";

type Creator = {
  id: string;
  handle: string | null;
  headline: string | null;
  profile_status: string;
  avg_rating: number;
  completed_orders: number;
  on_time_rate: number;
  avg_response_hours: number;
};

type OrderRow = {
  id: string;
  order_no: string;
  amount: number;
  status: OrderStatus;
  created_at: string;
  scope_snapshot: Record<string, unknown>;
  client_id: string;
  creator_id: string;
};

type RequestRow = {
  id: string;
  title: string;
  status: string;
  budget_min: number;
  budget_max: number;
  created_at: string;
};

type ServiceRow = {
  id: string;
  title: string;
  status: "draft" | "published" | "paused" | "removed";
  price_from: number;
  delivery_days: number;
  created_at: string;
};

export const Route = createFileRoute("/me")({ component: MePage });

function MePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workingServiceId, setWorkingServiceId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  async function loadDashboard() {
    if (!user) return;
    setLoading(true);

    const profile = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    setDisplayName(profile.data?.display_name || user.email || "AIGAO 用户");

    const creatorResult = await supabase
      .from("creator_profiles")
      .select("id,handle,headline,profile_status,avg_rating,completed_orders,on_time_rate,avg_response_hours")
      .eq("user_id", user.id)
      .maybeSingle();

    const cp = creatorResult.data as Creator | null;
    setCreator(cp);

    const [clientOrders, myRequests] = await Promise.all([
      supabase.from("orders").select("id,order_no,amount,status,created_at,scope_snapshot,client_id,creator_id").eq("client_id", user.id).order("created_at", { ascending: false }),
      supabase.from("requests").select("id,title,status,budget_min,budget_max,created_at").eq("client_id", user.id).order("created_at", { ascending: false }),
    ]);

    let creatorOrders: OrderRow[] = [];
    if (cp) {
      const [co, serviceResult, pc, ac] = await Promise.all([
        supabase.from("orders").select("id,order_no,amount,status,created_at,scope_snapshot,client_id,creator_id").eq("creator_id", cp.id).order("created_at", { ascending: false }),
        supabase.from("services").select("id,title,status,price_from,delivery_days,created_at").eq("creator_id", cp.id).neq("status", "removed").order("created_at", { ascending: false }),
        supabase.from("portfolios").select("id", { count: "exact", head: true }).eq("creator_id", cp.id),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("creator_id", cp.id),
      ]);
      creatorOrders = (co.data ?? []) as OrderRow[];
      setServices((serviceResult.data ?? []) as ServiceRow[]);
      setPortfolioCount(pc.count ?? 0);
      setApplicationCount(ac.count ?? 0);
    } else {
      setServices([]);
      setPortfolioCount(0);
      setApplicationCount(0);
    }

    const merged = [...((clientOrders.data ?? []) as OrderRow[]), ...creatorOrders];
    const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values())
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    setOrders(unique);
    setRequests((myRequests.data ?? []) as RequestRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadDashboard();
  }, [user?.id]);

  async function toggleService(service: ServiceRow) {
    const nextStatus = service.status === "published" ? "paused" : "published";
    const action = nextStatus === "paused" ? "下架" : "上架";
    if (nextStatus === "paused" && !window.confirm("下架后，需求方将无法继续从服务广场购买这个服务。确定下架吗？")) return;

    setWorkingServiceId(service.id);
    setNotice("");
    const { error } = await supabase
      .from("services")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", service.id);

    if (error) setNotice(actionErrorMessage(error, `${action}失败，请稍后重试。`));
    else {
      setNotice(`服务已${action}。`);
      await loadDashboard();
    }
    setWorkingServiceId(null);
  }

  const completedAmount = useMemo(
    () => orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + Number(o.amount), 0),
    [orders],
  );
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length;

  if (authLoading || loading || !user) {
    return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载个人中心…</div>;
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">你好，{displayName}</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">{creator ? "创作者中心" : "个人中心"}</h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" className="w-full sm:w-auto" asChild><Link to="/requests/new">发布需求</Link></Button>
          {creator ? (
            <>
              <Button variant="outline" className="w-full sm:w-auto" asChild><Link to="/creator/portfolio/new">上传作品</Link></Button>
              <Button className="w-full sm:w-auto" asChild><Link to="/creator/services/new">发布新服务</Link></Button>
            </>
          ) : (
            <Button className="w-full sm:w-auto" asChild><Link to="/creator/onboarding">成为创作者</Link></Button>
          )}
        </div>
      </div>

      {notice ? <div className="mt-5 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{notice}</div> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="进行中订单" value={activeOrders} hint="需求方与创作者订单合计" />
        <Stat label="已完成成交" value={"¥" + completedAmount.toLocaleString("zh-CN")} hint="当前账号参与的已完成订单" />
        <Stat label="我的需求" value={requests.length} hint="包含草稿与已发布" />
        <Stat label={creator ? "我的应征" : "身份"} value={creator ? applicationCount : "需求方"} hint={creator ? "累计提交应征" : "可随时开通创作者身份"} />
      </div>

      {!creator ? (
        <section className="mt-6 card-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-medium">你还没有创作者主页</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">建立主页后，可以应征真实需求、发布服务和上传作品。</p>
            </div>
            <Button className="w-full md:w-auto" asChild><Link to="/creator/onboarding">创建创作者主页</Link></Button>
          </div>
        </section>
      ) : (
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="card-surface p-5">
            <div className="text-sm font-medium">创作者主页</div>
            <div className="mt-3 text-sm leading-6 text-muted-foreground">{creator.headline || "补充一句擅长方向，让需求方更快理解你。"}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={creator.profile_status === "published" ? "brand" : "muted"}>{creator.profile_status === "published" ? "公开中" : creator.profile_status}</Pill>
              <Pill tone="muted">{services.length} 个服务</Pill>
              <Pill tone="muted">{portfolioCount} 个作品</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {creator.handle ? <Link to="/creators/$handle" params={{ handle: creator.handle }}>查看公开主页 →</Link> : null}
              <Link to="/creator/onboarding">编辑主页</Link>
            </div>
          </div>
          <Stat label="完成订单" value={creator.completed_orders} hint={"评分 " + Number(creator.avg_rating).toFixed(1)} />
          <Stat label="按时交付率" value={Number(creator.on_time_rate).toFixed(0) + "%"} hint={"平均响应 " + Number(creator.avg_response_hours).toFixed(1) + " 小时"} />
        </section>
      )}

      {creator ? (
        <section className="mt-6 card-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">我的服务</h2>
              <p className="mt-1 text-xs text-muted-foreground">编辑价格与交付说明，或临时下架不想继续接单的服务。</p>
            </div>
            <Button size="sm" asChild><Link to="/creator/services/new">新建服务</Link></Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {services.map((service) => (
              <div key={service.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{service.title}</span>
                    <Pill tone={service.status === "published" ? "brand" : "muted"}>{serviceStatusLabel(service.status)}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">¥{Number(service.price_from).toLocaleString("zh-CN")} 起 · {service.delivery_days} 天交付</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/creator/services/$serviceId/edit" params={{ serviceId: service.id }}>编辑</Link>
                  </Button>
                  <Button size="sm" variant={service.status === "published" ? "outline" : "secondary"} disabled={workingServiceId === service.id} onClick={() => toggleService(service)}>
                    {service.status === "published" ? "下架" : "上架"}
                  </Button>
                </div>
              </div>
            ))}
            {services.length === 0 ? <div className="py-10 text-center text-sm leading-6 text-muted-foreground">还没有发布服务。先创建一个标准化服务，让需求方可以直接找到并约稿。</div> : null}
          </div>
        </section>
      ) : null}

      <section className="mt-6 card-surface p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">最近订单</h2>
          <span className="text-xs text-muted-foreground">{orders.length} 笔</span>
        </div>
        <div className="mt-4 divide-y divide-border">
          {orders.slice(0, 8).map((o) => (
            <div key={o.id} className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_140px_100px_80px] md:items-center">
              <div className="min-w-0">
                <div className="truncate">{String(o.scope_snapshot?.request_title ?? o.scope_snapshot?.service_title ?? "AIGAO 约稿订单")}</div>
                <div className="mt-1 break-all text-xs text-muted-foreground">{o.order_no}</div>
              </div>
              <div>¥{Number(o.amount).toLocaleString("zh-CN")}</div>
              <OrderStatusBadge status={o.status} />
              <Link to="/orders/$orderId" params={{ orderId: o.id }} className="md:text-right">查看 →</Link>
            </div>
          ))}
          {orders.length === 0 ? <div className="py-10 text-center text-sm leading-6 text-muted-foreground">还没有订单。发布需求或服务后，合作订单会显示在这里。</div> : null}
        </div>
      </section>

      <section className="mt-6 card-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">我的需求</h2>
          <Button size="sm" variant="outline" asChild><Link to="/requests/new">新建需求</Link></Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {requests.slice(0, 8).map((r) => (
            <div key={r.id} className="flex flex-col gap-3 py-4 text-sm md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <Link to="/requests/$requestId" params={{ requestId: r.id }} className="font-medium">{r.title}</Link>
                <div className="mt-1 text-xs text-muted-foreground">预算 ¥{Number(r.budget_min).toLocaleString("zh-CN")}–{Number(r.budget_max).toLocaleString("zh-CN")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="muted">{requestStatusLabel(r.status)}</Pill>
                {["draft", "recruiting"].includes(r.status) ? <Link to="/requests/$requestId/edit" params={{ requestId: r.id }} className="text-xs">编辑 →</Link> : null}
              </div>
            </div>
          ))}
          {requests.length === 0 ? <div className="py-10 text-center text-sm leading-6 text-muted-foreground">还没有发布过需求。发布第一条需求后，可以在这里持续管理状态。</div> : null}
        </div>
      </section>
    </div>
  );
}

function serviceStatusLabel(status: ServiceRow["status"]) {
  if (status === "published") return "上架中";
  if (status === "paused") return "已下架";
  if (status === "draft") return "草稿";
  return "已移除";
}

function requestStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "草稿",
    recruiting: "招募中",
    matched: "已匹配",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return labels[status] ?? status;
}

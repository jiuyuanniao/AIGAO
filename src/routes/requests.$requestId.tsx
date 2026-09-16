import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge, Pill, RequestStatusBadge } from "@/components/site/common";
import { applicationsByRequest, formatCNY, getCreator, getRequest } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { actionErrorMessage } from "@/lib/action-errors";
import type { CreatorRequest, ApplicationStatus } from "@/lib/types";

type DbRequest = {
  id: string;
  client_id: string;
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

type DbApplication = {
  id: string;
  request_id: string;
  creator_id: string;
  status: ApplicationStatus;
  quote_price: number;
  delivery_days: number;
  proposal: string;
  revision_count: number;
  commercial_use: boolean;
  source_file: boolean;
  manual_retouch: boolean;
  created_at: string;
  creator_name?: string;
  creator_avatar?: string | null;
  creator_headline?: string | null;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const local = getRequest(requestId);

  const [request, setRequest] = useState<CreatorRequest | undefined>(local);
  const [dbRequest, setDbRequest] = useState<DbRequest | null>(null);
  const [apps, setApps] = useState<DbApplication[]>([]);
  const [myCreatorId, setMyCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!local);
  const [loadError, setLoadError] = useState("");
  const [quote, setQuote] = useState("");
  const [days, setDays] = useState("");
  const [proposal, setProposal] = useState("");
  const [revisions, setRevisions] = useState("1");
  const [commercial, setCommercial] = useState(true);
  const [sourceFile, setSourceFile] = useState(false);
  const [retouch, setRetouch] = useState(true);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const isReal = !local;
  const isOwner = !!user && dbRequest?.client_id === user.id;

  async function loadReal() {
    setLoadError("");
    const requestResult = await supabase
      .from("requests")
      .select("id,client_id,title,category,type,description,budget_min,budget_max,deadline,created_at,status,commercial_use,special_requirements,attachments")
      .eq("id", requestId)
      .single();

    if (requestResult.error || !requestResult.data) {
      setLoadError("需求不存在，或当前账号没有权限查看。");
      setRequest(undefined);
      setLoading(false);
      return;
    }

    const row = requestResult.data as DbRequest;
    setDbRequest(row);
    setRequest(normalize(row));

    if (user) {
      const creatorResult = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
      setMyCreatorId(creatorResult.data?.id ?? null);
    } else {
      setMyCreatorId(null);
    }

    const appResult = await supabase
      .from("applications")
      .select("id,request_id,creator_id,status,quote_price,delivery_days,proposal,revision_count,commercial_use,source_file,manual_retouch,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (appResult.data) {
      const enriched = await Promise.all(
        (appResult.data as DbApplication[]).map(async (app) => {
          const cp = await supabase.from("creator_profiles").select("user_id,headline").eq("id", app.creator_id).single();
          if (!cp.data) return app;
          const p = await supabase.from("profiles").select("display_name,avatar_url").eq("id", cp.data.user_id).single();
          return {
            ...app,
            creator_name: p.data?.display_name ?? "AI 创作者",
            creator_avatar: p.data?.avatar_url ?? null,
            creator_headline: cp.data.headline ?? null,
          };
        }),
      );
      setApps(enriched);
    } else {
      setApps([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (isReal) loadReal();
  }, [requestId, user?.id]);

  async function submitApplication() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!myCreatorId) {
      navigate({ to: "/creator/onboarding" });
      return;
    }
    if (request?.status !== "recruiting") {
      setMessage("这条需求已经结束招募。");
      return;
    }

    setWorking(true);
    setMessage("");
    const { error } = await supabase.from("applications").insert({
      request_id: requestId,
      creator_id: myCreatorId,
      quote_price: Number(quote),
      delivery_days: Number(days),
      proposal,
      revision_count: Number(revisions),
      commercial_use: commercial,
      source_file: sourceFile,
      manual_retouch: retouch,
      status: "submitted",
    });

    if (error) {
      setMessage(actionErrorMessage(error, "应征提交失败，请稍后重试。"));
    } else {
      setMessage("应征已提交，等待需求方选择。");
      setQuote("");
      setDays("");
      setProposal("");
      await loadReal();
    }
    setWorking(false);
  }

  async function withdrawApplication(applicationId: string) {
    if (!window.confirm("确定撤回这次应征吗？撤回后，在需求仍招募时可以重新应征。")) return;
    setWorking(true);
    setMessage("");

    const { error } = await supabase
      .from("applications")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) setMessage(actionErrorMessage(error, "撤回应征失败，请稍后重试。"));
    else {
      setMessage("应征已撤回。");
      await loadReal();
    }
    setWorking(false);
  }

  async function cancelRequest() {
    if (!window.confirm("确定取消这条需求吗？未选中的有效应征也会同时失效。")) return;
    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("cancel_request", { p_request_id: requestId });
    if (error) setMessage(actionErrorMessage(error, "取消需求失败，请稍后重试。"));
    else {
      setMessage("需求已取消。");
      await loadReal();
    }
    setWorking(false);
  }

  async function selectCreator(applicationId: string) {
    setWorking(true);
    setMessage("");
    const { data, error } = await supabase.rpc("select_application", {
      p_request_id: requestId,
      p_application_id: applicationId,
    });
    if (error) {
      setMessage(actionErrorMessage(error, "选择合作失败，请稍后重试。"));
    } else if (data) {
      navigate({ to: "/orders/$orderId", params: { orderId: data as string } });
    }
    setWorking(false);
  }

  if (loading) return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载需求…</div>;
  if (!request) {
    return (
      <div className="container-page py-20">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">没有找到这条需求</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError || "需求可能已经关闭或不存在。"}</p>
          <Button className="mt-5" variant="outline" asChild><Link to="/requests">返回需求大厅</Link></Button>
        </div>
      </div>
    );
  }

  const mockApps = local ? applicationsByRequest(request.id) : [];
  const myApps = myCreatorId ? apps.filter((app) => app.creator_id === myCreatorId) : [];
  const activeMyApp = myApps.find((app) => app.status === "submitted" || app.status === "selected");
  const latestMyApp = myApps.length ? myApps[myApps.length - 1] : undefined;
  const ownerCanManage = isReal && isOwner && (request.status === "draft" || request.status === "recruiting");

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <Pill tone="muted">{request.category}</Pill>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">{request.title}</h1>
          <div className="mt-3 text-sm text-muted-foreground">预算 {formatCNY(request.budget_min)}–{request.budget_max.toLocaleString("zh-CN")} · 截止 {request.deadline}</div>

          {ownerCanManage ? (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link to="/requests/$requestId/edit" params={{ requestId }}>编辑需求</Link>
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto" disabled={working} onClick={cancelRequest}>取消需求</Button>
            </div>
          ) : null}

          {message ? <div className="mt-5 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{message}</div> : null}

          <section className="mt-8 card-surface p-5 sm:p-6">
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
              {isReal ? apps.map((a) => (
                <div key={a.id} className="card-surface p-4 sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {a.creator_avatar ? <img src={a.creator_avatar} alt="" className="size-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{a.creator_name ?? "AI 创作者"}</span><ApplicationStatusBadge status={a.status} /></div>
                      {a.creator_headline ? <div className="mt-1 text-xs text-muted-foreground">{a.creator_headline}</div> : null}
                      <div className="mt-2 text-sm text-muted-foreground">报价 {formatCNY(Number(a.quote_price))} · {a.delivery_days} 天交付 · {a.revision_count} 次修改</div>
                      <p className="mt-3 text-sm leading-6">{a.proposal}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.commercial_use ? <Pill tone="muted">支持商用</Pill> : null}
                        {a.source_file ? <Pill tone="muted">提供源文件</Pill> : null}
                        {a.manual_retouch ? <Pill tone="muted">人工精修</Pill> : null}
                      </div>
                    </div>
                    {isOwner && request.status === "recruiting" && a.status === "submitted" ? (
                      <Button className="w-full md:w-auto" disabled={working} onClick={() => selectCreator(a.id)}>选择合作</Button>
                    ) : null}
                  </div>
                </div>
              )) : mockApps.map((a) => {
                const c = getCreator(a.creator_id);
                return (
                  <div key={a.id} className="card-surface p-5">
                    <div className="flex gap-4">
                      <img src={c?.avatar_url} alt="" className="size-12 rounded-full object-cover" />
                      <div><div className="font-medium">{c?.display_name}</div><div className="mt-2 text-sm text-muted-foreground">报价 {formatCNY(a.quote)} · {a.duration_days} 天交付</div><p className="mt-3 text-sm">{a.plan}</p></div>
                    </div>
                  </div>
                );
              })}
              {(isReal ? apps.length === 0 : mockApps.length === 0) ? <div className="card-surface p-8 text-center text-sm text-muted-foreground">暂时还没有应征。需求发布后，创作者的应征会出现在这里。</div> : null}
            </div>
          </section>
        </div>

        <aside>
          <div className="card-surface lg:sticky lg:top-24 p-5">
            {isReal && isOwner ? (
              <>
                <div className="font-medium">需求管理</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {request.status === "recruiting"
                    ? "查看应征并选择合作。选定创作者后，报价、周期和修改次数会写入订单快照。"
                    : request.status === "draft"
                      ? "这条需求还是草稿，可以继续编辑后再发布。"
                      : request.status === "cancelled"
                        ? "这条需求已经取消，不再接受应征。"
                        : "需求已经进入合作流程，内容已锁定。"}
                </p>
                {ownerCanManage ? (
                  <div className="mt-4 grid gap-2">
                    <Button variant="outline" asChild><Link to="/requests/$requestId/edit" params={{ requestId }}>编辑需求</Link></Button>
                    <Button variant="destructive" disabled={working} onClick={cancelRequest}>取消需求</Button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="font-medium">我要应征</div>
                {!user ? (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">登录并开通创作者身份后才能应征。</p>
                    <Button asChild className="mt-3 w-full"><Link to="/auth">登录 / 注册</Link></Button>
                  </div>
                ) : !myCreatorId && isReal ? (
                  <div className="mt-3">
                    <p className="text-sm leading-6 text-muted-foreground">你还没有创作者身份，先建立公开主页即可开始接单。</p>
                    <Button asChild className="mt-3 w-full"><Link to="/creator/onboarding">成为创作者</Link></Button>
                  </div>
                ) : request.status !== "recruiting" ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">这条需求已经结束招募，暂时不能再提交应征。</p>
                ) : activeMyApp ? (
                  <div className="mt-4">
                    <ApplicationStatusBadge status={activeMyApp.status} />
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {activeMyApp.status === "submitted" ? "应征已经提交，需求方选择合作前可以撤回。" : "你的应征已被选中，请前往订单继续合作。"}
                    </p>
                    {activeMyApp.status === "submitted" ? <Button variant="outline" className="mt-3 w-full" disabled={working} onClick={() => withdrawApplication(activeMyApp.id)}>撤回应征</Button> : null}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {latestMyApp?.status === "withdrawn" ? <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">你之前撤回过一次应征，可以重新提交新的报价与方案。</div> : null}
                    <input value={quote} onChange={(e) => setQuote(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="报价金额" type="number" min="0" />
                    <input value={days} onChange={(e) => setDays(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="交付天数" type="number" min="1" />
                    <input value={revisions} onChange={(e) => setRevisions(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="包含修改次数" type="number" min="0" />
                    <textarea value={proposal} onChange={(e) => setProposal(e.target.value)} className="min-h-28 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="简单说说你的制作方案和相关经验" />
                    <label className="block text-xs"><input type="checkbox" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} className="mr-2" />支持商用</label>
                    <label className="block text-xs"><input type="checkbox" checked={retouch} onChange={(e) => setRetouch(e.target.checked)} className="mr-2" />包含人工精修</label>
                    <label className="block text-xs"><input type="checkbox" checked={sourceFile} onChange={(e) => setSourceFile(e.target.checked)} className="mr-2" />提供源文件</label>
                    <Button className="w-full" disabled={working || !quote || !days || !proposal.trim()} onClick={submitApplication}>{working ? "提交中…" : "提交应征"}</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, Pill } from "@/components/site/common";
import { formatCNY, getCreator, getOrder } from "@/lib/data";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { actionErrorMessage } from "@/lib/action-errors";
import type { OrderStatus } from "@/lib/types";

type DbOrder = {
  id: string;
  order_no: string;
  request_id: string | null;
  client_id: string;
  creator_id: string;
  amount: number;
  deadline: string;
  revision_limit: number;
  revision_used: number;
  commercial_use_snapshot: string | null;
  scope_snapshot: Record<string, unknown>;
  status: OrderStatus;
  payment_status: string;
  created_at: string;
};

type DbDelivery = {
  id: string;
  version_no: number;
  note: string | null;
  file_urls: string[];
  is_final: boolean;
  submitted_by: string;
  created_at: string;
};

type DbMessage = {
  id: string;
  sender_id: string;
  message_type: string;
  content: string;
  created_at: string;
};

type SignedFile = {
  path: string;
  url: string | null;
  name: string;
};

type DeliveryView = DbDelivery & { signed_files: SignedFile[] };

type PartyProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline?: string | null;
};

export const Route = createFileRoute("/orders/$orderId")({ component: OrderPage });

function OrderPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const mockOrder = useMemo(() => getOrder(orderId), [orderId]);
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [client, setClient] = useState<PartyProfile | null>(null);
  const [creator, setCreator] = useState<PartyProfile | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryView[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [existingReview, setExistingReview] = useState<boolean>(false);
  const [loading, setLoading] = useState(!mockOrder);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [messageText, setMessageText] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");

  const isReal = !mockOrder;
  const isClient = !!user && order?.client_id === user.id;
  const isCreator = !!user && creator?.user_id === user.id;

  useEffect(() => {
    if (isReal && !authLoading && !user) navigate({ to: "/auth" });
  }, [isReal, authLoading, user, navigate]);

  async function loadOrder() {
    if (!user || !isReal) return;
    setLoading(true);

    const orderResult = await supabase
      .from("orders")
      .select("id,order_no,request_id,client_id,creator_id,amount,deadline,revision_limit,revision_used,commercial_use_snapshot,scope_snapshot,status,payment_status,created_at")
      .eq("id", orderId)
      .single();

    if (!orderResult.data) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const row = orderResult.data as DbOrder;
    setOrder(row);

    const [clientProfile, creatorProfile, deliveryResult, messageResult, reviewResult] = await Promise.all([
      supabase.from("profiles").select("id,display_name,avatar_url").eq("id", row.client_id).single(),
      supabase.from("creator_profiles").select("user_id,headline").eq("id", row.creator_id).single(),
      supabase.from("deliveries").select("id,version_no,note,file_urls,is_final,submitted_by,created_at").eq("order_id", row.id).order("version_no", { ascending: true }),
      supabase.from("messages").select("id,sender_id,message_type,content,created_at").eq("order_id", row.id).order("created_at", { ascending: true }),
      supabase.from("reviews").select("id").eq("order_id", row.id).eq("reviewer_id", user.id).maybeSingle(),
    ]);

    if (clientProfile.data) {
      setClient({
        user_id: clientProfile.data.id,
        display_name: clientProfile.data.display_name || "需求方",
        avatar_url: clientProfile.data.avatar_url,
      });
    }

    if (creatorProfile.data) {
      const creatorUser = await supabase.from("profiles").select("display_name,avatar_url").eq("id", creatorProfile.data.user_id).single();
      setCreator({
        user_id: creatorProfile.data.user_id,
        display_name: creatorUser.data?.display_name || "AI 创作者",
        avatar_url: creatorUser.data?.avatar_url ?? null,
        headline: creatorProfile.data.headline,
      });
    }

    const rawDeliveries = (deliveryResult.data ?? []) as DbDelivery[];
    const signed = await Promise.all(
      rawDeliveries.map(async (delivery) => {
        const signedFiles = await Promise.all(
          (delivery.file_urls ?? []).map(async (path) => {
            const { data } = await supabase.storage.from("deliveries").createSignedUrl(path, 3600);
            return {
              path,
              url: data?.signedUrl ?? null,
              name: path.split("/").pop() ?? "交付文件",
            };
          }),
        );
        return { ...delivery, signed_files: signedFiles };
      }),
    );
    setDeliveries(signed);
    setMessages((messageResult.data ?? []) as DbMessage[]);
    setExistingReview(!!reviewResult.data);
    setLoading(false);
  }

  useEffect(() => {
    if (user && isReal) loadOrder();
  }, [user?.id, orderId, isReal]);

  async function runRpc(name: string, args: Record<string, unknown>, success: string) {
    setWorking(true);
    setNotice("");
    const { error } = await supabase.rpc(name, args);
    if (error) setNotice(actionErrorMessage(error));
    else {
      setNotice(success);
      await loadOrder();
    }
    setWorking(false);
  }

  async function cancelOrder() {
    if (!order || !window.confirm("确定取消这笔订单吗？只有创作者接单前可以直接取消。")) return;
    await runRpc("cancel_order", { p_order_id: order.id }, "订单已取消。");
  }

  async function submitDelivery() {
    if (!user || !order || files.length === 0) return;
    setWorking(true);
    setNotice("");

    try {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${order.id}/${Date.now()}-${i}-${safe}`;
        const { error } = await supabase.storage.from("deliveries").upload(path, file, { upsert: false });
        if (error) throw error;
        paths.push(path);
      }

      const { error } = await supabase.rpc("submit_delivery", {
        p_order_id: order.id,
        p_note: deliveryNote,
        p_file_urls: paths,
        p_is_final: false,
      });
      if (error) throw error;

      setFiles([]);
      setDeliveryNote("");
      setNotice("交付版本已提交，等待需求方验收。");
      await loadOrder();
    } catch (error) {
      setNotice(actionErrorMessage(error, "交付失败，请稍后重试。"));
    } finally {
      setWorking(false);
    }
  }

  async function sendMessage() {
    if (!user || !order || !messageText.trim()) return;
    setWorking(true);
    const { error } = await supabase.from("messages").insert({
      order_id: order.id,
      sender_id: user.id,
      message_type: "text",
      content: messageText.trim(),
    });
    if (error) setNotice(actionErrorMessage(error, "留言发送失败，请稍后重试。"));
    else {
      setMessageText("");
      await loadOrder();
    }
    setWorking(false);
  }

  async function submitReview() {
    if (!user || !order || !creator) return;
    setWorking(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: order.id,
      reviewer_id: user.id,
      reviewee_id: creator.user_id,
      rating: Number(rating),
      content: reviewText,
      tags: [],
    });
    if (error) setNotice(actionErrorMessage(error, "评价提交失败，请稍后重试。"));
    else {
      setExistingReview(true);
      setNotice("评价已提交。");
    }
    setWorking(false);
  }

  if (mockOrder) {
    const mockCreator = getCreator(mockOrder.creator_id);
    return (
      <div className="container-page py-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><OrderStatusBadge status={mockOrder.status} /><h1 className="mt-3 font-display text-3xl font-semibold">{mockOrder.title}</h1></div>
          <div className="font-display text-2xl font-semibold">{formatCNY(mockOrder.amount)}</div>
        </div>
        <div className="mt-8 card-surface p-6">
          <p className="text-sm text-muted-foreground">这是原型示例订单。真实订单会在需求方选择创作者后自动生成，并启用文件上传、修改、验收和评价。</p>
          <div className="mt-4">创作者：{mockCreator?.display_name}</div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) return <div className="container-page py-20 text-center text-sm text-muted-foreground">正在加载订单…</div>;
  if (!order) {
    return (
      <div className="container-page py-20">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">没有找到这笔订单</h1>
          <p className="mt-3 text-sm text-muted-foreground">订单不存在，或当前账号不是这笔订单的合作方。</p>
          <Button className="mt-5" variant="outline" onClick={() => navigate({ to: "/me" })}>返回个人中心</Button>
        </div>
      </div>
    );
  }

  const scope = order.scope_snapshot ?? {};
  const title = String(scope.request_title ?? scope.service_title ?? "AIGAO 约稿订单");

  function renderReviewActions() {
    if (!isClient || order.status !== "pending_review") return null;
    return (
      <div>
        <div className="mb-3 text-sm font-medium">验收操作</div>
        <Button className="w-full" disabled={working} onClick={() => runRpc("complete_order", { p_order_id: order.id }, "订单已确认完成。")}>确认完成</Button>
        <textarea value={revisionFeedback} onChange={(e) => setRevisionFeedback(e.target.value)} className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="如需修改，请写清楚具体修改意见" />
        <Button variant="outline" className="mt-2 w-full" disabled={working || !revisionFeedback.trim() || order.revision_used >= order.revision_limit} onClick={() => runRpc("request_revision", { p_order_id: order.id, p_feedback: revisionFeedback }, "修改意见已提交。")}>申请修改</Button>
        <div className="mt-2 text-xs text-muted-foreground">剩余修改次数：{Math.max(0, order.revision_limit - order.revision_used)}</div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={order.status} /><span className="break-all text-xs text-muted-foreground">{order.order_no}</span></div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{title}</h1>
        </div>
        <div className="sm:text-right"><div className="font-display text-2xl font-semibold">{formatCNY(Number(order.amount))}</div><div className="mt-1 text-xs text-muted-foreground">成交金额</div></div>
      </div>

      {notice ? <div className="mt-5 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{notice}</div> : null}

      {isClient && order.status === "pending_confirm" ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">等待创作者确认接单</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">创作者尚未开始制作。如果计划有变，现在可以直接取消订单。</p>
          </div>
          <Button variant="destructive" className="w-full sm:w-auto" disabled={working} onClick={cancelOrder}>取消订单</Button>
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <div className="mt-5 rounded-2xl bg-secondary p-4 text-sm leading-6 text-muted-foreground">这笔订单已经取消，不再进入制作与交付流程。</div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <section className="card-surface p-5 sm:p-6">
            <h2 className="font-medium">订单约定</h2>
            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <Info label="交付范围" value={String(scope.description ?? scope.proposal ?? "按需求与应征方案执行")} />
              <Info label="截止日期" value={new Date(order.deadline).toLocaleString("zh-CN")} />
              <Info label="修改次数" value={order.revision_used + " / " + order.revision_limit} />
              <Info label="商用权限" value={order.commercial_use_snapshot || "按订单约定"} />
            </div>
          </section>

          {isCreator && order.status === "pending_confirm" ? (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="font-medium">确认接单</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">确认后订单进入制作中，并开始按约定截止日期履约。</p>
              <Button className="mt-4 w-full sm:w-auto" disabled={working} onClick={() => runRpc("accept_order", { p_order_id: order.id }, "已接单，订单进入制作中。")}>确认接单</Button>
            </section>
          ) : null}

          {isClient && order.status === "pending_review" ? (
            <section className="card-surface p-5 lg:hidden">{renderReviewActions()}</section>
          ) : null}

          {isCreator && (order.status === "in_progress" || order.status === "revision_required") ? (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="font-medium">{order.status === "revision_required" ? "提交修改版本" : "提交交付版本"}</h2>
              <textarea value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="说明这一版完成了什么…" />
              <input className="mt-3 block w-full max-w-full text-sm" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <div className="mt-2 text-xs leading-5 text-muted-foreground">已选择 {files.length} 个文件。文件会进入订单私有空间，仅合作双方可访问。</div>
              <Button className="mt-4 w-full sm:w-auto" disabled={working || files.length === 0} onClick={submitDelivery}>{working ? "上传中…" : "提交这一版"}</Button>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-2xl font-semibold">交付版本</h2>
            <div className="mt-5 space-y-4">
              {deliveries.map((d) => (
                <div key={d.id} className="card-surface p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><div className="font-medium">V{d.version_no}</div><div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("zh-CN")}</div></div>
                  {d.note ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{d.note}</p> : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {d.signed_files.map((f) => (
                      <a key={f.path} href={f.url ?? "#"} target="_blank" rel="noreferrer" className="min-w-0 rounded-xl border border-border p-3 text-sm hover:bg-secondary">
                        <div className="truncate font-medium">{f.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{f.url ? "点击预览 / 下载" : "暂时无法生成访问链接"}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {deliveries.length === 0 ? <div className="card-surface p-8 text-center text-sm leading-6 text-muted-foreground">暂时还没有交付版本。创作者提交第一版后会显示在这里。</div> : null}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">订单留言</h2>
            <div className="mt-5 card-surface divide-y divide-border overflow-hidden">
              {messages.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="text-xs text-muted-foreground">{m.sender_id === user?.id ? "我" : m.sender_id === client?.user_id ? client?.display_name : creator?.display_name} · {new Date(m.created_at).toLocaleString("zh-CN")}</div>
                  <div className="mt-1.5 break-words text-sm leading-6">{m.content}</div>
                  {m.message_type === "revision" ? <div className="mt-2"><Pill tone="clay">正式修改意见</Pill></div> : null}
                </div>
              ))}
              {messages.length === 0 ? <div className="p-5 text-center text-sm text-muted-foreground">还没有留言，可以在下面直接沟通订单细节。</div> : null}
              {order.status !== "cancelled" ? (
                <div className="p-4">
                  <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="写一条订单留言…" />
                  <Button className="mt-2 w-full sm:w-auto" disabled={working || !messageText.trim()} onClick={sendMessage}>发送</Button>
                </div>
              ) : null}
            </div>
          </section>

          {isClient && order.status === "completed" && !existingReview ? (
            <section className="card-surface p-5 sm:p-6">
              <h2 className="font-medium">评价这次合作</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm">评分</span>
                <select value={rating} onChange={(e) => setRating(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {[5,4,3,2,1].map((x) => <option key={x} value={x}>{x} 星</option>)}
                </select>
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="说说质量、沟通、交付体验…" />
              <Button className="mt-3 w-full sm:w-auto" disabled={working} onClick={submitReview}>提交评价</Button>
            </section>
          ) : null}
        </div>

        <aside>
          <div className="card-surface lg:sticky lg:top-24 p-5">
            <div className="font-medium">合作双方</div>
            <div className="mt-4 space-y-4 text-sm">
              <Party label="需求方" party={client} />
              <Party label="创作者" party={creator} />
            </div>

            {isClient && order.status === "pending_review" ? (
              <div className="mt-5 hidden border-t border-border pt-5 lg:block">{renderReviewActions()}</div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2"><Pill tone="muted">版本留痕</Pill><Pill tone="muted">订单快照</Pill><Pill tone="muted">修改次数记录</Pill></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Party({ label, party }: { label: string; party: PartyProfile | null }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{party?.display_name ?? "加载中…"}</div>{party?.headline ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{party.headline}</div> : null}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 break-words leading-6">{value}</div></div>;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, Pill } from "@/components/site/common";
import { formatCNY, getCreator, getOrder } from "@/lib/data";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
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
    if (error) setNotice(error.message);
    else {
      setNotice(success);
      await loadOrder();
    }
    setWorking(false);
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
      setNotice(error instanceof Error ? error.message : "交付失败");
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
    if (error) setNotice(error.message);
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
    if (error) setNotice(error.message);
    else {
      setExistingReview(true);
      setNotice("评价已提交。");
    }
    setWorking(false);
  }

  if (mockOrder) {
    const mockCreator = getCreator(mockOrder.creator_id);
    return (
      <div className="container-page py-10">
        <div className="flex items-start justify-between gap-4">
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
  if (!order) return <div className="container-page py-20 text-center">订单不存在，或你无权查看该订单。</div>;

  const scope = order.scope_snapshot ?? {};
  const title = String(scope.request_title ?? "AIGAO 约稿订单");

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><OrderStatusBadge status={order.status} /><span className="text-xs text-muted-foreground">{order.order_no}</span></div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{title}</h1>
        </div>
        <div className="text-right"><div className="font-display text-2xl font-semibold">{formatCNY(Number(order.amount))}</div><div className="mt-1 text-xs text-muted-foreground">成交金额</div></div>
      </div>

      {notice ? <div className="mt-5 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{notice}</div> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="card-surface p-6">
            <h2 className="font-medium">订单约定</h2>
            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <Info label="交付范围" value={String(scope.description ?? scope.proposal ?? "按需求与应征方案执行")} />
              <Info label="截止日期" value={new Date(order.deadline).toLocaleString("zh-CN")} />
              <Info label="修改次数" value={order.revision_used + " / " + order.revision_limit} />
              <Info label="商用权限" value={order.commercial_use_snapshot || "按订单约定"} />
            </div>
          </section>

          {isCreator && order.status === "pending_confirm" ? (
            <section className="card-surface p-6">
              <h2 className="font-medium">确认接单</h2>
              <p className="mt-2 text-sm text-muted-foreground">确认后订单进入制作中，并开始按约定截止日期履约。</p>
              <Button className="mt-4" disabled={working} onClick={() => runRpc("accept_order", { p_order_id: order.id }, "已接单，订单进入制作中。")}>确认接单</Button>
            </section>
          ) : null}

          {isCreator && (order.status === "in_progress" || order.status === "revision_required") ? (
            <section className="card-surface p-6">
              <h2 className="font-medium">{order.status === "revision_required" ? "提交修改版本" : "提交交付版本"}</h2>
              <textarea value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="说明这一版完成了什么…" />
              <input className="mt-3 block w-full text-sm" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <div className="mt-2 text-xs text-muted-foreground">已选择 {files.length} 个文件。文件会进入订单私有空间，仅合作双方可访问。</div>
              <Button className="mt-4" disabled={working || files.length === 0} onClick={submitDelivery}>{working ? "上传中…" : "提交这一版"}</Button>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-2xl font-semibold">交付版本</h2>
            <div className="mt-5 space-y-4">
              {deliveries.map((d) => (
                <div key={d.id} className="card-surface p-5">
                  <div className="flex justify-between"><div className="font-medium">V{d.version_no}</div><div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("zh-CN")}</div></div>
                  {d.note ? <p className="mt-2 text-sm text-muted-foreground">{d.note}</p> : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {d.signed_files.map((f) => (
                      <a key={f.path} href={f.url ?? "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-border p-3 text-sm hover:bg-secondary">
                        <div className="truncate font-medium">{f.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{f.url ? "点击预览 / 下载" : "暂时无法生成访问链接"}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {deliveries.length === 0 ? <div className="card-surface p-8 text-center text-sm text-muted-foreground">暂时还没有交付版本。</div> : null}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">订单留言</h2>
            <div className="mt-5 card-surface divide-y divide-border">
              {messages.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="text-xs text-muted-foreground">{m.sender_id === user?.id ? "我" : m.sender_id === client?.user_id ? client?.display_name : creator?.display_name} · {new Date(m.created_at).toLocaleString("zh-CN")}</div>
                  <div className="mt-1.5 text-sm">{m.content}</div>
                  {m.message_type === "revision" ? <div className="mt-2"><Pill tone="clay">正式修改意见</Pill></div> : null}
                </div>
              ))}
              <div className="p-4">
                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="写一条订单留言…" />
                <Button className="mt-2" disabled={working || !messageText.trim()} onClick={sendMessage}>发送</Button>
              </div>
            </div>
          </section>

          {isClient && order.status === "completed" && !existingReview ? (
            <section className="card-surface p-6">
              <h2 className="font-medium">评价这次合作</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm">评分</span>
                <select value={rating} onChange={(e) => setRating(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {[5,4,3,2,1].map((x) => <option key={x} value={x}>{x} 星</option>)}
                </select>
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="说说质量、沟通、交付体验…" />
              <Button className="mt-3" disabled={working} onClick={submitReview}>提交评价</Button>
            </section>
          ) : null}
        </div>

        <aside>
          <div className="card-surface sticky top-24 p-5">
            <div className="font-medium">合作双方</div>
            <div className="mt-4 space-y-4 text-sm">
              <Party label="需求方" party={client} />
              <Party label="创作者" party={creator} />
            </div>

            {isClient && order.status === "pending_review" ? (
              <div className="mt-5 border-t border-border pt-5">
                <div className="mb-3 text-sm font-medium">验收操作</div>
                <Button className="w-full" disabled={working} onClick={() => runRpc("complete_order", { p_order_id: order.id }, "订单已确认完成。")}>确认完成</Button>
                <textarea value={revisionFeedback} onChange={(e) => setRevisionFeedback(e.target.value)} className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="如需修改，请写清楚具体修改意见" />
                <Button variant="outline" className="mt-2 w-full" disabled={working || !revisionFeedback.trim() || order.revision_used >= order.revision_limit} onClick={() => runRpc("request_revision", { p_order_id: order.id, p_feedback: revisionFeedback }, "修改意见已提交。")}>申请修改</Button>
                <div className="mt-2 text-xs text-muted-foreground">剩余修改次数：{Math.max(0, order.revision_limit - order.revision_used)}</div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2"><Pill tone="muted">版本留痕</Pill><Pill tone="muted">订单快照</Pill><Pill tone="muted">修改次数记录</Pill></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Party({ label, party }: { label: string; party: PartyProfile | null }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{party?.display_name ?? "加载中…"}</div>{party?.headline ? <div className="mt-1 text-xs text-muted-foreground">{party.headline}</div> : null}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 leading-6">{value}</div></div>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/site/cards";
import { requests as mockRequests } from "@/lib/data";
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
};

function toCard(row: DbRequest): CreatorRequest {
  return {
    id: row.id,
    title: row.title,
    owner_name: "AIGAO 用户",
    owner_avatar: "",
    owner_kind: "需求方",
    category: row.category,
    media_type: row.type === "AI视频" ? "video" : row.type === "AI图片" ? "image" : "mixed",
    description: row.description,
    deliverables: [],
    budget_min: Number(row.budget_min),
    budget_max: Number(row.budget_max),
    deadline: row.deadline,
    created_at: row.created_at,
    status: row.status,
    applications_count: 0,
    views: 0,
    attachments: [],
    requirements: { commercial_use: false, retouch: false, consistency: false, source_files: false },
  };
}

export const Route = createFileRoute("/requests/")({ component: RequestsPage });

function RequestsPage() {
  const [remote, setRemote] = useState<CreatorRequest[]>([]);

  useEffect(() => {
    supabase
      .from("requests")
      .select("id,title,category,type,description,budget_min,budget_max,deadline,created_at,status")
      .eq("status", "recruiting")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRemote((data as DbRequest[]).map(toCard));
      });
  }, []);

  const combined = [...remote, ...mockRequests.filter((m) => !remote.some((r) => r.id === m.id))];

  return (
    <div className="container-page py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">需求大厅</h1>
          <p className="mt-2 text-sm text-muted-foreground">按预算、交付日期与项目类型找到适合自己的合作。</p>
        </div>
        <Button asChild className="rounded-full"><Link to="/requests/new">发布需求</Link></Button>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{combined.map((r) => <RequestCard key={r.id} request={r} />)}</div>
    </div>
  );
}

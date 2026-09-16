import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/site/cards";
import { requests } from "@/lib/data";

export const Route = createFileRoute("/requests/")({ component: RequestsPage });

function RequestsPage() {
  return (
    <div className="container-page py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">需求大厅</h1>
          <p className="mt-2 text-sm text-muted-foreground">按预算、交付日期与项目类型找到适合自己的合作。</p>
        </div>
        <Button asChild className="rounded-full"><Link to="/requests/new">发布需求</Link></Button>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{requests.map((r) => <RequestCard key={r.id} request={r} />)}</div>
    </div>
  );
}

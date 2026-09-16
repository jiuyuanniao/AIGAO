import { Link } from "@tanstack/react-router";
import { Search, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

const NAV = [
  { to: "/", label: "首页" },
  { to: "/services", label: "找服务" },
  { to: "/creators", label: "找创作者" },
  { to: "/works", label: "作品广场" },
  { to: "/requests", label: "需求大厅" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6">
        <Link to="/" className="shrink-0 font-display text-xl font-semibold tracking-tight">
          AIGAO
          <span className="ml-2 align-middle text-[11px] font-normal tracking-widest text-muted-foreground">
            AI 约稿
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/services"
            className="hidden h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition-colors hover:text-foreground lg:flex"
          >
            <Search className="size-4" />
            搜索服务、创作者、作品
          </Link>

          <Button asChild size="sm" className="rounded-full">
            <Link to={user ? "/requests/new" : "/auth"}>{user ? "发布需求" : "登录 / 注册"}</Link>
          </Button>

          {!loading && user ? (
            <>
              <Link to="/me" className="ml-1 hidden md:block" title={user.email ?? "我的"}>
                <Avatar className="size-9 border border-border">
                  <AvatarFallback>{(user.email?.[0] ?? "我").toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={signOut} title="退出登录">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="打开菜单"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="container-page flex flex-col py-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm text-muted-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={user ? "/me" : "/auth"}
            onClick={() => setOpen(false)}
            className="py-2.5 text-sm text-muted-foreground"
          >
            {user ? "我的" : "登录 / 注册"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

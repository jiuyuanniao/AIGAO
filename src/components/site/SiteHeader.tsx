import { Link } from "@tanstack/react-router";
import { Search, Menu, LogOut, X } from "lucide-react";
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
    setOpen(false);
    await supabase.auth.signOut();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Link to="/" className="min-w-0 shrink-0 font-display text-xl font-semibold tracking-tight" onClick={() => setOpen(false)}>
          AIGAO
          <span className="ml-2 hidden align-middle text-[11px] font-normal tracking-widest text-muted-foreground sm:inline">
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

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/services"
            className="hidden h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition-colors hover:text-foreground lg:flex"
          >
            <Search className="size-4" />
            搜索服务、创作者、作品
          </Link>

          <Button asChild size="sm" className="rounded-full px-3 sm:px-4">
            <Link to={user ? "/requests/new" : "/auth"}>
              <span className="sm:hidden">{user ? "发布" : "登录"}</span>
              <span className="hidden sm:inline">{user ? "发布需求" : "登录 / 注册"}</span>
            </Link>
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
            aria-label={open ? "关闭菜单" : "打开菜单"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border bg-background md:hidden", open ? "block" : "hidden")}>
        <nav className="container-page flex flex-col py-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="py-3 text-sm text-muted-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link
            to={user ? "/requests/new" : "/auth"}
            onClick={() => setOpen(false)}
            className="py-3 text-sm text-muted-foreground"
          >
            {user ? "发布需求" : "登录 / 注册"}
          </Link>
          <Link
            to={user ? "/me" : "/auth"}
            onClick={() => setOpen(false)}
            className="py-3 text-sm text-muted-foreground"
          >
            {user ? "我的 / 创作者中心" : "我的"}
          </Link>
          {user ? (
            <button type="button" onClick={signOut} className="flex items-center gap-2 py-3 text-left text-sm text-muted-foreground">
              <LogOut className="size-4" />
              退出登录
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth } from "@/components/auth/AuthProvider";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/me" });
  }, [authLoading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setMessage(authErrorMessage(error.message));
      } else if (data.session) {
        navigate({ to: "/me" });
      } else {
        setMessage("注册成功。验证邮件已经发出，请打开邮箱完成验证。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(authErrorMessage(error.message));
      } else {
        navigate({ to: "/me" });
      }
    }

    setLoading(false);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-md p-7">
        <div className="flex gap-2 rounded-full bg-secondary p-1">
          <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={"flex-1 rounded-full px-4 py-2 text-sm " + (mode === "login" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>登录</button>
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={"flex-1 rounded-full px-4 py-2 text-sm " + (mode === "signup" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>注册</button>
        </div>

        <h1 className="mt-7 font-display text-3xl font-semibold">{mode === "login" ? "欢迎回来" : "创建 AIGAO 账号"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">一个账号可同时作为需求方和 AI 创作者使用。</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" ? <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="昵称 / 工作室名称" required /> : null}
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="邮箱" required />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="密码（至少 6 位）" minLength={6} required />
          <Button className="w-full" disabled={loading}>{loading ? "处理中…" : mode === "login" ? "登录" : "注册"}</Button>
        </form>

        {mode === "login" ? (
          <div className="mt-4 text-center text-sm">
            <Link to="/auth/forgot-password" className="text-muted-foreground transition-colors hover:text-foreground">忘记密码？</Link>
          </div>
        ) : null}

        {message ? <div className="mt-4 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{message}</div> : null}
      </div>
    </div>
  );
}

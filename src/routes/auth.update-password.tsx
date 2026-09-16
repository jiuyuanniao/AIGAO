import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/update-password")({ component: UpdatePasswordPage });

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("正在验证重置链接…");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(authErrorMessage(error.message));
      else if (data.session) {
        setReady(true);
        setMessage("");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setMessage("");
      }
    });

    const timer = window.setTimeout(() => {
      if (active && !ready) setMessage("这个重置链接无效或已经过期，请重新申请。");
    }, 4000);

    return () => {
      active = false;
      window.clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(authErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setMessage("密码已更新，正在进入个人中心…");
    window.setTimeout(() => navigate({ to: "/me" }), 700);
    setLoading(false);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-md p-7">
        <h1 className="font-display text-3xl font-semibold">设置新密码</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">重置链接通过验证后，就可以为账号设置新的登录密码。</p>

        {ready ? (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="新密码（至少 6 位）" minLength={6} required />
            <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="再次输入新密码" minLength={6} required />
            <Button className="w-full" disabled={loading}>{loading ? "更新中…" : "确认修改密码"}</Button>
          </form>
        ) : null}

        {message ? <div className="mt-4 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{message}</div> : null}
        {!ready ? <div className="mt-4 text-center text-sm"><Link to="/auth/forgot-password" className="text-muted-foreground">重新申请重置链接</Link></div> : null}
      </div>
    </div>
  );
}

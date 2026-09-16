import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setMessage(authErrorMessage(error.message));
    } else {
      setMessage("重置密码邮件已经发送。请打开邮箱里的链接继续。");
    }
    setLoading(false);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-md p-7">
        <div className="text-sm text-muted-foreground"><Link to="/auth">← 返回登录</Link></div>
        <h1 className="mt-5 font-display text-3xl font-semibold">找回密码</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">输入注册邮箱，我们会发送一个一次性的密码重置链接。</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="注册邮箱" required />
          <Button className="w-full" disabled={loading}>{loading ? "发送中…" : "发送重置邮件"}</Button>
        </form>

        {message ? <div className="mt-4 rounded-xl bg-secondary p-3 text-sm leading-6 text-muted-foreground">{message}</div> : null}
      </div>
    </div>
  );
}

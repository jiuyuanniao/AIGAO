import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackPage });

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("正在确认邮箱…");

  useEffect(() => {
    let active = true;
    let timeout: number | undefined;

    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get("error_description");
      if (errorDescription) {
        if (active) setMessage(authErrorMessage(errorDescription));
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (active) setMessage(authErrorMessage(error.message));
        return;
      }

      if (data.session) {
        if (active) setMessage("邮箱验证成功，正在进入 AIGAO…");
        timeout = window.setTimeout(() => navigate({ to: "/me" }), 500);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active || !session) return;
        setMessage("邮箱验证成功，正在进入 AIGAO…");
        timeout = window.setTimeout(() => navigate({ to: "/me" }), 500);
      });

      timeout = window.setTimeout(() => {
        if (active) setMessage("邮箱已经验证。请返回登录页使用邮箱和密码登录。");
        listener.subscription.unsubscribe();
      }, 3500);

      return () => listener.subscription.unsubscribe();
    }

    let cleanup: (() => void) | undefined;
    finish().then((fn) => { cleanup = fn; });

    return () => {
      active = false;
      if (timeout) window.clearTimeout(timeout);
      cleanup?.();
    };
  }, [navigate]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-md p-7 text-center">
        <div className="mx-auto size-10 rounded-full bg-secondary" />
        <h1 className="mt-5 font-display text-2xl font-semibold">账号验证</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

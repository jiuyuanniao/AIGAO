export function actionErrorMessage(error: unknown, fallback = "操作失败，请稍后重试。") {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";

  if (!raw) return fallback;
  if (/[一-鿿]/.test(raw)) return raw;

  const value = raw.toLowerCase();
  if (value.includes("row-level security") || value.includes("permission denied")) return "你没有权限执行这个操作。";
  if (value.includes("duplicate key") || value.includes("already exists")) return "这条内容已经存在，请刷新页面后重试。";
  if (value.includes("jwt") || value.includes("session") || value.includes("not authenticated")) return "登录状态已失效，请重新登录。";
  if (value.includes("network") || value.includes("fetch")) return "网络连接异常，请检查网络后重试。";

  return fallback;
}

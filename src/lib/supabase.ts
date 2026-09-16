import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。");
}

export const supabase = createClient(url, publishableKey);

// Netlify production rebuild after environment configuration refresh.

export function authErrorMessage(message: string) {
  const value = message.toLowerCase();

  if (value.includes("invalid login credentials")) return "邮箱或密码不正确。";
  if (value.includes("email not confirmed")) return "邮箱还没有完成验证，请先打开验证邮件。";
  if (value.includes("user already registered")) return "这个邮箱已经注册过了，直接登录即可。";
  if (value.includes("password should be at least")) return "密码长度不够，请至少输入 6 位。";
  if (value.includes("rate limit") || value.includes("email rate limit")) return "操作太频繁了，请稍等一会儿再试。";
  if (value.includes("signup is disabled")) return "当前暂时关闭了新用户注册。";
  if (value.includes("same password")) return "新密码不能和原密码相同。";
  if (value.includes("session") && value.includes("missing")) return "登录状态已失效，请重新打开邮件里的链接。";

  return message;
}

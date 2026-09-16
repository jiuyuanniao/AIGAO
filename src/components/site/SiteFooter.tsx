import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="font-display text-lg font-semibold">AIGAO</div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            AI 图片、AI 视频与商业视觉制作的约稿平台。找到合适的 AI 创作者，从需求到交付一站完成。
          </p>
        </div>
        <FooterCol
          title="发现"
          links={[
            { to: "/services", label: "找服务" },
            { to: "/creators", label: "找创作者" },
            { to: "/works", label: "作品广场" },
          ]}
        />
        <FooterCol
          title="合作"
          links={[
            { to: "/requests", label: "需求大厅" },
            { to: "/requests/new", label: "发布需求" },
            { to: "/me", label: "个人中心" },
          ]}
        />
        <div>
          <div className="text-sm font-medium">关于</div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>平台规则</li>
            <li>版权与商用说明</li>
            <li>创作者入驻</li>
            <li>联系我们</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© 2026 AIGAO · 本平台不提供 AI 生成能力，仅连接需求方与 AI 创作者</span>
          <span>示例数据演示版本</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: "/services" | "/creators" | "/works" | "/requests" | "/requests/new" | "/me"; label: string }[];
}) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
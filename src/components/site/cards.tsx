import { Link } from "@tanstack/react-router";
import { Clock, Heart, Image as ImageIcon, PlayCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill, Rating, RequestStatusBadge } from "./common";
import { formatCNY, getCreator } from "@/lib/data";
import type { CreatorProfile, CreatorRequest, Portfolio, Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  const creator = getCreator(service.creator_id);
  return (
    <Link
      to="/services/$serviceId"
      params={{ serviceId: service.id }}
      className="card-surface hover-lift group block overflow-hidden"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <img
          src={service.cover_url}
          alt={service.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {service.media_type === "video" ? (
            <PlayCircle className="size-3.5" />
          ) : (
            <ImageIcon className="size-3.5" />
          )}
          {service.media_type === "video" ? "视频" : "图片"}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={creator?.avatar_url} alt={creator?.display_name} />
            <AvatarFallback>创</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{creator?.display_name}</span>
          {creator?.verified ? <Pill tone="brand">已认证</Pill> : null}
        </div>
        <h3 className="mt-2.5 line-clamp-2 text-[15px] font-medium leading-snug">{service.title}</h3>
        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
          <Rating value={service.rating} />
          <span>成交 {service.orders_count}</span>
        </div>
        <div className="mt-3.5 flex items-end justify-between border-t border-border pt-3.5">
          <div>
            <span className="font-display text-lg font-semibold">{formatCNY(service.price_from)}</span>
            <span className="ml-1 text-xs text-muted-foreground">起</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {service.quantity} · {service.delivery_days} 天
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CreatorCard({ creator }: { creator: CreatorProfile }) {
  return (
    <Link
      to="/creators/$handle"
      params={{ handle: creator.handle }}
      className="card-surface hover-lift block overflow-hidden"
    >
      <div className="h-24 overflow-hidden bg-muted">
        <img src={creator.cover_url} alt="" loading="lazy" className="size-full object-cover" />
      </div>
      <div className="px-5 pb-5">
        <Avatar className="-mt-8 size-16 border-4 border-card">
          <AvatarImage src={creator.avatar_url} alt={creator.display_name} />
          <AvatarFallback>创</AvatarFallback>
        </Avatar>
        <div className="mt-3 flex items-center gap-2">
          <h3 className="text-[15px] font-medium">{creator.display_name}</h3>
          {creator.verified ? <Pill tone="brand">已认证</Pill> : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{creator.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {creator.specialties.slice(0, 3).map((s) => (
            <Pill key={s} tone="muted">
              {s}
            </Pill>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
          <Rating value={creator.rating} count={creator.reviews_count} />
          <span>完成 {creator.completed_orders} 单</span>
          <span>{formatCNY(creator.price_from)} 起</span>
        </div>
      </div>
    </Link>
  );
}

export function WorkCard({ work }: { work: Portfolio }) {
  const creator = getCreator(work.creator_id);
  return (
    <div className="card-surface hover-lift group mb-5 block break-inside-avoid overflow-hidden">
      <div className="relative overflow-hidden bg-muted">
        <img
          src={work.cover_url}
          alt={work.title}
          loading="lazy"
          className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {work.media_type === "video" ? (
          <PlayCircle className="absolute right-3 top-3 size-5 text-background drop-shadow" />
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-sm font-medium">{work.title}</h3>
        <div className="mt-2.5 flex items-center justify-between">
          <Link
            to="/creators/$handle"
            params={{ handle: creator?.handle ?? "" }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Avatar className="size-5">
              <AvatarImage src={creator?.avatar_url} alt="" />
              <AvatarFallback>创</AvatarFallback>
            </Avatar>
            {creator?.display_name}
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="size-3.5" />
            {work.likes}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RequestCard({ request }: { request: CreatorRequest }) {
  return (
    <Link
      to="/requests/$requestId"
      params={{ requestId: request.id }}
      className="card-surface hover-lift block p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <Pill tone="muted">{request.category}</Pill>
          </div>
          <h3 className="mt-2.5 line-clamp-1 text-[15px] font-medium">{request.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-semibold">
            {formatCNY(request.budget_min)}–{request.budget_max.toLocaleString("zh-CN")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">预算区间</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Avatar className="size-5">
            <AvatarImage src={request.owner_avatar} alt="" />
            <AvatarFallback>方</AvatarFallback>
          </Avatar>
          {request.owner_name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          截止 {request.deadline}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {request.applications_count} 人应征
        </span>
        <span className="ml-auto">{request.views} 次浏览</span>
      </div>
    </Link>
  );
}
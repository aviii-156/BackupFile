"use client";

import {
  Bell,
  ShoppingCart,
  CheckCheck,
  Package,
  Truck,
  CircleCheck,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/context/NotificationContext";
import { type AppNotification } from "@/services/notification.service";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// Map notification types to icons and accent colours
const TYPE_META: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
  new_order:       { icon: ShoppingCart,  color: "text-blue-500" },
  order_placed:    { icon: Package,       color: "text-indigo-500" },
  order_confirmed: { icon: CircleCheck,   color: "text-green-500" },
  order_status:    { icon: Truck,         color: "text-orange-500" },
  order_delivered: { icon: CheckCheck,    color: "text-green-600" },
  order_cancelled: { icon: AlertCircle,   color: "text-red-500" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: Info, color: "text-primary" };
}

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  const handleMarkRead = (notif: AppNotification) => {
    if (!notif.isRead) markAsRead(notif._id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-95 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => {
              const meta = getTypeMeta(notif.type);
              const Icon = meta.icon;
              return (
                <button
                  key={notif._id}
                  onClick={() => handleMarkRead(notif)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex gap-3 items-start transition-colors",
                    notif.isRead
                      ? "bg-background hover:bg-muted/40"
                      : "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      notif.isRead ? "bg-muted" : "bg-primary/10"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", meta.color)} />
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        notif.isRead ? "font-normal text-foreground" : "font-semibold text-foreground"
                      )}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, PlaySquare, Clock, ThumbsUp, Video } from "lucide-react";
import { clsx } from "clsx";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Flame, label: "Trending", href: "/trending" },
  { icon: PlaySquare, label: "Subscriptions", href: "/subscriptions" },
  { icon: Clock, label: "History", href: "/history" },
  { icon: ThumbsUp, label: "Liked", href: "/liked" },
  { icon: Video, label: "Your Streams", href: "/streams" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-youtube-black border-r border-youtube-border overflow-y-auto">
      <nav className="py-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-6 px-6 py-3 hover:bg-youtube-darkHover transition-colors",
                isActive && "bg-youtube-darkHover"
              )}
            >
              <Icon
                size={24}
                className={clsx("text-white", isActive && "text-youtube-red")}
              />
              <span
                className={clsx(
                  "text-sm",
                  isActive
                    ? "text-white font-medium"
                    : "text-youtube-textSecondary"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

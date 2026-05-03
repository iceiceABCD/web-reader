"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "书架", icon: "📚" },
  { href: "/import", label: "导入", icon: "📂" },
  { href: "/search", label: "搜索", icon: "🔍" },
  { href: "/sources", label: "书源", icon: "🔗" },
  { href: "/replace-rules", label: "净化", icon: "🧹" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="text-2xl"
            >
              📖
            </motion.div>
            <span className="font-serif text-xl font-semibold text-foreground tracking-tight">
              阅读
            </span>
          </Link>

          {/* Navigation */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-70">{item.icon}</span>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Nav */}
          <div className="flex sm:hidden items-center gap-1 flex-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User */}
          <div className="ml-auto flex items-center gap-3">
            {session?.user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm text-muted-foreground">
                  {session.user.name}
                </span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  退出
                </motion.button>
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  登录
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

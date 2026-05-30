"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuthStore } from "@/store/useAuthStore";

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: "home", icon: "🏠", label: "Dashboard" },
  { id: "tryout", icon: "📝", label: "Tryout SKD" },
  { id: "buy", icon: "🛒", label: "Beli Paket" },
  { id: "video", icon: "🎬", label: "Video Belajar" },
  { id: "ranking", icon: "🏅", label: "Ranking" },
  { id: "profile", icon: "👤", label: "Profil" },
];

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const segment = pathname?.split("/").pop() || "";
  const currentPage = segment === "dashboard" ? "home" : segment;

  const handleNav = (id: string) => {
    setIsMoreOpen(false);
    router.push(id === "home" ? "/dashboard" : `/${id}`);
  };

  const handleLogout = () => {
    logout();
    signOut({ callbackUrl: "/" });
  };

  const hasAvatarUrl = !!(user?.avatar && user.avatar.startsWith("http"));
  const userInitial = user?.name?.[0]?.toUpperCase() || "U";

  const primaryNav = navItems.slice(0, 4);
  const secondaryNav = navItems.slice(4);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[228px] bg-white border-r border-gray-100 fixed h-screen top-0 shadow-md z-50">
        {/* User Info */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-2.5">
          {hasAvatarUrl ? (
            <Image
              src={user.avatar!}
              alt={user?.name || "User"}
              width={36}
              height={36}
              className="rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
              {userInitial}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="font-bold text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.name || "Pengguna"}
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.email || ""}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex items-center gap-2.5 w-full p-2.5 rounded-xl border-none cursor-pointer
                font-['Montserrat',sans-serif] font-semibold text-sm text-left mb-0.75
                transition-all duration-150
                ${
                  currentPage === item.id
                    ? "bg-blue-50 text-blue-600"
                    : "bg-transparent text-gray-500 hover:bg-gray-50"
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3.5 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full p-2.25 rounded-xl border-none cursor-pointer font-['Montserrat',sans-serif] font-semibold text-sm text-red-600 bg-red-50"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* Mobile More Menu Overlay */}
      {isMoreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-[64px] left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40 p-4 border-t border-gray-100 flex flex-col gap-2 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 p-2 mb-2 border-b border-gray-100">
              {hasAvatarUrl ? (
                <Image
                  src={user.avatar!}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  alt="User"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] text-white flex items-center justify-center font-bold">
                  {userInitial}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.name || "Pengguna"}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.email}
                </div>
              </div>
            </div>

            {secondaryNav.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm border-none cursor-pointer text-left ${
                  currentPage === item.id
                    ? "bg-blue-50 text-blue-600"
                    : "bg-transparent text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-red-600 bg-red-50 mt-2 border-none cursor-pointer text-left"
            >
              <span className="text-xl">🚪</span>
              Keluar
            </button>
          </div>
        </>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
        <div className="flex justify-around items-center py-2 pb-[env(safe-area-inset-bottom,8px)]">
          {primaryNav.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-1
                font-['Montserrat',sans-serif] w-16
                ${currentPage === item.id ? "text-blue-600" : "text-gray-400"}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span
                className={`text-[10px] whitespace-nowrap ${currentPage === item.id ? "font-bold" : "font-medium"}`}
              >
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`
              flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-1
              font-['Montserrat',sans-serif] w-16
              ${isMoreOpen ? "text-blue-600" : "text-gray-400"}
            `}
          >
            <span className="text-xl">☰</span>
            <span
              className={`text-[10px] whitespace-nowrap ${isMoreOpen ? "font-bold" : "font-medium"}`}
            >
              Lainnya
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

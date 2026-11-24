"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavGuardStore } from "@/store/useNavGuardStore";
import { Modal, Button } from "@/components/ui";
import { Menu } from "@base-ui/react/menu";
import { LayoutDashboard, ClipboardList, ShoppingBag, PlaySquare, Trophy, UserRound, LogOut, Ellipsis, ChevronsUpDown } from "lucide-react";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/shadcn/sidebar";

const navItems = [
  { id: "home", icon: LayoutDashboard, label: "Dashboard" },
  { id: "tryout", icon: ClipboardList, label: "Tryout SKD" },
  { id: "buy", icon: ShoppingBag, label: "Beli Paket" },
  { id: "video", icon: PlaySquare, label: "Video Belajar" },
  { id: "ranking", icon: Trophy, label: "Ranking" },
];
const menuItemClass = "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 outline-none data-highlighted:bg-slate-100 data-highlighted:text-brand [&>svg]:size-4";

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isGuarded = useNavGuardStore((s) => s.isActive);
  const navProgress = useNavGuardStore((s) => s.progress);

  // Nav-guard state: when a tryout is in-progress, clicks land here first
  // and trigger a confirm modal before we actually navigate.
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [navSaving, setNavSaving] = useState(false);

  const segment = pathname?.split("/")[1] || "";
  const currentPage = segment === "dashboard" ? "home" : segment;

  const pathFor = (id: string) =>
    id === "home" ? "/dashboard" : `/${id}`;

  const handleNav = (id: string) => {
    const path = pathFor(id);
    // Skip the guard when navigating to the same page the user is on —
    // avoids a confusing "are you sure you want to leave?" modal when
    // they just tap the active item.
    if (pathname === path) return;
    if (isGuarded) {
      setNavError(null);
      setPendingNavPath(path);
      return;
    }
    router.push(path);
  };

  const handleCancelNav = () => {
    if (navSaving) return;
    setPendingNavPath(null);
    setNavError(null);
  };

  const handleSaveAndLeave = async () => {
    if (!pendingNavPath) return;
    setNavSaving(true);
    setNavError(null);
    try {
      const save = useNavGuardStore.getState().save;
      if (save) await save();
      const dest = pendingNavPath;
      setPendingNavPath(null);
      router.push(dest);
    } catch (err) {
      setNavError(
        err instanceof Error ? err.message : "Gagal menyimpan, coba lagi.",
      );
    } finally {
      setNavSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    signOut({ callbackUrl: "/" });
  };

  const hasAvatarUrl = !!(user?.avatar && user.avatar.startsWith("http"));
  const userInitial = user?.name?.[0]?.toUpperCase() || "U";

  const primaryNav = navItems.slice(0, 4);
  const desktopNav = [navItems[0], navItems[1], navItems[3], navItems[4]];
  const accountItems = <>
    <Menu.Item className={menuItemClass} onClick={() => handleNav("profile")}><UserRound aria-hidden="true" />Profil Saya</Menu.Item>
    <Menu.Separator className="my-1 h-px bg-slate-100" />
    <Menu.Item className={menuItemClass + " text-red-600 data-highlighted:bg-red-50 data-highlighted:text-red-700"} onClick={handleLogout}><LogOut aria-hidden="true" />Keluar</Menu.Item>
  </>;
  const avatar = hasAvatarUrl ? <Image src={user!.avatar!} alt="" width={36} height={36} className="size-9 shrink-0 rounded-xl object-cover" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-sm font-bold text-brand">{userInitial}</span>;
  const navButtonClass = "h-11 rounded-xl px-3 font-medium text-slate-500 hover:bg-slate-50 hover:text-brand data-active:bg-primary data-active:font-semibold data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground";

  return (
    <>
      <Sidebar collapsible="icon" className="border-slate-200/70 [&_[data-slot=sidebar-inner]]:bg-white">
        <SidebarHeader className="gap-3 px-4 pb-5 pt-6 group-data-[collapsible=icon]:px-2">
          <button onClick={() => handleNav("home")} aria-label="FIX ASN — Dashboard" className="flex h-10 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <Image src="/logo_with_text.png" alt="FIX ASN" width={144} height={36} className="h-9 w-auto group-data-[collapsible=icon]:hidden" />
            <Image src="/logo_only.png" alt="" width={32} height={32} className="mx-auto hidden size-8 object-contain group-data-[collapsible=icon]:block" />
          </button>
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 group-data-[collapsible=icon]:hidden">RUANG BELAJAR</span>
            <SidebarTrigger aria-label="Buka atau ciutkan sidebar" className="text-slate-400 hover:text-brand" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Navigasi utama">
            <SidebarGroup>
              <SidebarGroupLabel>Belajar</SidebarGroupLabel>
              <SidebarMenu className="gap-1.5">
                {desktopNav.map(({ id, icon: Icon, label }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton tooltip={label} isActive={currentPage === id} aria-current={currentPage === id ? "page" : undefined} onClick={() => handleNav(id)} className={navButtonClass}>
                      <Icon aria-hidden="true" /><span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup className="mt-3">
              <SidebarGroupLabel>Paket</SidebarGroupLabel>
              <SidebarMenu><SidebarMenuItem>
                <SidebarMenuButton tooltip="Beli Paket" isActive={currentPage === "buy"} aria-current={currentPage === "buy" ? "page" : undefined} onClick={() => handleNav("buy")} className={navButtonClass}>
                  <ShoppingBag aria-hidden="true" /><span>Beli Paket</span>
                </SidebarMenuButton>
              </SidebarMenuItem></SidebarMenu>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-100 p-3 group-data-[collapsible=icon]:p-2">
          <SidebarMenu><SidebarMenuItem>
            <Menu.Root>
              <Menu.Trigger render={<SidebarMenuButton size="lg" />} aria-label={"Menu akun " + (user?.name || "Pengguna")} className="h-16 rounded-xl hover:bg-slate-50 data-popup-open:bg-slate-50 group-data-[collapsible=icon]:size-10!">
                {avatar}
                <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="block truncate text-sm font-semibold text-slate-800">{user?.name || "Pengguna"}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">{user?.email}</span>
                </span>
                <ChevronsUpDown aria-hidden="true" className="ml-auto text-slate-400 group-data-[collapsible=icon]:hidden" />
              </Menu.Trigger>
              <Menu.Portal><Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
                <Menu.Popup className="w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg outline-none">{accountItems}</Menu.Popup>
              </Menu.Positioner></Menu.Portal>
            </Menu.Root>
          </SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <nav data-ui="user-mobile-nav" aria-label="Navigasi mobile" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] z-40 mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_8px_32px_-8px_rgba(12,30,69,0.25)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {primaryNav.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => handleNav(id)} aria-label={label} aria-current={currentPage === id ? "page" : undefined} className={"flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand " + (currentPage === id ? "bg-primary text-primary-foreground" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")}>
              <Icon aria-hidden="true" className="size-5" strokeWidth={currentPage === id ? 2.25 : 1.75} />
              <span className="text-[9px] font-semibold sm:text-[10px]">{id === "tryout" ? "Tryout" : id === "video" ? "Video" : label}</span>
            </button>
          ))}
          <Menu.Root>
            <Menu.Trigger aria-label="Menu lainnya" className={"flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand data-popup-open:bg-primary data-popup-open:text-primary-foreground " + (["ranking", "profile"].includes(currentPage) ? "bg-primary text-primary-foreground" : "text-slate-400")}>
              <Ellipsis aria-hidden="true" className="size-5" /><span className="text-[9px] font-semibold sm:text-[10px]">Lainnya</span>
            </Menu.Trigger>
            <Menu.Portal><Menu.Positioner side="top" align="end" sideOffset={16} className="z-40 md:hidden">
              <Menu.Popup className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl outline-none">
                <div className="mb-2 flex items-center gap-3 border-b border-slate-100 p-2 pb-3">{avatar}<div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{user?.name || "Pengguna"}</div><div className="truncate text-xs text-slate-400">{user?.email}</div></div></div>
                <Menu.Item className={menuItemClass} onClick={() => handleNav("ranking")}><Trophy aria-hidden="true" />Ranking</Menu.Item>
                {accountItems}
              </Menu.Popup>
            </Menu.Positioner></Menu.Portal>
          </Menu.Root>
        </div>
      </nav>
      {/* ── Nav-guard confirmation modal ── */}
      <Modal
        open={!!pendingNavPath}
        onClose={handleCancelNav}
        title="Keluar dari Tryout?"
        width="min(95vw, 440px)"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Jawaban kamu yang belum tersimpan bisa hilang. Yakin ingin keluar
            ke halaman lain sekarang?
          </p>

          {navProgress && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Soal dijawab
                </div>
                <div className="font-black text-lg text-brand mt-0.5">
                  {navProgress.answered} / {navProgress.total}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Sisa waktu
                </div>
                <div className="font-black text-lg text-brand mt-0.5">
                  ⏱ {navProgress.timeLeftLabel}
                </div>
              </div>
            </div>
          )}

          {navError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {navError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelNav}
              disabled={navSaving}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSaveAndLeave}
              disabled={navSaving}
            >
              {navSaving ? "Menyimpan…" : "Simpan & Keluar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

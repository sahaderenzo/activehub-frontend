import type { ReactNode } from "react";
import { s } from "../lib/style";
import DashSidebar from "./DashSidebar";

interface DashLayoutProps {
  role: "instructor" | "admin";
  active: string;
  children: ReactNode;
}

/** Sidebar + main content shell shared by every Instructor/Admin screen. */
export default function DashLayout({ role, active, children }: DashLayoutProps) {
  return (
    <div className="ah-screen ah-dash-shell" style={s("min-height:100vh;background:#F4F7FA;display:flex;")}>
      <DashSidebar role={role} active={active} />
      <main className="ah-dash-main" style={s("flex:1;min-width:0;")}>
        {children}
      </main>
    </div>
  );
}

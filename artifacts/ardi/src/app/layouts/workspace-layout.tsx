import {
  AppSidebar,
  MobileAppHeader,
  MobileBottomNav,
} from "@/components/app-sidebar";
import { WorkflowChrome } from "@/features/workflow/workflow-chrome";

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ardi-liquid-workspace dark flex h-dvh overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileAppHeader />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          <WorkflowChrome />
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

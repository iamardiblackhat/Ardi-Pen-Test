import { Router as WouterRouter } from "wouter";
import { AppProviders } from "@/app/providers/app-providers";
import { ArdiAssistantProvider } from "@/features/ardi/ardi-assistant-provider";
import { AppRouter } from "@/app/router/app-router";

export default function App() {
  return (
    <AppProviders>
      <div className="dark ardi-glass-root min-h-screen bg-background text-foreground">
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ArdiAssistantProvider>
            <AppRouter />
          </ArdiAssistantProvider>
        </WouterRouter>
      </div>
    </AppProviders>
  );
}

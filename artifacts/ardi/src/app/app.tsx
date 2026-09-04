import { Router as WouterRouter } from "wouter";
import { AppProviders } from "@/app/providers/app-providers";
import { AppRouter } from "@/app/router/app-router";

export default function App() {
  return (
    <AppProviders>
      <div className="dark min-h-screen bg-background text-foreground">
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
      </div>
    </AppProviders>
  );
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { Eye, X } from "lucide-react";
import { ArdiLauncher, ArdiPanel } from "@/components/ardi-panel";
import { auth } from "@/lib/auth";
const DISPLAY_KEY = "ardi-assistant-display";
const AssistantContext = createContext<{
  setOpen: (open: boolean) => void;
} | null>(null);
export function useArdiAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("ARDI assistant provider is missing.");
  return value;
}
export function ArdiAssistantProvider({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISPLAY_KEY) === "hidden";
    } catch {
      return false;
    }
  });
  const authenticated = auth.isAuthenticated();
  const publicPath = [
    "/",
    "/capabilities",
    "/security",
    "/intelligence",
    "/login",
    "/register",
    "/terms",
    "/privacy",
    "/cookies",
    "/faq",
  ].includes(path);
  function display(value: boolean) {
    setHidden(value);
    try {
      localStorage.setItem(DISPLAY_KEY, value ? "hidden" : "visible");
    } catch {
      /* Display still works without storage. */
    }
  }
  function show(value: boolean) {
    if (value) display(false);
    setOpen(value);
  }
  useEffect(() => setOpen(false), [authenticated, path]);
  return (
    <AssistantContext.Provider value={{ setOpen: show }}>
      {children}
      {!open && (
        <div
          className={`ardi-mascot-dock ${publicPath ? "" : "ardi-mascot-dock-workspace"}`}
        >
          {hidden ? (
            <button
              className="ardi-mascot-restore"
              onClick={() => display(false)}
              aria-label="Show ARDI mascot"
            >
              <Eye size={16} /> ARDI
            </button>
          ) : (
            <>
              <ArdiLauncher
                onClick={() => show(true)}
                className="ardi-mascot-launcher"
              />
              <button
                className="ardi-mascot-hide"
                onClick={() => display(true)}
                aria-label="Hide ARDI mascot"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}
      <ArdiPanel
        key={authenticated ? "workspace" : "public"}
        open={open}
        onClose={() => setOpen(false)}
        authenticated={authenticated}
        context={`Current ARDI route: ${path}. Use only confirmed account evidence for account claims. Navigation is not permission to run a test.`}
      />
    </AssistantContext.Provider>
  );
}

import { useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAssetsQueryKey,
  getGetScansQueryKey,
  useCreateAsset,
  useCreateScan,
  useStartScan,
  type AssetInputType,
} from "@workspace/api-client-react";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { OnboardingRunning } from "@/features/onboarding/components/onboarding-running";
import { OnboardingScopeForm } from "@/features/onboarding/components/onboarding-scope-form";
import { OnboardingStart } from "@/features/onboarding/components/onboarding-start";
import { OnboardingWelcome } from "@/features/onboarding/components/onboarding-welcome";
import { backendError } from "@/lib/api-error";
import { routes } from "@/shared/config/routes";

const panelClass =
  "rounded-2xl border border-violet-300/20 bg-[#17113a]/90 p-5 shadow-[0_24px_80px_rgba(4,7,28,0.55)] backdrop-blur sm:p-8";
const primaryButtonClass =
  "min-h-11 bg-gradient-to-r from-blue-500 to-violet-500 px-6 text-sm font-bold text-white shadow-[0_0_24px_rgba(112,132,255,0.3)] hover:from-blue-400 hover:to-violet-400";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createAsset = useCreateAsset();
  const createScan = useCreateScan();
  const startScan = useStartScan();
  const [step, setStep] = useState(1);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<AssetInputType>("web_app");
  const [assetTarget, setAssetTarget] = useState("");
  const [assetId, setAssetId] = useState<number | null>(null);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [startedScanId, setStartedScanId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const pending =
    createAsset.isPending || createScan.isPending || startScan.isPending;

  async function addTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const asset = await createAsset.mutateAsync({
        data: {
          name: assetName.trim(),
          type: assetType,
          target: assetTarget.trim(),
          authorizationConfirmed: true,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      setAssetId(asset.id);
      setStep(3);
    } catch (requestError) {
      setError(backendError(requestError, "The target could not be added."));
    }
  }

  async function startPenTest() {
    if (!assetId) return;
    setError("");
    try {
      const created = await createScan.mutateAsync({
        data: { name: "Initial authorised Pen Test", type: "web_app", assetId },
      });
      const started = await startScan.mutateAsync({ id: created.id });
      await queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
      setStartedScanId(started.id);
      setStep(4);
    } catch (requestError) {
      setError(
        backendError(requestError, "The Pen Test could not be started."),
      );
    }
  }

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-[#080b21] px-4 py-8 text-white sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_5%,rgba(75,137,255,0.28),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(151,103,255,0.24),transparent_28%),linear-gradient(rgba(105,137,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(105,137,255,0.06)_1px,transparent_1px)] bg-[size:auto,auto,24px_24px,24px_24px]" />
      <div className="relative mx-auto w-full max-w-4xl">
        <header className="mb-7 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/30 bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_30px_rgba(93,146,255,0.35)]">
            <Shield className="h-8 w-8 text-white" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-cyan-200">
              ARDI SEC
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">
              Set up authorised testing
            </h1>
          </div>
        </header>
        <OnboardingProgress step={step} />
        {step === 1 ? (
          <OnboardingWelcome
            panelClass={panelClass}
            primaryButtonClass={primaryButtonClass}
            onContinue={() => setStep(2)}
          />
        ) : null}
        {step === 2 ? (
          <OnboardingScopeForm
            assetName={assetName}
            assetTarget={assetTarget}
            assetType={assetType}
            error={error}
            panelClass={panelClass}
            pending={createAsset.isPending}
            primaryButtonClass={primaryButtonClass}
            scopeConfirmed={scopeConfirmed}
            onAssetNameChange={setAssetName}
            onAssetTargetChange={setAssetTarget}
            onAssetTypeChange={setAssetType}
            onBack={() => setStep(1)}
            onScopeConfirmedChange={setScopeConfirmed}
            onSubmit={addTarget}
          />
        ) : null}
        {step === 3 ? (
          <OnboardingStart
            error={error}
            panelClass={panelClass}
            pending={pending}
            primaryButtonClass={primaryButtonClass}
            onBack={() => setStep(2)}
            onStart={() => void startPenTest()}
          />
        ) : null}
        {step === 4 ? (
          <OnboardingRunning
            panelClass={panelClass}
            primaryButtonClass={primaryButtonClass}
            onOpen={() =>
              navigate(
                startedScanId ? routes.scan(startedScanId) : routes.scans,
              )
            }
          />
        ) : null}
      </div>
    </main>
  );
}

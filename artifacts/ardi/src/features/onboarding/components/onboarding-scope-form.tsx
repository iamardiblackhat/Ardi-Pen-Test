import type { FormEvent } from "react";
import { Server } from "lucide-react";
import type { AssetInputType } from "@workspace/api-client-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";
import { Input } from "@workspace/ardi-ds/components/ui/input";
import { Label } from "@workspace/ardi-ds/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ardi-ds/components/ui/select";

type Props = {
  assetName: string;
  assetTarget: string;
  assetType: AssetInputType;
  error: string;
  panelClass: string;
  pending: boolean;
  primaryButtonClass: string;
  scopeConfirmed: boolean;
  onAssetNameChange: (value: string) => void;
  onAssetTargetChange: (value: string) => void;
  onAssetTypeChange: (value: AssetInputType) => void;
  onBack: () => void;
  onScopeConfirmedChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function OnboardingScopeForm(props: Props) {
  return (
    <form className={`space-y-5 ${props.panelClass}`} onSubmit={props.onSubmit}>
      <div>
        <Server className="mb-3 h-8 w-8 text-cyan-200" aria-hidden="true" />
        <h2 className="text-2xl font-bold sm:text-3xl">
          Add an authorised target
        </h2>
        <p className="mt-3 text-base leading-7 text-indigo-100/70">
          Choose what is being assessed—not a vendor or integration.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-name" className="text-sm text-indigo-50">
          Target name
        </Label>
        <Input
          id="onboarding-name"
          required
          value={props.assetName}
          onChange={(event) => props.onAssetNameChange(event.target.value)}
          placeholder="Production web app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-type" className="text-sm text-indigo-50">
          Target type
        </Label>
        <Select
          value={props.assetType}
          onValueChange={(value) =>
            props.onAssetTypeChange(value as AssetInputType)
          }
        >
          <SelectTrigger id="onboarding-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="web_app">Web application</SelectItem>
            <SelectItem value="api">API service</SelectItem>
            <SelectItem value="network">Network or host</SelectItem>
            <SelectItem value="mobile">Mobile application</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-target" className="text-sm text-indigo-50">
          URL, hostname, or IP address
        </Label>
        <Input
          id="onboarding-target"
          required
          value={props.assetTarget}
          onChange={(event) => props.onAssetTargetChange(event.target.value)}
          placeholder="https://app.example.com"
        />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-base leading-6">
        <input
          type="checkbox"
          checked={props.scopeConfirmed}
          onChange={(event) =>
            props.onScopeConfirmedChange(event.target.checked)
          }
          className="mt-1 h-5 w-5 accent-cyan-300"
        />
        <span>
          I own this target or have explicit permission to add it to the
          approved testing scope.
        </span>
      </label>
      {props.error ? (
        <p role="alert" className="text-sm text-red-300">
          {props.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={props.onBack}>
          Back
        </Button>
        <Button
          type="submit"
          disabled={
            !props.assetName.trim() ||
            !props.assetTarget.trim() ||
            !props.scopeConfirmed ||
            props.pending
          }
          className={props.primaryButtonClass}
        >
          {props.pending ? "Adding target…" : "Add target"}
        </Button>
      </div>
    </form>
  );
}

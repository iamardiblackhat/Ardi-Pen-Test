import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAssetsQueryKey,
  useCreateAsset,
  type AssetInputType,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ardi-ds/components/ui/dialog";
import { Input } from "@workspace/ardi-ds/components/ui/input";
import { Label } from "@workspace/ardi-ds/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ardi-ds/components/ui/select";
import { useToast } from "@workspace/ardi-ds/hooks/use-toast";
import { backendError } from "@/lib/api-error";

type CreateAssetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAssetDialog({
  open,
  onOpenChange,
}: CreateAssetDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createAsset = useCreateAsset();
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetInputType>("web_app");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [scopeConfirmed, setScopeConfirmed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createAsset.mutateAsync({
        data: {
          name: name.trim(),
          type,
          target: target.trim(),
          description: description.trim(),
          authorizationConfirmed: true,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      toast({
        title: "Target authorised",
        description: `${name.trim()} is now available for Pen Testing.`,
      });
      setName("");
      setTarget("");
      setDescription("");
      setScopeConfirmed(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Target could not be added",
        description: backendError(error, "Check the target and try again."),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="glow-primary">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add authorised target
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an authorised target</DialogTitle>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="asset-name">Name</Label>
            <Input
              id="asset-name"
              required
              placeholder="Production API"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as AssetInputType)}
            >
              <SelectTrigger id="asset-type">
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
            <Label htmlFor="asset-target">Target URL or IP address</Label>
            <Input
              id="asset-target"
              required
              placeholder="https://api.example.com"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="asset-description"
              placeholder="Customer-facing REST API"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm leading-6">
            <input
              type="checkbox"
              checked={scopeConfirmed}
              onChange={(event) => setScopeConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              I own this target or have explicit permission to add it to the
              approved testing scope.
            </span>
          </label>
          <Button
            type="submit"
            disabled={
              !name.trim() ||
              !target.trim() ||
              !scopeConfirmed ||
              createAsset.isPending
            }
            className="min-h-12 w-full glow-primary"
          >
            {createAsset.isPending ? "Adding target…" : "Add authorised target"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

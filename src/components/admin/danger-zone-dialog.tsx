"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface DangerZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "clear_orders" | "clear_inventory_logs" | "factory_reset";
  title: string;
  description: string;
  onComplete: () => void;
}

export function DangerZoneDialog({
  open,
  onOpenChange,
  action,
  title,
  description,
  onComplete,
}: DangerZoneDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (confirmation !== "DELETE") {
      toast({ title: 'Type "DELETE" to confirm', variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    setLoading(true);
    const res = await adminFetch("/api/danger-zone", {
      method: "POST",
      body: JSON.stringify({ action, password, confirmation: "DELETE" }),
    });
    setLoading(false);

    if (res.success) {
      toast({ title: (res.data as { message: string })?.message || "Done" });
      setPassword("");
      setConfirmation("");
      onOpenChange(false);
      onComplete();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dz-password">Admin Password</Label>
            <Input
              id="dz-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dz-confirm">Type DELETE to confirm</Label>
            <Input
              id="dz-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="bg-white/5 font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

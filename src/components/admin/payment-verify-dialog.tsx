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
import { Textarea } from "@/components/ui/textarea";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  order: {
    orderNumber: string;
    customerName: string | null;
    grandTotal: number;
  } | null;
}

interface PaymentVerifyDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function PaymentVerifyDialog({
  payment,
  open,
  onOpenChange,
  onVerified,
}: PaymentVerifyDialogProps) {
  const [upiReference, setUpiReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async (action: "verify" | "reject") => {
    if (!payment) return;
    if (action === "verify" && !upiReference.trim()) {
      toast({ title: "UTR/Reference required", variant: "destructive" });
      return;
    }
    if (action === "reject" && !rejectionReason.trim()) {
      toast({ title: "Rejection reason required", variant: "destructive" });
      return;
    }

    setLoading(true);
    const res = await adminFetch(`/api/payments/${payment.id}/verify`, {
      method: "POST",
      body: JSON.stringify({ action, upiReference, rejectionReason, notes }),
    });
    setLoading(false);

    if (res.success) {
      toast({ title: res.data ? (res.data as { message: string }).message : "Updated" });
      onOpenChange(false);
      setUpiReference("");
      setRejectionReason("");
      setNotes("");
      onVerified();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify UPI Payment</DialogTitle>
          <DialogDescription>
            Order {payment?.order?.orderNumber} — {formatCurrency(payment?.amount || 0)}
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white/5 p-3 text-sm">
              <p><span className="text-muted-foreground">Customer:</span> {payment.order?.customerName || "N/A"}</p>
              <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(payment.amount)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiReference">UTR / Reference Number</Label>
              <Input
                id="upiReference"
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
                placeholder="Enter UTR from payment app"
                className="bg-white/5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
              <Input
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white/5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white/5"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={() => handleAction("reject")} disabled={loading}>
            Reject
          </Button>
          <Button onClick={() => handleAction("verify")} disabled={loading}>
            Verify Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Database, FileX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DangerZoneDialog } from "@/components/admin/danger-zone-dialog";

type DangerAction = "clear_orders" | "clear_inventory_logs" | "factory_reset";

interface DangerItem {
  action: DangerAction;
  title: string;
  description: string;
  icon: React.ElementType;
}

const dangerItems: DangerItem[] = [
  {
    action: "clear_orders",
    title: "Clear All Orders",
    description: "Permanently delete all orders, payments, and invoices. Products and inventory will remain intact.",
    icon: FileX,
  },
  {
    action: "clear_inventory_logs",
    title: "Clear Inventory Logs",
    description: "Delete all inventory activity logs. Current stock levels will not be affected.",
    icon: Database,
  },
  {
    action: "factory_reset",
    title: "Factory Reset",
    description: "Delete all orders, invoices, reviews, wishlists, and import logs. Products and inventory remain. This cannot be undone.",
    icon: Trash2,
  },
];

export default function DangerZonePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DangerItem | null>(null);

  const openDialog = (item: DangerItem) => {
    setSelectedAction(item);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-destructive">
          <AlertTriangle className="h-8 w-8" />
          Danger Zone
        </h1>
        <p className="text-muted-foreground">
          Protected operations that require password confirmation. Proceed with extreme caution.
        </p>
      </div>

      <div className="space-y-4">
        {dangerItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.action} className="glass-card border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Icon className="h-5 w-5" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => openDialog(item)}
                >
                  {item.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedAction && (
        <DangerZoneDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          action={selectedAction.action}
          title={selectedAction.title}
          description={selectedAction.description}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}

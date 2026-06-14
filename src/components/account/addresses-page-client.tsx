"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema } from "@/lib/validations";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, MapPin } from "lucide-react";
import type { AddressData } from "@/lib/types";

type AddressForm = z.infer<typeof addressSchema>;

export function AddressesPageClient() {
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: "Home", country: "India", isDefault: false },
  });

  const loadAddresses = () => {
    fetch("/api/customer/addresses")
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const onSubmit = async (data: AddressForm) => {
    try {
      const res = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: "Address added" });
      reset();
      setShowForm(false);
      loadAddresses();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to add address",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/customer/addresses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: "Address deleted" });
      loadAddresses();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Add Address
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...register("fullName")} />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address Line 1</Label>
            <Input {...register("line1")} />
          </div>
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input {...register("line2")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input {...register("pincode")} />
            </div>
          </div>
          <Button type="submit">Save Address</Button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : addresses.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No saved addresses</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addr.label}</span>
                    {addr.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {addr.fullName}<br />
                    {addr.line1}<br />
                    {addr.line2 && <>{addr.line2}<br /></>}
                    {addr.city}, {addr.state} {addr.pincode}<br />
                    {addr.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(addr.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type CheckoutInput } from "@/lib/validations";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = addressSchema;
type AddressFormData = z.infer<typeof formSchema>;

interface AddressFormProps {
  defaultValues?: Partial<AddressFormData>;
  onChange?: (data: CheckoutInput["shippingAddress"]) => void;
}

export function AddressForm({ defaultValues, onChange }: AddressFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "Home",
      country: "India",
      isDefault: false,
      ...defaultValues,
    },
  });

  const values = watch();
  if (onChange) {
    const subscription = watch((data) => {
      if (data.fullName && data.phone && data.line1 && data.city && data.state && data.pincode) {
        onChange(data as CheckoutInput["shippingAddress"]);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="line1">Address Line 1</Label>
        <Input id="line1" {...register("line1")} />
        {errors.line1 && (
          <p className="text-xs text-destructive">{errors.line1.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="line2">Address Line 2 (Optional)</Label>
        <Input id="line2" {...register("line2")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
          {errors.city && (
            <p className="text-xs text-destructive">{errors.city.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
          {errors.state && (
            <p className="text-xs text-destructive">{errors.state.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" {...register("pincode")} />
          {errors.pincode && (
            <p className="text-xs text-destructive">{errors.pincode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Label</Label>
        <Select
          value={values.label}
          onValueChange={(v) => setValue("label", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Home">Home</SelectItem>
            <SelectItem value="Work">Work</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isDefault"
          checked={values.isDefault}
          onCheckedChange={(c) => setValue("isDefault", !!c)}
        />
        <Label htmlFor="isDefault" className="text-sm font-normal">
          Save as default address
        </Label>
      </div>
    </div>
  );
}

export type { AddressFormData };

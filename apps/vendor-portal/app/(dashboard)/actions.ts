"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateDeliveryStatus(formData: FormData) {
  const poId = String(formData.get("poId"));
  const status = String(formData.get("status"));
  const committedDeliveryDate = formData.get("committedDeliveryDate");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: status as "acknowledged" | "on-track" | "delivered",
      committed_delivery_date: committedDeliveryDate ? String(committedDeliveryDate) : undefined,
    })
    .eq("id", poId);

  if (error) throw error;
  revalidatePath("/");
}

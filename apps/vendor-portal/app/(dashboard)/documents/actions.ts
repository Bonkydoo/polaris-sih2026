"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File;
  const documentType = String(formData.get("documentType"));
  const purchaseOrderId = formData.get("purchaseOrderId");
  if (!file || file.size === 0) throw new Error("No file selected");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase.from("profiles").select("vendor_id").eq("id", user.id).single();
  if (!profile?.vendor_id) throw new Error("No vendor record for this account");

  // Path prefix must be the vendor's own id — the storage.objects RLS
  // policies (see supabase/migrations/20260917100001_vendor_documents.sql)
  // check exactly this, so a path outside it would just be rejected by
  // Storage regardless of what this action tries to do.
  const path = `${profile.vendor_id}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("vendor-documents").upload(path, file);
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("compliance_documents").insert({
    vendor_id: profile.vendor_id,
    purchase_order_id: purchaseOrderId ? String(purchaseOrderId) : null,
    document_type: documentType as "customs" | "msds" | "quality_cert" | "other",
    file_name: file.name,
    storage_path: path,
    uploaded_by: user.id,
  });
  if (insertError) throw insertError;

  revalidatePath("/documents");
}

export async function deleteDocument(formData: FormData) {
  const id = String(formData.get("id"));
  const storagePath = String(formData.get("storagePath"));

  const supabase = await createServerSupabaseClient();
  await supabase.storage.from("vendor-documents").remove([storagePath]);
  const { error } = await supabase.from("compliance_documents").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/documents");
}

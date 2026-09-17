import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getDocuments() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("compliance_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (!data) return [];

  // Signed URLs, not public ones — the bucket is private (see the
  // migration). Each URL is short-lived; generated fresh per page load
  // rather than stored, so there's nothing long-lived to leak.
  const withUrls = await Promise.all(
    data.map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from("vendor-documents")
        .createSignedUrl(doc.storage_path, 60 * 10);
      return { ...doc, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return withUrls;
}

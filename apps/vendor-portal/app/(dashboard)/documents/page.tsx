import { FileText, Trash2, ExternalLink } from "lucide-react";
import { getDocuments } from "@/lib/data/documents";
import { UploadForm } from "./upload-form";
import { deleteDocument } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  customs: "Customs",
  msds: "MSDS",
  quality_cert: "Quality Certificate",
  other: "Other",
};

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">Compliance</div>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">Documents</h1>
      </div>

      <UploadForm />

      <div className="mt-6 space-y-2">
        {documents.length === 0 ? (
          <p className="text-sm text-foreground-subtle">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-foreground-subtle" />
                <div>
                  <div className="text-sm font-medium text-foreground">{doc.file_name}</div>
                  <div className="text-xs text-foreground-subtle">
                    {TYPE_LABELS[doc.document_type]} · {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.signedUrl && (
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-accent-ink hover:underline"
                  >
                    View <ExternalLink className="size-3" />
                  </a>
                )}
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="storagePath" value={doc.storage_path} />
                  <button type="submit" className="text-foreground-subtle hover:text-critical">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { toast } from "sonner";

export function exportLogbookToPDF(companyName: string, entries: any[]) {
  // Create a printable HTML
  const printWindow = window.open("", "", "width=800,height=600");
  if (!printWindow) {
    toast.error("Could not open print window");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${companyName} - Logbook Entries</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1a1a2e; margin-bottom: 5px; }
          .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          .entry { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
          .entry-date { font-weight: bold; color: #0B5ED7; }
          .entry-activities { margin-top: 10px; color: #333; }
          .entry-skills { margin-top: 8px; color: #666; font-size: 0.9em; }
          .entry-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-top: 8px; }
          .status-approved { background-color: #d4edda; color: #155724; }
          .status-submitted { background-color: #d1ecf1; color: #0c5460; }
          .status-draft { background-color: #e2e3e5; color: #383d41; }
          .status-revision { background-color: #fff3cd; color: #856404; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${companyName}</h1>
        <div class="meta">
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p>Total Entries: ${entries.length}</p>
          <p>Approved: ${entries.filter((e) => e.status === "approved").length}</p>
        </div>
        ${
          entries.length > 0
            ? entries
                .map(
                  (entry) => `
            <div class="entry">
              <div class="entry-date">${new Date(entry.entry_date).toLocaleDateString()}</div>
              <div class="entry-activities"><strong>Activities:</strong> ${entry.activities_description || "—"}</div>
              ${entry.skills_learned ? `<div class="entry-skills"><strong>Skills:</strong> ${entry.skills_learned}</div>` : ""}
              <div class="entry-status status-${entry.status}">${entry.status.replace(/_/g, " ").toUpperCase()}</div>
            </div>
          `
                )
                .join("")
            : "<p>No logbook entries found.</p>"
        }
      </body>
    </html>
  `;

  if (printWindow.document) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }
}

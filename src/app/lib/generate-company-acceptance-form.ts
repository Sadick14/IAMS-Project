export interface CompanyAcceptanceFormData {
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  companyName: string;
  companyAddress?: string;
  startDate?: string;
  endDate?: string;
  universityName?: string;
}

function escapeHtml(value: any): string {
  // Force conversion to a string safely
  const str = value !== null && value !== undefined ? String(value) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayValue(value: any, fallback = "____________________"): string {
  // 1. If it's null or undefined, return fallback immediately
  if (value === null || value === undefined) return fallback;

  // 2. If it's a nested object accidentally passed through, extract its name or stringify it
  if (typeof value === "object") {
    value = value.name || value.title || JSON.stringify(value);
  }

  // 3. Safely convert to string and trim
  const trimmed = String(value).trim();
  
  // 4. Return trimmed string if it has length, otherwise fallback
  return trimmed ? escapeHtml(trimmed) : fallback;
}



/**
 * Generate and open a print-ready company acceptance form in a new window/tab.
 * Returns true if the window opened successfully.
 */
export async function downloadCompanyAcceptanceFormPDF(data: CompanyAcceptanceFormData): Promise<boolean> {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Company Acceptance Form - ${escapeHtml(data.studentName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Garamond', 'Georgia', serif;
      line-height: 1.5;
      color: #222;
      background: white;
      padding: 0.5in;
    }
    @media print {
      body {
        margin: 0.5in;
        padding: 0;
        background: white;
      }
      .no-print {
        display: none !important;
      }
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      min-height: 11in;
      display: flex;
      flex-direction: column;
    }
    .letterhead {
      text-align: center;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 0.22in;
      margin-bottom: 0.28in;
    }
    .letterhead-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e3a5f;
    }
    .letterhead-subtitle {
      font-size: 12px;
      color: #555;
      font-style: italic;
      margin-top: 0.04in;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 0.3in;
      font-size: 11px;
      margin-bottom: 0.22in;
    }
    h1 {
      text-align: center;
      font-size: 16px;
      text-transform: uppercase;
      margin-bottom: 0.24in;
      text-decoration: underline;
      color: #1e3a5f;
    }
    .section {
      margin-bottom: 0.25in;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e3a5f;
      border-bottom: 1px solid #9aa8b5;
      padding-bottom: 0.04in;
      margin-bottom: 0.12in;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.12in 0.3in;
    }
    .field {
      font-size: 12px;
      min-height: 0.28in;
      border-bottom: 1px solid #aaa;
      padding-bottom: 0.04in;
    }
    .field strong {
      display: inline-block;
      min-width: 1.35in;
      color: #333;
    }
    .statement {
      font-size: 12px;
      text-align: justify;
      margin: 0.2in 0;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5in;
      margin-top: 0.4in;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 0.06in;
      font-size: 11px;
      margin-top: 0.4in;
    }
    .note {
      font-size: 11px;
      color: #444;
      border: 1px solid #c9d3dc;
      background-color: #f8fafc;
      padding: 0.12in;
      margin-top: 0.3in;
      border-radius: 4px;
    }
    .print-button {
      display: block;
      margin: 0.2in auto 0.4in auto;
      padding: 0.15in 0.3in;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      text-align: center;
      max-width: 2.5in;
    }
    .print-button:hover {
      background: #152d4a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="letterhead">
      <div class="letterhead-title">${displayValue(data.universityName, "Ho Technical University")}</div>
      <div class="letterhead-subtitle">Department of Industrial Attachment & Mentoring</div>
    </div>

    <div class="meta">
      <div><strong>Date Issued:</strong> ${escapeHtml(dateStr)}</div>
      <div><strong>Form:</strong> Company Acceptance</div>
    </div>

    <h1>Company Acceptance Form</h1>

    <div class="section">
      <div class="section-title">Student Details</div>
      <div class="grid">
        <div class="field"><strong>Name:</strong> ${displayValue(data.studentName)}</div>
        <div class="field"><strong>Student ID:</strong> ${displayValue(data.studentId)}</div>
        <div class="field"><strong>Department:</strong> ${displayValue(data.department)}</div>
        <div class="field"><strong>Level:</strong> ${displayValue(data.level)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Company Details</div>
      <div class="grid">
        <div class="field"><strong>Company:</strong> ${displayValue(data.companyName)}</div>
        <div class="field"><strong>Department/Unit:</strong> ____________________</div>
        <div class="field"><strong>Address:</strong> ${displayValue(data.companyAddress)}</div>
        <div class="field"><strong>Phone/Email:</strong> ____________________</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Attachment Period</div>
      <div class="grid">
        <div class="field"><strong>Start Date:</strong> ${displayValue(data.startDate)}</div>
        <div class="field"><strong>End Date:</strong> ${displayValue(data.endDate)}</div>
      </div>
    </div>

    <p class="statement">
      We confirm that the company named above accepts the student for industrial attachment.
      The student will be assigned suitable duties and supervised during the stated period.
    </p>

    <div class="section">
      <div class="section-title">Industry Supervisor</div>
      <div class="grid">
        <div class="field"><strong>Name:</strong> ____________________</div>
        <div class="field"><strong>Job Title:</strong> ____________________</div>
        <div class="field"><strong>Email:</strong> ____________________</div>
        <div class="field"><strong>Phone:</strong> ____________________</div>
      </div>
    </div>

    <div class="signature-grid">
      <div class="signature-line">Industry Supervisor Signature / Date</div>
      <div class="signature-line">Company Stamp</div>
    </div>

    <div class="note">
      <strong>Note:</strong> After signing, the student should scan or photograph this form and upload it in the IAMS Documents page.
    </div>
  </div>
</body>
</html>
  `;

  // Open clean browser target layout context
  const win = window.open("", "_blank");
  if (!win) {
    console.error("Failed to open new window for company acceptance form");
    return false;
  }

  win.document.write(html);
  win.document.close();
  return true;
}
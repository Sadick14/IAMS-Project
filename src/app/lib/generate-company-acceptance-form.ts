import html2pdf from 'html2pdf.js';

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



function escapeHtml(value: string | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayValue(value: string | undefined, fallback = "____________________"): string {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : fallback;
}

/**
 * Generate the form HTML as a string.
 */
function generateFormHTML(data: CompanyAcceptanceFormData): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Company Acceptance Form</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Garamond', 'Georgia', serif;
      line-height: 1.45;
      color: #222;
      background: white;
      padding: 0.5in;
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      min-height: 11in;
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
      font-size: 15px;
      text-transform: uppercase;
      margin-bottom: 0.24in;
      text-decoration: underline;
    }
    .section {
      margin-bottom: 0.22in;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e3a5f;
      border-bottom: 1px solid #9aa8b5;
      padding-bottom: 0.04in;
      margin-bottom: 0.1in;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.1in 0.2in;
    }
    .field {
      font-size: 11px;
      min-height: 0.28in;
      border-bottom: 1px solid #999;
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
      margin: 0.15in 0;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35in;
      margin-top: 0.35in;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 0.05in;
      font-size: 11px;
    }
    .note {
      font-size: 10px;
      color: #555;
      border: 1px solid #c9d3dc;
      padding: 0.1in;
      margin-top: 0.18in;
    }
  </style>
</head>
<body>
  <div class="container">
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
      After signing, the student should scan or photograph this form and upload it in the IAMS Documents page.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate and directly download a PDF of the company acceptance form.
 * Returns true if PDF generation started successfully.
 */
export async function downloadCompanyAcceptanceFormPDF(data: CompanyAcceptanceFormData): Promise<boolean> {
  try {
    const html = generateFormHTML(data);
    // Create a temporary container and render the HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    const element = container.firstElementChild as HTMLElement;
    if (!element) {
      document.body.removeChild(container);
      throw new Error('Failed to create form element');
    }

    // Options for html2pdf (adjust as needed)

const opt: any = {
  margin: [0.5, 0.5, 0.5, 0.5],          // mutable tuple ✔
  filename: 'receipt.pdf',
  image: { type: 'jpeg', quality: 0.95 },
  html2canvas: { scale: 2, letterRendering: true },
  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
};

    await html2pdf().set(opt).from(element).save();

    // Clean up
    document.body.removeChild(container);
    return true;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return false;
  }
}
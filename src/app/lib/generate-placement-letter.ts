/**
 * Generate and open a print-ready placement letter for a student
 * Uses browser print dialog so user can save as PDF or print
 */

export interface PlacementLetterData {
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  program?: string;
  companyName: string;
  companyAddress?: string;
  companyContactPerson?: string;
  supervisorName?: string;
  termName?: string;
  startDate?: string;
  endDate?: string;
  dloName?: string;
  universityName?: string;
}

export function openPlacementLetter(data: PlacementLetterData): void {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const studentLevel = data.level || "Level 4";
  const supervisorLine = data.supervisorName
    ? `For queries, please contact ${data.supervisorName}, Department of ${data.department}.`
    : `For queries, please contact the Department of ${data.department}.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Placement Letter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Garamond', 'Georgia', serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 0.5in;
    }
    @media print {
      body {
        margin: 1in;
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
      height: 11in;
      display: flex;
      flex-direction: column;
    }
    .letterhead {
      text-align: center;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 0.3in;
      margin-bottom: 0.3in;
    }
    .letterhead-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 0.05in;
    }
    .letterhead-subtitle {
      font-size: 12px;
      color: #555;
      font-style: italic;
    }
    .date {
      text-align: right;
      font-size: 11px;
      margin-bottom: 0.3in;
      margin-top: 0.2in;
    }
    .recipient {
      font-size: 11px;
      margin-bottom: 0.2in;
    }
    .recipient-line {
      margin: 0.05in 0;
    }
    .salutation {
      margin: 0.2in 0;
      font-size: 12px;
    }
    .body {
      font-size: 12px;
      flex-grow: 1;
      margin-bottom: 0.3in;
    }
    .body p {
      margin-bottom: 0.15in;
      text-align: justify;
    }
    .body p:first-child {
      text-indent: 0.5in;
    }
    .signature-block {
      margin-top: 0.4in;
      font-size: 11px;
    }
    .signature-line {
      border-top: 1px solid #333;
      width: 2in;
      margin-top: 0.35in;
      margin-bottom: 0.05in;
      display: inline-block;
    }
    .signature-title {
      font-weight: bold;
      font-size: 11px;
    }
    .signature-subtitle {
      font-size: 10px;
      color: #666;
    }
    .closing {
      margin-bottom: 0.15in;
    }
    .print-button {
      display: block;
      margin: 0.3in 0;
      padding: 0.5in 1in;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .print-button:hover {
      background: #152d4a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center; margin-bottom: 0.3in;">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="letterhead">
      <div class="letterhead-title">Ho Technical University</div>
      <div class="letterhead-subtitle">Department of Industrial Attachment & Mentoring</div>
    </div>

    <div class="date">Date: ${dateStr}</div>

    <div class="recipient">
      <div class="recipient-line"><strong>TO: The Manager</strong></div>
      <div class="recipient-line">${data.companyName}</div>
      ${data.companyAddress ? `<div class="recipient-line">${data.companyAddress}</div>` : ""}
    </div>

    <div class="salutation">Dear Sir/Madam,</div>

    <div class="body">
      <p><strong>LETTER OF INTRODUCTION — INDUSTRIAL ATTACHMENT</strong></p>

      <p>
        We write to introduce <strong>${data.studentName}</strong> (Student ID: <strong>${data.studentId}</strong>),
        a ${studentLevel} student of the Department of <strong>${data.department}</strong>.
        This student is expected to undertake Industrial Attachment at your esteemed organisation
        ${data.startDate ? `from <strong>${data.startDate}</strong>` : ""}
        ${data.endDate ? `to <strong>${data.endDate}</strong>` : ""}
        as part of the academic programme.
      </p>

      <p>
        We kindly request that you extend to this student the necessary guidance and supervision
        during the attachment period. The student will contribute meaningfully to your operations
        whilst gaining invaluable practical experience in the profession.
      </p>

      <p>${supervisorLine}</p>
    </div>

    <div class="closing">Yours faithfully,</div>

    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-title">${data.dloName || "The Departmental Liaison Officer"}</div>
      <div class="signature-subtitle">Department of Industrial Attachment & Mentoring</div>
      <div class="signature-subtitle">${data.universityName || "Ho Technical University"}</div>
    </div>
  </div>
</body>
</html>
`;

  const win = window.open("", "_blank");
  if (!win) {
    console.error("Failed to open new window for placement letter");
    return;
  }
  win.document.write(html);
  win.document.close();
}

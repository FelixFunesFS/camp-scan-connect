import { jsPDF } from "jspdf";
import {
  ESIGN_NOTICE,
  WAIVER_ACKNOWLEDGEMENTS,
  WAIVER_SECTIONS,
  WAIVER_SUBTITLE,
  WAIVER_TITLE,
  WAIVER_VERSION,
} from "@/lib/waiverContent";

export interface WaiverReceiptInput {
  attendeeName: string;
  typedName: string;
  signedAt: string | Date;
  agreementVersion?: string;
  nameMatch?: boolean | null;
}

const MARGIN = 48;
const LINE = 14;

/** Renders one signed-waiver receipt onto an existing document. */
function renderReceipt(doc: jsPDF, input: WaiverReceiptInput) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - MARGIN * 2;
  let y = MARGIN;


  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const write = (
    text: string,
    { size = 10, style = "normal", gap = 6, indent = 0 } = {}
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width - indent) as string[];
    lines.forEach((line) => {
      ensureRoom(LINE);
      doc.text(line, MARGIN + indent, y);
      y += LINE;
    });
    y += gap;
  };

  const signedDate = new Date(input.signedAt);

  write(WAIVER_TITLE, { size: 16, style: "bold", gap: 2 });
  write(WAIVER_SUBTITLE, { size: 9, gap: 14 });

  // Signature block first — this is the part attendees care about.
  ensureRoom(96);
  doc.setDrawColor(180);
  doc.roundedRect(MARGIN, y - 10, width, 92, 6, 6);
  y += 10;
  write("Signature Receipt", { size: 12, style: "bold", gap: 4, indent: 12 });
  write(`Signed by: ${input.typedName}`, { indent: 12, gap: 2 });
  write(`Registered name: ${input.attendeeName}`, { indent: 12, gap: 2 });
  write(
    `Signed on: ${signedDate.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    })}`,
    { indent: 12, gap: 2 }
  );
  write(`Agreement version: ${input.agreementVersion || WAIVER_VERSION}`, {
    indent: 12,
    gap: 18,
  });

  write("Acknowledgements accepted", { size: 12, style: "bold", gap: 4 });
  WAIVER_ACKNOWLEDGEMENTS.forEach((ack) => {
    write(`- ${ack.label}`, { size: 9, gap: 2, indent: 12 });
  });
  y += 10;

  write("Full agreement", { size: 12, style: "bold", gap: 6 });
  WAIVER_SECTIONS.forEach((section) => {
    write(section.heading, { size: 10, style: "bold", gap: 2 });
    if (section.body) write(section.body, { size: 9, gap: 4 });
    section.bullets?.forEach((bullet) => {
      write(`- ${bullet}`, { size: 9, gap: 2, indent: 12 });
    });
    y += 6;
  });

  write(ESIGN_NOTICE, { size: 8, gap: 0 });

  return doc;
}

const slug = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "attendee";

/** Downloads the signed-waiver receipt PDF. */
export function downloadWaiverReceipt(input: WaiverReceiptInput) {
  const doc = buildWaiverReceipt(input);
  const date = new Date(input.signedAt).toISOString().slice(0, 10);
  doc.save(`waiver-${slug(input.attendeeName)}-${date}.pdf`);
}

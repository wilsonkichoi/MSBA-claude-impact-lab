import { NextResponse } from "next/server";
import { MAX_NOTICE_CHARS, MAX_UPLOAD_BYTES } from "@/lib/notice-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Extracts text from a text-based PDF in memory. Nothing is written to disk
 * or logged. Scanned/image-only PDFs return an explanatory error.
 */
export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File is larger than 5 MB." }, { status: 413 });
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: "Only PDF files are handled here." }, { status: 415 });

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Check the PDF magic number rather than trusting the extension.
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      return NextResponse.json({ error: "That file does not look like a PDF." }, { status: 415 });
    }
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const merged = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (!merged) {
      return NextResponse.json(
        { error: "No selectable text found. This may be a scanned PDF. Try pasting the text instead." },
        { status: 422 },
      );
    }
    return NextResponse.json({
      text: merged.slice(0, MAX_NOTICE_CHARS),
      totalPages,
      truncated: merged.length > MAX_NOTICE_CHARS,
    });
  } catch {
    return NextResponse.json({ error: "Could not read text from that PDF." }, { status: 422 });
  }
}

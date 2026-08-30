import { plainTextToHtml } from "./dataModel.js";

const chapterPattern = /^\s*(第[零〇一二三四五六七八九十百千0-9０-９]+[章回節卷][^\n]*|Chapter\s+\d+[^\n]*)\s*$/i;

export async function importNovelFile(file) {
  const extension = getExtension(file.name);

  if (extension === "txt") {
    return createNovelFromText(await file.text(), file.name);
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return createNovelFromText(result.value, file.name);
  }

  if (extension === "epub") {
    const { text, title } = await extractEpubText(await file.arrayBuffer());
    return createNovelFromText(text, file.name, title);
  }

  throw new Error("Unsupported novel format");
}

export async function createDocumentExport(document, format) {
  if (format === "docx") return createDocxExport(document);
  if (format === "epub") return createEpubExport(document);
  throw new Error("Unsupported export format");
}

function createNovelFromText(rawText, filename, suggestedTitle = "") {
  const text = normalizePlainText(rawText.replace(/^\uFEFF/, ""));
  if (!text) throw new Error("Empty document");

  const lines = text.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());
  const bookTitleMatch = lines[firstContentIndex]?.trim().match(/^《(.+)》$/);
  const fallbackTitle = filename.replace(/\.(txt|docx|epub)$/i, "").trim() || "匯入作品";
  const projectTitle = bookTitleMatch?.[1].trim() || suggestedTitle.trim() || fallbackTitle;
  const chapterStarts = lines
    .map((line, index) => (chapterPattern.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const timestamp = Date.now();
  const projectId = `project-import-${timestamp}`;

  const chapters = chapterStarts.length
    ? chapterStarts.map((start, index) => {
        const end = chapterStarts[index + 1] ?? lines.length;
        const chapterLines = lines.slice(start, end);
        if (index === 0) {
          const preamble = lines
            .slice(0, start)
            .filter((line, lineIndex) => !(bookTitleMatch && lineIndex === firstContentIndex))
            .join("\n")
            .trim();
          if (preamble) chapterLines.splice(1, 0, "", preamble);
        }
        return {
          title: lines[start].trim(),
          content: normalizePlainText(chapterLines.join("\n")),
        };
      })
    : [{ title: projectTitle, content: text }];

  const documents = chapters.map((chapter, index) => ({
    id: `doc-import-${timestamp}-${index + 1}`,
    projectId,
    title: chapter.title,
    kind: "小說",
    updatedAt: "剛剛",
    content: chapter.content,
    contentHtml: plainTextToHtml(chapter.content),
  }));

  return {
    project: {
      id: projectId,
      title: projectTitle,
      type: "小說",
      updatedAt: "剛剛",
      documentIds: documents.map((document) => document.id),
    },
    documents,
  };
}

async function extractEpubText(arrayBuffer) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(arrayBuffer);
  const containerXml = await readZipText(zip, "META-INF/container.xml");
  const container = parseXml(containerXml);
  const packagePath = container.querySelector("rootfile")?.getAttribute("full-path");
  if (!packagePath) throw new Error("Invalid EPUB container");

  const packageXml = await readZipText(zip, packagePath);
  const packageDocument = parseXml(packageXml);
  const packageDirectory = packagePath.includes("/") ? packagePath.slice(0, packagePath.lastIndexOf("/") + 1) : "";
  const manifest = new Map(
    [...packageDocument.querySelectorAll("manifest item")].map((item) => [
      item.getAttribute("id"),
      item.getAttribute("href"),
    ]),
  );
  const chapterPaths = [...packageDocument.querySelectorAll("spine itemref")]
    .map((item) => manifest.get(item.getAttribute("idref")))
    .filter(Boolean)
    .map((path) => resolveZipPath(packageDirectory, path));
  if (!chapterPaths.length) throw new Error("EPUB has no readable chapters");

  const chapterTexts = [];
  for (const path of chapterPaths) {
    const html = await readZipText(zip, path);
    chapterTexts.push(htmlToPlainText(html));
  }

  return {
    title: packageDocument.querySelector("metadata title, title")?.textContent?.trim() ?? "",
    text: chapterTexts.filter(Boolean).join("\n\n"),
  };
}

async function createDocxExport(document) {
  const { Document, HeadingLevel, Packer, Paragraph } = await import("docx");
  const lines = normalizePlainText(document.content ?? "").split("\n");
  const children = lines.map((line, index) => new Paragraph({
    text: line,
    ...(index === 0 && line.trim() ? { heading: HeadingLevel.HEADING_1 } : {}),
  }));
  const docxDocument = new Document({ sections: [{ children }] });
  return {
    blob: await Packer.toBlob(docxDocument),
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

async function createEpubExport(document) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const identifier = `urn:writenest:${Date.now()}`;
  const title = document.title || "WriteNest 文章";
  const paragraphs = normalizePlainText(document.content ?? "")
    .split(/\n{2,}/)
    .map((block, index) => index === 0
      ? `<h1>${escapeXml(block).replace(/\n/g, "<br/>")}</h1>`
      : `<p>${escapeXml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${identifier}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>zh-Hant</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`);
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>目錄</title></head><body>
<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol><li><a href="chapter.xhtml">${escapeXml(title)}</a></li></ol></nav>
</body></html>`);
  zip.file("OEBPS/chapter.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(title)}</title></head><body>${paragraphs}</body></html>`);

  return {
    blob: await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" }),
    mimeType: "application/epub+zip",
  };
}

function htmlToPlainText(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const blocks = [...document.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote,li")]
    .map((element) => element.textContent.trim())
    .filter(Boolean);
  return normalizePlainText(blocks.length ? blocks.join("\n\n") : document.body.textContent);
}

function parseXml(xml) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("Invalid XML");
  return document;
}

async function readZipText(zip, path) {
  const file = zip.file(path);
  if (!file) throw new Error(`Missing archive entry: ${path}`);
  return file.async("text");
}

function resolveZipPath(directory, path) {
  const parts = `${directory}${decodeURIComponent(path)}`.split("/");
  const resolved = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  });
  return resolved.join("/");
}

function normalizePlainText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getExtension(filename) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

import PDFDocument from 'pdfkit';

type PDFPage = { dictionary: { data: Record<string, unknown> } };

type TaggedPDFDocument = Omit<InstanceType<typeof PDFDocument>, 'struct' | 'addStructure'> & {
  page: PDFPage;
  struct: (type: string, children?: PDFStructureElementChild[]) => PDFStructureElement;
  addStructure: (el: PDFStructureElement) => void;
};

type PDFStructureElementChild = PDFStructureElement | (() => void);

type PDFStructureElement = {
  add: (child: PDFStructureElementChild) => PDFStructureElement;
  setParent: (el: PDFStructureElement) => void;
  setAttached: () => void;
  end: () => void;
};

/**
 * Builds accessible (PDF/UA-compliant) PDFs using PDFKit's tagged PDF support.
 *
 * Usage:
 *   const builder = new RequetePdfBuilder('Mon titre');
 *   builder.h1('Mon titre').section('Section 1').field('Champ', 'valeur');
 *   const buffer = await builder.toBuffer();
 */
export class RequetePdfBuilder {
  private readonly doc: TaggedPDFDocument;
  private readonly docElement: PDFStructureElement;
  private currentSection: PDFStructureElement | null = null;

  constructor(title: string) {
    this.doc = new PDFDocument({
      tagged: true,
      lang: 'fr-FR',
      displayTitle: true,
      info: { Title: title, Creator: 'Sirena' },
      margin: 40,
      size: 'A4',
    }) as unknown as TaggedPDFDocument;

    this.docElement = this.doc.struct('Document');
    this.doc.addStructure(this.docElement);

    // Fix tab order: /Tabs /S ensures tab order follows the structure tree (PDF/UA requirement).
    const setTabOrder = () => {
      this.doc.page.dictionary.data.Tabs = 'S';
    };
    setTabOrder();
    this.doc.on('pageAdded', setTabOrder);

    // Inject PDF/UA-1 identifier in XMP metadata (ISO 14289-1 requirement).
    this.injectPdfUaXmp(title);
  }

  private injectPdfUaXmp(title: string): void {
    const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${title}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <pdfuaid:part>1</pdfuaid:part>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

    const metadataStream = (
      this.doc as unknown as {
        ref: (data: Record<string, unknown>) => unknown;
        _root: { data: Record<string, unknown> };
      }
    ).ref({
      Type: 'Metadata',
      Subtype: 'XML',
      Length: Buffer.byteLength(xmp, 'utf8'),
    });

    (
      metadataStream as unknown as {
        write: (s: string) => void;
        end: () => void;
      }
    ).write(xmp);
    (
      metadataStream as unknown as {
        write: (s: string) => void;
        end: () => void;
      }
    ).end();

    (this.doc as unknown as { _root: { data: Record<string, unknown> } })._root.data.Metadata = metadataStream;
  }

  private get current(): PDFStructureElement {
    return this.currentSection ?? this.docElement;
  }

  h1(text: string): this {
    this.docElement.add(
      this.doc.struct('H1', [
        () => {
          this.doc.fontSize(16).font('Helvetica-Bold').text(text, { align: 'center' });
          this.doc.moveDown(0.4);
        },
      ]),
    );
    return this;
  }

  section(title: string): this {
    this.currentSection?.end();
    const sect = this.doc.struct('Sect');
    this.docElement.add(sect);
    this.currentSection = sect;

    sect.add(
      this.doc.struct('H2', [
        () => {
          this.doc.moveDown(0.5).fontSize(13).font('Helvetica-Bold').text(title);
          this.doc
            .moveTo(this.doc.page.margins.left, this.doc.y)
            .lineTo(this.doc.page.width - this.doc.page.margins.right, this.doc.y)
            .stroke();
          this.doc.moveDown(0.3);
        },
      ]),
    );
    return this;
  }

  subsection(title: string): this {
    this.current.add(
      this.doc.struct('H3', [
        () => {
          this.doc.moveDown(0.3).fontSize(11).font('Helvetica-Bold').text(title);
          this.doc.moveDown(0.2);
        },
      ]),
    );
    return this;
  }

  field(label: string, value: string | null | undefined): this {
    if (!value?.trim()) return this;
    this.current.add(
      this.doc.struct('P', [
        () => {
          this.doc.fontSize(10).font('Helvetica-Bold').text(`${label} : `, { continued: true });
          this.doc.font('Helvetica').text(value);
        },
      ]),
    );
    return this;
  }

  list(items: string[]): this {
    if (items.length === 0) return this;

    const list = this.doc.struct('L');
    this.current.add(list);

    for (const item of items) {
      const li = this.doc.struct('LI');
      list.add(li);
      li.add(
        this.doc.struct('LBody', [
          () => {
            this.doc.fontSize(10).font('Helvetica').text(`• ${item}`);
          },
        ]),
      );
      li.end();
    }

    list.end();
    return this;
  }

  toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);

      this.currentSection?.end();
      this.docElement.end();
      this.doc.end();
    });
  }
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROBOTO_REGULAR = path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf');
const ROBOTO_BOLD = path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf');

type PDFPage = { dictionary: { data: Record<string, unknown> } };

type TaggedPDFDocument = Omit<InstanceType<typeof PDFDocument>, 'struct' | 'addStructure'> & {
  page: PDFPage;
  struct: (type: string, children?: PDFStructureElementChild[]) => PDFStructureElement;
  addStructure: (el: PDFStructureElement) => void;
  markContent: (tag: string, options?: Record<string, unknown>) => void;
  endMarkedContent: () => void;
  registerFont: (name: string, src: string) => TaggedPDFDocument;
};

type PDFStructureElementChild = PDFStructureElement | (() => void);

type PDFStructureElement = {
  add: (child: PDFStructureElementChild) => PDFStructureElement;
  setParent: (el: PDFStructureElement) => void;
  setAttached: () => void;
  end: () => void;
};

type DocWithRef = {
  ref: (data: Record<string, unknown>) => unknown;
  _root: { data: Record<string, unknown> };
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
      info: { Title: title, Creator: 'Sirena', Author: 'Sirena' },
      margin: 40,
      size: 'A4',
    }) as unknown as TaggedPDFDocument;

    this.doc.registerFont('Roboto', ROBOTO_REGULAR);
    this.doc.registerFont('Roboto-Bold', ROBOTO_BOLD);

    this.docElement = this.doc.struct('Document');
    this.doc.addStructure(this.docElement);

    const roleMapRef = (this.doc as unknown as DocWithRef).ref({
      Type: 'RoleMap',
      Sect: 'Sect',
      H1: 'H1',
      H2: 'H2',
      H3: 'H3',
      P: 'P',
      L: 'L',
      LI: 'LI',
      Lbl: 'Lbl',
      LBody: 'LBody',
      Artifact: 'Artifact',
    });
    (roleMapRef as unknown as { end: () => void }).end();
    (this.doc as unknown as DocWithRef)._root.data.RoleMap = roleMapRef;

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
      <dc:language><rdf:Seq><rdf:li>fr-FR</rdf:li></rdf:Seq></dc:language>
      <dc:creator><rdf:Seq><rdf:li>SIRENA</rdf:li></rdf:Seq></dc:creator>
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
          this.doc.fontSize(16).font('Roboto-Bold').text(text, { align: 'center' });
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
          this.doc.moveDown(0.5).fontSize(13).font('Roboto-Bold').text(title);
          this.doc.markContent('Artifact', { type: 'Layout' });
          this.doc
            .moveTo(this.doc.page.margins.left, this.doc.y)
            .lineTo(this.doc.page.width - this.doc.page.margins.right, this.doc.y)
            .stroke();
          this.doc.endMarkedContent();
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
          this.doc.moveDown(0.3).fontSize(11).font('Roboto-Bold').text(title);
          this.doc.moveDown(0.2);
        },
      ]),
    );
    return this;
  }

  paragraph(text: string, options?: { bold?: boolean }): this {
    this.current.add(
      this.doc.struct('P', [
        () => {
          this.doc
            .fontSize(12)
            .font(options?.bold ? 'Roboto-Bold' : 'Roboto')
            .text(text);
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
          this.doc.fontSize(12).font('Roboto-Bold').text(`${label} : `, { continued: true });
          this.doc.font('Roboto').text(value);
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
        this.doc.struct('Lbl', [
          () => {
            this.doc.fontSize(12).font('Roboto').text('• ', { continued: true });
          },
        ]),
      );
      li.add(
        this.doc.struct('LBody', [
          () => {
            this.doc.fontSize(12).font('Roboto').text(item);
          },
        ]),
      );
      li.end();
    }

    list.end();
    return this;
  }

  groupedList(groups: { label: string; children: string[] }[]): this {
    if (groups.length === 0) return this;

    const list = this.doc.struct('L');
    this.current.add(list);

    for (const group of groups) {
      const li = this.doc.struct('LI');
      list.add(li);
      li.add(
        this.doc.struct('Lbl', [
          () => {
            this.doc.fontSize(12).font('Roboto').text('• ', { continued: true });
          },
        ]),
      );
      li.add(
        this.doc.struct('LBody', [
          () => {
            this.doc.fontSize(12).font('Roboto').text(group.label);
          },
        ]),
      );

      if (group.children.length > 0) {
        const subList = this.doc.struct('L');
        li.add(subList);

        for (const child of group.children) {
          const subLi = this.doc.struct('LI');
          subList.add(subLi);
          subLi.add(
            this.doc.struct('Lbl', [
              () => {
                this.doc.fontSize(12).font('Roboto').text('  - ', { continued: true });
              },
            ]),
          );
          subLi.add(
            this.doc.struct('LBody', [
              () => {
                this.doc.fontSize(12).font('Roboto').text(child);
              },
            ]),
          );
          subLi.end();
        }

        subList.end();
      }

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

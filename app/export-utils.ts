function bitsFor(character: string) {
  return character.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number);
}

export type ExportLayout = 'worksheet' | 'coded';
export type ExportRepresentation = 'bulbs' | 'digits';
export type AsciiTablePosition = 'none' | 'first' | 'last';

const asciiEntries: Array<[number, string]> = [
  [32, 'SPACE'], [33, '!'], [46, '.'], [63, '?'],
  ...Array.from({ length: 10 }, (_, index) => [48 + index, String(index)] as [number, string]),
  ...Array.from({ length: 26 }, (_, index) => [65 + index, String.fromCharCode(65 + index)] as [number, string]),
];

function latexEscape(value: string) {
  return value.replace(/[\\#$%&_{}~^]/g, (character) => ({
    '\\': '\\textbackslash{}', '#': '\\#', '$': '\\$', '%': '\\%', '&': '\\&',
    '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  })[character] ?? character);
}

function latexAsciiReference(pageBreakBefore = true) {
  const columns = Array.from({ length: 4 }, (_, column) => asciiEntries.slice(column * 10, column * 10 + 10));
  const rows = Array.from({ length: 10 }, (_, row) => columns.map((column) => {
    const entry = column[row];
    return entry ? `\\textbf{${entry[1]}} & ${entry[0]} & \\texttt{${entry[0].toString(2).padStart(8, '0')}}` : ' & & ';
  }).join(' & ')).join(' \\\\\n');
  return `
${pageBreakBefore ? '\\par\\newpage' : ''}
\\textbf{ASCII Reference}\\hfill {\\color{gray!65}\\footnotesize Prepared by Dr. Simonas Čepėnas}

\\medskip
{\\tiny The characters used in this activity, with decimal values and 8-bit binary codes.}

\\medskip
\\begin{center}
\\renewcommand{\\arraystretch}{1.16}
\\setlength{\\fboxsep}{7pt}
\\setlength{\\fboxrule}{0.7pt}
{\\tiny\\fbox{\\begin{tabular}{@{}rcl@{\\hspace{1em}}rcl@{\\hspace{1em}}rcl@{\\hspace{1em}}rcl@{}}
{\\color{gray!70}\\textbf{CHAR}} & {\\color{gray!70}\\textbf{DEC}} & {\\color{gray!70}\\textbf{BINARY}} & {\\color{gray!70}\\textbf{CHAR}} & {\\color{gray!70}\\textbf{DEC}} & {\\color{gray!70}\\textbf{BINARY}} & {\\color{gray!70}\\textbf{CHAR}} & {\\color{gray!70}\\textbf{DEC}} & {\\color{gray!70}\\textbf{BINARY}} & {\\color{gray!70}\\textbf{CHAR}} & {\\color{gray!70}\\textbf{DEC}} & {\\color{gray!70}\\textbf{BINARY}} \\\\[0.15em]
${rows}
\\end{tabular}}}
\\end{center}
`;
}

function createCodedLatex(text: string, title: string, asciiTablePosition: AsciiTablePosition, representation: ExportRepresentation) {
  const message = [...text].map((character) => {
    if (character === ' ') return '\\hspace{1.2em}\\allowbreak ';
    const bits = bitsFor(character);
    return representation === 'bulbs'
      ? `\\ByteInline{${bits.join('}{')}}\\hspace{0.08em}\\allowbreak `
      : `\\texttt{\\textbf{${bits.join('')}}}\\hspace{0.35em}\\allowbreak `;
  }).join('');

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\setlength{\\parindent}{0pt}
\\newcommand{\\BulbOff}{%
  \\filldraw[fill=white,draw=black,line width=1.2pt] (0,0) circle (1);
  \\fill[gray!55] (-0.28,-1.00) rectangle (0.28,-1.28);
  \\fill[gray!75] (-0.60,-1.28) rectangle (0.60,-1.80);
  \\draw (-0.60,-1.45)--(0.60,-1.45); \\draw (-0.60,-1.60)--(0.60,-1.60); \\draw (-0.60,-1.75)--(0.60,-1.75);
  \\draw[gray!60,line width=1.1pt] (-0.45,-0.20)--(-0.15,0.10)--(0.15,-0.20)--(0.45,0.10);
}
\\newcommand{\\BulbOn}{%
  \\filldraw[fill=yellow!80!white,draw=black,line width=1.2pt] (0,0) circle (1);
  \\foreach \\a in {0,30,...,330}{\\draw[yellow!90!black,line width=1.6pt] (\\a:1.2)--(\\a:1.7);}
  \\fill[gray!55] (-0.28,-1.00) rectangle (0.28,-1.28);
  \\fill[gray!75] (-0.60,-1.28) rectangle (0.60,-1.80);
  \\draw (-0.60,-1.45)--(0.60,-1.45); \\draw (-0.60,-1.60)--(0.60,-1.60); \\draw (-0.60,-1.75)--(0.60,-1.75);
  \\draw[orange!90!black,line width=1.4pt] (-0.45,-0.20)--(-0.15,0.10)--(0.15,-0.20)--(0.45,0.10);
}
\\newcommand{\\PlaceTinyBulb}[2]{\\begin{scope}[xshift=#1 cm,scale=0.045]\\ifnum#2=1\\BulbOn\\else\\BulbOff\\fi\\end{scope}}
\\newcommand{\\ByteInline}[8]{\\begin{tikzpicture}[baseline=-0.35ex]\\PlaceTinyBulb{0}{#1}\\PlaceTinyBulb{0.12}{#2}\\PlaceTinyBulb{0.24}{#3}\\PlaceTinyBulb{0.36}{#4}\\PlaceTinyBulb{0.48}{#5}\\PlaceTinyBulb{0.60}{#6}\\PlaceTinyBulb{0.72}{#7}\\PlaceTinyBulb{0.84}{#8}\\end{tikzpicture}}
\\begin{document}
${asciiTablePosition === 'first' ? `${latexAsciiReference(false)}
\\newpage` : ''}
\\textbf{${latexEscape(title)}}\\hfill {\\color{gray!65}\\footnotesize Prepared by Dr. Simonas Čepėnas}

\\medskip
{\\tiny ${representation === 'bulbs' ? 'Yellow is ON (1); white is OFF (0). Each compact group of eight bulbs is one ASCII character.' : 'Each compact group of eight binary digits is one ASCII character.'}}

\\bigskip
\\raggedright
\\setlength{\\lineskip}{4pt}
${message}
${asciiTablePosition === 'last' ? latexAsciiReference() : ''}
\\end{document}
`;
}

export function createLatexWorksheet(text: string, layout: ExportLayout = 'worksheet', title = 'Binary Code', asciiTablePosition: AsciiTablePosition = 'none', representation: ExportRepresentation = 'bulbs') {
  if (layout === 'coded') return createCodedLatex(text, title.trim() || 'Binary Code', asciiTablePosition, representation);
  const rows = [...text].map((character, index) => {
    const bits = bitsFor(character);
    return representation === 'bulbs'
      ? `\\textbf{${index + 1}:} \\quad \\ByteRow{${bits.join('}{')}} & Binary: \\rule{0.62\\linewidth}{0.5pt}\\\\[-0.25em]\n& Decimal: \\rule{0.58\\linewidth}{0.5pt}\\\\[-0.25em]\n& ASCII character: \\rule{0.48\\linewidth}{0.5pt}\\\\[0.2em]`
      : `\\textbf{${index + 1}:} \\quad \\fbox{\\strut\\texttt{\\textbf{${bits.join('')}}}} & Decimal: \\rule{0.58\\linewidth}{0.5pt}\\\\[-0.1em]\n& ASCII character: \\rule{0.48\\linewidth}{0.5pt}\\\\[1em]`;
  }).join('\n');

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage{longtable}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\setlength{\\parindent}{0pt}

\\newcommand{\\BulbOff}{%
  \\filldraw[fill=white,draw=black,line width=1.2pt] (0,0) circle (1);
  \\fill[gray!55] (-0.28,-1.00) rectangle (0.28,-1.28);
  \\fill[gray!75] (-0.60,-1.28) rectangle (0.60,-1.80);
  \\draw (-0.60,-1.45)--(0.60,-1.45); \\draw (-0.60,-1.60)--(0.60,-1.60); \\draw (-0.60,-1.75)--(0.60,-1.75);
  \\draw[gray!60,line width=1.1pt] (-0.45,-0.20)--(-0.15,0.10)--(0.15,-0.20)--(0.45,0.10);
  \\draw[gray!60] (-0.45,-0.20)..controls(-0.60,-0.40)and(-0.60,-0.70)..(-0.28,-1.00);
  \\draw[gray!60] (0.45,0.10)..controls(0.60,-0.10)and(0.60,-0.70)..(0.28,-1.00);
}
\\newcommand{\\BulbOn}{%
  \\filldraw[fill=yellow!80!white,draw=black,line width=1.2pt] (0,0) circle (1);
  \\foreach \\a in {0,30,...,330}{\\draw[yellow!90!black,line width=1.6pt] (\\a:1.2)--(\\a:1.7);}
  \\fill[gray!55] (-0.28,-1.00) rectangle (0.28,-1.28);
  \\fill[gray!75] (-0.60,-1.28) rectangle (0.60,-1.80);
  \\draw (-0.60,-1.45)--(0.60,-1.45); \\draw (-0.60,-1.60)--(0.60,-1.60); \\draw (-0.60,-1.75)--(0.60,-1.75);
  \\draw[orange!90!black,line width=1.4pt] (-0.45,-0.20)--(-0.15,0.10)--(0.15,-0.20)--(0.45,0.10);
  \\draw[orange!90!black] (-0.45,-0.20)..controls(-0.60,-0.40)and(-0.60,-0.70)..(-0.28,-1.00);
  \\draw[orange!90!black] (0.45,0.10)..controls(0.60,-0.10)and(0.60,-0.70)..(0.28,-1.00);
  \\draw[white,line width=2pt] (-0.45,0.55) arc (140:40:0.40);
}
\\newcommand{\\PlaceBulb}[2]{\\begin{scope}[xshift=#1 cm,scale=0.30]\\ifnum#2=1\\BulbOn\\else\\BulbOff\\fi\\end{scope}}
\\newcommand{\\ByteRow}[8]{\\begin{tikzpicture}[baseline=-2pt]\\PlaceBulb{0}{#1}\\PlaceBulb{0.93}{#2}\\PlaceBulb{1.86}{#3}\\PlaceBulb{2.79}{#4}\\PlaceBulb{3.72}{#5}\\PlaceBulb{4.65}{#6}\\PlaceBulb{5.58}{#7}\\PlaceBulb{6.51}{#8}\\end{tikzpicture}}

\\begin{document}
${asciiTablePosition === 'first' ? `${latexAsciiReference(false)}
\\newpage` : ''}
{\\Large\\textbf{${latexEscape(title.trim() || 'Binary Code')}}}\\hfill {\\color{gray!65}\\footnotesize Prepared by Dr. Simonas Čepėnas}

\\medskip
${representation === 'bulbs' ? 'Yellow is ON (1); white is OFF (0). Read each byte from MSB to LSB, convert it to decimal, then use ASCII to reveal the message.' : 'Read each 8-bit byte from MSB to LSB, convert it to decimal, then use ASCII to reveal the message.'}

\\medskip
\\textbf{MSB $\\rightarrow$ LSB:} 128, 64, 32, 16, 8, 4, 2, 1

\\small
\\renewcommand{\\arraystretch}{1.35}
\\begin{longtable}{@{}p{0.58\\linewidth}p{0.40\\linewidth}@{}}
${rows}
\\end{longtable}

\\vfill
\\textbf{Hidden message:} \\rule{0.72\\linewidth}{0.8pt}
${asciiTablePosition === 'last' ? latexAsciiReference() : ''}
\\end{document}
`;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfText(value: string, x: number, y: number, size = 10, bold = false, mono = false, gray = 0) {
  return `${gray} ${gray} ${gray} rg BT /${mono ? 'F3' : bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`;
}

function circlePath(x: number, y: number, radius: number) {
  const k = radius * 0.5522848;
  return `${x + radius} ${y} m ${x + radius} ${y + k} ${x + k} ${y + radius} ${x} ${y + radius} c ${x - k} ${y + radius} ${x - radius} ${y + k} ${x - radius} ${y} c ${x - radius} ${y - k} ${x - k} ${y - radius} ${x} ${y - radius} c ${x + k} ${y - radius} ${x + radius} ${y - k} ${x + radius} ${y} c h`;
}

function pdfBulb(x: number, y: number, on: boolean) {
  let commands = '';
  if (on) {
    commands += '0.82 0.62 0 RG 1.1 w\n';
    for (let angle = 0; angle < 360; angle += 30) {
      const radians = angle * Math.PI / 180;
      commands += `${(x + Math.cos(radians) * 12).toFixed(2)} ${(y + Math.sin(radians) * 12).toFixed(2)} m ${(x + Math.cos(radians) * 17).toFixed(2)} ${(y + Math.sin(radians) * 17).toFixed(2)} l S\n`;
    }
  }
  commands += `${on ? '1 0.88 0.22' : '1 1 1'} rg 0 0 0 RG 1 w ${circlePath(x, y, 9)} B\n`;
  commands += `${on ? '0.72 0.34 0' : '0.55 0.55 0.55'} RG 0.9 w ${x - 4} ${y - 2} m ${x - 1.5} ${y + 1} l ${x + 1.5} ${y - 2} l ${x + 4} ${y + 1} l S\n`;
  commands += `${x - 4} ${y - 2} m ${x - 2.5} ${y - 9} l ${x + 4} ${y + 1} m ${x + 2.5} ${y - 9} l S\n`;
  commands += `0.68 0.68 0.68 rg 0 0 0 RG 0.8 w ${x - 3} ${y - 12} 6 3 re B\n`;
  commands += `0.48 0.48 0.48 rg ${x - 6} ${y - 19} 12 7 re B\n`;
  commands += `${x - 6} ${y - 15} m ${x + 6} ${y - 15} l S ${x - 6} ${y - 17} m ${x + 6} ${y - 17} l S\n`;
  if (on) commands += `1 1 1 RG 1.2 w ${x - 4} ${y + 4} m ${x} ${y + 7} l ${x + 4} ${y + 4} l S\n`;
  return commands;
}

function pdfMicroBulb(x: number, y: number, on: boolean) {
  let commands = '';
  if (on) {
    commands += '0.82 0.62 0 RG 0.35 w\n';
    for (let angle = 0; angle < 360; angle += 30) {
      const radians = angle * Math.PI / 180;
      commands += `${(x + Math.cos(radians) * 2).toFixed(2)} ${(y + Math.sin(radians) * 2).toFixed(2)} m ${(x + Math.cos(radians) * 2.8).toFixed(2)} ${(y + Math.sin(radians) * 2.8).toFixed(2)} l S\n`;
    }
  }
  commands += `${on ? '1 0.88 0.22' : '1 1 1'} rg 0 0 0 RG 0.35 w ${circlePath(x, y, 1.5)} B\n`;
  commands += `0.68 0.68 0.68 rg ${x - 0.5} ${y - 2} 1 0.6 re B 0.48 0.48 0.48 rg ${x - 1} ${y - 3.1} 2 1.1 re B\n`;
  return commands;
}

function pageStream(characters: string[], pageIndex: number, representation: ExportRepresentation, title: string) {
  let stream = pdfText(title.slice(0, 52), 40, 805, 17, true);
  stream += pdfAuthorName(446, 805, 7);
  stream += pdfText(representation === 'bulbs' ? 'Yellow = ON (1)   White = OFF (0)   Read each byte from MSB to LSB.' : 'Read each 8-bit binary byte from MSB to LSB.', 40, 783, 9);
  stream += pdfText('Place values: 128   64   32   16   8   4   2   1', 40, 766, 9, true);
  characters.forEach((character, row) => {
    const y = 718 - row * 72;
    stream += pdfText(String(pageIndex * 9 + row + 1) + '.', 42, y - 2, 10, true);
    if (representation === 'bulbs') {
      bitsFor(character).forEach((bit, index) => { stream += pdfBulb(70 + index * 31, y, Boolean(bit)); });
      stream += pdfText('Binary: __________________', 335, y + 13, 8);
      stream += pdfText('Decimal: ________________', 335, y - 1, 8);
      stream += pdfText('ASCII: ___________________', 335, y - 15, 8);
    } else {
      stream += pdfText(bitsFor(character).join(''), 70, y - 4, 18, false, true);
      stream += pdfText('Decimal: ________________', 335, y + 7, 8);
      stream += pdfText('ASCII: ___________________', 335, y - 8, 8);
    }
  });
  stream += pdfText('Hidden message: _______________________________________________', 40, 44, 10, true);
  return stream;
}

function pdfAuthorName(x: number, y: number, size = 9) {
  let commands = pdfText('Prepared by Dr. Simonas Cepenas', x, y, size, false, false, 0.48);
  const scale = size / 9;
  const prefixWidth = 52.6 * scale;
  const caronX = x + prefixWidth + 55 * scale;
  const accentY = y + 10 * scale;
  const dotX = x + prefixWidth + 70.5 * scale;
  commands += `0.48 0.48 0.48 RG 0.7 w ${caronX - 2 * scale} ${accentY + 1.2 * scale} m ${caronX} ${accentY - 0.8 * scale} l ${caronX + 2 * scale} ${accentY + 1.2 * scale} l S\n`;
  commands += `0.48 0.48 0.48 rg ${dotX - 0.75 * scale} ${accentY + 0.4 * scale} ${1.5 * scale} ${1.5 * scale} re f\n`;
  return commands;
}

function codedPageStreams(text: string, title: string, representation: ExportRepresentation) {
  const streams: string[] = [];
  let stream = '';
  let x = 40;
  let y = 760;
  const byteWidth = representation === 'bulbs' ? 29 : 45;
  const wordGap = 12;
  const lineHeight = 18;
  const startPage = () => {
    stream = pdfText(title.slice(0, 52), 40, 805, 12, true);
    stream += pdfAuthorName(446, 805, 7);
    stream += pdfText(representation === 'bulbs' ? 'Yellow is ON (1); white is OFF (0). Each compact group of eight bulbs is one ASCII character.' : 'Each compact group of eight binary digits is one ASCII character.', 40, 784, 7);
    x = 40; y = 750;
  };
  const finishPage = () => { streams.push(stream); startPage(); };
  startPage();
  const words = text.trim().split(/ +/).filter(Boolean);
  words.forEach((word, wordIndex) => {
    const wordWidth = [...word].length * byteWidth;
    if (x > 40 && x + Math.min(wordWidth, 515) > 555) { x = 40; y -= lineHeight; }
    [...word].forEach((character) => {
      if (x + byteWidth > 555) { x = 40; y -= lineHeight; }
      if (y < 55) finishPage();
      if (representation === 'bulbs') bitsFor(character).forEach((bit, index) => { stream += pdfMicroBulb(x + 2 + index * 3.25, y, Boolean(bit)); });
      else stream += pdfText(bitsFor(character).join(''), x, y - 2, 8, false, true);
      x += byteWidth;
    });
    if (wordIndex < words.length - 1) x += wordGap;
  });
  streams.push(stream);
  return streams;
}

function asciiReferencePageStream() {
  let stream = pdfText('ASCII REFERENCE', 40, 805, 15, true);
  stream += pdfAuthorName(446, 805, 7);
  stream += pdfText('Characters used in this activity, with decimal values and 8-bit binary codes.', 40, 784, 7);
  stream += '0 0 0 RG 0.8 w 40 519 523 244 re S\n';
  const columns = Array.from({ length: 4 }, (_, column) => asciiEntries.slice(column * 10, column * 10 + 10));
  columns.forEach((column, columnIndex) => {
    const x = 40 + columnIndex * 135;
    stream += pdfText('CHAR', x + 5, 750, 7, true, false, 0.48);
    stream += pdfText('DEC', x + 39, 750, 7, true, false, 0.48);
    stream += pdfText('BINARY', x + 68, 750, 7, true, false, 0.48);
    stream += `0.72 0.74 0.78 RG 0.45 w ${x} 742 m ${x + 118} 742 l S\n`;
    column.forEach(([decimal, character], rowIndex) => {
      const y = 721 - rowIndex * 21;
      stream += pdfText(character, x + 5, y, 8, true);
      stream += pdfText(String(decimal), x + 39, y, 8, false, true, 0.35);
      stream += pdfText(decimal.toString(2).padStart(8, '0'), x + 68, y, 7);
    });
  });
  return stream;
}

export function createPdfWorksheet(text: string, layout: ExportLayout = 'worksheet', title = 'Binary Code', asciiTablePosition: AsciiTablePosition = 'none', representation: ExportRepresentation = 'bulbs') {
  const characters = [...text];
  const worksheetPageCount = Math.ceil(characters.length / 9);
  const pageStreams = layout === 'coded'
    ? codedPageStreams(text, title.trim() || 'Binary Code', representation)
    : Array.from({ length: worksheetPageCount }, (_, index) => pageStream(characters.slice(index * 9, index * 9 + 9), index, representation, title.trim() || 'Binary Code'));
  if (asciiTablePosition === 'first') pageStreams.unshift(asciiReferencePageStream());
  if (asciiTablePosition === 'last') pageStreams.push(asciiReferencePageStream());
  const objects: string[] = ['', '', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>'];
  const pageReferences: number[] = [];
  pageStreams.forEach((pageStreamContent, pageIndex) => {
    const stream = pageStreamContent + pdfText(`Page ${pageIndex + 1} of ${pageStreams.length}`, 500, 22, 8);
    const contentReference = objects.length;
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`);
    const pageReference = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentReference} 0 R >>`);
    pageReferences.push(pageReference);
  });
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Count ${pageReferences.length} /Kids [${pageReferences.map((reference) => `${reference} 0 R`).join(' ')}] >>`;

  let pdf = '%PDF-1.4\n%BinaryLightLab\n';
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = new TextEncoder().encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function saveDownload(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

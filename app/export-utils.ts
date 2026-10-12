function bitsFor(character: string) {
  return character.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number);
}

export type ExportLayout = 'worksheet' | 'coded';

function latexEscape(value: string) {
  return value.replace(/[\\#$%&_{}~^]/g, (character) => ({
    '\\': '\\textbackslash{}', '#': '\\#', '$': '\\$', '%': '\\%', '&': '\\&',
    '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  })[character] ?? character);
}

function createCodedLatex(text: string, title: string) {
  const message = [...text].map((character) => {
    if (character === ' ') return '\\hspace{1.2em}\\allowbreak ';
    return `\\ByteInline{${bitsFor(character).join('}{')}}\\hspace{0.08em}\\allowbreak `;
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
\\textbf{${latexEscape(title)}}\\hfill Dr. Simonas Čepėnas

\\medskip
{\\tiny Yellow is ON (1); white is OFF (0). Each compact group of eight bulbs is one ASCII character.}

\\bigskip
\\raggedright
\\setlength{\\lineskip}{4pt}
${message}
\\end{document}
`;
}

export function createLatexWorksheet(text: string, layout: ExportLayout = 'worksheet', title = 'Oscar Brown Jr., The Snake') {
  if (layout === 'coded') return createCodedLatex(text, title.trim() || 'Coded Binary Text');
  const rows = [...text].map((character, index) => {
    const bits = bitsFor(character).join('}{');
    return `\\textbf{${index + 1}:} \\quad \\ByteRow{${bits}} & Binary: \\rule{0.62\\linewidth}{0.5pt}\\\\[-0.25em]\n& Decimal: \\rule{0.58\\linewidth}{0.5pt}\\\\[-0.25em]\n& ASCII character: \\rule{0.48\\linewidth}{0.5pt}\\\\[0.2em]`;
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
{\\Large\\textbf{Binary Light Worksheet}}\\hfill Dr. Simonas Čepėnas

\\medskip
Yellow is ON (1); white is OFF (0). Read each byte from MSB to LSB, convert it to decimal, then use ASCII to reveal the message.

\\medskip
\\textbf{MSB $\\rightarrow$ LSB:} 128, 64, 32, 16, 8, 4, 2, 1

\\small
\\renewcommand{\\arraystretch}{1.35}
\\begin{longtable}{@{}p{0.58\\linewidth}p{0.40\\linewidth}@{}}
${rows}
\\end{longtable}

\\vfill
\\textbf{Hidden message:} \\rule{0.72\\linewidth}{0.8pt}
\\end{document}
`;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfText(value: string, x: number, y: number, size = 10, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`;
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

function pageStream(characters: string[], pageIndex: number, pageCount: number) {
  let stream = pdfText('BINARY LIGHT WORKSHEET', 40, 805, 17, true);
  stream += pdfText('Yellow = ON (1)   White = OFF (0)   Read each byte from MSB to LSB.', 40, 783, 9);
  stream += pdfText('Place values: 128   64   32   16   8   4   2   1', 40, 766, 9, true);
  characters.forEach((character, row) => {
    const y = 718 - row * 72;
    stream += pdfText(String(pageIndex * 9 + row + 1) + '.', 42, y - 2, 10, true);
    bitsFor(character).forEach((bit, index) => { stream += pdfBulb(70 + index * 31, y, Boolean(bit)); });
    stream += pdfText('Binary: __________________', 335, y + 13, 8);
    stream += pdfText('Decimal: ________________', 335, y - 1, 8);
    stream += pdfText('ASCII: ___________________', 335, y - 15, 8);
  });
  stream += pdfText('Hidden message: _______________________________________________', 40, 44, 10, true);
  stream += pdfText(`Page ${pageIndex + 1} of ${pageCount}`, 500, 22, 8);
  return stream;
}

function pdfAuthorName(x: number, y: number, size = 9) {
  let commands = pdfText('Dr. Simonas Cepenas', x, y, size);
  const scale = size / 9;
  const caronX = x + 55 * scale;
  const accentY = y + 10 * scale;
  const dotX = x + 70.5 * scale;
  commands += `0 0 0 RG 0.7 w ${caronX - 2 * scale} ${accentY + 1.2 * scale} m ${caronX} ${accentY - 0.8 * scale} l ${caronX + 2 * scale} ${accentY + 1.2 * scale} l S\n`;
  commands += `0 0 0 rg ${dotX - 0.75 * scale} ${accentY + 0.4 * scale} ${1.5 * scale} ${1.5 * scale} re f\n`;
  return commands;
}

function codedPageStreams(text: string, title: string) {
  const streams: string[] = [];
  let stream = '';
  let x = 40;
  let y = 760;
  const byteWidth = 29;
  const wordGap = 12;
  const lineHeight = 18;
  const startPage = () => {
    stream = pdfText(title.slice(0, 52), 40, 805, 12, true);
    stream += pdfAuthorName(466, 805, 9);
    stream += pdfText('Yellow is ON (1); white is OFF (0). Each compact group of eight bulbs is one ASCII character.', 40, 784, 7);
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
      bitsFor(character).forEach((bit, index) => { stream += pdfMicroBulb(x + 2 + index * 3.25, y, Boolean(bit)); });
      x += byteWidth;
    });
    if (wordIndex < words.length - 1) x += wordGap;
  });
  streams.push(stream);
  return streams;
}

export function createPdfWorksheet(text: string, layout: ExportLayout = 'worksheet', title = 'Oscar Brown Jr., The Snake') {
  const characters = [...text];
  const worksheetPageCount = Math.ceil(characters.length / 9);
  const pageStreams = layout === 'coded'
    ? codedPageStreams(text, title.trim() || 'Coded Binary Text')
    : Array.from({ length: worksheetPageCount }, (_, index) => pageStream(characters.slice(index * 9, index * 9 + 9), index, worksheetPageCount));
  const objects: string[] = ['', '', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageReferences: number[] = [];
  pageStreams.forEach((pageStreamContent, pageIndex) => {
    const stream = layout === 'coded' ? pageStreamContent + pdfText(`Page ${pageIndex + 1} of ${pageStreams.length}`, 500, 22, 8) : pageStreamContent;
    const contentReference = objects.length;
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`);
    const pageReference = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentReference} 0 R >>`);
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

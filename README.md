# Binary Light Lab

An interactive teaching website for learning binary numbers and decoding ASCII text with lightbulbs.

## Features

- Interactive 8-bit binary lesson
- Number, word, and sentence decoding tests
- Complete classroom sessions with student registration and teacher reports
- Text-to-binary lightbulb converter
- PDF and LaTeX worksheet generation
- Compact ASCII reference with selectable first- or last-page placement

## Live website

[Open Binary Light Lab](https://binary-light-lab.workspace-404564.chatgpt.site/)

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Run validation with:

```bash
npm run lint
npm run build
```

Classroom sessions and results use the D1 database binding declared in `.openai/hosting.json`.

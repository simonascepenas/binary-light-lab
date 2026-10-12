'use client';

import { FormEvent, Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { createLatexWorksheet, createPdfWorksheet, saveDownload, type ExportLayout, type ExportRepresentation } from './export-utils';

const weights = [128, 64, 32, 16, 8, 4, 2, 1];
const taskBank = {
  numbers: {
    1: [1, 3, 5, 8, 10],
    2: [13, 18, 27, 42, 57, 64, 73, 99],
    3: [128, 130, 149, 170, 191, 200, 219, 240, 254, 255],
  },
  words: {
    1: ['AI', 'BIT', 'BYTE', 'DATA', 'CODE'],
    2: ['MODEL', 'INPUT', 'OUTPUT', 'SIGNAL', 'BINARY', 'PIXEL', 'LOGIC', 'LEARN'],
    3: ['SCIENCE', 'MACHINE', 'NETWORK', 'PATTERN', 'COMPUTE', 'DIGITAL', 'ANALYZE', 'ALGORITHM', 'PREDICT', 'INTELLIGENCE'],
  },
  sentences: {
    1: ['HI.', 'I CODE.', 'AI USES DATA.', 'BITS ARE FUN.', 'READ THE LIGHTS.'],
    2: ['DATA HAS A STORY.', 'A BYTE HAS 8 BITS.', 'INPUT BECOMES OUTPUT.', 'BINARY USES 0 AND 1.', 'PIXELS MAKE AN IMAGE.', 'AI FINDS PATTERNS.', 'CODE GIVES INSTRUCTIONS.', 'EVERY BIT HAS A PLACE.'],
    3: ['COMPUTERS STORE NUMBERS.', 'ASCII TURNS NUMBERS INTO TEXT.', 'EACH BYTE HAS EIGHT SWITCHES.', 'DATA CAN REPRESENT A SIGNAL.', 'MODELS LEARN FROM EXAMPLES.', 'BINARY IS A BASE TWO SYSTEM.', 'AN ALGORITHM FOLLOWS STEPS.', 'COMPUTERS READ ON AND OFF.', 'DIGITAL IMAGES USE PIXELS.', 'SMALL BITS BUILD BIG IDEAS.'],
  },
} as const;

type TaskMode = keyof typeof taskBank;
type Result = { id: number; displayName: string; classCode: string; taskType: TaskMode; level: number; questionsTotal: number; score: number; accuracy: number; durationSeconds: number };

function toBits(value: number) { return value.toString(2).padStart(8, '0').split('').map(Number); }
function cleanText(value: string) { return [...value.toUpperCase()].map((character) => { if (/\s/.test(character)) return ' '; const code = character.codePointAt(0) ?? 63; return code >= 32 && code <= 126 ? character : '?'; }).join(''); }
function toBytes(text: string) { return [...text].map((character) => ({ character, value: character.charCodeAt(0), bits: toBits(character.charCodeAt(0)) })); }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function Bulb({ on, index, onToggle, compact = false, micro = false }: { on: boolean; index: number; onToggle?: () => void; compact?: boolean; micro?: boolean }) {
  const contents = <>
    {Array.from({ length: 12 }, (_, ray) => <span className={`ray ray-${ray + 1}`} key={ray} />)}
    <span className="bulb-glass"><span className="highlight" /><span className="filament"><i /><i /><i /></span></span>
    <span className="bulb-neck" /><span className="bulb-base"><i /><i /><i /></span>
    {!compact && !micro && <><strong>{on ? '1' : '0'}</strong><small>{weights[index]}</small></>}
  </>;
  if (!onToggle) return <span className={`bulb-button static ${on ? 'is-on' : ''} ${compact ? 'compact' : ''} ${micro ? 'micro' : ''}`} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`}>{contents}</span>;
  return <button className={`bulb-button ${on ? 'is-on' : ''}`} onClick={onToggle} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`} aria-pressed={on}>{contents}</button>;
}

function ByteDisplay({ value, compact = false, micro = false }: { value: number; compact?: boolean; micro?: boolean }) {
  return <span className={`bulb-row ${compact ? 'compact-row' : ''} ${micro ? 'micro-row' : ''}`}>{toBits(value).map((bit, index) => <Bulb key={`${value}-${index}`} on={Boolean(bit)} index={index} compact={compact} micro={micro} />)}</span>;
}

function AsciiTable() {
  const entries: Array<[number, string]> = [
    [32, 'SPACE'], [46, '.'],
    ...Array.from({ length: 10 }, (_, i) => [48 + i, String(i)] as [number, string]),
    ...Array.from({ length: 26 }, (_, i) => [65 + i, String.fromCharCode(65 + i)] as [number, string]),
  ];
  const columns = Array.from({ length: 4 }, (_, column) => entries.slice(column * 10, column * 10 + 10));
  return <div className="ascii-table-wrap"><table className="ascii-table"><caption>ASCII character, decimal value, and 8-bit binary code</caption><thead><tr>{columns.map((_, column) => <Fragment key={column}><th scope="col">CHAR</th><th scope="col">DEC</th><th scope="col">BINARY</th></Fragment>)}</tr></thead><tbody>{Array.from({ length: 10 }, (_, row) => <tr key={row}>{columns.map((column, columnIndex) => { const entry = column[row]; return entry ? <Fragment key={`${columnIndex}-${entry[0]}`}><th scope="row" className={entry[1].length > 1 ? 'word-symbol' : ''}>{entry[1]}</th><td>{entry[0]}</td><td><code>{toBits(entry[0]).join('')}</code></td></Fragment> : <Fragment key={`${columnIndex}-empty`}><td /><td /><td /></Fragment>; })}</tr>)}</tbody></table></div>;
}

export default function Home() {
  const [bits, setBits] = useState([false, true, false, false, true, false, false, false]);
  const [converterText, setConverterText] = useState('HELLO.');
  const [exportLayout, setExportLayout] = useState<ExportLayout>('worksheet');
  const [documentTitle, setDocumentTitle] = useState('Binary Code');
  const [includeAsciiTable, setIncludeAsciiTable] = useState(true);
  const [exportRepresentation, setExportRepresentation] = useState<ExportRepresentation>('bulbs');
  const [displayName, setDisplayName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [mode, setMode] = useState<TaskMode>('numbers');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Result[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [transitioning, setTransitioning] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredConverterText = useDeferredValue(converterText);
  const value = useMemo(() => bits.reduce((sum, bit, i) => sum + (bit ? weights[i] : 0), 0), [bits]);
  const tasks = taskBank[mode][level] as readonly (number | string)[];
  const current = tasks[question];
  const currentBytes = typeof current === 'number' ? [current] : toBytes(current).map((byte) => byte.value);
  const convertedBytes = toBytes(cleanText(deferredConverterText));
  const codedWords = cleanText(deferredConverterText).trim().split(/ +/).filter(Boolean);
  const accuracy = Math.round((tasks.length / (tasks.length + mistakes)) * 100);
  const exportText = cleanText(converterText);

  const exportName = exportLayout === 'worksheet' ? 'binary-light-worksheet' : 'binary-light-coded-text';
  const downloadLatex = () => saveDownload(createLatexWorksheet(exportText, exportLayout, documentTitle, includeAsciiTable, exportRepresentation), 'application/x-tex;charset=utf-8', `${exportName}.tex`);
  const downloadPdf = () => saveDownload(createPdfWorksheet(exportText, exportLayout, documentTitle, includeAsciiTable, exportRepresentation), 'application/pdf', `${exportName}.pdf`);

  const loadResults = async (filter = '') => {
    try { const response = await fetch(`/api/results${filter ? `?classCode=${encodeURIComponent(filter)}` : ''}`); const data = await response.json(); setLeaderboard(data.results ?? []); } catch { setLeaderboard([]); }
  };
  useEffect(() => {
    let cancelled = false;
    fetch('/api/results').then((response) => response.json()).then((data) => { if (!cancelled) setLeaderboard(data.results ?? []); }).catch(() => { if (!cancelled) setLeaderboard([]); });
    return () => { cancelled = true; if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, []);

  const resetTransition = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setTransitioning(false);
  };

  const startTest = (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    resetTransition(); setStarted(true); setFinished(false); setQuestion(0); setAnswer(''); setMistakes(0); setFeedback(''); setSaveStatus('idle'); setStartedAt(event.timeStamp);
  };

  const finishTest = async (completedAt: number) => {
    const elapsed = Math.max(1, Math.round((completedAt - startedAt) / 1000));
    const finalScore = Math.max(100, 1000 - elapsed - mistakes * 35);
    const finalAccuracy = Math.round((tasks.length / (tasks.length + mistakes)) * 100);
    setDuration(elapsed); setScore(finalScore); setFinished(true); setSaveStatus('saving');
    try {
      const response = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, classCode, taskType: mode, level, questionsTotal: tasks.length, score: finalScore, accuracy: finalAccuracy, durationSeconds: elapsed, mistakes }) });
      if (!response.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      await loadResults(classCode.trim());
    } catch { setSaveStatus('error'); }
  };

  const submitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    if (transitioning) return;
    const expected = String(current).toUpperCase().replace(/\s+/g, ' ').trim();
    const response = answer.toUpperCase().replace(/\s+/g, ' ').trim();
    if (response !== expected) {
      setMistakes((count) => count + 1);
      setFeedback(mode === 'numbers' ? 'Try again. Add the values below the yellow bulbs.' : 'Try again. Decode each byte, then use the ASCII table.');
      return;
    }
    setTransitioning(true); setFeedback('Correct.'); setAnswer('');
    if (question === tasks.length - 1) await finishTest(event.timeStamp);
    else advanceTimer.current = setTimeout(() => { setQuestion((currentQuestion) => currentQuestion + 1); setFeedback(''); setTransitioning(false); advanceTimer.current = null; }, 350);
  };

  const chooseMode = (nextMode: TaskMode) => { resetTransition(); setMode(nextMode); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };
  const chooseLevel = (nextLevel: 1 | 2 | 3) => { resetTransition(); setLevel(nextLevel); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Binary Light Lab home"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></a>
      <nav aria-label="Primary navigation"><a href="#learn">Learn</a><a href="#ascii">ASCII</a><a className="active" href="#tests">Tests</a><a href="#converter">Converter</a><a href="#results">Results</a><a href="#about">About</a></nav>
      <div className="course-chip">Dr. Simonas Čepėnas</div>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">BINARY, MADE VISIBLE</div><h1>Switch on.<br /><em>Decode.</em></h1>
      <p>Learn to read a byte, find its number, and turn binary into text.</p>
      <div className="hero-actions"><a className="primary-button" href="#learn">Start with one byte <span>↓</span></a></div>
      <div className="binary-ribbon" aria-hidden="true">0 1 0 0 1 0 0 0&nbsp;&nbsp;·&nbsp;&nbsp;64 + 8&nbsp;&nbsp;·&nbsp;&nbsp;72&nbsp;&nbsp;·&nbsp;&nbsp;H</div>
    </section>

    <section className="lesson-section" id="learn">
      <div className="section-heading"><div><span className="step-kicker">01 / LEARN</span><h2>Eight switches make one byte.</h2></div><p>White is OFF (0). Yellow is ON (1). Read from the most significant bit on the left to the least significant bit on the right.</p></div>
      <div className="lab-card">
        <div className="lab-topline"><div><span className="live-dot" /> TAP THE LAMPS</div><span>MSB <i>→</i> LSB</span></div>
        <div className="bulb-row">{bits.map((bit, index) => <Bulb key={weights[index]} on={bit} index={index} onToggle={() => setBits((currentBits) => currentBits.map((item, i) => i === index ? !item : item))} />)}</div>
        <div className="equation-row"><div><span>BINARY</span><strong>{bits.map((bit) => bit ? '1' : '0').join('')}</strong></div><span className="equals">=</span><div><span>DECIMAL</span><strong className="decimal-value">{value}</strong></div><div className="calculation">{bits.map((bit, i) => bit ? weights[i] : null).filter(Boolean).join(' + ') || '0'} = <b>{value}</b></div></div>
      </div>
      <div className="three-steps"><p><b>1.</b> Find every yellow bulb.</p><p><b>2.</b> Keep its place value.</p><p><b>3.</b> Add the values.</p></div>
    </section>

    <section className="ascii-section" id="ascii">
      <div className="section-heading"><div><span className="step-kicker">02 / LOOK UP</span><h2>The ASCII codebook.</h2></div><p>After finding the decimal number, match it to a character. Space and full stop are included for sentence tests.</p></div>
      <AsciiTable />
    </section>

    <section className="tests-section" id="tests">
      <div className="section-heading"><div><span className="step-kicker">03 / TEST</span><h2>Choose one task.</h2></div><p>Pick a task and a level, then decode each set of lamps.</p></div>
      <div className="task-tabs" role="group" aria-label="Test type">
        {(['numbers','words','sentences'] as TaskMode[]).map((task, index) => <button key={task} aria-pressed={mode === task} className={mode === task ? 'selected' : ''} onClick={() => chooseMode(task)}><span>0{index + 1}</span><strong>{task}</strong><small>{task === 'numbers' ? 'One byte → decimal' : task === 'words' ? 'Bytes → one word' : 'Bytes → one sentence'}</small></button>)}
      </div>
      <div className="level-bar"><span>LEVEL</span>{([1,2,3] as const).map((item) => <button key={item} className={level === item ? 'selected' : ''} onClick={() => chooseLevel(item)}>{item}<small>{taskBank[mode][item].length} questions</small></button>)}</div>

      {!started ? <form className="start-card" onSubmit={startTest}><div><span className="test-label">{mode.toUpperCase()} · LEVEL {level}</span><h3>{tasks.length} questions</h3><p>{mode === 'numbers' ? 'Decode each byte into a decimal number.' : mode === 'words' ? 'Decode every group of bytes into a word.' : 'Decode each line of bytes into a sentence.'}</p></div><label>Display name or initials<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="e.g. Ada L." required /></label><label>Class code <small>(optional)</small><input value={classCode} onChange={(e) => setClassCode(e.target.value)} maxLength={20} placeholder="e.g. AI-01" /></label><button className="yellow-button" type="submit">Start test →</button></form>
      : finished ? <div className="finish-card"><span className="trophy">✓</span><div><span className="step-kicker">TEST COMPLETE</span><h3>{mode} · level {level}</h3><p role="status">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Result saved.' : saveStatus === 'error' ? 'Result could not be saved.' : ''}</p></div><div className="finish-stat"><small>SCORE</small><strong>{score}</strong></div><div className="finish-stat"><small>ACCURACY</small><strong>{accuracy}%</strong></div><div className="finish-stat"><small>TIME</small><strong>{formatTime(duration)}</strong></div><button onClick={() => { resetTransition(); setStarted(false); }}>New test</button></div>
      : <div className="challenge-card">
        <div className="challenge-head"><div><span>QUESTION {question + 1} / {tasks.length}</span><strong>{mode.toUpperCase()} · LEVEL {level}</strong></div><div className="progress-track"><i style={{ width: `${(question / tasks.length) * 100}%` }} /></div><div><small>ERRORS</small><b>{mistakes}</b></div></div>
        <div tabIndex={0} aria-label="Scrollable encoded bytes" className={`challenge-bytes ${currentBytes.length > 7 ? 'sentence-bytes' : ''}`}>{currentBytes.map((byte, index) => <div className="byte-challenge" key={`${byte}-${index}`}><ByteDisplay value={byte} compact /><small>{typeof current === 'string' && current[index] === ' ' ? 'SPACE' : `BYTE ${index + 1}`}</small></div>)}</div>
        <form className="answer-form" onSubmit={submitAnswer}><label>{mode === 'numbers' ? 'Decimal number' : mode === 'words' ? 'Hidden word' : 'Hidden sentence'}<div><input disabled={transitioning} value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode={mode === 'numbers' ? 'numeric' : 'text'} autoFocus placeholder="Your answer" /><button disabled={transitioning} type="submit">Check</button></div></label>{feedback && <p role="status" aria-live="polite" className={feedback === 'Correct.' ? 'correct' : 'try-again'}>{feedback}</p>}</form>
      </div>}
    </section>

    <section className="converter-section" id="converter">
      <div className="section-heading"><div><span className="step-kicker">04 / CREATE</span><h2>Write your own message.</h2></div><p>Write as many sentences as you need. Each character is translated into its ASCII byte and shown as eight lamps.</p></div>
      <label className="converter-input"><span>YOUR TEXT</span><textarea value={converterText} onChange={(e) => setConverterText(e.target.value)} rows={4} placeholder="TYPE AS MANY SENTENCES AS YOU NEED." /><small>{converterText.length} characters</small></label>
      <div className="format-bar" role="group" aria-label="Message format"><span>FORMAT</span><button type="button" className={exportLayout === 'worksheet' ? 'selected' : ''} aria-pressed={exportLayout === 'worksheet'} onClick={() => setExportLayout('worksheet')}><strong>Task worksheet</strong><small>One byte per row + answer lines</small></button><button type="button" className={exportLayout === 'coded' ? 'selected' : ''} aria-pressed={exportLayout === 'coded'} onClick={() => setExportLayout('coded')}><strong>Coded text</strong><small>Small bytes that wrap like sentences</small></button></div>
      <div className="representation-bar" role="group" aria-label="Code representation"><span>DISPLAY</span><button type="button" className={exportRepresentation === 'bulbs' ? 'selected' : ''} aria-pressed={exportRepresentation === 'bulbs'} onClick={() => setExportRepresentation('bulbs')}><strong>{exportRepresentation === 'bulbs' ? '✓ ' : ''}Lightbulbs</strong><small>Yellow and white lamps</small></button><button type="button" className={exportRepresentation === 'digits' ? 'selected' : ''} aria-pressed={exportRepresentation === 'digits'} onClick={() => setExportRepresentation('digits')}><strong>{exportRepresentation === 'digits' ? '✓ ' : ''}1s and 0s</strong><small>Eight binary digits per character</small></button></div>
      <div className="reference-bar" role="group" aria-label="ASCII reference in download"><span>REFERENCE</span><button type="button" className={includeAsciiTable ? 'selected' : ''} aria-pressed={includeAsciiTable} onClick={() => setIncludeAsciiTable(true)}><strong>{includeAsciiTable ? '✓ ' : ''}Include ASCII table</strong><small>Adds one page to PDF and LaTeX</small></button><button type="button" className={!includeAsciiTable ? 'selected' : ''} aria-pressed={!includeAsciiTable} onClick={() => setIncludeAsciiTable(false)}><strong>{!includeAsciiTable ? '✓ ' : ''}No ASCII table</strong><small>Code only</small></button></div>
      <label className="document-title"><span>DOCUMENT TITLE</span><input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} maxLength={80} placeholder="Binary Code" /></label>
      {exportLayout === 'worksheet'
        ? <div className="converter-output" tabIndex={0} aria-label="Scrollable binary translation">{convertedBytes.length ? convertedBytes.map((byte, index) => <div className="converted-byte" key={`${byte.value}-${index}`}><span className="character-label">{byte.character === ' ' ? 'SPACE' : byte.character}</span>{exportRepresentation === 'bulbs' ? <ByteDisplay value={byte.value} compact /> : <code className="binary-byte">{byte.bits.join('')}</code>}<code>{byte.bits.join('')} · {byte.value}</code></div>) : <p>Start typing to encode your message.</p>}</div>
        : <div className="converter-output coded-output" tabIndex={0} aria-label="Coded text preview">{codedWords.length ? <div className={`coded-message ${exportRepresentation === 'digits' ? 'digit-message' : ''}`}>{codedWords.map((word, wordIndex) => <span className={`coded-word ${exportRepresentation === 'digits' ? 'digit-word' : ''}`} key={`${word}-${wordIndex}`}>{[...word].map((character, characterIndex) => exportRepresentation === 'bulbs' ? <ByteDisplay key={`${character}-${characterIndex}`} value={character.charCodeAt(0)} micro /> : <code className="inline-binary" key={`${character}-${characterIndex}`}>{toBits(character.charCodeAt(0)).join('')}</code>)}</span>)}</div> : <p>Start typing to encode your message.</p>}</div>}
      <div className="export-bar"><div><strong>{exportLayout === 'worksheet' ? 'TASK WORKSHEET' : 'CODED TEXT'} · {exportRepresentation === 'bulbs' ? 'LIGHTBULBS' : '1S AND 0S'} · {includeAsciiTable ? 'ASCII TABLE INCLUDED' : 'NO ASCII TABLE'}</strong><span>{exportLayout === 'worksheet' ? 'One byte per row with blank answer lines.' : exportRepresentation === 'bulbs' ? 'Small bulb-bytes flow and wrap like regular text.' : 'Binary bytes flow and wrap like regular text.'}</span></div><button type="button" disabled={!exportText} onClick={downloadLatex}>Download LaTeX</button><button type="button" disabled={!exportText} className="export-primary" onClick={downloadPdf}>Download PDF</button></div>
    </section>

    <section className="results-section" id="results">
      <div className="section-heading"><div><span className="step-kicker">05 / RESULTS</span><h2>Class performance.</h2></div><p>Every completed test records task, level, score, accuracy, and time.</p></div>
      <div className="results-card" tabIndex={0} aria-label="Scrollable class results"><div className="results-head"><span>RANK</span><span>STUDENT</span><span>TEST</span><span>LEVEL</span><span>SCORE</span><span>ACCURACY</span><span>TIME</span></div>{leaderboard.length ? leaderboard.map((result, index) => <div className="result-row" key={result.id}><span className={`rank rank-${index + 1}`}>{index + 1}</span><strong>{result.displayName}</strong><span>{result.taskType || 'mixed'}</span><span>{result.level || '—'}</span><b>{result.score}</b><span>{result.accuracy}%</span><span>{formatTime(result.durationSeconds)}</span></div>) : <p className="empty-results">No completed tests yet.</p>}</div>
    </section>

    <section className="author-section" id="about">
      <div className="author-photo"><Image src="/author-simonas-cepenas.webp" alt="Dr. Simonas Čepėnas" width={1500} height={1000} /><span>ABOUT THE AUTHOR</span></div>
      <div className="author-copy"><span className="step-kicker">06 / AUTHOR</span><h2>Dr. Simonas Čepėnas</h2><p>Dr. Simonas Čepėnas earned his PhD in Foreign Affairs and Methods from the University of Virginia. He teaches subjects spanning mathematics, statistics, data science, artificial intelligence, economics, and politics.</p><p>Outside the classroom, he is a husband and the father of two wonderful children.</p><div className="author-fields">MATHEMATICS · STATISTICS · DATA SCIENCE · AI · ECONOMICS · POLITICS</div></div>
    </section>

    <footer><div className="brand"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></div><p>Dr. Simonas Čepėnas · ISM University of Management and Economics</p><a href="#top">Top ↑</a></footer>
  </main>;
}

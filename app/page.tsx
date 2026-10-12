'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

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
function cleanText(value: string) { return value.toUpperCase().replace(/[^\x20-\x7E]/g, '?').slice(0, 36); }
function toBytes(text: string) { return [...text].map((character) => ({ character, value: character.charCodeAt(0), bits: toBits(character.charCodeAt(0)) })); }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function Bulb({ on, index, onToggle, compact = false }: { on: boolean; index: number; onToggle?: () => void; compact?: boolean }) {
  const contents = <>
    {Array.from({ length: 8 }, (_, ray) => <span className={`ray ray-${ray + 1}`} key={ray} />)}
    <span className="bulb-glass"><span className="filament"><i /><i /><i /></span></span>
    <span className="bulb-neck" /><span className="bulb-base"><i /><i /><i /></span>
    {!compact && <><strong>{on ? '1' : '0'}</strong><small>{weights[index]}</small></>}
  </>;
  if (!onToggle) return <span className={`bulb-button static ${on ? 'is-on' : ''} ${compact ? 'compact' : ''}`} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`}>{contents}</span>;
  return <button className={`bulb-button ${on ? 'is-on' : ''}`} onClick={onToggle} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`} aria-pressed={on}>{contents}</button>;
}

function ByteDisplay({ value, compact = false }: { value: number; compact?: boolean }) {
  return <div className={`bulb-row ${compact ? 'compact-row' : ''}`}>{toBits(value).map((bit, index) => <Bulb key={`${value}-${index}`} on={Boolean(bit)} index={index} compact={compact} />)}</div>;
}

function AsciiTable() {
  const entries: Array<[number, string]> = [
    [32, 'SPACE'], [46, '.'],
    ...Array.from({ length: 10 }, (_, i) => [48 + i, String(i)] as [number, string]),
    ...Array.from({ length: 26 }, (_, i) => [65 + i, String.fromCharCode(65 + i)] as [number, string]),
  ];
  return <div className="ascii-grid">{entries.map(([code, character]) => <div key={code}><small>{code}</small><strong className={character.length > 1 ? 'word-symbol' : ''}>{character}</strong><code>{toBits(code).join('')}</code></div>)}</div>;
}

export default function Home() {
  const [bits, setBits] = useState([false, true, false, false, true, false, false, false]);
  const [converterText, setConverterText] = useState('HELLO.');
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
  const [saving, setSaving] = useState(false);
  const value = useMemo(() => bits.reduce((sum, bit, i) => sum + (bit ? weights[i] : 0), 0), [bits]);
  const tasks = taskBank[mode][level] as readonly (number | string)[];
  const current = tasks[question];
  const currentBytes = typeof current === 'number' ? [current] : toBytes(current).map((byte) => byte.value);
  const convertedBytes = toBytes(cleanText(converterText));
  const accuracy = Math.round((tasks.length / (tasks.length + mistakes)) * 100);

  const loadResults = async () => {
    try { const response = await fetch('/api/results'); const data = await response.json(); setLeaderboard(data.results ?? []); } catch { setLeaderboard([]); }
  };
  useEffect(() => { loadResults(); }, []);

  const startTest = (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    setStarted(true); setFinished(false); setQuestion(0); setAnswer(''); setMistakes(0); setFeedback(''); setStartedAt(Date.now());
  };

  const finishTest = async () => {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const finalScore = Math.max(100, 1000 - elapsed - mistakes * 35);
    const finalAccuracy = Math.round((tasks.length / (tasks.length + mistakes)) * 100);
    setDuration(elapsed); setScore(finalScore); setFinished(true); setSaving(true);
    try {
      await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, classCode, taskType: mode, level, questionsTotal: tasks.length, score: finalScore, accuracy: finalAccuracy, durationSeconds: elapsed, mistakes }) });
      await loadResults();
    } finally { setSaving(false); }
  };

  const submitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    const expected = String(current).toUpperCase().replace(/\s+/g, ' ').trim();
    const response = answer.toUpperCase().replace(/\s+/g, ' ').trim();
    if (response !== expected) {
      setMistakes((count) => count + 1);
      setFeedback(mode === 'numbers' ? 'Try again. Add the values below the yellow bulbs.' : 'Try again. Decode each byte, then use the ASCII table.');
      return;
    }
    setFeedback('Correct.'); setAnswer('');
    if (question === tasks.length - 1) await finishTest();
    else setTimeout(() => { setQuestion((currentQuestion) => currentQuestion + 1); setFeedback(''); }, 350);
  };

  const chooseMode = (nextMode: TaskMode) => { setMode(nextMode); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };
  const chooseLevel = (nextLevel: 1 | 2 | 3) => { setLevel(nextLevel); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Binary Light Lab home"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></a>
      <nav aria-label="Primary navigation"><a href="#learn">Learn</a><a href="#ascii">ASCII</a><a className="active" href="#tests">Tests</a><a href="#converter">Converter</a><a href="#results">Results</a></nav>
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
      <div className="task-tabs" role="tablist" aria-label="Test type">
        {(['numbers','words','sentences'] as TaskMode[]).map((task, index) => <button key={task} className={mode === task ? 'selected' : ''} onClick={() => chooseMode(task)}><span>0{index + 1}</span><strong>{task}</strong><small>{task === 'numbers' ? 'One byte → decimal' : task === 'words' ? 'Bytes → one word' : 'Bytes → one sentence'}</small></button>)}
      </div>
      <div className="level-bar"><span>LEVEL</span>{([1,2,3] as const).map((item) => <button key={item} className={level === item ? 'selected' : ''} onClick={() => chooseLevel(item)}>{item}<small>{taskBank[mode][item].length} questions</small></button>)}</div>

      {!started ? <form className="start-card" onSubmit={startTest}><div><span className="test-label">{mode.toUpperCase()} · LEVEL {level}</span><h3>{tasks.length} questions</h3><p>{mode === 'numbers' ? 'Decode each byte into a decimal number.' : mode === 'words' ? 'Decode every group of bytes into a word.' : 'Decode each line of bytes into a sentence.'}</p></div><label>Display name or initials<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="e.g. Ada L." required /></label><label>Class code <small>(optional)</small><input value={classCode} onChange={(e) => setClassCode(e.target.value)} maxLength={20} placeholder="e.g. AI-01" /></label><button className="yellow-button" type="submit">Start test →</button></form>
      : finished ? <div className="finish-card"><span className="trophy">✓</span><div><span className="step-kicker">TEST COMPLETE</span><h3>{mode} · level {level}</h3><p>{saving ? 'Saving…' : 'Result saved.'}</p></div><div className="finish-stat"><small>SCORE</small><strong>{score}</strong></div><div className="finish-stat"><small>ACCURACY</small><strong>{accuracy}%</strong></div><div className="finish-stat"><small>TIME</small><strong>{formatTime(duration)}</strong></div><button onClick={() => setStarted(false)}>New test</button></div>
      : <div className="challenge-card">
        <div className="challenge-head"><div><span>QUESTION {question + 1} / {tasks.length}</span><strong>{mode.toUpperCase()} · LEVEL {level}</strong></div><div className="progress-track"><i style={{ width: `${((question + 1) / tasks.length) * 100}%` }} /></div><div><small>ERRORS</small><b>{mistakes}</b></div></div>
        <div className={`challenge-bytes ${currentBytes.length > 7 ? 'sentence-bytes' : ''}`}>{currentBytes.map((byte, index) => <div className="byte-challenge" key={`${byte}-${index}`}><ByteDisplay value={byte} compact /><small>{typeof current === 'string' && current[index] === ' ' ? 'SPACE' : `BYTE ${index + 1}`}</small></div>)}</div>
        <form className="answer-form" onSubmit={submitAnswer}><label>{mode === 'numbers' ? 'Decimal number' : mode === 'words' ? 'Hidden word' : 'Hidden sentence'}<div><input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode={mode === 'numbers' ? 'numeric' : 'text'} autoFocus placeholder="Your answer" /><button type="submit">Check</button></div></label>{feedback && <p className={feedback === 'Correct.' ? 'correct' : 'try-again'}>{feedback}</p>}</form>
      </div>}
    </section>

    <section className="converter-section" id="converter">
      <div className="section-heading"><div><span className="step-kicker">04 / CREATE</span><h2>Write your own message.</h2></div><p>Type up to 36 printable characters. Each character is translated into its ASCII byte and shown as eight lamps.</p></div>
      <label className="converter-input"><span>YOUR TEXT</span><input value={converterText} onChange={(e) => setConverterText(cleanText(e.target.value))} maxLength={36} placeholder="TYPE SOMETHING." /><small>{converterText.length}/36</small></label>
      <div className="converter-output">{convertedBytes.length ? convertedBytes.map((byte, index) => <div className="converted-byte" key={`${byte.value}-${index}`}><span className="character-label">{byte.character === ' ' ? 'SPACE' : byte.character}</span><ByteDisplay value={byte.value} compact /><code>{byte.bits.join('')} · {byte.value}</code></div>) : <p>Start typing to light the lamps.</p>}</div>
    </section>

    <section className="results-section" id="results">
      <div className="section-heading"><div><span className="step-kicker">05 / RESULTS</span><h2>Class performance.</h2></div><p>Every completed test records task, level, score, accuracy, and time.</p></div>
      <div className="results-card"><div className="results-head"><span>RANK</span><span>STUDENT</span><span>TEST</span><span>LEVEL</span><span>SCORE</span><span>ACCURACY</span><span>TIME</span></div>{leaderboard.length ? leaderboard.map((result, index) => <div className="result-row" key={result.id}><span className={`rank rank-${index + 1}`}>{index + 1}</span><strong>{result.displayName}</strong><span>{result.taskType || 'mixed'}</span><span>{result.level || '—'}</span><b>{result.score}</b><span>{result.accuracy}%</span><span>{formatTime(result.durationSeconds)}</span></div>) : <p className="empty-results">No completed tests yet.</p>}</div>
    </section>

    <footer><div className="brand"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></div><p>Dr. Simonas Čepėnas · ISM University of Management and Economics</p><a href="#top">Top ↑</a></footer>
  </main>;
}

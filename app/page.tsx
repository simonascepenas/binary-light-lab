'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const weights = [128, 64, 32, 16, 8, 4, 2, 1];
const numberChallenges = [13, 42, 170];
const wordChallenge = 'BIGFOOT';
const sentenceChallenge = 'DATA IS POWER';
const totalQuestions = numberChallenges.length + 2;

type Result = { id: number; displayName: string; classCode: string; score: number; accuracy: number; durationSeconds: number };

function toBits(value: number) { return value.toString(2).padStart(8, '0').split('').map(Number); }
function toBytes(text: string) { return [...text].map((character) => ({ character, value: character.charCodeAt(0), bits: toBits(character.charCodeAt(0)) })); }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function Bulb({ on, index, onToggle, compact = false }: { on: boolean; index: number; onToggle?: () => void; compact?: boolean }) {
  const contents = <><span className="ray ray-1" /><span className="ray ray-2" /><span className="ray ray-3" /><span className="ray ray-4" /><span className="bulb-glass"><span className="filament" /></span><span className="bulb-base"><i /><i /></span>{!compact && <><strong>{on ? '1' : '0'}</strong><small>{weights[index]}</small></>}</>;
  if (!onToggle) return <span className={`bulb-button static ${on ? 'is-on' : ''} ${compact ? 'compact' : ''}`} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`}>{contents}</span>;
  return <button className={`bulb-button ${on ? 'is-on' : ''}`} onClick={onToggle} aria-label={`${weights[index]} bit, ${on ? 'on' : 'off'}`} aria-pressed={on}>{contents}</button>;
}

function ByteDisplay({ value, compact = false }: { value: number; compact?: boolean }) {
  return <div className={`bulb-row ${compact ? 'compact-row' : ''}`}>{toBits(value).map((bit, index) => <Bulb key={`${value}-${index}`} on={Boolean(bit)} index={index} compact={compact} />)}</div>;
}

function AsciiTable() {
  const entries = [
    ...Array.from({ length: 10 }, (_, i) => [48 + i, String(i)] as const),
    ...Array.from({ length: 26 }, (_, i) => [65 + i, String.fromCharCode(65 + i)] as const),
  ];
  return <div className="ascii-grid">{entries.map(([code, character]) => <div key={code}><small>{code}</small><strong>{character}</strong><code>{toBits(code).join('')}</code></div>)}</div>;
}

export default function Home() {
  const [bits, setBits] = useState([false, true, false, false, true, false, false, false]);
  const [displayName, setDisplayName] = useState('');
  const [classCode, setClassCode] = useState('');
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

  const loadResults = async () => {
    try { const response = await fetch('/api/results'); const data = await response.json(); setLeaderboard(data.results ?? []); } catch { setLeaderboard([]); }
  };
  useEffect(() => { loadResults(); }, []);

  const startChallenge = (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    setStarted(true); setFinished(false); setQuestion(0); setAnswer(''); setMistakes(0); setFeedback(''); setStartedAt(Date.now());
  };

  const finishChallenge = async (nextMistakes: number) => {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const finalScore = Math.max(100, 1000 - elapsed * 2 - nextMistakes * 50);
    const accuracy = Math.round((totalQuestions / (totalQuestions + nextMistakes)) * 100);
    setDuration(elapsed); setScore(finalScore); setFinished(true); setSaving(true);
    try {
      await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, classCode, score: finalScore, accuracy, durationSeconds: elapsed, mistakes: nextMistakes }) });
      await loadResults();
    } finally { setSaving(false); }
  };

  const submitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    const expected = question < numberChallenges.length ? String(numberChallenges[question]) : question === numberChallenges.length ? wordChallenge : sentenceChallenge;
    if (answer.trim().toUpperCase().replace(/\s+/g, ' ') !== expected) {
      setMistakes((count) => count + 1); setFeedback('Not yet. Read from 128 on the left to 1 on the right, then add every lit value.'); return;
    }
    setFeedback('Correct — code cracked!'); setAnswer('');
    if (question === totalQuestions - 1) await finishChallenge(mistakes);
    else setTimeout(() => { setQuestion((current) => current + 1); setFeedback(''); }, 450);
  };

  const currentStage = question < numberChallenges.length ? 'NUMBER' : question === numberChallenges.length ? 'HIDDEN WORD' : 'HIDDEN SENTENCE';
  const currentBytes = question < numberChallenges.length ? [numberChallenges[question]] : question === numberChallenges.length ? toBytes(wordChallenge).map((byte) => byte.value) : toBytes(sentenceChallenge).map((byte) => byte.value);
  const accuracy = Math.round((totalQuestions / (totalQuestions + mistakes)) * 100);

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Binary Light Lab home"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></a>
      <nav aria-label="Primary navigation"><a href="#learn">Learn</a><a href="#ascii">ASCII table</a><a className="active" href="#practice">Practice</a><a href="#results">Results</a></nav>
      <div className="course-chip">Dr. Simonas Čepėnas</div>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">FROM SWITCHES TO SENTENCES</div><h1>Read the light.<br /><em>Reveal the code.</em></h1>
      <p>Learn how computers turn ON and OFF into numbers, letters, words—and meaning.</p>
      <div className="hero-actions"><a className="primary-button" href="#learn">Start learning <span>→</span></a><span className="lesson-note"><b>5</b> challenges · about 10 minutes</span></div>
      <div className="binary-ribbon" aria-hidden="true">01000010&nbsp; 01001001&nbsp; 01001110&nbsp; 01000001&nbsp; 01010010&nbsp; 01011001</div>
    </section>

    <section className="lesson-section" id="learn">
      <div className="section-heading"><div><span className="step-kicker">01 · LEARN THE LANGUAGE</span><h2>One byte. Eight decisions.</h2></div><p>A bit is a switch: OFF means 0, ON means 1. Eight bits make one byte—enough to represent a number from 0 to 255.</p></div>
      <div className="concept-row"><div><b>OFF</b><span>means</span><strong>0</strong></div><div><b>ON</b><span>means</span><strong>1</strong></div><p>Read left to right: <b>MSB</b> (most significant bit) to <b>LSB</b> (least significant bit).</p></div>
      <div className="lab-card">
        <div className="lab-topline"><div><span className="live-dot" /> INTERACTIVE BYTE</div><span>MSB <i>→</i> LSB</span></div>
        <div className="bulb-row">{bits.map((bit, index) => <Bulb key={weights[index]} on={bit} index={index} onToggle={() => setBits((current) => current.map((item, i) => i === index ? !item : item))} />)}</div>
        <div className="equation-row"><div><span>BINARY</span><strong>{bits.map((bit) => bit ? '1' : '0').join('')}</strong></div><span className="equals">=</span><div><span>DECIMAL</span><strong className="decimal-value">{value}</strong></div><div className="calculation">{bits.map((bit, i) => bit ? weights[i] : null).filter(Boolean).join(' + ') || '0'} = <b>{value}</b></div></div>
        <p className="tap-hint">Try it: tap any bulb to switch that bit ON or OFF.</p>
      </div>
      <div className="teaching-cards"><article><span>1</span><h3>Find the place value</h3><p>The eight positions are worth 128, 64, 32, 16, 8, 4, 2 and 1.</p></article><article><span>2</span><h3>Keep every lit value</h3><p>An ON bulb contributes its value. An OFF bulb contributes zero.</p></article><article><span>3</span><h3>Add the lights</h3><p>The total is the decimal number represented by that byte.</p></article></div>
    </section>

    <section className="ascii-section" id="ascii">
      <div className="section-heading"><div><span className="step-kicker">02 · USE THE CODEBOOK</span><h2>Numbers become letters.</h2></div><p>ASCII assigns a number to every character. Decode the byte to decimal first, then find its character below.</p></div>
      <div className="ascii-key"><span>DECIMAL</span><i>→</i><span>CHARACTER</span><i>→</i><span>8-BIT BINARY</span></div>
      <AsciiTable />
    </section>

    <section className="practice-section" id="practice">
      <div className="section-heading light"><div><span className="step-kicker">03 · CRACK THE CODE</span><h2>Numbers. Words. Sentences.</h2></div><p>Complete the full mission. Accuracy comes first; speed breaks ties on the class leaderboard.</p></div>
      {!started ? <form className="start-card" onSubmit={startChallenge}><div><span className="challenge-number">5</span><h3>challenge checkpoints</h3><p>Three numbers → one word → one sentence</p></div><label>Display name or initials<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="e.g. Ada L." required /></label><label>Class code <small>(optional)</small><input value={classCode} onChange={(e) => setClassCode(e.target.value)} maxLength={20} placeholder="e.g. AI-01" /></label><button className="yellow-button" type="submit">Begin mission →</button></form>
      : finished ? <div className="finish-card"><span className="trophy">★</span><div><span className="step-kicker">MISSION COMPLETE</span><h3>Code cracked, {displayName}.</h3><p>{saving ? 'Saving your result…' : 'Your performance is on the leaderboard.'}</p></div><div className="finish-stat"><small>SCORE</small><strong>{score}</strong></div><div className="finish-stat"><small>ACCURACY</small><strong>{accuracy}%</strong></div><div className="finish-stat"><small>TIME</small><strong>{formatTime(duration)}</strong></div><button onClick={() => setStarted(false)}>Try again</button></div>
      : <div className="challenge-card">
        <div className="challenge-head"><div><span>CHECKPOINT {question + 1} / {totalQuestions}</span><strong>{currentStage}</strong></div><div className="progress-track"><i style={{ width: `${((question + 1) / totalQuestions) * 100}%` }} /></div><div><small>MISTAKES</small><b>{mistakes}</b></div></div>
        <div className={`challenge-bytes ${currentBytes.length > 7 ? 'sentence-bytes' : ''}`}>{currentBytes.map((byte, index) => <div className="byte-challenge" key={`${byte}-${index}`}><ByteDisplay value={byte} compact /><small>BYTE {index + 1}</small></div>)}</div>
        <form className="answer-form" onSubmit={submitAnswer}><label>{currentStage === 'NUMBER' ? 'What decimal number do the bulbs represent?' : currentStage === 'HIDDEN WORD' ? 'Use the ASCII table. What word is hidden?' : 'Read each byte. What sentence is hidden?'}<div><input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode={currentStage === 'NUMBER' ? 'numeric' : 'text'} autoFocus placeholder={currentStage === 'NUMBER' ? 'Enter a number' : 'Enter your decoded text'} /><button type="submit">Check answer</button></div></label>{feedback && <p className={feedback.startsWith('Correct') ? 'correct' : 'try-again'}>{feedback}</p>}</form>
      </div>}
    </section>

    <section className="results-section" id="results">
      <div className="section-heading"><div><span className="step-kicker">04 · CLASS RESULTS</span><h2>Leaderboard &amp; performance.</h2></div><p>Results are saved after the complete mission. Students may use initials to keep the board classroom-friendly.</p></div>
      <div className="results-card"><div className="results-head"><span>RANK</span><span>STUDENT</span><span>CLASS</span><span>SCORE</span><span>ACCURACY</span><span>TIME</span></div>{leaderboard.length ? leaderboard.map((result, index) => <div className="result-row" key={result.id}><span className={`rank rank-${index + 1}`}>{index + 1}</span><strong>{result.displayName}</strong><span>{result.classCode || '—'}</span><b>{result.score}</b><span>{result.accuracy}%</span><span>{formatTime(result.durationSeconds)}</span></div>) : <p className="empty-results">No completed missions yet. The first codebreaker takes the lead.</p>}</div>
    </section>

    <footer><div className="brand"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></div><p>Dr. Simonas Čepėnas · ISM University of Management and Economics</p><a href="#top">Back to top ↑</a></footer>
  </main>;
}

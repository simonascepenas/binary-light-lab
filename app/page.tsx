'use client';

import { FormEvent, Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createLatexWorksheet, createPdfWorksheet, saveDownload, type AsciiTablePosition, type ExportLayout, type ExportRepresentation } from './export-utils';

const DATABASE_SITE_ORIGIN = 'https://binary-light-lab.workspace-404564.chatgpt.site';
function apiUrl(path: string) {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) return `${DATABASE_SITE_ORIGIN}${path}`;
  return path;
}

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
type ClassroomSession = { code: string; title: string; taskType: TaskMode; level: 1 | 2 | 3; createdAt: string };
type JoinedStudent = { id: number; displayName: string };
type TeacherSession = ClassroomSession & { teacherToken: string };
type SessionStudent = { studentId: number; displayName: string; joinedAt: string; completed: number; score: number | null; accuracy: number | null; durationSeconds: number | null; mistakes: number | null; completedAt: string | null };

function toBits(value: number) { return value.toString(2).padStart(8, '0').split('').map(Number); }
function cleanText(value: string) { return [...value.toUpperCase()].map((character) => { if (/\s/.test(character)) return ' '; const code = character.codePointAt(0) ?? 63; return code >= 32 && code <= 126 ? character : '?'; }).join(''); }
function toBytes(text: string) { return [...text].map((character) => ({ character, value: character.charCodeAt(0), bits: toBits(character.charCodeAt(0)) })); }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function Bulb({ on, index, onToggle, compact = false, micro = false }: { on: boolean; index: number; onToggle?: () => void; compact?: boolean; micro?: boolean }) {
  const contents = <>
    {Array.from({ length: 12 }, (_, ray) => <span className={`ray ray-${ray + 1}`} key={ray} />)}
    <span className="bulb-glass"><span className="highlight" /><span className="filament"><i /><i /><i /></span></span>
    <span className="bulb-neck" /><span className="bulb-base"><i /><i /><i /></span>
    {!compact && !micro && <span className="bulb-values"><small>{weights[index]}</small><span>2<sup>{7 - index}</sup></span><strong>{on ? 'ON · 1' : 'OFF · 0'}</strong></span>}
  </>;
  if (!onToggle) return <span className={`bulb-button static ${on ? 'is-on' : ''} ${compact ? 'compact' : ''} ${micro ? 'micro' : ''}`} aria-label={`${weights[index]}, 2 to the power ${7 - index}, ${on ? 'on, 1' : 'off, 0'}`}>{contents}</span>;
  return <button className={`bulb-button ${on ? 'is-on' : ''}`} onClick={onToggle} aria-label={`${weights[index]}, 2 to the power ${7 - index}, ${on ? 'on, 1' : 'off, 0'}`} aria-pressed={on}>{contents}</button>;
}

function ByteDisplay({ value, compact = false, micro = false }: { value: number; compact?: boolean; micro?: boolean }) {
  return <span className={`bulb-row ${compact ? 'compact-row' : ''} ${micro ? 'micro-row' : ''}`}>{toBits(value).map((bit, index) => <Bulb key={`${value}-${index}`} on={Boolean(bit)} index={index} compact={compact} micro={micro} />)}</span>;
}

function AsciiTable() {
  const entries: Array<[number, string]> = [
    [32, 'SPACE'], [33, '!'], [46, '.'], [63, '?'],
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
  const [asciiTablePosition, setAsciiTablePosition] = useState<AsciiTablePosition>('last');
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
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Binary decoding assignment');
  const [sessionTask, setSessionTask] = useState<TaskMode>('words');
  const [sessionLevel, setSessionLevel] = useState<1 | 2 | 3>(1);
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null>(null);
  const [sessionStudents, setSessionStudents] = useState<SessionStudent[]>([]);
  const [teacherStatus, setTeacherStatus] = useState('');
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreKey, setRestoreKey] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinStatus, setJoinStatus] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('');
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
  const downloadLatex = () => saveDownload(createLatexWorksheet(exportText, exportLayout, documentTitle, asciiTablePosition, exportRepresentation), 'application/x-tex;charset=utf-8', `${exportName}.tex`);
  const downloadPdf = () => saveDownload(createPdfWorksheet(exportText, exportLayout, documentTitle, asciiTablePosition, exportRepresentation), 'application/pdf', `${exportName}.pdf`);

  const loadResults = async (filter = '') => {
    try { const response = await fetch(apiUrl(`/api/results${filter ? `?classCode=${encodeURIComponent(filter)}` : ''}`)); const data = await response.json(); setLeaderboard(data.results ?? []); } catch { setLeaderboard([]); }
  };
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/results')).then((response) => response.json()).then((data) => { if (!cancelled) setLeaderboard(data.results ?? []); }).catch(() => { if (!cancelled) setLeaderboard([]); });
    return () => { cancelled = true; if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, []);

  useEffect(() => {
    const sectionIds = ['learn', 'ascii', 'tests', 'converter', 'results', 'classroom', 'about'];
    const updateActiveSection = () => {
      if (window.scrollY < 48) {
        setActiveSection('');
        return;
      }

      const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter((section): section is HTMLElement => Boolean(section));

      const marker = Math.min(window.innerHeight * 0.32, 240);
      if (sections[0] && sections[0].getBoundingClientRect().top > marker) {
        setActiveSection('');
        return;
      }

      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        setActiveSection('about');
        return;
      }

      const current = sections.find((section) => {
        const bounds = section.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });

      if (current) {
        setActiveSection(current.id);
        return;
      }

      const nearest = sections
        .filter((section) => {
          const bounds = section.getBoundingClientRect();
          return bounds.bottom > 72 && bounds.top < window.innerHeight;
        })
        .sort((first, second) => (
          Math.abs(first.getBoundingClientRect().top - marker)
          - Math.abs(second.getBoundingClientRect().top - marker)
        ))[0];
      setActiveSection(nearest?.id ?? '');
    };
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => { window.removeEventListener('scroll', updateActiveSection); window.removeEventListener('resize', updateActiveSection); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem('binary-light-teacher-session');
        if (saved) setTeacherSession(JSON.parse(saved) as TeacherSession);
      } catch { /* The dashboard can still be opened with its key. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!teacherSession) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(apiUrl(`/api/sessions?code=${encodeURIComponent(teacherSession.code)}&teacherToken=${encodeURIComponent(teacherSession.teacherToken)}`));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Report unavailable.');
        if (!cancelled) { setSessionStudents(data.students ?? []); setTeacherStatus('Live report updated.'); }
      } catch (error) { if (!cancelled) setTeacherStatus(error instanceof Error ? error.message : 'Report unavailable.'); }
    };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [teacherSession]);

  const createClassroomSession = async (event: FormEvent) => {
    event.preventDefault(); setTeacherStatus('Creating session…');
    try {
      const response = await fetch(apiUrl('/api/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', title: sessionTitle, taskType: sessionTask, level: sessionLevel }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the session.');
      const created = data.session as TeacherSession;
      setTeacherSession(created); setSessionStudents([]); setTeacherStatus('Session is ready. Share the student code.');
      window.localStorage.setItem('binary-light-teacher-session', JSON.stringify(created));
    } catch (error) { setTeacherStatus(error instanceof Error ? error.message : 'Could not create the session.'); }
  };

  const restoreTeacherSession = async (event: FormEvent) => {
    event.preventDefault(); setTeacherStatus('Opening dashboard…');
    try {
      const code = restoreCode.trim().toUpperCase(); const teacherToken = restoreKey.trim();
      const response = await fetch(apiUrl(`/api/sessions?code=${encodeURIComponent(code)}&teacherToken=${encodeURIComponent(teacherToken)}`));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not open the dashboard.');
      const restored = { ...data.session, teacherToken } as TeacherSession;
      setTeacherSession(restored); setSessionStudents(data.students ?? []); setTeacherStatus('Dashboard restored.');
      window.localStorage.setItem('binary-light-teacher-session', JSON.stringify(restored));
    } catch (error) { setTeacherStatus(error instanceof Error ? error.message : 'Could not open the dashboard.'); }
  };

  const joinClassroomSession = async (event: FormEvent) => {
    event.preventDefault();
    if (joinSubmitting) return;
    setJoinSubmitting(true); setJoinStatus('Joining session…');
    try {
      const normalizedCode = joinCode.trim().toUpperCase();
      const storageKey = `binary-light-participant-${normalizedCode}-${joinName.trim().toLocaleLowerCase()}`;
      let participantToken = window.sessionStorage.getItem(storageKey);
      if (!participantToken) {
        participantToken = crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, participantToken);
      }
      const response = await fetch(apiUrl('/api/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', code: normalizedCode, displayName: joinName, participantToken }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not join the session.');
      const joined = data.session as ClassroomSession;
      const student = data.student as JoinedStudent;
      setActiveSession(joined); setActiveStudentId(student.id); setDisplayName(student.displayName); setClassCode(joined.code); setMode(joined.taskType); setLevel(joined.level); setStarted(false); setFinished(false); setJoinStatus(student.displayName === joinName.trim() ? 'Registered. Your assignment is ready below.' : `Registered as ${student.displayName}. Your assignment is ready below.`);
      window.setTimeout(() => document.getElementById('tests')?.scrollIntoView({ behavior: 'smooth' }), 250);
    } catch (error) { setJoinStatus(error instanceof Error ? error.message : 'Could not join the session.'); }
    finally { setJoinSubmitting(false); }
  };

  const downloadSessionReport = () => {
    if (!teacherSession) return;
    const quote = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const lines = [['Student', 'Status', 'Score', 'Accuracy', 'Time seconds', 'Mistakes', 'Joined', 'Completed'], ...sessionStudents.map((student) => [student.displayName, student.completed ? 'Completed' : 'Registered', student.score ?? '', student.accuracy ?? '', student.durationSeconds ?? '', student.mistakes ?? '', student.joinedAt, student.completedAt ?? ''])];
    saveDownload(lines.map((row) => row.map(quote).join(',')).join('\n'), 'text/csv;charset=utf-8', `${teacherSession.code.toLowerCase()}-session-report.csv`);
  };

  const resetTransition = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setTransitioning(false);
    setShowNextPrompt(false);
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
      const response = await fetch(apiUrl('/api/results'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, classCode, studentId: activeStudentId, taskType: mode, level, questionsTotal: tasks.length, score: finalScore, accuracy: finalAccuracy, durationSeconds: elapsed, mistakes }) });
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
    if (!response) {
      setFeedback('Enter an answer first.');
      return;
    }
    if (response !== expected) {
      setMistakes((count) => count + 1);
      setTransitioning(true);
      setFeedback(`Incorrect. The correct answer is ${expected}.`);
      advanceTimer.current = setTimeout(() => { setShowNextPrompt(true); advanceTimer.current = null; }, 700);
      return;
    }
    setTransitioning(true); setFeedback('Correct.'); setAnswer('');
    if (question === tasks.length - 1) await finishTest(event.timeStamp);
    else advanceTimer.current = setTimeout(() => { setQuestion((currentQuestion) => currentQuestion + 1); setFeedback(''); setTransitioning(false); advanceTimer.current = null; }, 350);
  };

  const continueAfterAnswer = async (completedAt: number) => {
    setShowNextPrompt(false); setAnswer(''); setFeedback('');
    if (question === tasks.length - 1) await finishTest(completedAt);
    else { setQuestion((currentQuestion) => currentQuestion + 1); setTransitioning(false); }
  };

  const chooseMode = (nextMode: TaskMode) => { if (activeSession) return; resetTransition(); setMode(nextMode); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };
  const chooseLevel = (nextLevel: 1 | 2 | 3) => { if (activeSession) return; resetTransition(); setLevel(nextLevel); setStarted(false); setFinished(false); setQuestion(0); setAnswer(''); setFeedback(''); };

  return <>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Binary Light Lab home"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></a>
      <nav aria-label="Primary navigation">{[['learn','Learn'],['ascii','ASCII'],['tests','Tests'],['converter','Converter'],['results','Results'],['classroom','Classroom'],['about','About']].map(([id, label]) => <a key={id} className={activeSection === id ? 'active' : ''} aria-current={activeSection === id ? 'location' : undefined} href={`#${id}`}>{label}</a>)}</nav>
      <div className="course-chip">Dr. Simonas Čepėnas</div>
    </header>

    <main>

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
        <div className="equation-row"><div><span>BINARY</span><strong>{bits.map((bit) => bit ? '1' : '0').join('')}</strong></div><span className="equals">=</span><div><span>DECIMAL</span><strong className="decimal-value">{value}</strong></div><div className="calculation" aria-label={`Binary expansion equals ${value}`}>{bits.map((bit, index) => <Fragment key={weights[index]}><span>2<sup>{7 - index}</sup> × {bit ? 1 : 0}</span>{index < bits.length - 1 && <i>+</i>}</Fragment>)}<i>=</i><b>{value}</b></div></div>
      </div>
      <div className="three-steps"><p><b>1.</b> Read each bulb as 0 or 1.</p><p><b>2.</b> Multiply each power of two by its bit.</p><p><b>3.</b> Add all eight products.</p></div>
    </section>

    <section className="ascii-section" id="ascii">
      <div className="section-heading"><div><span className="step-kicker">02 / LOOK UP</span><h2>The ASCII codebook.</h2></div><p>After finding the decimal number, match it to a character. Space and full stop are included for sentence tests.</p></div>
      <AsciiTable />
    </section>

    <section className="tests-section" id="tests">
      <div className="section-heading"><div><span className="step-kicker">03 / TEST</span><h2>{activeSession ? 'Complete your assignment.' : 'Choose one task.'}</h2></div><p>{activeSession ? `${activeSession.title} · Session ${activeSession.code}` : 'Pick a task and a level, then decode each set of lamps.'}</p></div>
      <div className="task-tabs" role="group" aria-label="Test type">
        {(['numbers','words','sentences'] as TaskMode[]).map((task, index) => <button key={task} disabled={Boolean(activeSession)} aria-pressed={mode === task} className={mode === task ? 'selected' : ''} onClick={() => chooseMode(task)}><span>0{index + 1}</span><strong>{task}</strong><small>{task === 'numbers' ? 'One byte → decimal' : task === 'words' ? 'Bytes → one word' : 'Bytes → one sentence'}</small></button>)}
      </div>
      <div className="level-bar" role="group" aria-label="Test level"><span>LEVEL</span>{([1,2,3] as const).map((item) => <button key={item} disabled={Boolean(activeSession)} aria-pressed={level === item} className={level === item ? 'selected' : ''} onClick={() => chooseLevel(item)}>{item}<small>{taskBank[mode][item].length} questions</small></button>)}</div>

      {!started ? <form className="start-card" onSubmit={startTest}><div><span className="test-label">{mode.toUpperCase()} · LEVEL {level}</span><h3>{tasks.length} questions</h3><p>{mode === 'numbers' ? 'Decode each byte into a decimal number.' : mode === 'words' ? 'Decode every group of bytes into a word.' : 'Decode each line of bytes into a sentence.'}</p></div><label>Display name or initials<input value={displayName} readOnly={Boolean(activeSession)} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="e.g. Ada L." required /></label><label>Class code <small>{activeSession ? '(session)' : '(optional)'}</small><input value={classCode} readOnly={Boolean(activeSession)} onChange={(e) => setClassCode(e.target.value)} maxLength={20} placeholder="e.g. AI-01" /></label><button className="yellow-button" type="submit">Start test →</button></form>
      : finished ? <div className="finish-card"><span className="trophy">✓</span><div><span className="step-kicker">TEST COMPLETE</span><h3>{mode} · level {level}</h3><p role="status">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Result saved.' : saveStatus === 'error' ? 'Result could not be saved.' : ''}</p></div><div className="finish-stat"><small>SCORE</small><strong>{score}</strong></div><div className="finish-stat"><small>ACCURACY</small><strong>{accuracy}%</strong></div><div className="finish-stat"><small>TIME</small><strong>{formatTime(duration)}</strong></div><button onClick={() => { resetTransition(); setStarted(false); }}>New test</button></div>
      : <div className="challenge-card">
        <div className="challenge-head"><div><span>QUESTION {question + 1} / {tasks.length}</span><strong>{mode.toUpperCase()} · LEVEL {level}</strong></div><div className="progress-track"><i style={{ width: `${(question / tasks.length) * 100}%` }} /></div><div><small>ERRORS</small><b>{mistakes}</b></div></div>
        <div tabIndex={0} aria-label="Scrollable encoded bytes" className={`challenge-bytes ${currentBytes.length > 7 ? 'sentence-bytes' : ''}`}>{currentBytes.map((byte, index) => <div className="byte-challenge" key={`${byte}-${index}`}><ByteDisplay value={byte} compact /><small>{typeof current === 'string' && current[index] === ' ' ? 'SPACE' : `BYTE ${index + 1}`}</small></div>)}</div>
        <form className="answer-form" onSubmit={submitAnswer}><label>{mode === 'numbers' ? 'Decimal number' : mode === 'words' ? 'Hidden word' : 'Hidden sentence'}<div><input required disabled={transitioning} value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode={mode === 'numbers' ? 'numeric' : 'text'} autoFocus placeholder="Your answer" />{showNextPrompt ? <button className="next-question-button" type="button" onClick={(event) => void continueAfterAnswer(event.timeStamp)}>{question === tasks.length - 1 ? 'See results →' : 'Next question →'}</button> : <button disabled={transitioning} type="submit">Check</button>}</div></label>{feedback && <p role="status" aria-live="polite" className={feedback === 'Correct.' ? 'correct' : 'try-again'}>{feedback}</p>}</form>
      </div>}
    </section>

    <section className="converter-section" id="converter">
      <div className="section-heading"><div><span className="step-kicker">04 / CREATE</span><h2>Write your own message.</h2></div><p>Write as many sentences as you need. Each character is translated into its ASCII byte and shown as eight lamps.</p></div>
      <label className="converter-input"><span>YOUR TEXT</span><textarea value={converterText} onChange={(e) => setConverterText(e.target.value)} rows={4} placeholder="TYPE AS MANY SENTENCES AS YOU NEED." /><small>{converterText.length} characters</small></label>
      <div className="format-bar" role="group" aria-label="Message format"><span>FORMAT</span><button type="button" className={exportLayout === 'worksheet' ? 'selected' : ''} aria-pressed={exportLayout === 'worksheet'} onClick={() => setExportLayout('worksheet')}><strong>Task worksheet</strong><small>One byte per row + answer lines</small></button><button type="button" className={exportLayout === 'coded' ? 'selected' : ''} aria-pressed={exportLayout === 'coded'} onClick={() => setExportLayout('coded')}><strong>Coded text</strong><small>Small bytes that wrap like sentences</small></button></div>
      <div className="representation-bar" role="group" aria-label="Code representation"><span>DISPLAY</span><button type="button" className={exportRepresentation === 'bulbs' ? 'selected' : ''} aria-pressed={exportRepresentation === 'bulbs'} onClick={() => setExportRepresentation('bulbs')}><strong>{exportRepresentation === 'bulbs' ? '✓ ' : ''}Lightbulbs</strong><small>Yellow and white lamps</small></button><button type="button" className={exportRepresentation === 'digits' ? 'selected' : ''} aria-pressed={exportRepresentation === 'digits'} onClick={() => setExportRepresentation('digits')}><strong>{exportRepresentation === 'digits' ? '✓ ' : ''}1s and 0s</strong><small>Eight binary digits per character</small></button></div>
      <div className="reference-bar" role="group" aria-label="ASCII reference position in download"><span>ASCII TABLE</span><button type="button" className={asciiTablePosition === 'none' ? 'selected' : ''} aria-pressed={asciiTablePosition === 'none'} onClick={() => setAsciiTablePosition('none')}><strong>{asciiTablePosition === 'none' ? '✓ ' : ''}No table</strong><small>Code only</small></button><button type="button" className={asciiTablePosition === 'first' ? 'selected' : ''} aria-pressed={asciiTablePosition === 'first'} onClick={() => setAsciiTablePosition('first')}><strong>{asciiTablePosition === 'first' ? '✓ ' : ''}First page</strong><small>Reference before the activity</small></button><button type="button" className={asciiTablePosition === 'last' ? 'selected' : ''} aria-pressed={asciiTablePosition === 'last'} onClick={() => setAsciiTablePosition('last')}><strong>{asciiTablePosition === 'last' ? '✓ ' : ''}Last page</strong><small>Reference after the activity</small></button></div>
      <label className="document-title"><span>DOCUMENT TITLE</span><input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} maxLength={80} placeholder="Binary Code" /></label>
      {exportLayout === 'worksheet'
        ? <div className="converter-output" tabIndex={0} aria-label="Scrollable binary translation">{convertedBytes.length ? convertedBytes.map((byte, index) => <div className="converted-byte" key={`${byte.value}-${index}`}><span className="character-label">{byte.character === ' ' ? 'SPACE' : byte.character}</span>{exportRepresentation === 'bulbs' ? <ByteDisplay value={byte.value} compact /> : <code className="binary-byte">{byte.bits.join('')}</code>}<code>{byte.bits.join('')} · {byte.value}</code></div>) : <p>Start typing to encode your message.</p>}</div>
        : <div className="converter-output coded-output" tabIndex={0} aria-label="Coded text preview">{codedWords.length ? <div className={`coded-message ${exportRepresentation === 'digits' ? 'digit-message' : ''}`}>{codedWords.map((word, wordIndex) => <span className={`coded-word ${exportRepresentation === 'digits' ? 'digit-word' : ''}`} key={`${word}-${wordIndex}`}>{[...word].map((character, characterIndex) => exportRepresentation === 'bulbs' ? <ByteDisplay key={`${character}-${characterIndex}`} value={character.charCodeAt(0)} micro /> : <code className="inline-binary" key={`${character}-${characterIndex}`}>{toBits(character.charCodeAt(0)).join('')}</code>)}</span>)}</div> : <p>Start typing to encode your message.</p>}</div>}
      <div className="export-bar"><div><strong>{exportLayout === 'worksheet' ? 'TASK WORKSHEET' : 'CODED TEXT'} · {exportRepresentation === 'bulbs' ? 'LIGHTBULBS' : '1S AND 0S'} · {asciiTablePosition === 'none' ? 'NO ASCII TABLE' : `ASCII TABLE · ${asciiTablePosition.toUpperCase()} PAGE`}</strong><span>{exportLayout === 'worksheet' ? 'One byte per row with blank answer lines.' : exportRepresentation === 'bulbs' ? 'Small bulb-bytes flow and wrap like regular text.' : 'Binary bytes flow and wrap like regular text.'}</span></div><button type="button" disabled={!exportText} onClick={downloadLatex}>Download LaTeX</button><button type="button" disabled={!exportText} className="export-primary" onClick={downloadPdf}>Download PDF</button></div>
    </section>

    <section className="results-section" id="results">
      <div className="section-heading"><div><span className="step-kicker">05 / RESULTS</span><h2>Class performance.</h2></div><p>Every completed test records task, level, score, accuracy, and time.</p></div>
      <div className="results-card" tabIndex={0} aria-label="Scrollable class results"><div className="results-head"><span>RANK</span><span>STUDENT</span><span>TEST</span><span>LEVEL</span><span>SCORE</span><span>ACCURACY</span><span>TIME</span></div>{leaderboard.length ? leaderboard.map((result, index) => <div className="result-row" key={result.id}><span className={`rank rank-${index + 1}`}>{index + 1}</span><strong>{result.displayName}</strong><span>{result.taskType || 'mixed'}</span><span>{result.level || '—'}</span><b>{result.score}</b><span>{result.accuracy}%</span><span>{formatTime(result.durationSeconds)}</span></div>) : <p className="empty-results">No completed tests yet.</p>}</div>
    </section>

    <section className="classroom-section" id="classroom">
      <div className="section-heading"><div><span className="step-kicker">06 / CLASSROOM</span><h2>Run a class session.</h2></div><p>Create one assignment, share its short code, and watch students register and complete it. The report updates automatically.</p></div>
      <div className="classroom-grid">
        <article className="classroom-card teacher-card"><div className="classroom-card-head"><span>FOR TEACHERS</span><b>01</b></div>{teacherSession ? <div className="teacher-dashboard"><div className="session-identity"><div><small>STUDENT CODE</small><strong>{teacherSession.code}</strong></div><div><small>ASSIGNMENT</small><b>{teacherSession.title}</b><span>{teacherSession.taskType} · level {teacherSession.level}</span></div></div><div className="session-summary"><div><strong>{sessionStudents.length}</strong><span>registered</span></div><div><strong>{sessionStudents.filter((student) => student.completed).length}</strong><span>completed</span></div><div><strong>{sessionStudents.length ? Math.round(sessionStudents.filter((student) => student.accuracy !== null).reduce((sum, student) => sum + (student.accuracy ?? 0), 0) / Math.max(1, sessionStudents.filter((student) => student.accuracy !== null).length)) : 0}%</strong><span>avg. accuracy</span></div></div><div className="teacher-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(teacherSession.code)}>Copy student code</button><button type="button" onClick={downloadSessionReport} disabled={!sessionStudents.length}>Download CSV report</button><button type="button" className="quiet-button" onClick={() => { setTeacherSession(null); setSessionStudents([]); setTeacherStatus(''); window.localStorage.removeItem('binary-light-teacher-session'); }}>Close dashboard</button></div><div className="session-report" tabIndex={0}><div className="session-report-head"><span>STUDENT</span><span>STATUS</span><span>SCORE</span><span>ACCURACY</span><span>TIME</span></div>{sessionStudents.length ? sessionStudents.map((student) => <div className="session-report-row" key={student.studentId}><strong>{student.displayName}</strong><span className={student.completed ? 'complete-pill' : 'waiting-pill'}>{student.completed ? 'Complete' : 'Registered'}</span><span>{student.score ?? '—'}</span><span>{student.accuracy === null ? '—' : `${student.accuracy}%`}</span><span>{student.durationSeconds === null ? '—' : formatTime(student.durationSeconds)}</span></div>) : <p>No students have registered yet.</p>}</div><details className="teacher-key"><summary>Teacher dashboard key</summary><code>{teacherSession.teacherToken}</code><p>Keep this private. You need the session code and this key to reopen the report on another device.</p></details></div> : <><form className="session-form" onSubmit={createClassroomSession}><label>Session title<input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} maxLength={80} required /></label><label>Assignment<select value={sessionTask} onChange={(event) => setSessionTask(event.target.value as TaskMode)}><option value="numbers">Decode numbers</option><option value="words">Crack words</option><option value="sentences">Read sentences</option></select></label><label>Level<select value={sessionLevel} onChange={(event) => setSessionLevel(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>Level 1 · 5 questions</option><option value={2}>Level 2 · 8 questions</option><option value={3}>Level 3 · 10 questions</option></select></label><button className="yellow-button" type="submit">Create session →</button></form><details className="restore-session"><summary>Open an existing teacher dashboard</summary><form onSubmit={restoreTeacherSession}><label>Session code<input value={restoreCode} onChange={(event) => setRestoreCode(event.target.value.toUpperCase())} maxLength={6} /></label><label>Teacher key<input value={restoreKey} onChange={(event) => setRestoreKey(event.target.value)} /></label><button type="submit">Open dashboard</button></form></details></>}{teacherStatus && <p className="classroom-status" role="status">{teacherStatus}</p>}</article>
        <article className="classroom-card student-card"><div className="classroom-card-head"><span>FOR STUDENTS</span><b>02</b></div><form className="session-form" onSubmit={joinClassroomSession}><label>Session code<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" maxLength={6} required /></label><label>Your name<input value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="First name and initial" maxLength={32} required /></label><button className="blue-button" type="submit" disabled={joinSubmitting}>{joinSubmitting ? 'Joining…' : 'Join assignment →'}</button></form>{activeSession && <div className="joined-assignment"><small>YOU ARE REGISTERED</small><strong>{activeSession.title}</strong><span>{activeSession.taskType} · level {activeSession.level}</span></div>}{joinStatus && <p className="classroom-status" role="status">{joinStatus}</p>}</article>
      </div>
    </section>

    <section className="author-section" id="about">
      {/* A relative native image path works on both the root Site and GitHub Pages subpath. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="author-photo"><img src="author-simonas-cepenas.webp" alt="Dr. Simonas Čepėnas" width={1500} height={1000} /></div>
      <div className="author-copy"><span className="step-kicker">07 / AUTHOR</span><h2>Dr. Simonas Čepėnas</h2><p>Dr. Simonas Čepėnas earned his PhD in Foreign Affairs and Methods from the University of Virginia. He teaches subjects spanning mathematics, statistics, data science, artificial intelligence, economics, and politics.</p><p>Outside the classroom, he is a husband and the father of two wonderful children.</p><div className="author-fields">MATHEMATICS · STATISTICS · DATA SCIENCE · AI · ECONOMICS · POLITICS</div></div>
    </section>
    </main>

    <footer><div className="brand"><span className="brand-mark">01</span><span><b>Binary Light Lab</b><small>AI Principles &amp; Applications</small></span></div><a href="#top">Top ↑</a></footer>
  </>;
}

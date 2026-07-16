import { useState, useEffect, useRef } from "react";
import { Trophy, Zap, History, Loader2, Hash, X, Sparkles, ChevronRight, Trash2, RotateCcw } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const METRICS = [
  { key: "hook", label: "Hook" },
  { key: "clarity", label: "Clarity" },
  { key: "emotionalImpact", label: "Emotion" },
  { key: "shareability", label: "Shareability" },
  { key: "ctaStrength", label: "CTA Pull" },
  { key: "formatting", label: "Format" },
];

const HISTORY_KEY = "postduel-history";

function CharCount({ text }) {
  const len = text.length;
  const over = len > 280;
  return (
    <span className={`char-count ${over ? "over" : ""}`}>
      {len}/280
    </span>
  );
}

function ScoreBar({ label, a, b }) {
  const total = a + b || 1;
  const aPct = (a / total) * 100;
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div className="score-fill a" style={{ width: `${aPct}%` }} />
        <div className="score-fill b" style={{ width: `${100 - aPct}%` }} />
      </div>
      <span className="score-nums">
        <b className="numa">{a}</b> <i>/</i> <b className="numb">{b}</b>
      </span>
    </div>
  );
}

export default function PostDuel() {
  const [postA, setPostA] = useState("");
  const [postB, setPostB] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("duel");
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(HISTORY_KEY, false);
        if (res && res.value) setHistory(JSON.parse(res.value));
      } catch (e) {
        // no history yet
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, []);

  async function saveHistory(next) {
    setHistory(next);
    try {
      await window.storage.set(HISTORY_KEY, JSON.stringify(next.slice(0, 30)), false);
    } catch (e) {
      console.error("Storage error", e);
    }
  }

  async function runDuel() {
    setError(null);
    if (!postA.trim() || !postB.trim()) {
      setError("Enter both posts before starting the duel.");
      return;
    }
    setIsComparing(true);
    setResult(null);

    const system = `You are a ruthless, expert social media strategist judging two X (Twitter) posts in a head-to-head duel. Score each post from 0-100 on these six axes: hook (does the first line stop the scroll), clarity (is the point instantly understandable), emotionalImpact (does it make the reader feel something), shareability (would people repost/quote it), ctaStrength (does it invite replies, clicks, or action), formatting (line breaks, rhythm, readability). Then decide an overall winner. Respond ONLY with raw JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "scoresA": {"hook":0,"clarity":0,"emotionalImpact":0,"shareability":0,"ctaStrength":0,"formatting":0},
  "scoresB": {"hook":0,"clarity":0,"emotionalImpact":0,"shareability":0,"ctaStrength":0,"formatting":0},
  "overallA": 0,
  "overallB": 0,
  "winner": "A",
  "verdict": "one punchy sentence explaining the win",
  "noteA": "one short sentence on Post A's biggest strength or flaw",
  "noteB": "one short sentence on Post B's biggest strength or flaw"
}`;

    const userMsg = `POST A:\n"""${postA}"""\n\nPOST B:\n"""${postB}"""`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("No response text");
      const clean = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);

      const entry = {
        id: Date.now(),
        postA,
        postB,
        winner: parsed.winner,
        overallA: parsed.overallA,
        overallB: parsed.overallB,
        verdict: parsed.verdict,
      };
      await saveHistory([entry, ...history]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      console.error(e);
      setError("The judge choked. Try again in a moment.");
    } finally {
      setIsComparing(false);
    }
  }

  function loadFromHistory(entry) {
    setPostA(entry.postA);
    setPostB(entry.postB);
    setResult(null);
    setTab("duel");
  }

  async function deleteEntry(id) {
    const next = history.filter((h) => h.id !== id);
    await saveHistory(next);
  }

  function newDuel() {
    setPostA("");
    setPostB("");
    setResult(null);
    setError(null);
  }

  const radarData = result
    ? METRICS.map((m) => ({
        metric: m.label,
        A: result.scoresA[m.key],
        B: result.scoresB[m.key],
      }))
    : [];

  return (
    <div className="pd-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .pd-root {
          --ink: #0B0F14;
          --panel: #12181F;
          --panel-2: #171F28;
          --line: #232D38;
          --cream: #F2EFE9;
          --dim: #8B97A3;
          --corner-a: #00D9C0;
          --corner-a-dim: #0A3B36;
          --corner-b: #FF5A3C;
          --corner-b-dim: #3B1C13;
          --gold: #FFC53D;
          font-family: 'Inter', sans-serif;
          background: var(--ink);
          color: var(--cream);
          min-height: 100%;
          padding: 28px 20px 60px;
          box-sizing: border-box;
        }
        .pd-root * { box-sizing: border-box; }
        .pd-shell { max-width: 880px; margin: 0 auto; }

        .pd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .pd-brand { display: flex; align-items: center; gap: 10px; }
        .pd-brand-mark {
          width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, var(--corner-a), var(--corner-b));
          display: flex; align-items: center; justify-content: center;
          transform: rotate(-6deg);
        }
        .pd-title {
          font-family: 'Archivo Black', sans-serif;
          font-size: 22px;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .pd-tagline { color: var(--dim); font-size: 13px; margin-top: 2px; }

        .pd-tabs { display: flex; gap: 6px; background: var(--panel); padding: 4px; border-radius: 10px; border: 1px solid var(--line); }
        .pd-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 7px; font-size: 13px; font-weight: 600;
          color: var(--dim); cursor: pointer; border: none; background: transparent;
          transition: all 0.15s ease;
        }
        .pd-tab.active { background: var(--panel-2); color: var(--cream); }
        .pd-tab:hover:not(.active) { color: var(--cream); }

        .arena {
          display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px;
          align-items: stretch; margin-bottom: 18px;
        }
        @media (max-width: 640px) {
          .arena { grid-template-columns: 1fr; }
          .vs-divider { display: none; }
        }
        .corner {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px;
          display: flex; flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .corner.a { border-top: 3px solid var(--corner-a); }
        .corner.b { border-top: 3px solid var(--corner-b); }
        .corner-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; margin-bottom: 10px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .corner.a .corner-label { color: var(--corner-a); }
        .corner.b .corner-label { color: var(--corner-b); }
        .corner textarea {
          background: var(--ink);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--cream);
          font-family: 'Inter', sans-serif;
          font-size: 14.5px;
          line-height: 1.45;
          padding: 12px;
          resize: none;
          min-height: 140px;
          flex: 1;
          outline: none;
        }
        .corner.a textarea:focus { border-color: var(--corner-a); }
        .corner.b textarea:focus { border-color: var(--corner-b); }
        .char-count { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--dim); }
        .char-count.over { color: var(--corner-b); font-weight: 700; }

        .winner-stamp {
          position: absolute; top: 10px; right: 10px;
          background: var(--gold); color: #1a1400;
          font-family: 'Archivo Black', sans-serif;
          font-size: 10px; padding: 4px 8px; border-radius: 5px;
          transform: rotate(6deg);
          display: flex; align-items: center; gap: 4px;
        }

        .vs-divider {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Archivo Black', sans-serif;
          font-size: 20px; color: var(--dim); padding: 0 4px;
        }

        .cta-row { display: flex; justify-content: center; margin: 8px 0 24px; }
        .duel-btn {
          font-family: 'Archivo Black', sans-serif;
          font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase;
          background: var(--cream); color: var(--ink);
          border: none; border-radius: 999px;
          padding: 14px 34px; cursor: pointer;
          display: flex; align-items: center; gap: 10px;
          transition: transform 0.12s ease;
        }
        .duel-btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.02); }
        .duel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .error-msg {
          text-align: center; color: var(--corner-b); font-size: 13px; margin-bottom: 16px;
          font-weight: 600;
        }

        .result-panel {
          background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
          padding: 24px; margin-top: 8px;
        }
        .verdict-line {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Archivo Black', sans-serif;
          font-size: 18px; margin-bottom: 4px;
        }
        .verdict-line .win-tag { color: var(--gold); }
        .verdict-sub { color: var(--dim); font-size: 14px; margin-bottom: 20px; }

        .overall-row { display: flex; gap: 16px; margin-bottom: 20px; }
        .overall-card {
          flex: 1; background: var(--panel-2); border-radius: 10px; padding: 14px;
          border: 1px solid var(--line);
        }
        .overall-card.win { border-color: var(--gold); }
        .overall-card .oc-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--dim); text-transform: uppercase; }
        .overall-card .oc-score { font-family: 'Archivo Black', sans-serif; font-size: 30px; margin: 4px 0; }
        .overall-card.a .oc-score { color: var(--corner-a); }
        .overall-card.b .oc-score { color: var(--corner-b); }
        .overall-card .oc-note { font-size: 12.5px; color: var(--dim); line-height: 1.4; }

        .chart-wrap { height: 240px; margin-bottom: 16px; }
        .legend-row { display: flex; gap: 20px; justify-content: center; font-size: 12px; color: var(--dim); margin-bottom: 20px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }

        .score-breakdown { display: flex; flex-direction: column; gap: 10px; }
        .score-row { display: grid; grid-template-columns: 70px 1fr 70px; align-items: center; gap: 10px; }
        .score-label { font-size: 12px; color: var(--dim); font-weight: 600; }
        .score-track { height: 8px; background: var(--panel-2); border-radius: 999px; display: flex; overflow: hidden; }
        .score-fill { height: 100%; }
        .score-fill.a { background: var(--corner-a); }
        .score-fill.b { background: var(--corner-b); }
        .score-nums { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: right; color: var(--dim); }
        .numa { color: var(--corner-a); } .numb { color: var(--corner-b); }

        .new-duel-btn {
          margin-top: 20px; width: 100%;
          background: transparent; border: 1px dashed var(--line); color: var(--dim);
          border-radius: 10px; padding: 12px; cursor: pointer; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .new-duel-btn:hover { border-color: var(--cream); color: var(--cream); }

        .history-list { display: flex; flex-direction: column; gap: 10px; }
        .history-empty { text-align: center; color: var(--dim); padding: 60px 20px; font-size: 14px; }
        .history-item {
          background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
          padding: 14px 16px; display: flex; align-items: center; gap: 14px; cursor: pointer;
        }
        .history-item:hover { border-color: var(--dim); }
        .h-winner-badge {
          font-family: 'Archivo Black', sans-serif; font-size: 11px; width: 28px; height: 28px;
          border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .h-winner-badge.A { background: var(--corner-a-dim); color: var(--corner-a); }
        .h-winner-badge.B { background: var(--corner-b-dim); color: var(--corner-b); }
        .h-content { flex: 1; min-width: 0; }
        .h-verdict { font-size: 13px; color: var(--cream); font-weight: 600; margin-bottom: 3px; }
        .h-snippets { font-size: 11.5px; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .h-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .h-icon-btn { background: transparent; border: none; color: var(--dim); cursor: pointer; padding: 6px; border-radius: 6px; }
        .h-icon-btn:hover { color: var(--cream); background: var(--panel-2); }
      `}</style>

      <div className="pd-shell">
        <div className="pd-header">
          <div className="pd-brand">
            <div className="pd-brand-mark"><Zap size={18} color="#0B0F14" fill="#0B0F14" /></div>
            <div>
              <div className="pd-title">Post Duel</div>
              <div className="pd-tagline">Two posts enter. One gets judged the winner.</div>
            </div>
          </div>
          <div className="pd-tabs">
            <button className={`pd-tab ${tab === "duel" ? "active" : ""}`} onClick={() => setTab("duel")}>
              <Zap size={14} /> Duel
            </button>
            <button className={`pd-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
              <History size={14} /> History
            </button>
          </div>
        </div>

        {tab === "duel" && (
          <>
            <div className="arena">
              <div className="corner a">
                <div className="corner-label">
                  <span>Post A</span>
                  <CharCount text={postA} />
                </div>
                <textarea
                  placeholder="Paste or write the first post..."
                  value={postA}
                  onChange={(e) => setPostA(e.target.value)}
                />
                {result?.winner === "A" && (
                  <div className="winner-stamp"><Trophy size={11} /> WINNER</div>
                )}
              </div>

              <div className="vs-divider">VS</div>

              <div className="corner b">
                <div className="corner-label">
                  <span>Post B</span>
                  <CharCount text={postB} />
                </div>
                <textarea
                  placeholder="Paste or write the second post..."
                  value={postB}
                  onChange={(e) => setPostB(e.target.value)}
                />
                {result?.winner === "B" && (
                  <div className="winner-stamp"><Trophy size={11} /> WINNER</div>
                )}
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="cta-row">
              <button className="duel-btn" onClick={runDuel} disabled={isComparing}>
                {isComparing ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    Judging...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Start the Duel
                  </>
                )}
              </button>
            </div>

            {result && (
              <div className="result-panel" ref={resultRef}>
                <div className="verdict-line">
                  <Trophy size={20} color="#FFC53D" />
                  Post <span className="win-tag">{result.winner}</span> wins
                </div>
                <div className="verdict-sub">{result.verdict}</div>

                <div className="overall-row">
                  <div className={`overall-card a ${result.winner === "A" ? "win" : ""}`}>
                    <div className="oc-label">Post A</div>
                    <div className="oc-score">{result.overallA}</div>
                    <div className="oc-note">{result.noteA}</div>
                  </div>
                  <div className={`overall-card b ${result.winner === "B" ? "win" : ""}`}>
                    <div className="oc-label">Post B</div>
                    <div className="oc-score">{result.overallB}</div>
                    <div className="oc-note">{result.noteB}</div>
                  </div>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="#232D38" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#8B97A3", fontSize: 11 }} />
                      <Radar name="Post A" dataKey="A" stroke="#00D9C0" fill="#00D9C0" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Post B" dataKey="B" stroke="#FF5A3C" fill="#FF5A3C" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend-row">
                  <span><span className="legend-dot" style={{ background: "#00D9C0" }} />Post A</span>
                  <span><span className="legend-dot" style={{ background: "#FF5A3C" }} />Post B</span>
                </div>

                <div className="score-breakdown">
                  {METRICS.map((m) => (
                    <ScoreBar key={m.key} label={m.label} a={result.scoresA[m.key]} b={result.scoresB[m.key]} />
                  ))}
                </div>

                <button className="new-duel-btn" onClick={newDuel}>
                  <RotateCcw size={13} /> Start a new duel
                </button>
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div className="history-list">
            {!historyLoaded ? (
              <div className="history-empty">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="history-empty">No duels yet. Fought battles will show up here.</div>
            ) : (
              history.map((h) => (
                <div className="history-item" key={h.id} onClick={() => loadFromHistory(h)}>
                  <div className={`h-winner-badge ${h.winner}`}>{h.winner}</div>
                  <div className="h-content">
                    <div className="h-verdict">{h.verdict}</div>
                    <div className="h-snippets">
                      A: {h.postA.slice(0, 40)}{h.postA.length > 40 ? "…" : ""} · B: {h.postB.slice(0, 40)}{h.postB.length > 40 ? "…" : ""}
                    </div>
                  </div>
                  <div className="h-actions">
                    <button className="h-icon-btn" onClick={(e) => { e.stopPropagation(); deleteEntry(h.id); }}>
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} color="#8B97A3" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

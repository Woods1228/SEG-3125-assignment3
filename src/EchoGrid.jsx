import React, { useState, useRef, useCallback, useEffect } from "react";

/**
 * EchoGrid — a spatial sequence-recall memory game.
*/

const SHAPE_THEMES = {
  // render(size, color?) — color overrides currentColor when provided
  circle: { label: "circles", render: (size, color) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color || "currentColor", display: "block" }} />
  )},
  square: { label: "squares", render: (size, color) => (
    <div style={{ width: size * 0.78, height: size * 0.78, borderRadius: 4, background: color || "currentColor", display: "block" }} />
  )},
  triangle: { label: "triangles", render: (size, color) => (
    <div style={{
      width: 0, height: 0,
      borderLeft: `${size * 0.5}px solid transparent`,
      borderRight: `${size * 0.5}px solid transparent`,
      borderBottom: `${size * 0.86}px solid ${color || "currentColor"}`,
    }} />
  )},
};

const PALETTES = {
  warm: { name: "warm", accent: "#D85A30", accentSoft: "#F5C4B3", glow: "#D85A3055" },
  cool: { name: "cool", accent: "#185FA5", accentSoft: "#B5D4F4", glow: "#185FA555" },
  forest: { name: "forest", accent: "#3B6D11", accentSoft: "#C0DD97", glow: "#3B6D1155" },
};

const LEVELS = {
  novice: { gridSize: 3, startLength: 3, label: "novice" },
  adept: { gridSize: 4, startLength: 4, label: "adept" },
  master: { gridSize: 5, startLength: 5, label: "master" },
};

const PHASE = { SETUP: "setup", SHOWING: "showing", INPUT: "input", FEEDBACK: "feedback", GAMEOVER: "gameover" };

function useTimeout() {
  const ids = useRef([]);
  const set = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    ids.current.push(id);
    return id;
  }, []);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return set;
}

export default function EchoGrid() {
  const [level, setLevel] = useState("novice");
  const [shapeKey, setShapeKey] = useState("circle");
  const [paletteKey, setPaletteKey] = useState("warm");
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [sequence, setSequence] = useState([]);
  const [playerInput, setPlayerInput] = useState([]);
  const [activeTile, setActiveTile] = useState(null);
  const [wrongTile, setWrongTile] = useState(null);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState(0);

  const setSafeTimeout = useTimeout();
  const palette = PALETTES[paletteKey];
  const shape = SHAPE_THEMES[shapeKey];
  const gridSize = LEVELS[level].gridSize;
  const tileCount = gridSize * gridSize;

  const startGame = () => {
    const startLength = LEVELS[level].startLength;
    const seq = Array.from({ length: startLength }, () => Math.floor(Math.random() * tileCount));
    setSequence(seq);
    setRound(startLength);
    setPlayerInput([]);
    playSequence(seq);
  };

  const playSequence = (seq) => {
    setPhase(PHASE.SHOWING);
    seq.forEach((tileIndex, i) => {
      setSafeTimeout(() => setActiveTile(tileIndex), i * 700);
      setSafeTimeout(() => setActiveTile(null), i * 700 + 450);
    });
    setSafeTimeout(() => {
      setPhase(PHASE.INPUT);
      setPlayerInput([]);
    }, seq.length * 700 + 200);
  };

  const handleTileClick = (index) => {
    if (phase !== PHASE.INPUT) return;
    const expected = sequence[playerInput.length];
    if (index === expected) {
      const next = [...playerInput, index];
      setPlayerInput(next);
      setActiveTile(index);
      setSafeTimeout(() => setActiveTile(null), 250);
      if (next.length === sequence.length) {
        setBest((b) => Math.max(b, sequence.length));
        setSafeTimeout(() => {
          const longer = [...sequence, Math.floor(Math.random() * tileCount)];
          setSequence(longer);
          setRound(longer.length);
          setPlayerInput([]);
          playSequence(longer);
        }, 500);
      }
    } else {
      setWrongTile(index);
      setBest((b) => Math.max(b, sequence.length - 1));
      setSafeTimeout(() => {
        setWrongTile(null);
        setPhase(PHASE.GAMEOVER);
      }, 500);
    }
  };

  const resetToSetup = () => {
    setPhase(PHASE.SETUP);
    setSequence([]);
    setPlayerInput([]);
    setRound(0);
  };

  const tileSize = gridSize === 3 ? 84 : gridSize === 4 ? 68 : 54;
  const shapeRenderSize = tileSize * 0.42;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.title}>EchoGrid</h1>
          <p style={styles.subtitle}>watch the path, then trace it back</p>
        </header>

        {phase === PHASE.SETUP && (
          <SetupPanel
            level={level} setLevel={setLevel}
            shapeKey={shapeKey} setShapeKey={setShapeKey}
            paletteKey={paletteKey} setPaletteKey={setPaletteKey}
            palette={palette}
            onStart={startGame}
          />
        )}

        {(phase === PHASE.SHOWING || phase === PHASE.INPUT) && (
          <GamePanel
            gridSize={gridSize}
            tileCount={tileCount}
            tileSize={tileSize}
            shapeRenderSize={shapeRenderSize}
            shape={shape}
            palette={palette}
            activeTile={activeTile}
            wrongTile={wrongTile}
            phase={phase}
            round={round}
            progress={playerInput.length}
            target={sequence.length}
            onTileClick={handleTileClick}
          />
        )}

        {phase === PHASE.GAMEOVER && (
          <GameOverPanel
            reached={best}
            level={LEVELS[level].label}
            palette={palette}
            onRetry={startGame}
            onChangeSetup={resetToSetup}
          />
        )}
      </div>
    </div>
  );
}

function SetupPanel({ level, setLevel, shapeKey, setShapeKey, paletteKey, setPaletteKey, palette, onStart }) {
  return (
    <div style={styles.setupBody}>
      <Field label="level">
        <div style={styles.segmented}>
          {Object.entries(LEVELS).map(([key, v]) => (
            <button
              key={key}
              onClick={() => setLevel(key)}
              style={{
                ...styles.segment,
                ...(level === key ? { background: "#1A1A18", color: "#fff" } : {}),
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="tile shape">
        <div style={styles.swatchRow}>
          {Object.entries(SHAPE_THEMES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setShapeKey(key)}
              aria-label={s.label}
              style={{
                ...styles.shapeSwatch,
                borderColor: shapeKey === key ? "#1A1A18" : "#D8D8D2",
                color: shapeKey === key ? "#1A1A18" : "#9A9A92",
              }}
            >
              {s.render(28, shapeKey === key ? "#1A1A18" : "#9A9A92")}
            </button>
          ))}
        </div>
      </Field>

      <Field label="color theme">
        <div style={styles.swatchRow}>
          {Object.entries(PALETTES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPaletteKey(key)}
              aria-label={p.name}
              style={{
                ...styles.colorSwatch,
                background: p.accent,
                outline: paletteKey === key ? "2px solid #1A1A18" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </Field>

      <button style={{ ...styles.primaryButton, background: palette.accent }} onClick={onStart}>
        begin
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <p style={styles.fieldLabel}>{label}</p>
      {children}
    </div>
  );
}

function GamePanel({ gridSize, tileCount, tileSize, shapeRenderSize, shape, palette, activeTile, wrongTile, phase, round, progress, target, onTileClick }) {
  return (
    <div style={styles.gameBody}>
      <div style={styles.statusRow}>
        <span style={styles.statusText}>
          {phase === PHASE.SHOWING ? "watch closely" : "your turn"}
        </span>
        <span style={styles.statusMeta}>round {round}</span>
      </div>

      <div style={styles.progressDots} aria-hidden="true">
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            style={{
              ...styles.dot,
              background: i < progress ? palette.accent : "#E3E3DD",
            }}
          />
        ))}
      </div>

      <div
        style={{
          ...styles.board,
          gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
        }}
        role="group"
        aria-label="memory grid"
      >
        {Array.from({ length: tileCount }, (_, i) => {
          const isActive = activeTile === i;
          const isWrong = wrongTile === i;
          return (
            <button
              key={i}
              onClick={() => onTileClick(i)}
              disabled={phase !== PHASE.INPUT}
              aria-label={`tile ${i + 1}`}
              style={{
                ...styles.tile,
                width: tileSize,
                height: tileSize,
                color: isWrong ? "#791F1F" : palette.accent,
                background: isWrong ? "#FCEBEB" : isActive ? palette.accentSoft : "#FAFAF8",
                borderColor: isWrong ? "#E24B4A" : isActive ? palette.accent : "#D8D8D2",
                boxShadow: isActive ? `0 0 0 6px ${palette.glow}` : "none",
                cursor: phase === PHASE.INPUT ? "pointer" : "default",
              }}
            >
              {(isActive || (phase === PHASE.INPUT && false)) && shape.render(shapeRenderSize)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GameOverPanel({ reached, level, palette, onRetry, onChangeSetup }) {
  return (
    <div style={styles.overBody}>
      <div style={{ ...styles.overIcon, background: palette.accentSoft, color: palette.accent }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h2 style={styles.overTitle}>sequence broken</h2>
      <p style={styles.overMeta}>{reached} tiles recalled &middot; {level} level</p>
      <div style={styles.overActions}>
        <button style={styles.secondaryButton} onClick={onChangeSetup}>change setup</button>
        <button style={{ ...styles.primaryButton, background: palette.accent }} onClick={onRetry}>play again</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: 480,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F1EFE8",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: 24,
  },
  card: {
    width: 420,
    background: "#FFFFFF",
    border: "1px solid #E3E3DD",
    borderRadius: 16,
    padding: "28px 28px 32px",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 600, color: "#1A1A18", margin: 0, letterSpacing: 0.3 },
  subtitle: { fontSize: 13, color: "#8A8A82", margin: "6px 0 0" },

  setupBody: { display: "flex", flexDirection: "column", gap: 22 },
  field: { display: "flex", flexDirection: "column", gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: 500, color: "#8A8A82", margin: 0, letterSpacing: 0.4 },
  segmented: { display: "flex", border: "1.5px solid #1A1A18", borderRadius: 10, overflow: "hidden" },
  segment: {
    flex: 1, padding: "10px 0", border: "none", background: "#fff",
    color: "#5A5A52", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  swatchRow: { display: "flex", gap: 10 },
  shapeSwatch: {
    width: 48, height: 48, borderRadius: 10, border: "1.5px solid",
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  colorSwatch: { width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer" },
  primaryButton: {
    marginTop: 4, padding: "13px 0", borderRadius: 12, border: "none",
    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  secondaryButton: {
    padding: "13px 0", borderRadius: 12, border: "1.5px solid #1A1A18",
    background: "#fff", color: "#1A1A18", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1,
  },

  gameBody: { display: "flex", flexDirection: "column", alignItems: "center", gap: 18 },
  statusRow: { display: "flex", justifyContent: "space-between", width: "100%" },
  statusText: { fontSize: 14, fontWeight: 500, color: "#1A1A18" },
  statusMeta: { fontSize: 12, color: "#8A8A82" },
  progressDots: { display: "flex", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: "50%", transition: "background 0.2s" },
  board: { display: "grid", gap: 6 },
  tile: {
    borderRadius: 10, border: "1.5px solid", display: "flex",
    alignItems: "center", justifyContent: "center", transition: "all 0.15s",
    padding: 0,
  },

  overBody: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 0" },
  overIcon: { width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  overTitle: { fontSize: 18, fontWeight: 600, color: "#1A1A18", margin: 0 },
  overMeta: { fontSize: 13, color: "#8A8A82", margin: 0 },
  overActions: { display: "flex", gap: 10, width: "100%", marginTop: 14 },
};

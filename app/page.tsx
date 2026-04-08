"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Platform = "x" | "instagram";
type XVar = {
  styleRef: string;
  text: string;
  inspiration?: { url: string; author: string; postedAt: string; summary?: string };
};
type IGVar = { name: string; html: string };

export default function Page() {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [prompt, setPrompt] = useState("");
  const [surprise, setSurprise] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [slides, setSlides] = useState(1);

  const [loading, setLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xVars, setXVars] = useState<XVar[]>([]);
  const [igVars, setIgVars] = useState<IGVar[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const totalSteps = platform === "instagram" ? 5 : 3;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const canNext = useMemo(() => {
    if (step === 1) return platform !== null;
    if (step === 2) return surprise || prompt.trim().length > 0;
    if (step === 3 && platform === "instagram") return true; // images optional
    if (step === 4 && platform === "instagram") return slides >= 1;
    return true;
  }, [step, platform, prompt, surprise, slides]);

  const next = useCallback(() => {
    if (!canNext) return;
    if (platform === "x" && step === 2) {
      generate();
      return;
    }
    if (platform === "instagram" && step === 4) {
      generate();
      return;
    }
    setStep((s) => s + 1);
  }, [canNext, step, platform]);

  const prev = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (step === 1) {
        if (e.key === "1") setPlatform("instagram");
        if (e.key === "2") setPlatform("x");
      }
      if (e.key === "Enter") next();
      if (e.key === "Backspace" && step > 1) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, next, prev]);

  async function generate() {
    setLoading(true);
    setError(null);
    setXVars([]);
    setIgVars([]);
    setCaption("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform, prompt, surprise, slides })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      if (platform === "x") {
        setXVars(json.variations || []);
      } else {
        setCaption(json.caption || "");
        setIgVars(json.variations || []);
      }
      setStep(totalSteps + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function editVariation(idx: number, instruction: string, selection?: string) {
    setEditingIdx(idx);
    setError(null);
    try {
      const current = platform === "x" ? xVars[idx].text : igVars[idx].html;
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform, current, selection, instruction })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (platform === "x") {
        const next = [...xVars];
        next[idx] = { ...next[idx], text: json.text };
        setXVars(next);
      } else {
        const next = [...igVars];
        next[idx] = { ...next[idx], html: json.html };
        setIgVars(next);
      }
      showToast("updated");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEditingIdx(null);
    }
  }

  // UI
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">Foundess / Content Engine</div>
        <div className="stepdots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={"stepdot " + (step === i + 1 ? "current" : step > i + 1 ? "done" : "")}
            />
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {step === 1 && (
        <>
          <h1 className="step-q">What platform do you want to post on?</h1>
          <div className="choices">
            <button
              className="choice"
              style={platform === "instagram" ? { background: "var(--lavender)" } : {}}
              onClick={() => setPlatform("instagram")}
            >
              Instagram
              <span className="kbd">press 1</span>
            </button>
            <button
              className="choice"
              style={platform === "x" ? { background: "var(--lavender)" } : {}}
              onClick={() => setPlatform("x")}
            >
              X
              <span className="kbd">press 2</span>
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="step-q">What do you want to say?</h1>
          <h2 className="step-sub">Describe the post, or hit <em>surprise me</em>.</h2>
          <textarea
            placeholder="e.g. Announce our founder cafe meetup with @framer and @carotlynscafe in SoHo on Nov 2."
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (e.target.value) setSurprise(false);
            }}
          />
          <div style={{ marginTop: 12 }}>
            <button
              className={surprise ? "accent" : ""}
              onClick={() => {
                setSurprise(!surprise);
                if (!surprise) setPrompt("");
              }}
            >
              {surprise ? "✓ surprise me" : "surprise me"}
            </button>
          </div>
        </>
      )}

      {step === 3 && platform === "instagram" && (
        <>
          <h1 className="step-q">Any images or graphics?</h1>
          <h2 className="step-sub">Optional. Drag and drop, or skip.</h2>
          <Dropzone onFiles={(fs) => setImages([...images, ...fs])} />
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" />
              ))}
            </div>
          )}
        </>
      )}

      {step === 4 && platform === "instagram" && (
        <>
          <h1 className="step-q">How many slides?</h1>
          <input
            type="number"
            min={1}
            max={10}
            value={slides}
            onChange={(e) => setSlides(parseInt(e.target.value) || 1)}
          />
        </>
      )}

      {step > totalSteps && (
        <>
          <h1 className="step-q">{loading ? "Generating…" : "Your variations"}</h1>
          {platform === "x" && xVars.length > 0 && (
            <div className="variations">
              {xVars.map((v, i) => (
                <XCard
                  key={i}
                  v={v}
                  busy={editingIdx === i}
                  onCopy={() => {
                    navigator.clipboard.writeText(v.text);
                    showToast("copied to clipboard");
                  }}
                  onEdit={(instruction, selection) => editVariation(i, instruction, selection)}
                />
              ))}
            </div>
          )}
          {platform === "instagram" && igVars.length > 0 && (
            <>
              <div className="card" style={{ marginBottom: 24 }}>
                <h3>Caption</h3>
                <div className="xtext">{caption}</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(caption);
                    showToast("caption copied");
                  }}
                >
                  copy caption
                </button>
              </div>
              <div className="variations">
                {igVars.map((v, i) => (
                  <IGCard
                    key={i}
                    index={i}
                    v={v}
                    busy={editingIdx === i}
                    onEdit={(instruction) => editVariation(i, instruction)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="nav">
        {step > 1 && step <= totalSteps && <button onClick={prev}>← previous</button>}
        <div className="spacer" />
        {step <= totalSteps && (
          <button className="primary" onClick={next} disabled={!canNext || loading}>
            {loading
              ? "…"
              : (platform === "x" && step === 2) || (platform === "instagram" && step === 4)
              ? "generate →"
              : "next →"}
          </button>
        )}
        {step > totalSteps && (
          <button
            onClick={() => {
              setStep(1);
              setXVars([]);
              setIgVars([]);
              setCaption("");
              setPrompt("");
              setSurprise(false);
              setImages([]);
              setSlides(1);
              setPlatform(null);
            }}
          >
            start over
          </button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Dropzone({ onFiles }: { onFiles: (f: File[]) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={"dropzone" + (drag ? " drag" : "")}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
      drop images here or click to upload
    </div>
  );
}

function XCard({
  v,
  busy,
  onCopy,
  onEdit
}: {
  v: XVar;
  busy: boolean;
  onCopy: () => void;
  onEdit: (instruction: string, selection?: string) => void;
}) {
  const [instr, setInstr] = useState("");
  const [sel, setSel] = useState<string>("");
  return (
    <div className="card" style={{ position: "relative" }}>
      <h3>{v.styleRef}</h3>
      <div
        className="xtext"
        onMouseUp={() => {
          const s = window.getSelection()?.toString() || "";
          if (s) setSel(s);
        }}
      >
        {v.text}
      </div>
      {v.inspiration && (
        <div className="inspo">
          <small>inspired by</small>
          <a href={v.inspiration.url} target="_blank" rel="noreferrer">
            {v.inspiration.author} — {v.inspiration.postedAt}
          </a>
          {v.inspiration.summary && <small>{v.inspiration.summary}</small>}
        </div>
      )}
      <button onClick={onCopy}>copy</button>
      <div className="edit-panel">
        {sel && <small>editing: "{sel.slice(0, 40)}…"</small>}
        <input
          type="text"
          placeholder="describe a change…"
          value={instr}
          disabled={busy}
          onChange={(e) => setInstr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && instr) {
              onEdit(instr, sel || undefined);
              setInstr("");
              setSel("");
            }
          }}
        />
      </div>
      {busy && <LoadingOverlay label="rewriting…" />}
    </div>
  );
}

function IGCard({
  index,
  v,
  busy,
  onEdit
}: {
  index: number;
  v: IGVar;
  busy: boolean;
  onEdit: (instruction: string) => void;
}) {
  const [instr, setInstr] = useState("");
  function downloadHtml() {
    const blob = new Blob([v.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foundess-slide-${index + 1}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  return (
    <div className="card" style={{ position: "relative" }}>
      <h3>{v.name}</h3>
      <div className="ig-frame">
        <iframe srcDoc={v.html} sandbox="allow-same-origin" />
      </div>
      <button onClick={downloadHtml}>download html/css</button>
      <div className="edit-panel">
        <small>describe element-level changes (background, heading, layout…)</small>
        <input
          type="text"
          placeholder="e.g. make the heading lime on black"
          value={instr}
          disabled={busy}
          onChange={(e) => setInstr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && instr) {
              onEdit(instr);
              setInstr("");
            }
          }}
        />
      </div>
      {busy && <LoadingOverlay label="redesigning…" />}
    </div>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div>{label}</div>
    </div>
  );
}

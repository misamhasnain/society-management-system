import { useEffect, useState } from "react";
import api from "../../api/axios";
import LoadingSpinner from "../ui/LoadingSpinner";

// Zoom levels as a share of the viewer width. -1 index = "Fit to screen".
const LEVELS = [1, 1.5, 2, 3, 4];

function ZoomBar({ zoomIdx, setZoomIdx, onFullscreen, fullscreen }) {
  const label = zoomIdx < 0 ? "Fit" : `${Math.round(LEVELS[zoomIdx] * 100)}%`;
  const btn =
    "px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button type="button" className={btn} onClick={() => setZoomIdx((i) => Math.max(i - 1, -1))} disabled={zoomIdx <= -1} aria-label="Zoom out">
        −
      </button>
      <span className="min-w-[44px] text-center text-xs font-bold text-gray-700">{label}</span>
      <button type="button" className={btn} onClick={() => setZoomIdx((i) => Math.min(i + 1, LEVELS.length - 1))} disabled={zoomIdx >= LEVELS.length - 1} aria-label="Zoom in">
        +
      </button>
      <button type="button" className={btn} onClick={() => setZoomIdx(-1)} disabled={zoomIdx === -1}>
        Fit
      </button>
      <button type="button" className={btn} onClick={onFullscreen}>
        {fullscreen ? "✕ Close" : "⛶ Full screen"}
      </button>
    </div>
  );
}

// Securely loads a payment proof (cookie-authenticated), then previews it with zoom.
export default function ProofViewer({ proofId, mimeType, name, fileUrl }) {
  // fileUrl lets the same viewer show utility bills (e.g. `/utility-bills/<id>/file`).
  // Defaults to payment proofs, so existing usages keep working.
  const endpoint = fileUrl || `/payment-proofs/${proofId}/file`;
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(-1);
  const [full, setFull] = useState(false);
  const isPdf = mimeType?.includes("pdf");

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    setUrl(null);
    setError(false);
    setZoomIdx(-1);
    api
      .get(endpoint, { responseType: "blob" })
      .then((r) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(r.data);
        setUrl(objectUrl);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [endpoint]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  if (error) {
    return <div className="p-6 text-center text-xs text-rose-600 bg-rose-50 rounded-xl">Could not load the uploaded file.</div>;
  }
  if (!url) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const toggleZoom = () => setZoomIdx((i) => (i < 0 ? 2 : -1)); // double-click: fit <-> 200%

  const renderSurface = (heightClass) => (
    <div className={`border border-gray-200 rounded-xl bg-gray-900 overflow-auto ${heightClass}`}>
      {isPdf ? (
        <iframe src={url} title="Payment proof PDF" className="w-full h-full min-h-[320px] border-none bg-white" />
      ) : zoomIdx < 0 ? (
        <div className="w-full h-full flex items-center justify-center p-1">
          <img
            src={url}
            alt="Uploaded payment proof"
            onDoubleClick={toggleZoom}
            className="max-w-full max-h-full object-contain cursor-zoom-in"
          />
        </div>
      ) : (
        <img
          src={url}
          alt="Uploaded payment proof"
          onDoubleClick={toggleZoom}
          style={{ width: `${LEVELS[zoomIdx] * 100}%`, maxWidth: "none" }}
          className="block h-auto cursor-zoom-out"
        />
      )}
    </div>
  );

  const links = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">
        ↗ Open in new tab
      </a>
      <a href={url} download={name} className="text-xs font-bold text-indigo-600 hover:underline">
        💾 Download original
      </a>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isPdf ? (
          <p className="text-[11px] text-gray-500">PDF document · use the PDF toolbar to zoom, or open full screen.</p>
        ) : (
          <ZoomBar zoomIdx={zoomIdx} setZoomIdx={setZoomIdx} onFullscreen={() => setFull(true)} />
        )}
        {isPdf && (
          <button
            type="button"
            onClick={() => setFull(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            ⛶ Full screen
          </button>
        )}
      </div>

      {renderSurface("h-[50vh] min-h-[280px]")}
      {!isPdf && <p className="text-[10px] text-gray-400">Tip: double-click the image to zoom, scroll to pan. Pinch also works on touch screens.</p>}
      {links}

      {full && (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 flex flex-col p-3 sm:p-5 gap-3" role="dialog" aria-modal="true">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-white truncate max-w-full">{name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {!isPdf && <ZoomBar zoomIdx={zoomIdx} setZoomIdx={setZoomIdx} onFullscreen={() => setFull(false)} fullscreen />}
              {isPdf && (
                <button
                  type="button"
                  onClick={() => setFull(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700"
                >
                  ✕ Close
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0">{renderSurface("h-full")}</div>
        </div>
      )}
    </div>
  );
}
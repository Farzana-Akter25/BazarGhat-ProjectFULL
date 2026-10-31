import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react"; // viewer controls

// Full-screen viewer for evidence photos attached to a return or complaint.
const PhotoViewer = ({
  photos = [], // image urls
  startIndex = 0, // which photo to open on
  onClose, // close handler
}) => {
  // Which photo is shown
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false); // true = 1:1 scroll view, false = fit to screen

  // Number of photos
  const count = photos.length;

  // wrap around in both directions so paging never dead-ends
  const step = useCallback(
    (delta) => {
      setIndex((i) => (i + delta + count) % count);
      setZoomed(false);
    },
    [count]
  );

  // keyboard: escape closes, arrows page
  useEffect(() => {
    // Keyboard controls: Escape closes, arrows move
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  // keep the page behind the overlay from scrolling under it
  useEffect(() => {
    // Stop the page scrolling while the viewer is open
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!count) return null;

  // The photo being shown
  const current = photos[index];

  return (
    // full-screen overlay, click the backdrop to close
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* toolbar: counter on the left, controls on the right */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* photo counter */}
        <p className="text-xs font-semibold tracking-wide">
          Photo {index + 1} of {count}
        </p>
        <div className="flex items-center gap-1.5">
          {/* fit / actual size toggle */}
          <button
            type="button"
            onClick={() => setZoomed((v) => !v)}
            title={zoomed ? "Fit to screen" : "View at full size"}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            {zoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
            {zoomed ? "Fit" : "Full size"}
          </button>
          {/* open the original file in a new tab */}
          <a
            href={current}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original in a new tab"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            <ExternalLink size={14} />
            Original
          </a>
          {/* close viewer */}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* stage: the photo itself, plus paging arrows when there is more than one */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
        {count > 1 && (
          // previous photo
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            title="Previous photo"
            className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* image wrapper: scrolls when zoomed, centred when fitted */}
        <div
          className={`flex h-full w-full items-center justify-center ${
            zoomed ? "overflow-auto" : "overflow-hidden"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={current}
            alt={`Photo ${index + 1} of ${count}`}
            onClick={() => setZoomed((v) => !v)}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out"
                : "max-h-full max-w-full cursor-zoom-in object-contain"
            }
          />
        </div>

        {count > 1 && (
          // next photo
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            title="Next photo"
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {count > 1 && (
        // filmstrip of the other photos in this set
        <div
          className="flex items-center justify-center gap-2 px-4 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((url, i) => (
            // one filmstrip thumbnail
            <button
              key={url}
              type="button"
              onClick={() => {
                setIndex(i);
                setZoomed(false);
              }}
              className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? "border-orange-400" : "border-white/25 hover:border-white/60"
              }`}
            >
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// A row of evidence thumbnails that opens PhotoViewer on click.
export const PhotoStrip = ({
  photos = [], // image urls
  label = "Photos", // heading above the strip, pass null to hide it
  size = "h-44 w-44 sm:h-52 sm:w-52", // tile box, large enough to judge a product by
}) => {
  const [viewerIndex, setViewerIndex] = useState(null); // photo open in the viewer, null = closed

  if (!photos.length) return null;

  return (
    <div>
      {label && (
        // strip heading with a count, so it is obvious when more photos exist
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-600 uppercase">
          {label}
          <span className="ml-1.5 font-semibold text-slate-500 normal-case">
            ({photos.length}) — click to enlarge
          </span>
        </p>
      )}
      {/* thumbnail row */}
      <div className="flex flex-wrap gap-3">
        {photos.map((url, i) => (
          // one thumbnail, opens the full-screen viewer at this photo
          <button
            key={url}
            type="button"
            onClick={() => setViewerIndex(i)}
            title="Click to enlarge"
            className={`${size} group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-orange-400`}
          >
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {/* zoom affordance on hover */}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
              <ZoomIn size={24} />
            </span>
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        // full-screen viewer for this set
        <PhotoViewer
          photos={photos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

export default PhotoViewer;

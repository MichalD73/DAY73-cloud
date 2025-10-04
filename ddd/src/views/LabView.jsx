import { useEffect, useRef, useState } from "react";

export default function LabView() {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // posloucháme log ze self-test HTML (posílá postMessage)
  useEffect(() => {
    const onMsg = (e) => {
      if (typeof e.data === "string" && e.data.includes("[P73]")) setReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lab (Grid + Self-test)</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            onClick={() => iframeRef.current?.contentWindow?.location.reload()}
            title="Reload Lab"
          >
            Reload
          </button>
          <a
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            href="/DAY73/grid-app-test.html"
            target="_blank"
            rel="noreferrer"
            title="Otevřít v novém okně"
          >
            Otevřít samostatně
          </a>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src="/DAY73/grid-app-test.html?v=dev"
        className="w-full flex-1 rounded border"
        style={{ minHeight: 600 }}
        onLoad={() => setReady(true)}
      />
      <div className="text-xs text-gray-500">
        {ready ? "Lab načten." : "Načítám Lab…"}
      </div>
    </div>
  );
}

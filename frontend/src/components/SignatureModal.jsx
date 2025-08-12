import React, { useRef, useState } from "react";

/**
 * Modal de assinatura visual: permite desenhar ou carregar imagem.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onConfirm: (dataUrl: string) => void
 */
export default function SignatureModal({ open, onClose, onConfirm }) {
  const [tab, setTab] = useState("draw");
  const [imgUrl, setImgUrl] = useState(null);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Desenho
  function startDraw(e) {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(
      (e.touches ? e.touches[0].clientX : e.nativeEvent.offsetX),
      (e.touches ? e.touches[0].clientY : e.nativeEvent.offsetY)
    );
  }
  function draw(e) {
    if (!drawing) return;
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(
      (e.touches ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX),
      (e.touches ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY)
    );
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function stopDraw() {
    setDrawing(false);
  }
  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  // Upload
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgUrl(ev.target.result);
    reader.readAsDataURL(file);
  }
  function removeImg() {
    setImgUrl(null);
  }

  // Confirmar assinatura
  function handleConfirm() {
    if (tab === "draw" && hasDrawn) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onConfirm(dataUrl);
    } else if (tab === "upload" && imgUrl) {
      onConfirm(imgUrl);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-gray-900 rounded shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-red-400" onClick={onClose}>
          ×
        </button>
        <div className="flex gap-4 mb-4">
          <button
            className={`px-3 py-1 rounded-t ${tab === "draw" ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-300"}`}
            onClick={() => setTab("draw")}
          >
            Desenhar
          </button>
          <button
            className={`px-3 py-1 rounded-t ${tab === "upload" ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-300"}`}
            onClick={() => setTab("upload")}
          >
            Carregar
          </button>
        </div>
        {tab === "draw" && (
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              className="border border-orange-400 bg-white rounded cursor-crosshair"
              style={{ touchAction: "none" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <button className="mt-2 text-orange-400 hover:underline" onClick={clearCanvas}>
              Limpar
            </button>
          </div>
        )}
        {tab === "upload" && (
          <div className="flex flex-col items-center">
            {!imgUrl ? (
              <>
                <input type="file" accept="image/*" onChange={handleFile} />
              </>
            ) : (
              <div className="flex flex-col items-center">
                <img src={imgUrl} alt="Assinatura" className="max-h-24 max-w-xs border border-orange-400 bg-white rounded" />
                <button className="mt-2 text-orange-400 hover:underline" onClick={removeImg}>
                  Remover
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-4 mt-6">
          <button
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50"
            disabled={tab === "draw" ? !hasDrawn : !imgUrl}
            onClick={handleConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

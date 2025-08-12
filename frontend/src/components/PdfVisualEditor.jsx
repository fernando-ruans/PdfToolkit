import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FaMousePointer, FaFont, FaPen, FaHighlighter, FaSquare, FaCircle, FaUndo, FaRedo, FaSave, FaSearchPlus, FaSearchMinus, FaSyncAlt, FaExpand } from "react-icons/fa";

// Importar o CSS do pdfjs-dist no main.jsx ou App.jsx:
// import 'pdfjs-dist/web/pdf_viewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';

const TOOL = {
  SELECT: "select",
  TEXT: "text",
  DRAW: "draw",
  HIGHLIGHT: "highlight",
  RECT: "rect",
  CIRCLE: "circle",
};

export default function PdfVisualEditor({ file, onSave }) {
  // Zoom e rotação
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // graus
  const [tool, setTool] = useState(TOOL.SELECT);
  const [thumbnails, setThumbnails] = useState([]); // Array de miniaturas (dataURL)
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [elements, setElements] = useState([]); // [{type, x, y, ...}]
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  // Desenho à mão livre
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]); // [{x, y}]
  // Destaque (highlight)
  const [highlightStart, setHighlightStart] = useState(null); // {x, y} ou null
  const [highlightRect, setHighlightRect] = useState(null); // {x, y, w, h} ou null
  // Formas
  const [shapeStart, setShapeStart] = useState(null); // {x, y} ou null
  const [shapeRect, setShapeRect] = useState(null); // {x, y, w, h} ou null
  const [drawingShape, setDrawingShape] = useState(null); // 'rect' | 'circle' | null
  const canvasRef = useRef();
  const containerRef = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detecta entrada/saída do modo fullscreen
  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === editorRootRef.current);
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);
  const editorRootRef = useRef();

  useEffect(() => {
    setPageNumber(1);
    setElements([]);
    setUndoStack([]);
    setRedoStack([]);
  }, [file]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPdfError(null);
    // Gerar miniaturas das páginas
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const thumbs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.18 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
        setThumbnails(thumbs);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function onDocumentLoadError(error) {
    setPdfError(error?.message || String(error));
  }


  // Adicionar texto: ao clicar, exibe input para digitar e adiciona elemento na posição
  const [addingText, setAddingText] = useState(null); // {x, y} ou null
  const [inputValue, setInputValue] = useState("");
  // Seleção e movimentação de elementos
  const [selectedIdx, setSelectedIdx] = useState(null); // índice do elemento selecionado
  const [dragOffset, setDragOffset] = useState(null); // {dx, dy} para arrastar

  function getRelativeCoords(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }

  function handlePdfClick(e) {
    if (tool === TOOL.TEXT) {
      const { x, y } = getRelativeCoords(e);
      setAddingText({ x, y });
      setInputValue("");
    } else if (tool === TOOL.SELECT) {
      // Selecionar elemento clicado
      const { x, y } = getRelativeCoords(e);
      // Verifica se clicou em algum elemento (texto, forma, highlight, etc)
      const idx = elements.findIndex(el => el.page === pageNumber && (
        (el.type === 'text' && x >= el.x && x <= el.x + 120 && y >= el.y && y <= el.y + 24) ||
        (el.type === 'rect' && x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) ||
        (el.type === 'circle' && Math.pow(x - (el.x + el.w/2),2) / Math.pow(el.w/2,2) + Math.pow(y - (el.y + el.h/2),2) / Math.pow(el.h/2,2) <= 1) ||
        (el.type === 'highlight' && x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h)
      ));
      setSelectedIdx(idx >= 0 ? idx : null);
    }
  }

  function handleMouseDown(e) {
    if (tool === TOOL.DRAW) {
      setDrawing(true);
      const { x, y } = getRelativeCoords(e);
      setCurrentPath([{ x, y }]);
    } else if (tool === TOOL.HIGHLIGHT) {
      const { x, y } = getRelativeCoords(e);
      setHighlightStart({ x, y });
      setHighlightRect({ x, y, w: 0, h: 0 });
    } else if (tool === TOOL.RECT || tool === TOOL.CIRCLE) {
      const { x, y } = getRelativeCoords(e);
      setShapeStart({ x, y });
      setShapeRect({ x, y, w: 0, h: 0 });
      setDrawingShape(tool === TOOL.RECT ? 'rect' : 'circle');
    } else if (tool === TOOL.SELECT && selectedIdx !== null) {
      // Iniciar arrasto do elemento selecionado
      const { x, y } = getRelativeCoords(e);
      const el = elements[selectedIdx];
      if (el && el.page === pageNumber) {
        let dx = 0, dy = 0;
        if (el.type === 'text') { dx = x - el.x; dy = y - el.y; }
        else if (el.type === 'rect' || el.type === 'highlight') { dx = x - el.x; dy = y - el.y; }
        else if (el.type === 'circle') { dx = x - (el.x + el.w/2); dy = y - (el.y + el.h/2); }
        setDragOffset({ dx, dy });
      }
    }
  }

  function handleMouseMove(e) {
    if (tool === TOOL.DRAW && drawing) {
      const { x, y } = getRelativeCoords(e);
      setCurrentPath(path => [...path, { x, y }]);
    } else if (tool === TOOL.HIGHLIGHT && highlightStart) {
      const { x, y } = getRelativeCoords(e);
      setHighlightRect({
        x: Math.min(highlightStart.x, x),
        y: Math.min(highlightStart.y, y),
        w: Math.abs(x - highlightStart.x),
        h: Math.abs(y - highlightStart.y),
      });
    } else if ((tool === TOOL.RECT || tool === TOOL.CIRCLE) && shapeStart) {
      const { x, y } = getRelativeCoords(e);
      setShapeRect({
        x: Math.min(shapeStart.x, x),
        y: Math.min(shapeStart.y, y),
        w: Math.abs(x - shapeStart.x),
        h: Math.abs(y - shapeStart.y),
      });
    } else if (tool === TOOL.SELECT && selectedIdx !== null && dragOffset) {
      // Arrastar elemento selecionado
      const { x, y } = getRelativeCoords(e);
      setElements(els => els.map((el, idx) => {
        if (idx !== selectedIdx || el.page !== pageNumber) return el;
        if (el.type === 'text' || el.type === 'rect' || el.type === 'highlight') {
          return { ...el, x: x - dragOffset.dx, y: y - dragOffset.dy };
        } else if (el.type === 'circle') {
          // Move centro
          return { ...el, x: x - dragOffset.dx - el.w/2, y: y - dragOffset.dy - el.h/2 };
        }
        return el;
      }));
    }
  }

  function handleMouseUp(e) {
    if (tool === TOOL.DRAW && drawing && currentPath.length > 1) {
      setElements([...elements, { type: "draw", path: currentPath, page: pageNumber }]);
      setUndoStack([...undoStack, elements]);
      setRedoStack([]);
    }
    setDrawing(false);
    setCurrentPath([]);
    if (tool === TOOL.HIGHLIGHT && highlightRect && highlightRect.w > 5 && highlightRect.h > 5) {
      setElements([...elements, { type: "highlight", ...highlightRect, page: pageNumber }]);
      setUndoStack([...undoStack, elements]);
      setRedoStack([]);
    }
    setHighlightStart(null);
    setHighlightRect(null);
    if ((tool === TOOL.RECT || tool === TOOL.CIRCLE) && shapeRect && shapeRect.w > 5 && shapeRect.h > 5) {
      setElements([...elements, { type: drawingShape, ...shapeRect, page: pageNumber }]);
      setUndoStack([...undoStack, elements]);
      setRedoStack([]);
    }
    setShapeStart(null);
    setShapeRect(null);
    setDrawingShape(null);
    if (tool === TOOL.SELECT && dragOffset) {
      setDragOffset(null);
    }
  }

  function handleTextInputBlur() {
    if (inputValue.trim()) {
      setElements([...elements, { type: "text", x: addingText.x, y: addingText.y, value: inputValue, page: pageNumber }]);
      setUndoStack([...undoStack, elements]);
      setRedoStack([]);
    }
    setAddingText(null);
    setInputValue("");
  }

  function handleTextInputKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTextInputBlur();
    } else if (e.key === "Escape") {
      setAddingText(null);
      setInputValue("");
    }
  }

  return (
      <div
        ref={editorRootRef}
        className={`w-full h-full flex flex-col items-center justify-center ${isFullscreen ? 'fixed top-0 left-0 z-[9999] bg-white rounded-none shadow-none !max-w-none !min-h-0' : ''}`}
        style={isFullscreen ? { width: '100vw', height: '100vh', margin: 0, padding: 0, borderRadius: 0 } : {}}
      >
      {/* Barra de ferramentas fixa */}
      <div className="sticky top-0 z-10 w-full flex justify-center bg-white/90 shadow-md border-b py-2 px-2 gap-2 rounded-b-xl backdrop-blur">
        <div className="flex gap-1">
          <button onClick={() => setTool(TOOL.SELECT)} title="Selecionar (V)" className={`rounded p-2 transition ${tool === TOOL.SELECT ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaMousePointer size={18} /></button>
          <button onClick={() => setTool(TOOL.TEXT)} title="Adicionar texto (T)" className={`rounded p-2 transition ${tool === TOOL.TEXT ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaFont size={18} /></button>
          <button onClick={() => setTool(TOOL.DRAW)} title="Desenhar à mão livre (D)" className={`rounded p-2 transition ${tool === TOOL.DRAW ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaPen size={18} /></button>
          <button onClick={() => setTool(TOOL.HIGHLIGHT)} title="Destacar (H)" className={`rounded p-2 transition ${tool === TOOL.HIGHLIGHT ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaHighlighter size={18} /></button>
          <button onClick={() => setTool(TOOL.RECT)} title="Retângulo (R)" className={`rounded p-2 transition ${tool === TOOL.RECT ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaSquare size={18} /></button>
          <button onClick={() => setTool(TOOL.CIRCLE)} title="Círculo (C)" className={`rounded p-2 transition ${tool === TOOL.CIRCLE ? 'bg-blue-100 text-blue-700 shadow' : 'hover:bg-gray-100'}`}><FaCircle size={18} /></button>
        </div>
        {/* Zoom e rotação */}
        <div className="flex gap-1 ml-4 items-center">
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} title="Diminuir zoom (-)" className="rounded p-2 transition hover:bg-gray-100"><FaSearchMinus size={18} /></button>
          <span className="text-xs w-10 text-center select-none">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} title="Aumentar zoom (+)" className="rounded p-2 transition hover:bg-gray-100"><FaSearchPlus size={18} /></button>
          <button
            onClick={() => {
              if (editorRootRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  editorRootRef.current.requestFullscreen();
                }
              }
            }}
            title="Tela cheia"
            className="rounded p-2 transition hover:bg-gray-100"
          >
            <FaExpand size={16} />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)} title="Rotacionar página 90°" className="rounded p-2 transition hover:bg-gray-100"><FaSyncAlt size={17} /></button>
    </div>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => {
              if (undoStack.length > 0) {
                setRedoStack([elements, ...redoStack]);
                setElements(undoStack[undoStack.length - 1]);
                setUndoStack(undoStack.slice(0, -1));
              }
            }}
            title="Desfazer"
            disabled={undoStack.length === 0}
            className="rounded p-2 transition hover:bg-gray-100 disabled:opacity-40"
          >
            <FaUndo size={18} />
          </button>
          <button
            onClick={() => {
              if (redoStack.length > 0) {
                setUndoStack([...undoStack, elements]);
                setElements(redoStack[0]);
                setRedoStack(redoStack.slice(1));
              }
            }}
            title="Refazer"
            disabled={redoStack.length === 0}
            className="rounded p-2 transition hover:bg-gray-100 disabled:opacity-40"
          >
            <FaRedo size={18} />
          </button>
          <button
            onClick={async () => {
              if (!file) return;
              const arrayBuffer = await file.arrayBuffer();
              const pdfDoc = await PDFDocument.load(arrayBuffer);
              const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
              // Percorre páginas e aplica elementos
              for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                const page = pdfDoc.getPage(i);
                const pageElements = elements.filter(el => el.page === i + 1);
                for (const el of pageElements) {
                  if (el.type === "text") {
                    page.drawText(el.value, {
                      x: el.x,
                      y: page.getHeight() - el.y - 18, // Ajuste para coordenada PDF
                      size: 18,
                      font,
                      color: rgb(0.13, 0.13, 0.13),
                    });
                  } else if (el.type === "draw") {
                    for (let j = 1; j < el.path.length; j++) {
                      const p1 = el.path[j - 1];
                      const p2 = el.path[j];
                      page.drawLine({
                        start: { x: p1.x, y: page.getHeight() - p1.y },
                        end: { x: p2.x, y: page.getHeight() - p2.y },
                        thickness: 2.5,
                        color: rgb(0.10, 0.46, 0.82),
                      });
                    }
                  } else if (el.type === "highlight") {
                    page.drawRectangle({
                      x: el.x,
                      y: page.getHeight() - el.y - el.h,
                      width: el.w,
                      height: el.h,
                      color: rgb(1, 0.96, 0.62),
                      opacity: 0.5,
                      borderColor: rgb(1, 0.99, 0.91),
                      borderWidth: 1,
                    });
                  } else if (el.type === "rect") {
                    page.drawRectangle({
                      x: el.x,
                      y: page.getHeight() - el.y - el.h,
                      width: el.w,
                      height: el.h,
                      color: rgb(0.56, 0.79, 0.98),
                      opacity: 0.3,
                      borderColor: rgb(0.10, 0.46, 0.82),
                      borderWidth: 2,
                    });
                  } else if (el.type === "circle") {
                    // Aproxima círculo por elipse
                    page.drawEllipse({
                      x: el.x + el.w / 2,
                      y: page.getHeight() - el.y - el.h / 2,
                      xScale: Math.abs(el.w / 2),
                      yScale: Math.abs(el.h / 2),
                      color: rgb(0.65, 0.84, 0.65),
                      opacity: 0.3,
                      borderColor: rgb(0.22, 0.56, 0.24),
                      borderWidth: 2,
                    });
                  }
                }
              }
              const pdfBytes = await pdfDoc.save();
              const blob = new Blob([pdfBytes], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "editado.pdf";
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }, 100);
            }}
            title="Salvar"
            disabled={!file}
            className="rounded p-2 transition bg-green-500 text-white hover:bg-green-600 shadow"
          >
            <FaSave size={18} />
          </button>
        </div>
        <span className="ml-6 text-gray-500 font-medium">Ferramenta: <span className="capitalize text-blue-700">{tool}</span></span>
  </div>
  {/* Área de edição centralizada com fundo quadriculado e sombra */}
      <div
        className="flex-1 w-full flex justify-center items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 px-2 overflow-auto"
        style={{ minHeight: 600, height: '100%', minHeight: 0 }}
      >
        <div className="relative rounded-2xl shadow-2xl border bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-white via-blue-50 to-purple-50 p-2 flex" style={{ minWidth: 350, maxWidth: 950, width: '100%', height: '100%', minHeight: 0 }}>
          {/* Miniaturas de páginas */}
          {thumbnails.length > 1 && (
            <div
              className="flex flex-col items-center gap-2 py-2 px-1 bg-white/80 border-r rounded-l-2xl shadow min-w-[70px] max-w-[90px] z-10 overflow-y-auto overflow-x-hidden"
              style={{
                height: '100%',
                maxHeight: '100%',
                minHeight: 0,
                flex: '0 0 auto',
                // Limite para modo normal (não fullscreen)
                ...(isFullscreen ? {} : { maxHeight: 'calc(80vh - 64px)' })
              }}
            >
              {thumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  className={`rounded-lg border-2 ${pageNumber === idx + 1 ? 'border-blue-500 shadow-lg' : 'border-transparent'} overflow-hidden focus:outline-none`}
                  style={{ width: 65, height: 80, background: '#f3f4f6', minHeight: 60, maxHeight: 90 }}
                  onClick={() => setPageNumber(idx + 1)}
                  title={`Ir para página ${idx + 1}`}
                >
                  <img src={thumb} alt={`Miniatura página ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
          <div
            ref={containerRef}
            className="relative w-full h-full min-h-[500px] bg-[repeating-linear-gradient(0deg,_#e0e7ef_0px,_#e0e7ef_20px,_#f8fafc_20px,_#f8fafc_40px)] rounded-xl overflow-hidden border shadow"
            onClick={handlePdfClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            tabIndex={0}
            role="presentation"
          >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-center text-gray-400">Carregando PDF...</div>}
          error={<div className="text-center text-red-600">Falha ao carregar PDF.</div>}
        >
          {!pdfError && (
            <Page
              pageNumber={pageNumber}
              width={containerRef.current?.offsetWidth ? Math.min(containerRef.current.offsetWidth, 900) * zoom : 900 * zoom}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              rotate={rotation}
            />
          )}
        </Document>
        {pdfError && (
          <div className="text-center text-red-600 mt-4">Erro ao carregar PDF: {pdfError}</div>
        )}
        {/* Canvas de edição sobreposto */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
          {/* Renderizar textos adicionados na página atual */}
          {elements.filter(el => el.type === "text" && el.page === pageNumber).map((el, idx) => (
            <div
              key={"text-"+idx}
              style={{ position: "absolute", left: el.x, top: el.y, color: "#222", fontSize: 18, background: "rgba(255,255,255,0.7)", padding: "1px 4px", borderRadius: 2,
                outline: (tool === TOOL.SELECT && selectedIdx === elements.findIndex((e, i) => i === idx && e.page === pageNumber && e.type === 'text')) ? '2px solid #2563eb' : 'none',
                zIndex: (tool === TOOL.SELECT && selectedIdx === elements.findIndex((e, i) => i === idx && e.page === pageNumber && e.type === 'text')) ? 10 : 1
              }}
              onClick={e => { e.stopPropagation(); setSelectedIdx(elements.findIndex((e, i) => i === idx && e.page === pageNumber && e.type === 'text')); }}
            >
              {el.value}
            </div>
          ))}
          {/* Renderizar desenhos à mão livre, destaques e formas na página atual */}
          <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }}>
            {/* Handles para redimensionamento de elementos selecionados */}
            {tool === TOOL.SELECT && selectedIdx !== null && (() => {
              const el = elements[selectedIdx];
              if (!el || el.page !== pageNumber) return null;
              if (el.type === 'rect' || el.type === 'highlight') {
                return [
                  <circle key="handle-tl" cx={el.x} cy={el.y} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-tr" cx={el.x+el.w} cy={el.y} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-bl" cx={el.x} cy={el.y+el.h} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-br" cx={el.x+el.w} cy={el.y+el.h} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                ];
              } else if (el.type === 'circle') {
                return [
                  <circle key="handle-c" cx={el.x+el.w} cy={el.y+el.h/2} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                ];
              }
              return null;
            })()}
            {/* Handles para redimensionamento de elementos selecionados */}
            {tool === TOOL.SELECT && selectedIdx !== null && (() => {
              const el = elements[selectedIdx];
              if (!el || el.page !== pageNumber) return null;
              if (el.type === 'rect' || el.type === 'highlight') {
                return [
                  <circle key="handle-tl" cx={el.x} cy={el.y} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-tr" cx={el.x+el.w} cy={el.y} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-bl" cx={el.x} cy={el.y+el.h} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />,
                  <circle key="handle-br" cx={el.x+el.w} cy={el.y+el.h} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                ];
              } else if (el.type === 'circle') {
                return [
                  <circle key="handle-c" cx={el.x+el.w} cy={el.y+el.h/2} r={6} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                ];
              }
              return null;
            })()}
            {/* Destaques */}
            {elements.filter(el => el.type === "highlight" && el.page === pageNumber).map((el, idx) => (
              <rect
                key={"hl-"+idx}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill="#fff59d"
                fillOpacity={0.7}
                stroke="#fffde7"
                strokeWidth={1}
              />
            ))}
            {/* Retângulo de destaque em andamento */}
            {tool === TOOL.HIGHLIGHT && highlightRect && (
              <rect
                x={highlightRect.x}
                y={highlightRect.y}
                width={highlightRect.w}
                height={highlightRect.h}
                fill="#fff59d"
                fillOpacity={0.4}
                stroke="#fbc02d"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
            )}
            {/* Retângulos */}
            {elements.filter(el => el.type === "rect" && el.page === pageNumber).map((el, idx) => (
              <rect
                key={"rect-"+idx}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill="#90caf9"
                fillOpacity={0.3}
                stroke="#1976d2"
                strokeWidth={2}
              />
            ))}
            {tool === TOOL.RECT && shapeRect && (
              <rect
                x={shapeRect.x}
                y={shapeRect.y}
                width={shapeRect.w}
                height={shapeRect.h}
                fill="#90caf9"
                fillOpacity={0.15}
                stroke="#1976d2"
                strokeDasharray="4 2"
                strokeWidth={2}
              />
            )}
            {/* Círculos */}
            {elements.filter(el => el.type === "circle" && el.page === pageNumber).map((el, idx) => (
              <ellipse
                key={"circle-"+idx}
                cx={el.x + el.w / 2}
                cy={el.y + el.h / 2}
                rx={Math.abs(el.w / 2)}
                ry={Math.abs(el.h / 2)}
                fill="#a5d6a7"
                fillOpacity={0.3}
                stroke="#388e3c"
                strokeWidth={2}
              />
            ))}
            {tool === TOOL.CIRCLE && shapeRect && (
              <ellipse
                cx={shapeRect.x + shapeRect.w / 2}
                cy={shapeRect.y + shapeRect.h / 2}
                rx={Math.abs(shapeRect.w / 2)}
                ry={Math.abs(shapeRect.h / 2)}
                fill="#a5d6a7"
                fillOpacity={0.15}
                stroke="#388e3c"
                strokeDasharray="4 2"
                strokeWidth={2}
              />
            )}
            {/* Desenhos à mão livre */}
            {elements.filter(el => el.type === "draw" && el.page === pageNumber).map((el, idx) => (
              <polyline
                key={"draw-"+idx}
                fill="none"
                stroke="#1976d2"
                strokeWidth={2.5}
                points={el.path.map(p => `${p.x},${p.y}`).join(" ")}
              />
            ))}
            {/* Desenho atual */}
            {tool === TOOL.DRAW && drawing && currentPath.length > 1 && (
              <polyline
                fill="none"
                stroke="#1976d2"
                strokeWidth={2.5}
                points={currentPath.map(p => `${p.x},${p.y}`).join(" ")}
              />
            )}
          </svg>
        </div>
        {/* Input para adicionar texto */}
        {addingText && (
          <input
            autoFocus
            className="absolute z-10 border border-blue-400 rounded px-1 py-0.5 text-base bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-lg transition-all"
            style={{ left: addingText.x, top: addingText.y, minWidth: 40, maxWidth: 220 }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={handleTextInputBlur}
            onKeyDown={handleTextInputKeyDown}
            placeholder="Digite o texto e pressione Enter"
          />
        )}
        {/* Paginação */}
        {numPages > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 rounded px-2 py-1 shadow">
            <button disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>&lt;</button>
            <span>Página {pageNumber} de {numPages}</span>
            <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(pageNumber + 1)}>&gt;</button>
          </div>
        )}
          </div> {/* fecha containerRef div */}
        </div> {/* fecha área centralizada */}
      </div>
    </div>
  );
}

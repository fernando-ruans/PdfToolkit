
import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FaMousePointer, FaFont, FaPen, FaHighlighter, FaSquare, FaCircle, FaUndo, FaRedo, FaSave } from "react-icons/fa";

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
  const [tool, setTool] = useState(TOOL.SELECT);
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

  useEffect(() => {
    setPageNumber(1);
    setElements([]);
    setUndoStack([]);
    setRedoStack([]);
  }, [file]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPdfError(null);
  }

  function onDocumentLoadError(error) {
    setPdfError(error?.message || String(error));
  }


  // Adicionar texto: ao clicar, exibe input para digitar e adiciona elemento na posição
  const [addingText, setAddingText] = useState(null); // {x, y} ou null
  const [inputValue, setInputValue] = useState("");

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
    <div className="w-full h-full flex flex-col">
      {/* Barra de ferramentas */}
      <div className="flex gap-2 p-2 bg-gray-100 border-b items-center">
        <button onClick={() => setTool(TOOL.SELECT)} title="Selecionar"><FaMousePointer /></button>
        <button onClick={() => setTool(TOOL.TEXT)} title="Adicionar texto"><FaFont /></button>
        <button onClick={() => setTool(TOOL.DRAW)} title="Desenhar à mão livre"><FaPen /></button>
        <button onClick={() => setTool(TOOL.HIGHLIGHT)} title="Destacar"><FaHighlighter /></button>
        <button onClick={() => setTool(TOOL.RECT)} title="Retângulo"><FaSquare /></button>
        <button onClick={() => setTool(TOOL.CIRCLE)} title="Círculo"><FaCircle /></button>
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
        >
          <FaUndo />
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
        >
          <FaRedo />
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
        >
          <FaSave />
        </button>
        <span className="ml-4 text-gray-500">Ferramenta: {tool}</span>
      </div>
      {/* Área de edição */}
      <div
        className="flex-1 relative bg-gray-200 overflow-auto"
        ref={containerRef}
        style={{ minHeight: 500 }}
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
              width={containerRef.current?.offsetWidth ? Math.min(containerRef.current.offsetWidth, 900) : 900}
              renderAnnotationLayer={true}
              renderTextLayer={true}
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
              style={{ position: "absolute", left: el.x, top: el.y, color: "#222", fontSize: 18, background: "rgba(255,255,255,0.7)", padding: "1px 4px", borderRadius: 2 }}
            >
              {el.value}
            </div>
          ))}
          {/* Renderizar desenhos à mão livre, destaques e formas na página atual */}
          <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }}>
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
            className="absolute z-10 border border-blue-400 rounded px-1 py-0.5 text-base bg-white"
            style={{ left: addingText.x, top: addingText.y, minWidth: 40 }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={handleTextInputBlur}
            onKeyDown={handleTextInputKeyDown}
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
      </div>
    </div>
  );
}

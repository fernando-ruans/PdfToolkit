import React, { useState } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';

const Rotate = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [rotations, setRotations] = useState([]); // Array de ângulos por página
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setNumPages(null);
    setSelectedPages([]);
    setRotations([]);
    setDownloadUrl('');
    setError('');
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setSelectedPages(Array(numPages).fill(true)); // Seleciona todas por padrão
    setRotations(Array(numPages).fill(0)); // Ângulo inicial 0°
  };

  const handlePageSelect = (idx) => {
    setSelectedPages((prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  };

  const rotatePage = (idx, delta) => {
    setRotations((prev) => {
      const copy = [...prev];
      copy[idx] = (copy[idx] + delta + 360) % 360;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !numPages) {
      setError('Selecione um PDF.');
      return;
    }
    const pagesToRotate = selectedPages
      .map((v, i) => (v ? i + 1 : null))
      .filter((v) => v !== null);
    if (pagesToRotate.length === 0) {
      setError('Selecione ao menos uma página.');
      return;
    }
    // Monta objeto: {pagina: angulo}
    const rotationMap = {};
    selectedPages.forEach((v, i) => {
      if (v && rotations[i] !== 0) {
        rotationMap[i + 1] = rotations[i];
      }
    });
    if (Object.keys(rotationMap).length === 0) {
      setError('Nenhuma página foi rotacionada.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rotations', JSON.stringify(rotationMap));
    try {
      const response = await axios.post('/api/edit/rotate', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao rotacionar o PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Rotacionar Páginas do PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        {file && (
          <div className="my-4">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div>Carregando PDF...</div>}
              error={<div>Falha ao carregar PDF.</div>}
            >
              <div className="flex flex-wrap gap-2">
                {Array.from(new Array(numPages), (el, idx) => (
                  <div key={idx} className={`flex flex-col items-center border rounded p-1 relative ${selectedPages[idx] ? 'ring-2 ring-blue-500' : ''}`}>
                    <Page
                      pageNumber={idx + 1}
                      width={80}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      rotate={rotations[idx]}
                    />
                    <div className="flex gap-1 mt-1">
                      <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => rotatePage(idx, -90)} title="Rotacionar -90°">⟲</button>
                      <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => rotatePage(idx, 90)} title="Rotacionar +90°">⟳</button>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!selectedPages[idx]}
                      onChange={() => handlePageSelect(idx)}
                      className="mt-1"
                    />
                    <span className="text-xs">Pág. {idx + 1} ({rotations[idx]}°)</span>
                  </div>
                ))}
              </div>
            </Document>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Rotacionando...' : 'Rotacionar Páginas'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="pdf_rotacionado.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Rotacionado
          </a>
        </div>
      )}
    </div>
  );
};

export default Rotate;

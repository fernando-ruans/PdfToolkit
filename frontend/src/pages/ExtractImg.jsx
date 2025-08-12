
import React, { useState } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';

const ExtractImg = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
    setNumPages(null);
    setSelectedPages([]);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setSelectedPages(Array.from({ length: numPages }, (_, i) => false));
  };

  const handlePageSelect = (idx) => {
    setSelectedPages((prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !numPages) {
      setError('Selecione um arquivo PDF.');
      return;
    }
    const pagesToExtract = selectedPages
      .map((v, i) => (v ? i + 1 : null))
      .filter((v) => v !== null);
    if (pagesToExtract.length === 0) {
      setError('Selecione ao menos uma página.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', JSON.stringify(pagesToExtract));
    try {
      const response = await axios.post('/api/pdf2img', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao extrair imagens do PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Extrair Imagens de PDF</h2>
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
                  <label key={idx} className={`flex flex-col items-center border rounded p-1 cursor-pointer ${selectedPages[idx] ? 'ring-2 ring-blue-500' : ''}`}>
                    <Page
                      pageNumber={idx + 1}
                      width={80}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <input
                      type="checkbox"
                      checked={!!selectedPages[idx]}
                      onChange={() => handlePageSelect(idx)}
                      className="mt-1"
                    />
                    <span className="text-xs">Pág. {idx + 1}</span>
                  </label>
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
          {loading ? 'Extraindo...' : 'Extrair Imagens'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="imagens_pdf.zip"
            className="text-green-700 underline font-semibold"
          >
            Baixar Imagens (ZIP)
          </a>
        </div>
      )}
    </div>
  );
};

export default ExtractImg;

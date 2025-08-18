import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';
import axios from 'axios';

const Watermark = () => {
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [position, setPosition] = useState('center');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
    setNumPages(null);
    setPageNumber(1);
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || (!text && !image)) {
      setError('Selecione um PDF e informe o texto ou imagem da marca d’água.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    if (text) formData.append('watermark_text', text);
    if (image) formData.append('watermark_image', image);
    formData.append('position', position);
    try {
      const response = await axios.post('/api/edit/watermark', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao adicionar marca d’água.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Adicionar Marca d’Água</h2>
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
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page pageNumber={pageNumber} width={400} />
            </Document>
            {numPages && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)} className="px-2 py-1 bg-gray-200 rounded">Anterior</button>
                <span>Página {pageNumber} de {numPages}</span>
                <button type="button" disabled={pageNumber >= numPages} onClick={() => setPageNumber(pageNumber + 1)} className="px-2 py-1 bg-gray-200 rounded">Próxima</button>
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          placeholder="Texto da marca d’água"
          value={text}
          onChange={handleTextChange}
          className="block w-full text-sm text-gray-700 border rounded px-2 py-1 mt-2"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-700 mt-2"
        />
        <div className="mt-2">
          <label className="block text-sm font-semibold mb-1">Posição da marca d’água:</label>
          <select value={position} onChange={e => setPosition(e.target.value)} className="border rounded px-2 py-1 w-full">
            <option value="top">Topo</option>
            <option value="center">Centro</option>
            <option value="bottom">Rodapé</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adicionando...' : 'Adicionar Marca d’Água'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="pdf_marcadagua.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF com Marca d’Água
          </a>
        </div>
      )}
    </div>
  );
};

export default Watermark;

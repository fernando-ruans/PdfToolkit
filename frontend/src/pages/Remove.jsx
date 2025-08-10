import React, { useState } from 'react';
import axios from 'axios';

const Remove = () => {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
  };

  const handlePagesChange = (e) => {
    setPages(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !pages) {
      setError('Selecione um PDF e informe as páginas a remover.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', pages);
    try {
      const response = await axios.post('/api/edit/remove', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao remover páginas do PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Remover Páginas</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        <input
          type="text"
          placeholder="Ex: 2,4-6"
          value={pages}
          onChange={handlePagesChange}
          className="block w-full text-sm text-gray-700 border rounded px-2 py-1 mt-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Removendo...' : 'Remover Páginas'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="pdf_sem_paginas.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Atualizado
          </a>
        </div>
      )}
    </div>
  );
};

export default Remove;

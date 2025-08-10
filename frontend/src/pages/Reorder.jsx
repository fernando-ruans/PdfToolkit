import React, { useState } from 'react';
import axios from 'axios';

const Reorder = () => {
  const [file, setFile] = useState(null);
  const [order, setOrder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
  };

  const handleOrderChange = (e) => {
    setOrder(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !order) {
      setError('Selecione um PDF e informe a nova ordem das páginas.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order', order);
    try {
      const response = await axios.post('/api/edit/reorder', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao reordenar páginas do PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Reorganizar Páginas</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        <input
          type="text"
          placeholder="Nova ordem, ex: 3,1,2"
          value={order}
          onChange={handleOrderChange}
          className="block w-full text-sm text-gray-700 border rounded px-2 py-1 mt-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Reorganizando...' : 'Reorganizar Páginas'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="pdf_reorganizado.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Reorganizado
          </a>
        </div>
      )}
    </div>
  );
};

export default Reorder;

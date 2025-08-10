import React, { useState } from 'react';
import axios from 'axios';

const Compress = () => {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
  };

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Selecione um arquivo PDF.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('level', level);
    try {
      const response = await axios.post('/api/edit/compress', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao comprimir o PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-blue-100">
      <h2 className="text-2xl font-bold mb-4">Comprimir PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        <div>
          <label className="block mb-1 font-medium">Nível de compressão:</label>
          <select
            value={level}
            onChange={handleLevelChange}
            className="border rounded px-2 py-1"
          >
            <option value="default">Padrão</option>
            <option value="high">Alta compressão</option>
            <option value="low">Baixa compressão</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Comprimindo...' : 'Comprimir PDF'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="compressed.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Comprimido
          </a>
        </div>
      )}
    </div>
  );
};

export default Compress;

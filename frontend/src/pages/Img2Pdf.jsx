import React, { useState } from 'react';
import axios from 'axios';

const Img2Pdf = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setDownloadUrl('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Selecione uma ou mais imagens.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    try {
      // 1. Solicita um ID de conversão
      const idResp = await axios.post('/api/start');
      const convId = idResp.data.id;
      if (!convId) throw new Error('Falha ao obter ID de conversão');
      // 2. Prepara o FormData com o ID
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('conv_id', convId);
      // 3. Envia as imagens para conversão
      const response = await axios.post('/api/img2pdf', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao converter imagens para PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Imagens para PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Convertendo...' : 'Converter para PDF'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="imagens.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default Img2Pdf;

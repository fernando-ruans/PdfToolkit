import React, { useState } from 'react';
import axios from 'axios';

const Pdf2Img = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
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
    try {
      // 1. Solicita um ID de conversão
      const idResp = await axios.post('/api/start');
      const convId = idResp.data.id;
      if (!convId) throw new Error('Falha ao obter ID de conversão');
      // 2. Prepara o FormData com o ID
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conv_id', convId);
      // 3. Envia o arquivo para conversão
      const response = await axios.post('/api/pdf2img', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Detecta se a resposta é erro JSON/texto
      const contentType = response.headers['content-type'];
      if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
        const text = await response.data.text();
        let msg = text;
        try {
          const json = JSON.parse(text);
          msg = json.error || text;
        } catch {}
        setError(msg);
        setDownloadUrl('');
        return;
      }
      // Caso contrário, é arquivo válido
      const url = window.URL.createObjectURL(response.data);
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao converter PDF para imagens.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">PDF para Imagens</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Convertendo...' : 'Converter PDF'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="pdf_imagens.zip"
            className="text-green-700 underline font-semibold"
          >
            Baixar Imagens (ZIP)
          </a>
        </div>
      )}
    </div>
  );
};

export default Pdf2Img;

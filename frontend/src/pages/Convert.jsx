import React, { useState } from 'react';
import axios from 'axios';
import { FaFileImport, FaFileExport } from 'react-icons/fa';

export default function Convert() {
  const [file, setFile] = useState(null);
  // targetFormat removido, só PDF <-> Imagem
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
    if (!file) return setError('Selecione um arquivo para converter.');
    setLoading(true);
    setError('');
    setDownloadUrl('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      let endpoint = '';
      if (file.type === 'application/pdf') {
        endpoint = '/api/pdf2img';
      } else if (file.type.startsWith('image/')) {
        endpoint = '/api/img2pdf';
      } else {
        setError('Formato não suportado. Envie PDF ou imagem.');
        setLoading(false);
        return;
      }
      const response = await axios.post(endpoint, formData, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao converter o arquivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white text-neutral-900 p-8 rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FaFileImport className="text-blue-600" /> Converter Arquivo
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" onChange={handleFileChange} className="block w-full" />
        <div className="mb-4 text-gray-500 text-sm">
          <span>Formatos suportados: PDF → Imagem, Imagem → PDF</span>
        </div>
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
          <FaFileExport /> {loading ? 'Convertendo...' : 'Converter'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <a href={downloadUrl} download className="mt-4 block text-green-700 font-semibold underline">
          Baixar arquivo convertido
        </a>
      )}
    </div>
  );
}

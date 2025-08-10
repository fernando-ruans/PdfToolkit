import React, { useState } from 'react';
import axios from 'axios';
import { FaFileImport, FaFileExport } from 'react-icons/fa';

export default function Convert() {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
  };

  const handleFormatChange = (e) => {
    setTargetFormat(e.target.value);
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
      formData.append('targetFormat', targetFormat);
      const response = await axios.post('/api/convert', formData, {
        responseType: 'blob',
      });
      // Detecta se a resposta é um erro JSON/texto
      const contentType = response.headers['content-type'];
      if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
        // Tenta ler o erro
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
        <div>
          <label className="block mb-1 font-semibold">Converter para:</label>
          <select value={targetFormat} onChange={handleFormatChange} className="w-full p-2 border rounded">
            <option value="pdf">PDF</option>
            <option value="docx">Word (.docx)</option>
            <option value="pptx">PowerPoint (.pptx)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="jpg">Imagem (.jpg)</option>
            <option value="png">Imagem (.png)</option>
          </select>
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

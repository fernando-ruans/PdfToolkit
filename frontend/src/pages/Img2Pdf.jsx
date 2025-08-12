import React, { useState, useRef } from 'react';
import axios from 'axios';

const Img2Pdf = () => {
  const [files, setFiles] = useState([]);
  const [thumbs, setThumbs] = useState([]); // {file, url}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const dragItem = useRef();
  const dragOverItem = useRef();

  const fileInputRef = useRef();
  // Adiciona imagens sem sobrescrever
  const handleFileChange = (e) => {
    const arr = Array.from(e.target.files);
    setFiles(prev => [...prev, ...arr]);
    setThumbs(prev => [...prev, ...arr.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
    setSelected((s) => {
      // Se não havia imagens antes, selecionar a primeira
      return thumbs.length === 0 && arr.length > 0 ? 0 : s;
    });
    setDownloadUrl('');
    setError('');
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & drop para ordenar (com feedback visual)
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; setDragOverIdx(idx); };
  const handleDragLeave = () => { setDragOverIdx(null); };
  const handleDragEnd = () => {
    const cpy = [...thumbs];
    const dragIdx = dragItem.current;
    const overIdx = dragOverItem.current;
    setDragOverIdx(null);
    if (dragIdx === overIdx || dragIdx == null || overIdx == null) return;
    const [removed] = cpy.splice(dragIdx, 1);
    cpy.splice(overIdx, 0, removed);
    setThumbs(cpy);
    setFiles(cpy.map(t => t.file));
    setSelected(overIdx);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Remover imagem
  const handleRemove = (idx) => {
    const cpy = thumbs.filter((_, i) => i !== idx);
    setThumbs(cpy);
    setFiles(cpy.map(t => t.file));
    setSelected(s => (s > 0 ? s - 1 : 0));
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
      const idResp = await axios.post('/api/start');
      const convId = idResp.data.id;
      if (!convId) throw new Error('Falha ao obter ID de conversão');
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('conv_id', convId);
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
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow flex flex-col gap-6">
      <h2 className="text-2xl font-bold mb-2">Imagens para PDF</h2>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
        <div className="flex flex-col gap-2 w-full md:w-3/4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            className="w-full max-w-xs bg-orange-500 text-white px-3 py-2 rounded hover:bg-orange-600 mb-4"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            Adicionar Imagem
          </button>
          <div className="w-full overflow-x-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {thumbs.map((t, idx) => (
                <div key={idx} className="flex flex-col items-center" style={{ width: 120 }}>
                  <div
                    className={`border-2 rounded relative group transition-all duration-150 bg-white ${dragOverIdx === idx ? 'ring-2 ring-orange-400' : 'border-gray-300'}`}
                    style={{ width: 100, height: 100, overflow: 'hidden', background: '#f8fafc' }}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    title={t.file.name}
                  >
                    <img src={t.url} alt="thumb" className="object-contain w-full h-full" />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-white bg-opacity-80 text-red-600 rounded-bl px-1 py-0.5 text-xs opacity-0 group-hover:opacity-100"
                      onClick={e => { e.stopPropagation(); handleRemove(idx); }}
                      title="Remover"
                    >×</button>
                  </div>
                  <div className="text-xs text-gray-700 mt-1 w-full truncate text-center font-mono" title={t.file.name}>
                    {t.file.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-1/4 items-center justify-center">
          <button
            type="submit"
            disabled={loading || !files.length}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-bold text-lg"
          >
            {loading ? 'Convertendo...' : 'Converter para PDF'}
          </button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="output.pdf"
              className="w-full text-center text-green-700 underline font-semibold mt-2"
            >
              Baixar PDF
            </a>
          )}
          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
        </div>
      </form>
    </div>
  );
};

export default Img2Pdf;

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { FaLayerGroup, FaDownload, FaPlus, FaTrash } from 'react-icons/fa';
// Removed duplicate imports

export default function Merge() {

  const [files, setFiles] = useState([])
  const [downUrl, setDownUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // Adiciona arquivos sem sobrescrever
  const onBrowse = (e) => {
    const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  // Remove arquivo da lista
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const merge = async () => {
    setError(null);
    setDownUrl(null);
    setProgress(0);
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const res = await axios.post('/api/merge', form, {
        responseType: 'blob',
        onUploadProgress: evt => evt.total && setProgress(Math.round((evt.loaded / evt.total) * 100)),
      });
      const url = URL.createObjectURL(res.data);
      setDownUrl(url);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
  <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-blue-100">
      <h2 className="text-xl font-bold mb-4">Juntar PDF</h2>
      <input type="file" accept="application/pdf" ref={inputRef} className="hidden" onChange={onBrowse} />
      <button className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition" onClick={() => inputRef.current?.click()}>
        <FaPlus /> Adicionar PDF
      </button>
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="list-disc pl-5 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 justify-between">
                <span>{f.name}</span>
                <button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeFile(i)} title="Remover">
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
          <button className="mt-4 px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-50" onClick={merge} disabled={files.length < 2}>
            <FaLayerGroup /> Juntar PDFs
          </button>
          <div className="mt-4 h-3 bg-gray-200 rounded">
            <div className="h-3 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
          </div>
          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
          {downUrl && (
            <div className="mt-4 flex items-center gap-2">
              <FaDownload className="text-green-600 animate-bounce" />
              <a href={downUrl} download="merged.pdf" className="text-green-700 underline font-semibold">Baixar PDF Mesclado</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react';
import axios from 'axios';
import PdfVisualEditor from '../components/PdfVisualEditor';

const Edit = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); // Keeping loading state for the button
  const [error, setError] = useState(''); // Keeping error state for error messages
  const [downloadUrl, setDownloadUrl] = useState(''); // Keeping download URL for the edited PDF

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
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/api/edit/content', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao editar o PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Editar PDF</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <div className="mt-4" style={{ minHeight: 600 }}>
        {file ? (
          <PdfVisualEditor file={file} />
        ) : (
          <div className="text-gray-400">Selecione um PDF para editar</div>
        )}
      </div>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="edited.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Editado
          </a>
        </div>
      )}
    </div>
  );
};

export default Edit;

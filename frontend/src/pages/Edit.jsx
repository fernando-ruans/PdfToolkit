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
    <div className="max-w-6xl w-full mx-auto mt-8 p-8 bg-white rounded-2xl shadow-2xl flex flex-col items-center min-h-[90vh]">
      <h2 className="text-3xl font-bold mb-6 self-start">Editar PDF</h2>
      <div className="w-full flex flex-col gap-2 items-start">
        <input type="file" accept="application/pdf" onChange={handleFileChange} className="mb-2" />
        {error && <div className="text-red-600">{error}</div>}
        {downloadUrl && (
          <div>
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
      <div className="w-full flex-1 flex flex-col mt-4 min-h-[700px]">
        {file ? (
          <PdfVisualEditor file={file} />
        ) : (
          <div className="text-gray-400 flex-1 flex items-center justify-center text-lg">Selecione um PDF para editar</div>
        )}
      </div>
    </div>
  );
};

export default Edit;

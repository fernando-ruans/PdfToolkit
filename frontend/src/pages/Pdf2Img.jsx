import React, { useState, useRef } from 'react';
import axios from 'axios';

const Pdf2Img = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef(null);
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
    setProgress(0);
    setError('');
    setDownloadUrl('');
    let convId = null;
    try {
      // 1. Solicita um ID de conversão
      const idResp = await axios.post('/api/start');
      convId = idResp.data.id;
      if (!convId) throw new Error('Falha ao obter ID de conversão');
      // 2. Prepara o FormData com o ID
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conv_id', convId);
      // 3. Envia o arquivo para conversão (mostra progresso do upload)
      await axios.post('/api/pdf2img', formData, {
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
        validateStatus: () => true,
      }).then(async (response) => {
        // Cria o link de download imediatamente
        const url = window.URL.createObjectURL(response.data);
        setDownloadUrl(url);
        // Inicia polling de progresso só para atualizar a barra
        let finished = false;
        const pollProgress = (id) => {
          progressInterval.current = setInterval(async () => {
            try {
              const res = await axios.get(`/api/progress/${id}`);
              if (res.data && typeof res.data.progress === 'number') {
                setProgress(res.data.progress);
                if (res.data.progress >= 100 && !finished) {
                  finished = true;
                  clearInterval(progressInterval.current);
                  setLoading(false);
                  setProgress(100);
                }
              }
            } catch {}
          }, 500);
        };
        pollProgress(convId);
      });
    } catch (err) {
      setError('Falha ao converter PDF para imagens.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
      if (progressInterval.current) clearInterval(progressInterval.current);
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
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-6 mt-2 relative">
            <div
              className="bg-blue-600 h-6 rounded-full transition-all duration-200 flex items-center justify-center text-white text-xs font-bold"
              style={{ width: `${progress}%` }}
            >
              {progress > 8 && (
                <span className="w-full text-center select-none">{progress}%</span>
              )}
            </div>
            {progress <= 8 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-600 text-xs font-bold select-none">{progress}%</span>
            )}
          </div>
        )}
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

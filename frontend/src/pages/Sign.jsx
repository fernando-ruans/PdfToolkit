
import React, { useState, useRef } from 'react';
import SignatureModal from '../components/SignatureModal';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';

const Sign = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [pageWidth, setPageWidth] = useState(500);
  const [pageHeight, setPageHeight] = useState(700);
  const [signText, setSignText] = useState('Assinado digitalmente');
  const [signPos, setSignPos] = useState(null); // {x, y}
  const [signatureImg, setSignatureImg] = useState(null); // dataUrl
  const [showModal, setShowModal] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const pageRef = useRef();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDownloadUrl('');
    setError('');
    setSignPos(null);
  };

  const handlePageClick = (e) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSignPos({ x: Math.round(x), y: Math.round(y) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !signPos || !signatureImg) {
      setError('Selecione o arquivo, a posição e a assinatura.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('x', signPos.x);
    formData.append('y', signPos.y);
    // Enviar imagem da assinatura (dataUrl base64)
    formData.append('signature_img', signatureImg);
    try {
      const response = await axios.post('/api/edit/sign', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao assinar o PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Assinar PDF (customizável)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700"
        />
        {file && (
          <div className="my-4">
            <div className="mb-2 text-sm text-gray-600">Clique na página para escolher a posição da assinatura:</div>
            <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ddd', borderRadius: 8 }}>
              <div ref={pageRef} onClick={handlePageClick} style={{ cursor: 'crosshair' }}>
                <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading="Carregando...">
                  <Page pageNumber={1} width={pageWidth} height={pageHeight} />
                </Document>
                {signPos && (
                  <div style={{
                    position: 'absolute',
                    left: signPos.x - 40,
                    top: signPos.y - 15,
                    pointerEvents: 'none',
                    background: 'rgba(0,0,0,0.1)',
                    color: '#2563eb',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}>{signText}</div>
                )}
              </div>
            </div>
          </div>
        )}
        <div>
          <button
            type="button"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            onClick={() => setShowModal(true)}
          >
            {signatureImg ? 'Editar assinatura' : 'Adicionar assinatura'}
          </button>
          {signatureImg && (
            <div className="mt-2 flex items-center gap-2">
              <img src={signatureImg} alt="Assinatura" className="h-12 border border-orange-400 bg-white rounded" />
              <button className="text-red-500 underline" type="button" onClick={() => setSignatureImg(null)}>Remover</button>
            </div>
          )}
        </div>
        <SignatureModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={img => { setSignatureImg(img); setShowModal(false); }}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Assinando...' : 'Assinar PDF'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download="signed.pdf"
            className="text-green-700 underline font-semibold"
          >
            Baixar PDF Assinado
          </a>
        </div>
      )}
    </div>
  );
};

export default Sign;

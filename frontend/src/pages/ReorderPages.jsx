import React, { useState } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

try {
  pdfjs.GlobalWorkerOptions.workerSrc = '/public/pdf.worker.min.js';
} catch (e) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

const ReorderPages = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pagesOrder, setPagesOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [previewIdx, setPreviewIdx] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setNumPages(null);
    setPagesOrder([]);
    setDownloadUrl('');
    setError('');
    setPreviewIdx(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPagesOrder(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = Array.from(pagesOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    setPagesOrder(newOrder);
  };

  const handlePreview = (idx) => {
    setPreviewIdx(idx);
  };

  const closePreview = () => {
    setPreviewIdx(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !numPages) {
      setError('Selecione um PDF.');
      return;
    }
    setLoading(true);
    setError('');
    setDownloadUrl('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order', JSON.stringify(pagesOrder));
    try {
      const response = await axios.post('/api/edit/reorder', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setDownloadUrl(url);
    } catch (err) {
      setError('Falha ao reorganizar páginas do PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-blue-700">Reorganizar Páginas do PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 border-b-2 border-blue-300 focus:border-blue-600 outline-none"
        />
        {file && (
          <div className="my-6">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div>Carregando PDF...</div>}
              error={<div className="text-red-600 font-semibold">Falha ao carregar PDF. Certifique-se que o arquivo não está corrompido ou protegido por senha.</div>}
            >
              {(typeof numPages === 'number' && numPages > 0) ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="pages-droppable" direction="horizontal">
                    {(provided) => (
                      <div className="flex flex-wrap gap-4 justify-center" ref={provided.innerRef} {...provided.droppableProps}>
                        {pagesOrder.map((pageNum, idx) => (
                          <Draggable key={pageNum} draggableId={pageNum.toString()} index={idx}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex flex-col items-center border-2 rounded-lg p-2 cursor-move transition-all duration-200 shadow-sm hover:shadow-lg bg-gray-50`}
                                onClick={() => handlePreview(pageNum - 1)}
                              >
                                <Page
                                  pageNumber={pageNum}
                                  width={100}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                                <span className="text-xs mt-1">Pág. {pageNum}</span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="text-red-600 font-semibold">Não foi possível obter as páginas do PDF. O arquivo pode estar corrompido ou protegido.</div>
              )}
            </Document>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 shadow"
        >
          {loading ? 'Reorganizando...' : 'Reorganizar Páginas'}
        </button>
      </form>
      {previewIdx !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={closePreview}>
          <div className="bg-white p-6 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            {(file && typeof numPages === 'number' && numPages > 0 && previewIdx >= 0 && previewIdx < numPages) ? (
              <Document file={file} loading={<div>Carregando PDF...</div>} error={<div className="text-red-600">Erro ao carregar PDF no visualizador.</div>}>
                <Page
                  pageNumber={previewIdx + 1}
                  width={600}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            ) : (
              <div className="text-red-600 font-semibold">Não foi possível exibir a página selecionada. O arquivo pode estar corrompido ou protegido.</div>
            )}
            <button className="mt-6 px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold" onClick={closePreview}>Fechar</button>
          </div>
        </div>
      )}
      {error && <div className="mt-6 text-red-600 font-semibold">{error}</div>}
      {downloadUrl && (
        <div className="mt-6">
          <a
            href={downloadUrl}
            download="pdf_reorganizado.pdf"
            className="text-green-700 underline font-bold text-lg"
          >
            Baixar PDF Reorganizado
          </a>
        </div>
      )}
    </div>
  );
};

export default ReorderPages;

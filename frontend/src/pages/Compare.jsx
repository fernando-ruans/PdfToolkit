
import React, { useState } from 'react';
import axios from 'axios';

const Compare = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFile1Change = (e) => {
    setFile1(e.target.files[0]);
    setResult(null);
    setError('');
  };

  const handleFile2Change = (e) => {
    setFile2(e.target.files[0]);
    setResult(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file1 || !file2) {
      setError('Selecione os dois arquivos PDF.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    try {
      const response = await axios.post('/api/edit/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data.result);
    } catch (err) {
      setError('Falha ao comparar os PDFs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Comparar PDFs</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">PDF 1:</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile1Change}
            className="block w-full text-sm text-gray-700"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">PDF 2:</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile2Change}
            className="block w-full text-sm text-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Comparando...' : 'Comparar PDFs'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {result && (
        <div className="mt-6">
          <div className="mb-2 text-lg font-semibold text-gray-800">Resumo:</div>
          <div className="mb-2">PDF 1: <span className="font-bold">{result.total_pages_pdf1}</span> páginas</div>
          <div className="mb-2">PDF 2: <span className="font-bold">{result.total_pages_pdf2}</span> páginas</div>
          <div className="mb-4">Diferença de páginas: <span className="font-bold">{result.page_difference}</span></div>
          {result.diffs.length === 0 ? (
            <div className="text-green-700 font-semibold">Os PDFs são idênticos em texto.</div>
          ) : (
            <div>
              <div className="mb-2 text-lg font-semibold text-gray-800">Diferenças encontradas:</div>
              {result.diffs.map((diff, idx) => (
                <div key={idx} className="mb-4 p-3 border rounded bg-gray-50">
                  <div className="font-bold mb-2">Página {diff.page}</div>
                  <pre className="text-xs overflow-x-auto bg-white p-2 rounded border">
                    {diff.diff.length === 0
                      ? 'Diferença não detalhada.'
                      : diff.diff.map((line, i) => {
                          if (line.startsWith('+')) return <span key={i} style={{color: 'green'}}>{line}<br/></span>;
                          if (line.startsWith('-')) return <span key={i} style={{color: 'red'}}>{line}<br/></span>;
                          return <span key={i}>{line}<br/></span>;
                        })}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Compare;

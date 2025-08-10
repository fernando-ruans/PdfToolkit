import React, { useState } from 'react';
import axios from 'axios';

const Compare = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleFile1Change = (e) => {
    setFile1(e.target.files[0]);
    setResult('');
    setError('');
  };

  const handleFile2Change = (e) => {
    setFile2(e.target.files[0]);
    setResult('');
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
    setResult('');
    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    try {
      const response = await axios.post('/api/edit/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data.result || 'Comparação realizada.');
    } catch (err) {
      setError('Falha ao comparar os PDFs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
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
        <div className="mt-4 text-green-700 font-semibold">{result}</div>
      )}
    </div>
  );
};

export default Compare;

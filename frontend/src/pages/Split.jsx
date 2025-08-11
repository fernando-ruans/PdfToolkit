import React, { useRef, useState } from 'react'
import axios from 'axios'
import { FaDownload } from 'react-icons/fa';
import { GiScissors } from 'react-icons/gi';

export default function Split() {
  const [file, setFile] = useState(null)
  const [ranges, setRanges] = useState('1-1,2-2')
  const [downUrl, setDownUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const onBrowse = (e) => setFile(e.target.files?.[0] || null)

  const split = async () => {
    setError(null)
    setDownUrl(null)
    setProgress(0)
    if (!file) return
  const form = new FormData()
  form.append('file', file)
  form.append('ranges', ranges)
    try {
      const res = await axios.post('/api/edit/split', form, {
        responseType: 'blob',
        onUploadProgress: evt => evt.total && setProgress(Math.round((evt.loaded / evt.total) * 100)),
      })
      const url = URL.createObjectURL(res.data)
      setDownUrl(url)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
  <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-blue-100">
      <h2 className="text-xl font-bold mb-4">Dividir PDF</h2>
      <input type="file" accept="application/pdf" ref={inputRef} className="hidden" onChange={onBrowse} />
      <button className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition" onClick={() => inputRef.current?.click()}>
  <GiScissors className="animate-pulse" /> Selecionar PDF
      </button>
      {file && (
        <div className="mt-4 space-y-2">
          <div className="text-sm">Arquivo: {file.name}</div>
          <label className="block text-sm">Intervalos (ex: 1-1,2-2,3-5):
            <input className="border px-2 py-1 rounded ml-2" value={ranges} onChange={e => setRanges(e.target.value)} />
          </label>
          <button className="mt-2 px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-50" onClick={split} disabled={!file}>
            <GiScissors /> Dividir PDF
          </button>
          <div className="mt-4 h-3 bg-gray-200 rounded">
            <div className="h-3 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
          </div>
          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
          {downUrl && (
            <div className="mt-4 flex items-center gap-2">
              <FaDownload className="text-green-600 animate-bounce" />
              <a href={downUrl} download="splits.zip" className="text-green-700 underline font-semibold">Baixar PDFs (ZIP)</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

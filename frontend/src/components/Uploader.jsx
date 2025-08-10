import React, { useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function Uploader() {
  const { t } = useTranslation()
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [downUrl, setDownUrl] = useState(null)
  const [error, setError] = useState(null)
  const [zipSeparate, setZipSeparate] = useState(false)
  const inputRef = useRef(null)

  const onDrop = (e) => {
    e.preventDefault()
    const list = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...list])
  }

  const onBrowse = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)])
  }

  const convert = async () => {
    const form = new FormData()
  files.forEach((f) => form.append('files', f))
  if (zipSeparate && files.length > 1) form.append('zip', '1')
    setProgress(0)
    setDownUrl(null)
    setError(null)
    try {
      const res = await axios.post(`${API}/api/convert`, form, {
        responseType: 'blob',
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      const fname = match ? match[1] : (files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') + '.pdf' : 'converted.zip')
      const url = URL.createObjectURL(res.data)
      setDownUrl({ url, name: fname })
    } catch (e) {
      console.error('Conversion error', e)
      setError(e.message || 'Error')
    }
  }

  return (
    <div className="grid gap-4">
      <div
        className="border-2 border-dashed rounded p-6 text-center bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <p className="mb-2">{t('uploader.dragdrop')}</p>
        <input type="file" multiple ref={inputRef} className="hidden" onChange={onBrowse} />
        <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => inputRef.current?.click()}>
          {t('uploader.browse')}
        </button>
      </div>

      {files.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">{t('uploader.selected')}</h3>
          <ul className="list-disc pl-5 text-sm">
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            {files.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={zipSeparate} onChange={e => setZipSeparate(e.target.checked)} />
                {t('uploader.generateZip')}
              </label>
            )}
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={convert}>
              {t('uploader.convert')}
            </button>
          </div>
          <div className="mt-4 h-3 bg-gray-200 rounded">
            <div className="h-3 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {downUrl && (
            <a className="mt-4 inline-block underline text-blue-700" href={downUrl.url} download={downUrl.name}>
        {files.length === 1 || !zipSeparate ? t('uploader.downloadPdf') : t('uploader.downloadZip')}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// OBSOLETO: Este componente não deve mais ser usado. Todas as ferramentas agora têm páginas próprias.
export default function PdfEditor() {
  return null;
}
        </div>
        <div className="grid gap-2 mt-4 sm:grid-cols-2">
          <button className="btn" onClick={() => runOp('rotate', { pages: '1', angle: '90' })}>{t('editor.rotate')}</button>
          <button className="btn" onClick={() => runOp('merge')}>{t('editor.merge')}</button>
          <button className="btn" onClick={() => runOp('split', { ranges: '1-1,2-2' })}>{t('editor.split')}</button>
          <button className="btn" onClick={() => runOp('remove-pages', { pages: '1' })}>{t('editor.remove')}</button>
          <button className="btn" onClick={() => runOp('add-content', { ops: JSON.stringify([{ type: 'text', text: 'Hello', page: 1, x: 50, y: 50 }]) })}>{t('editor.addText')}</button>
          <button className="btn" onClick={() => runOp('protect', { password: '1234' })}>{t('editor.protect')}</button>
          <button className="btn" onClick={() => runOp('unprotect', { password: '1234' })}>{t('editor.unprotect')}</button>
          <button className="btn" onClick={() => runOp('resize', { width: '595', height: '842' })}>{t('editor.resize')}</button>
          <button className="btn" onClick={() => runOp('extract')}>{t('editor.extract')}</button>
          <div className="grid gap-2 bg-gray-50 p-2 rounded">
            <label className="text-sm">Cert (P12): <input type="file" accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files?.[0] || null)} /></label>
            <input className="border px-2 py-1 rounded" placeholder="Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
            <button className="btn" onClick={() => runOp('sign', { signerName: 'User' })}>{t('editor.sign')}</button>
          </div>
        </div>
      </div>

      {resultUrl && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">{t('editor.preview')}</h3>
          <iframe className="w-full h-96 border" src={resultUrl} title="preview" />
          <a className="mt-2 inline-block underline text-blue-700" href={resultUrl} download>
            {t('editor.download')}
          </a>
        </div>
      )}
    </div>
  )}

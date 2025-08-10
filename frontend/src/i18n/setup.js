import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  pt: {
    translation: {
      home: { title: 'Ferramentas PDF', convert: 'Converter para PDF', edit: 'Editar PDF' },
  uploader: { dragdrop: 'Arraste e solte arquivos aqui', browse: 'Escolher arquivos', selected: 'Selecionados', convert: 'Converter', downloadZip: 'Baixar ZIP', downloadPdf: 'Baixar PDF', generateZip: 'Gerar ZIP separado' },
      editor: { choosePdf: 'Escolher PDF', rotate: 'Rotacionar 90°', merge: 'Mesclar (envie vários PDFs)', split: 'Dividir 1-1,2-2', remove: 'Remover página 1', addText: 'Adicionar texto', protect: 'Proteger (1234)', unprotect: 'Desproteger (1234)', resize: 'Redimensionar A4', extract: 'Extrair', sign: 'Assinar', preview: 'Pré-visualização', download: 'Baixar' }
    }
  },
  en: {
    translation: {
      home: { title: 'PDF Tools', convert: 'Convert to PDF', edit: 'Edit PDF' },
  uploader: { dragdrop: 'Drag and drop files here', browse: 'Browse files', selected: 'Selected', convert: 'Convert', downloadZip: 'Download ZIP', downloadPdf: 'Download PDF', generateZip: 'Generate separate ZIP' },
      editor: { choosePdf: 'Choose PDF', rotate: 'Rotate 90°', merge: 'Merge (upload multiple PDFs)', split: 'Split 1-1,2-2', remove: 'Remove page 1', addText: 'Add text', protect: 'Protect (1234)', unprotect: 'Unprotect (1234)', resize: 'Resize A4', extract: 'Extract', sign: 'Sign', preview: 'Preview', download: 'Download' }
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'pt',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n

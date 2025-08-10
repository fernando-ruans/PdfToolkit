import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Uploader from '../components/Uploader';
import { Link } from 'react-router-dom';
import { FaFilePdf, FaCompress, FaEdit, FaLock, FaUnlock, FaFileImage, FaImages, FaPlus, FaMinus, FaSync, FaSortNumericDown, FaWater, FaExchangeAlt, FaSignature, FaLayerGroup, FaFileExport, FaFileImport } from 'react-icons/fa';
import { GiScissors } from 'react-icons/gi';

export default function Home({ onNavigate }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(null)

      const tools = [
        { id: 'convert', label: t('home.convert'), path: '/convert', icon: <FaFileImport size={28} /> },
        { id: 'merge', label: 'Juntar PDF', path: '/merge', icon: <FaLayerGroup size={28} /> },
  { id: 'split', label: 'Dividir PDF', path: '/split', icon: <GiScissors size={28} /> },
        { id: 'compress', label: 'Comprimir PDF', path: '/compress', icon: <FaCompress size={28} /> },
        { id: 'edit', label: 'Editar PDF', path: '/edit', icon: <FaEdit size={28} /> },
        { id: 'sign', label: 'Assinar PDF', path: '/sign', icon: <FaSignature size={28} /> },
        { id: 'pdf2img', label: 'PDF para imagens', path: '/pdf2img', icon: <FaFileImage size={28} /> },
        { id: 'img2pdf', label: 'Imagens para PDF', path: '/img2pdf', icon: <FaImages size={28} /> },
        { id: 'extractimg', label: 'Extrair imagens de PDF', path: '/extractimg', icon: <FaFileExport size={28} /> },
        { id: 'protect', label: 'Proteger PDF', path: '/protect', icon: <FaLock size={28} /> },
        { id: 'unprotect', label: 'Desbloquear PDF', path: '/unprotect', icon: <FaUnlock size={28} /> },
        { id: 'rotate', label: 'Rotacionar páginas', path: '/rotate', icon: <FaSync size={28} /> },
        { id: 'remove', label: 'Remover páginas', path: '/remove', icon: <FaMinus size={28} /> },
        { id: 'extract', label: 'Extrair páginas', path: '/extract', icon: <FaFileExport size={28} /> },
        { id: 'reorder', label: 'Reorganizar páginas', path: '/reorder', icon: <FaExchangeAlt size={28} /> },
        { id: 'pagenum', label: 'Adicionar números de página', path: '/pagenum', icon: <FaSortNumericDown size={28} /> },
        { id: 'watermark', label: 'Adicionar marca d’água', path: '/watermark', icon: <FaWater size={28} /> },
        { id: 'compare', label: 'Comparar PDFs', path: '/compare', icon: <FaFilePdf size={28} /> }
      ];
  // linha removida, já está no array acima

  return (
    <main className="p-6 max-w-7xl mx-auto bg-neutral-900 text-neutral-100 min-h-[80vh] rounded-lg">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">{t('home.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tools.map(tool => (
            <Link key={tool.id} to={tool.path} className="aspect-square flex flex-col items-center justify-center text-center text-base font-semibold bg-white text-neutral-800 hover:bg-blue-100 rounded-lg border border-neutral-200 shadow transition-all duration-150">
              <span className="mb-2">{tool.icon}</span>
              <span>{tool.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

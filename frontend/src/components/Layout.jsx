import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaGithub, FaTools } from 'react-icons/fa';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 text-gray-900 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="/public/logo.png" alt="Logo PDF Toolkit" className="h-16 w-auto" style={{maxHeight: 64}} />
              <span className="font-extrabold text-2xl tracking-tight text-blue-700 hover:text-blue-900 transition">PDF Toolkit</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/" className="hover:text-blue-700 flex items-center gap-1"><FaHome /> Início</Link>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 flex items-center gap-1"><FaGithub /> GitHub</a>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-2">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
      <footer className="bg-white/80 backdrop-blur border-t text-center py-3 text-sm text-gray-500 mt-8">
        PDF Toolkit © {new Date().getFullYear()} — Feito com ❤️ por você
      </footer>
    </div>
  );
}

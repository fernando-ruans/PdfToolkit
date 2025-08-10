# PDF Toolkit (Node.js + React)

Aplicativo web completo para converter qualquer arquivo comum para PDF e editar PDFs (mesclar, dividir, rotacionar, anotar, proteger, etc.).

## Requisitos

- Node.js 18+
- Backend usa LibreOffice (soffice) para converter documentos Office; instale e garanta `soffice` no PATH.
- Para imagens, é usado `sharp`.
 - Para desproteger PDFs, suporte opcional via `qpdf` (se instalado no PATH).
 - Para extrair imagens via rasterização, suporte opcional via `pdftoppm` (poppler-utils) no PATH.
 - Assinatura digital real opcional via certificado P12: usa `node-signpdf`.


## Instalação e execução (monolítico)


## Instalação e execução a partir da raiz

1. Instale todas as dependências (backend e frontend):
  ```powershell
  npm install
  ```

2. Gere o build do frontend:
  ```powershell
  npm run build
  ```

3. Inicie o app monolítico (backend + frontend na mesma porta):
  ```powershell
  npm start
  ```
  O app estará disponível em http://localhost:4000 (ou porta definida em .env).

- Todas as rotas /api continuam funcionando normalmente.
- O frontend React é servido como SPA pelo Express.

## Desenvolvimento
- Para desenvolvimento do frontend, use `npm run dev` dentro de `frontend` normalmente.
- Para desenvolvimento do backend, use `npm run dev` dentro de `backend` (Nodemon).

## Produção
- Faça o build do frontend (`npm run build:all`), depois rode `npm start` no backend.

## Observações
- O backend Express serve tudo, inclusive os arquivos estáticos do frontend.
- Não é mais necessário rodar dois servidores separados.

## Funcionalidades

- Conversão universal para PDF:
  - Imagens (JPG, PNG, BMP, TIFF, etc.) via `sharp`.
  - Documentos (DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, HTML, etc.) via LibreOffice (`soffice`).
  - Upload em streaming (sem limite de tamanho), lote múltiplo, retorno como ZIP.

- Editor de PDF (pdf-lib):
  - Adicionar/remover páginas, mesclar, dividir, rotacionar, adicionar texto, redimensionar páginas, proteger PDF, pseudo-desproteger, extrair conteúdo básico, assinatura visual.
  - Observação: assinatura digital real (PKCS#7) e desproteção forte exigem libs especializadas e certificados (fora do escopo deste template).

- UI (React + Tailwind):
  - Tela inicial com "Converter para PDF" e "Editar PDF".
  - Drag-and-drop, progresso de upload, preview e download.
  - i18n PT-BR e EN.

## Produção

- Build do frontend:
  ```powershell
  cd frontend; npm run build
  ```
- Você pode servir os arquivos estáticos do `frontend/dist` em qualquer servidor. O backend Express pode ser hospedado em qualquer ambiente Node com LibreOffice disponível.

## Estrutura

- backend: Express, rotas `/api/convert` e `/api/edit/*` com upload streaming via Busboy.
- frontend: Vite + React + Tailwind, componentes `Uploader` e `PdfEditor`.

## Dependências de sistema (opcionais)

- qpdf: https://qpdf.sourceforge.io/ (para `unprotect` com senha)
- Poppler (pdftoppm): https://blog.alivate.com.au/poppler-windows/ (para extrair imagens)

## Notas Tailwind

As diretivas `@tailwind` e `@apply` são processadas no build (Vite + PostCSS). O editor pode apontar avisos, mas em tempo de build os estilos são gerados corretamente.

## Observações

- Para extração de texto/imagens e assinatura digital completas, considere integrar `pdfjs-dist` (parsing) e uma lib de assinatura (p.ex. node-signpdf) com certificados.
- Em Windows, o executável do LibreOffice pode estar em `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`.

## Deploy em Heroku

1. Crie um app no Heroku e conecte o repositório.
2. Certifique-se de que o arquivo `Procfile` está presente na raiz de `pybackend`.
3. O Heroku detecta o Python automaticamente e instala as dependências do `requirements.txt`.
4. O comando de inicialização já está configurado no `Procfile`.
5. Após o deploy, o backend estará disponível em uma URL pública.

## Deploy em Render

1. Crie um novo serviço web no Render e aponte para o repositório.
2. Configure o comando de inicialização para:
   ```sh
   bash start.sh
   ```
3. O Render detecta o Python e instala as dependências do `requirements.txt`.
4. O backend ficará disponível em uma URL pública.

## Observações para integração com o frontend (Vercel)

- No frontend, configure as URLs das requisições para apontar para o backend hospedado (Heroku ou Render).
- Certifique-se de que o backend aceita CORS do domínio do frontend.

# PDF Toolkit - Backend Python (FastAPI)

## Instruções para rodar o projeto

1. Instale o Python 3.9 ou superior
2. No terminal, acesse a pasta `pybackend`:
   ```sh
   cd pybackend
   ```
3. Instale as dependências:
   ```sh
   pip install -r requirements.txt
   ```
4. Faça o build do frontend (Vite) normalmente (já feito em `frontend/dist`)
5. Inicie o backend:
   ```sh
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
6. Acesse [http://localhost:8000](http://localhost:8000) para usar o app (frontend SPA será servido pelo FastAPI)

## Funcionalidades do PDF Toolkit

- **Extração de páginas**: selecione páginas via miniaturas, visualize antes de exportar.
- **Reorganização de páginas**: arraste e solte para reordenar, preview instantâneo.
- **Adicionar números de página**: escolha posição, formato e exporte.
- **Adicionar marca d'água**: texto ou imagem, escolha posição (topo, centro, rodapé) e opacidade.
- **Comparar PDFs**: upload de dois arquivos, exibe diferenças de texto por página (diff tradicional).
- **Proteger PDF**: adicione senha ao arquivo.
- **Desproteger PDF**: remova senha de arquivos protegidos.
- **Converter PDF para imagem**: exporte páginas como PNG/JPG.
- **Converter imagem para PDF**: crie PDF a partir de imagens.
- **Mesclar PDFs**: combine múltiplos arquivos em um só.
- **Dividir PDF**: separe páginas em novos arquivos.
- **Comprimir PDF**: reduza o tamanho do arquivo.
- **Extrair imagens**: salve imagens contidas no PDF.
- **Remover páginas**: exclua páginas indesejadas.
- **Rotacionar páginas**: gire páginas individualmente.
- **Assinar PDF**: (customizável) adicione assinatura digital.

## Tecnologias utilizadas

- **Backend**: FastAPI, PyPDF2, reportlab, Pillow, PyMuPDF
- **Frontend**: React, Vite, TailwindCSS, react-pdf, axios

## Observações

- Para converter PDF→imagem, é usado PyMuPDF (`pymupdf`). Para imagem→PDF, é usado Pillow.
- O frontend SPA é servido diretamente pelo backend FastAPI.
- Para produção, recomenda-se usar um servidor ASGI como gunicorn+uvicorn.

---
Projeto desenvolvido para manipulação avançada de PDFs via interface web moderna.

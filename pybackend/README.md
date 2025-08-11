# Instruções para rodar o backend Python (FastAPI)

1. Instale o Python 3.9+
2. No terminal, acesse a pasta pybackend:
   cd pybackend
3. Instale as dependências:
   pip install -r requirements.txt
4. Faça o build do frontend (Vite) normalmente (já feito em frontend/dist)
5. Inicie o backend:
   uvicorn main:app --host 0.0.0.0 --port 8000
6. Acesse http://localhost:8000 para usar o app (frontend será servido pelo FastAPI)

Obs: Para converter PDF→imagem, é usado PyMuPDF (pymupdf). Para imagem→PDF, é usado Pillow.

Se quiser rodar em produção, use um servidor ASGI como gunicorn+uvicorn.

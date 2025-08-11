from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from uuid import uuid4
from typing import List

app = FastAPI(title="PDF Toolkit Python Backend")

# Permitir frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pasta para arquivos temporários
UPLOAD_DIR = "tmp"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Servir frontend build (Vite)
from fastapi.responses import HTMLResponse
from starlette.requests import Request



# Servir assets do Vite em /assets
app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")




# Servir index.html em /
@app.get("/", response_class=HTMLResponse)
async def root():
    index_path = os.path.join(os.path.dirname(__file__), "../frontend/dist/index.html")
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            return HTMLResponse(f.read(), status_code=200)
    return HTMLResponse(status_code=404, content="index.html não encontrado")


# Fallback: servir index.html para qualquer GET não-API
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_fallback(full_path: str):
    # Não intercepta APIs nem assets
    if full_path.startswith("api/") or full_path.startswith("assets/"):
        return HTMLResponse(status_code=404, content="Not Found")
    index_path = os.path.join(os.path.dirname(__file__), "../frontend/dist/index.html")
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            return HTMLResponse(f.read(), status_code=200)
    return HTMLResponse(status_code=404, content="index.html não encontrado")

@app.post("/api/pdf2img")
async def pdf_to_img(file: UploadFile = File(...)):
    """Converte PDF em imagens (uma por página)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF não instalado. Use: pip install pymupdf")
    
    # Salvar PDF temporário
    pdf_id = str(uuid4())
    pdf_path = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Converter PDF em imagens
    doc = fitz.open(pdf_path)
    img_paths = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap()
        img_path = os.path.join(UPLOAD_DIR, f"{pdf_id}_page{i+1}.png")
        pix.save(img_path)
        img_paths.append(img_path)
    doc.close()
    
    # Retornar lista de arquivos gerados
    return JSONResponse({"images": [os.path.basename(p) for p in img_paths]})

@app.post("/api/img2pdf")
async def img_to_pdf(files: List[UploadFile] = File(...)):
    """Converte imagens em um único PDF."""
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow não instalado. Use: pip install pillow")
    
    img_id = str(uuid4())
    img_paths = []
    for i, file in enumerate(files):
        img_path = os.path.join(UPLOAD_DIR, f"{img_id}_{i}.png")
        with open(img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        img_paths.append(img_path)
    
    images = [Image.open(p).convert("RGB") for p in img_paths]
    pdf_path = os.path.join(UPLOAD_DIR, f"{img_id}.pdf")
    images[0].save(pdf_path, save_all=True, append_images=images[1:])
    
    # Limpar imagens temporárias
    for p in img_paths:
        os.remove(p)
    
    return FileResponse(pdf_path, filename="output.pdf")

@app.get("/api/tmp/{filename}")
def get_tmp_file(filename: str):
    """Permite baixar arquivos temporários gerados."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(file_path)

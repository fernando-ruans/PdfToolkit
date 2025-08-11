from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import shutil
import os
from uuid import uuid4
from typing import List
import threading

# Controle de progresso global (simples, por id)
conversion_progress = {}


app = FastAPI(title="PDF Toolkit Python Backend")
# Permitir frontend local
@app.post("/api/start")
def start_conversion():
    conv_id = str(uuid4())
    conversion_progress[conv_id] = 0
    print(f"[LOG] Novo ID de conversão criado: {conv_id}")
    return {"id": conv_id}

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


from fastapi.responses import StreamingResponse
import zipfile
import io


@app.post("/api/pdf2img")
async def pdf_to_img(file: UploadFile = File(...), conv_id: str = Form(...)):
    print(f"[LOG] Recebido upload para PDF2IMG com conv_id={conv_id}")
    print(f"[LOG] Estado inicial do progresso: {conversion_progress.get(conv_id)}")
    """Converte PDF em imagens (uma por página) e retorna um ZIP para download. Progresso via polling."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF não instalado. Use: pip install pymupdf")
    pdf_path = os.path.join(UPLOAD_DIR, f"{conv_id}.pdf")
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    doc = fitz.open(pdf_path)
    img_paths = []
    total = doc.page_count
    for i, page in enumerate(doc):
        print(f"[LOG] PDF2IMG conv_id={conv_id} página {i+1}/{total}")
        pix = page.get_pixmap()
        img_path = os.path.join(UPLOAD_DIR, f"{conv_id}_page{i+1}.png")
        pix.save(img_path)
        img_paths.append(img_path)
        conversion_progress[conv_id] = int(((i+1)/total)*90)  # 0-90% durante conversão
    doc.close()
    # Compactar imagens em um ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zipf:
        for img_path in img_paths:
            zipf.write(img_path, os.path.basename(img_path))
    zip_buffer.seek(0)
    # Limpar imagens temporárias
    for p in img_paths:
        os.remove(p)
    os.remove(pdf_path)
    conversion_progress[conv_id] = 100  # 100% ao finalizar
    print(f"[LOG] PDF2IMG conv_id={conv_id} FINALIZADO")
    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename=pdf2img_{conv_id}.zip", "X-Conversion-Id": conv_id})



@app.post("/api/img2pdf")
async def img_to_pdf(file: UploadFile = File(...), conv_id: str = Form(...)):
    print(f"[LOG] Recebido upload para IMG2PDF com conv_id={conv_id}")
    print(f"[LOG] Estado inicial do progresso: {conversion_progress.get(conv_id)}")
    """Converte uma imagem em PDF. Progresso via polling."""
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow não instalado. Use: pip install pillow")
    img_path = os.path.join(UPLOAD_DIR, f"{conv_id}.png")
    with open(img_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    conversion_progress[conv_id] = 50
    print(f"[LOG] IMG2PDF conv_id={conv_id} progresso 50%")
    image = Image.open(img_path).convert("RGB")
    pdf_path = os.path.join(UPLOAD_DIR, f"{conv_id}.pdf")
    image.save(pdf_path)
    os.remove(img_path)
    conversion_progress[conv_id] = 100
    print(f"[LOG] IMG2PDF conv_id={conv_id} FINALIZADO")
    return FileResponse(pdf_path, filename="output.pdf", headers={"X-Conversion-Id": conv_id})
# Endpoint para polling de progresso
@app.get("/api/progress/{conv_id}")
def get_progress(conv_id: str):
    if conv_id in conversion_progress:
        prog = conversion_progress[conv_id]
        print(f"[LOG] Polling progresso conv_id={conv_id}: {prog}")
        return {"progress": int(prog) if prog is not None else 0}
    print(f"[LOG] Polling progresso conv_id={conv_id}: NÃO ENCONTRADO")
    return {"progress": 100}

@app.get("/api/tmp/{filename}")
def get_tmp_file(filename: str):
    """Permite baixar arquivos temporários gerados."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(file_path)

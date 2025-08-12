
# Imports principais (devem vir antes do uso do app)
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from uuid import uuid4
from typing import List
import threading
import io

# Definição do app
app = FastAPI(title="PDF Toolkit Python Backend")

# Endpoint para assinar PDF (customizável)

# Endpoint para assinar PDF com imagem (dataUrl base64)
@app.post("/api/edit/sign")
async def sign_pdf(
    file: UploadFile = File(...),
    x: int = Form(50),
    y: int = Form(50),
    signature_img: str = Form(None)
):
    from PyPDF2 import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    import base64
    import re
    from PIL import Image
    pdf_bytes = await file.read()
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        packet = io.BytesIO()
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        can = canvas.Canvas(packet, pagesize=(width, height))
        # Só assina a primeira página
        if i == 0 and signature_img:
            # Extrair base64 puro
            match = re.match(r"data:image/(png|jpeg);base64,(.*)", signature_img)
            if match:
                img_data = base64.b64decode(match.group(2))
                img = Image.open(io.BytesIO(img_data))
                # Ajustar tamanho da assinatura se necessário
                max_w, max_h = 200, 60
                ratio = min(max_w / img.width, max_h / img.height, 1)
                new_w, new_h = int(img.width * ratio), int(img.height * ratio)
                img = img.resize((new_w, new_h), Image.LANCZOS)
                img_io = io.BytesIO()
                img.save(img_io, format='PNG')
                img_io.seek(0)
                can.drawImage(ImageReader(img_io), x, height - y - new_h, width=new_w, height=new_h, mask='auto')
        can.save()
        packet.seek(0)
        from PyPDF2 import PdfReader as RLReader
        sig_pdf = RLReader(packet)
        sig_page = sig_pdf.pages[0]
        page.merge_page(sig_page)
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(out, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=assinado.pdf"})


# --- ENDPOINTS FUNCIONAIS PARA TODOS OS MENUS ---
# (Bloco duplicado removido para evitar conflitos)

# Controle de progresso global (simples, por id)
conversion_progress = {}

from PyPDF2 import PdfReader, PdfWriter
@app.post("/api/edit/split")
async def split_pdf(file: UploadFile = File(...), ranges: str = Form(...)):
    """Divide o PDF conforme intervalos (ex: 1-1,2-2,3-5) e retorna ZIP."""
    import zipfile
    pdf_bytes = await file.read()
    reader = PdfReader(io.BytesIO(pdf_bytes))
    zip_buffer = io.BytesIO()
    for idx, part in enumerate(ranges.split(",")):
        writer = PdfWriter()
        if "-" in part:
            start, end = [int(x)-1 for x in part.split("-")]
        else:
            start = end = int(part)-1
        for i in range(start, end+1):
            if 0 <= i < len(reader.pages):
                writer.add_page(reader.pages[i])
        out = io.BytesIO()
        writer.write(out)
        out.seek(0)
        with zipfile.ZipFile(zip_buffer, "a") as zipf:
            zipf.writestr(f"split_{idx+1}.pdf", out.read())
    zip_buffer.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=splits.zip"})

@app.post("/api/edit/compress")
async def compress_pdf(file: UploadFile = File(...), level: str = Form("default")):
    from PyPDF2 import PdfReader, PdfWriter
    pdf_bytes = await file.read()
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(out, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=compressed.pdf"})

# Editar conteúdo (stub: só regrava)
@app.post("/api/edit/content")
async def edit_content(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(out, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=edited.pdf"})
# Endpoint para juntar múltiplos PDFs
@app.post("/api/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    try:
        from PyPDF2 import PdfMerger
    except ImportError:
        raise HTTPException(status_code=500, detail="PyPDF2 não instalado. Use: pip install pypdf2")
    if not files or len(files) < 2:
        raise HTTPException(status_code=400, detail="Envie pelo menos dois arquivos PDF.")
    merger = PdfMerger()
    temp_paths = []
    for f in files:
        temp_path = os.path.join(UPLOAD_DIR, f"merge_{uuid4()}.pdf")
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(f.file, out)
        merger.append(temp_path)
        temp_paths.append(temp_path)
    output_stream = io.BytesIO()
    merger.write(output_stream)
    merger.close()
    # Limpar temporários
    for p in temp_paths:
        os.remove(p)
    output_stream.seek(0)
    from starlette.responses import StreamingResponse
    return StreamingResponse(output_stream, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=merged.pdf"})
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
# Servir arquivos públicos do frontend (ex: pdf.worker.min.js)
app.mount("/public", StaticFiles(directory="../frontend/public"), name="public")




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




# Novo endpoint: aceita várias imagens e gera PDF multi-página
from typing import List
@app.post("/api/img2pdf")
async def img_to_pdf(files: List[UploadFile] = File(...), conv_id: str = Form(...)):
    print(f"[LOG] Recebido upload para IMG2PDF com conv_id={conv_id}")
    print(f"[LOG] Estado inicial do progresso: {conversion_progress.get(conv_id)}")
    """Converte várias imagens em um PDF multi-página. Progresso via polling."""
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow não instalado. Use: pip install pillow")
    img_paths = []
    for idx, file in enumerate(files):
        img_path = os.path.join(UPLOAD_DIR, f"{conv_id}_{idx}.png")
        with open(img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        img_paths.append(img_path)
    conversion_progress[conv_id] = 50
    print(f"[LOG] IMG2PDF conv_id={conv_id} progresso 50%")
    images = [Image.open(p).convert("RGB") for p in img_paths]
    pdf_path = os.path.join(UPLOAD_DIR, f"{conv_id}.pdf")
    if images:
        images[0].save(pdf_path, save_all=True, append_images=images[1:])
    for p in img_paths:
        os.remove(p)
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

const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5200;

app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/src/uploads')));
app.use(express.json());

// Configuração do multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public/src/uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  })
});

// Upload e salvar metadados
app.post('/upload', upload.single('pdf'), (req, res) => {
  const file = req.file;
  const { name, category } = req.body;

  if (!file || !name || !category) {
    return res.status(400).send('Campos obrigatórios faltando.');
  }

  const fileUrl = `/uploads/${file.filename}`;
  const now = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,

  });
  const newDoc = { name, category, fileUrl, createdAt: now, updatedAt: now };

  const dataPath = path.join(__dirname, 'data.json');
  const existing = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  existing.push(newDoc);
  fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));

  return res.json(newDoc);
});

// Buscar documentos
app.get('/documents', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) return res.json([]);
  const documents = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  res.json(documents);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.delete('/documents', (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ message: 'Arquivo não informado' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  const documents = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  const updatedDocs = documents.filter(doc => doc.fileUrl !== fileUrl);
  const removedDoc = documents.find(doc => doc.fileUrl === fileUrl);

  // Remove o arquivo do disco
  if (removedDoc) {
    const filePath = path.join(__dirname, 'public/src', removedDoc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(updatedDocs, null, 2));

  res.json({ message: 'Documento removido com sucesso' });
});

// Atualizar nome do documento
app.put('/documents', (req, res) => {
  const { fileUrl, newName } = req.body;

  if (!fileUrl || !newName) {
    return res.status(400).json({ message: 'Parâmetros faltando' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  const documents = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  const docIndex = documents.findIndex(doc => doc.fileUrl === fileUrl);
  if (docIndex === -1) {
    return res.status(404).json({ message: 'Documento não encontrado' });
  }

  documents[docIndex].name = newName;
  documents[docIndex].updatedAt = new Date().toISOString();
  fs.writeFileSync(dataPath, JSON.stringify(documents, null, 2));

  res.json(documents[docIndex]);
});

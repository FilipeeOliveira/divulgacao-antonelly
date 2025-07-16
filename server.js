const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 5200;

// Função para obter IPs locais
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

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
    console.log('Upload falhou: campos obrigatórios faltando');
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

  console.log(`Novo documento adicionado: ${name} (${category})`);
  return res.json(newDoc);
});

// Buscar documentos
app.get('/documents', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('Listagem de documentos: nenhum documento encontrado');
    return res.json([]);
  }
  const documents = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Listagem de documentos: ${documents.length} documentos encontrados`);
  res.json(documents);
});

// Deletar documento
app.delete('/documents', (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    console.log('Tentativa de exclusão sem fileUrl');
    return res.status(400).json({ message: 'Arquivo não informado' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  const documents = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  const updatedDocs = documents.filter(doc => doc.fileUrl !== fileUrl);
  const removedDoc = documents.find(doc => doc.fileUrl === fileUrl);

  if (removedDoc) {
    const filePath = path.join(__dirname, 'public/src', removedDoc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Documento excluído: ${removedDoc.name}`);
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(updatedDocs, null, 2));

  res.json({ message: 'Documento removido com sucesso' });
});

// Atualizar nome do documento
app.put('/documents', (req, res) => {
  const { fileUrl, newName } = req.body;

  if (!fileUrl || !newName) {
    console.log('Tentativa de atualização sem parâmetros necessários');
    return res.status(400).json({ message: 'Parâmetros faltando' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  const documents = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  const docIndex = documents.findIndex(doc => doc.fileUrl === fileUrl);
  if (docIndex === -1) {
    console.log(`Documento não encontrado para atualização: ${fileUrl}`);
    return res.status(404).json({ message: 'Documento não encontrado' });
  }

  const oldName = documents[docIndex].name;
  documents[docIndex].name = newName;
  documents[docIndex].updatedAt = new Date().toISOString();
  fs.writeFileSync(dataPath, JSON.stringify(documents, null, 2));

  console.log(`Documento atualizado: "${oldName}" para "${newName}"`);
  res.json(documents[docIndex]);
});

// Iniciar servidor
const ips = getLocalIPs();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  console.log(`Acesso local: http://localhost:${PORT}`);
  
  if (ips.length > 0) {
    console.log('Acesso pela rede local:');
    ips.forEach(ip => {
      console.log(`- http://${ip}:${PORT}`);
    });
  } else {
    console.log('Nenhum endereço de rede local encontrado');
  }
});

// Tratamento de erro para porta em uso
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Erro: A porta ${PORT} já está em uso`);
  } else {
    console.error('Erro não tratado:', err);
  }
  process.exit(1);
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 5200;

// Configuração de caminhos
const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'src', 'uploads');
const DATA_FILE = path.join(BASE_DIR, 'data.json');

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

// Verificar e criar diretórios
function ensureDirectoriesExist() {
  const dirsToCreate = [PUBLIC_DIR, UPLOADS_DIR];
  
  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`[SISTEMA] Criando diretório: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// ========== CONFIGURAÇÃO INICIAL ==========
console.log(`
=========================================
  Iniciando Servidor de Documentos
  Data: ${new Date().toLocaleString()}
  Sistema: ${os.platform()} ${os.release()}
  Node.js: ${process.version}
  Diretório: ${BASE_DIR}
=========================================
`);

ensureDirectoriesExist();

// ========== MIDDLEWARES ==========
app.use(cors());
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());

// Middleware de log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ========== CONFIGURAÇÃO DO MULTER ==========
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log(`[UPLOAD] Salvando arquivo em: ${UPLOADS_DIR}`);
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      console.log(`[UPLOAD] Nome do arquivo: ${uniqueName}`);
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      console.log(`[UPLOAD] Tipo de arquivo rejeitado: ${file.originalname}`);
      return cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
    cb(null, true);
  }
});

// ========== ROTAS ==========

// Rota de upload
app.post('/upload', upload.single('pdf'), (req, res) => {
  try {
    const { name, category } = req.body;
    const file = req.file;

    if (!file || !name || !category) {
      console.log('[UPLOAD] Erro: Campos obrigatórios faltando');
      return res.status(400).json({ error: 'Nome, categoria e arquivo são obrigatórios' });
    }

    const fileUrl = `/uploads/${file.filename}`;
    const filePath = path.join(UPLOADS_DIR, file.filename);
    
    // Verifica se o arquivo foi realmente salvo
    if (!fs.existsSync(filePath)) {
      console.error('[UPLOAD] Erro: Arquivo não foi salvo no sistema');
      return res.status(500).json({ error: 'Falha ao salvar arquivo' });
    }

    const now = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Manaus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const newDoc = { 
      name, 
      category, 
      fileUrl, 
      createdAt: now, 
      updatedAt: now
    };

    // Carrega ou cria o arquivo de dados
    let documents = [];
    if (fs.existsSync(DATA_FILE)) {
      documents = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }

    documents.push(newDoc);
    fs.writeFileSync(DATA_FILE, JSON.stringify(documents, null, 2));

    console.log(`[UPLOAD] Sucesso: Documento "${name}" salvo em ${filePath}`);
    res.json(newDoc);
  } catch (err) {
    console.error('[UPLOAD] Erro interno:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para listar documentos
app.get('/documents', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('[DOCS] Nenhum documento encontrado (arquivo de dados não existe)');
      return res.json([]);
    }

    const documents = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log(`[DOCS] Retornando ${documents.length} documentos`);
    res.json(documents);
  } catch (err) {
    console.error('[DOCS] Erro ao ler documentos:', err);
    res.status(500).json({ error: 'Erro ao carregar documentos' });
  }
});

// Rota para deletar documento (CORRIGIDA)
app.delete('/documents', (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      console.log('[DELETE] Erro: fileUrl não fornecido');
      return res.status(400).json({ error: 'fileUrl é obrigatório' });
    }

    if (!fs.existsSync(DATA_FILE)) {
      console.log('[DELETE] Nenhum documento para deletar (arquivo de dados não existe)');
      return res.json({ message: 'Nenhum documento encontrado' });
    }

    const documents = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const updatedDocs = documents.filter(doc => doc.fileUrl !== fileUrl);
    const removedDoc = documents.find(doc => doc.fileUrl === fileUrl);

    if (removedDoc) {
      // CORREÇÃO: O caminho do arquivo deve ser construído corretamente
      const filePath = path.join(UPLOADS_DIR, path.basename(removedDoc.fileUrl));
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[DELETE] Arquivo removido: ${filePath}`);
      } else {
        console.log(`[DELETE] Aviso: Arquivo não encontrado: ${filePath}`);
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(updatedDocs, null, 2));
      console.log(`[DELETE] Documento removido: ${fileUrl}`);
      return res.json({ message: 'Documento removido com sucesso' });
    }

    console.log(`[DELETE] Documento não encontrado: ${fileUrl}`);
    res.status(404).json({ error: 'Documento não encontrado' });
  } catch (err) {
    console.error('[DELETE] Erro ao remover documento:', err);
    res.status(500).json({ error: 'Erro ao remover documento' });
  }
});

// Rota para atualizar documento
app.put('/documents', (req, res) => {
  try {
    const { fileUrl, newName } = req.body;

    if (!fileUrl || !newName) {
      console.log('[UPDATE] Erro: fileUrl ou newName não fornecidos');
      return res.status(400).json({ error: 'fileUrl e newName são obrigatórios' });
    }

    if (!fs.existsSync(DATA_FILE)) {
      console.log('[UPDATE] Nenhum documento para atualizar (arquivo de dados não existe)');
      return res.status(404).json({ error: 'Nenhum documento encontrado' });
    }

    const documents = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const docIndex = documents.findIndex(doc => doc.fileUrl === fileUrl);

    if (docIndex === -1) {
      console.log(`[UPDATE] Documento não encontrado: ${fileUrl}`);
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const oldName = documents[docIndex].name;
    documents[docIndex].name = newName;
    documents[docIndex].updatedAt = new Date().toISOString();

    fs.writeFileSync(DATA_FILE, JSON.stringify(documents, null, 2));
    console.log(`[UPDATE] Documento atualizado: "${oldName}" -> "${newName}"`);
    res.json(documents[docIndex]);
  } catch (err) {
    console.error('[UPDATE] Erro ao atualizar documento:', err);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// Rota de informações do servidor
app.get('/server-info', (req, res) => {
  const info = {
    system: {
      platform: os.platform(),
      release: os.release(),
      nodeVersion: process.version
    },
    paths: {
      baseDir: BASE_DIR,
      publicDir: PUBLIC_DIR,
      uploadsDir: UPLOADS_DIR,
      dataFile: DATA_FILE
    },
    stats: {
      uploadsCount: fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR).length : 0,
      documentsCount: fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')).length : 0
    }
  };
  res.json(info);
});

// ========== INICIAR SERVIDOR ==========
const server = app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log(`
=========================================
  Servidor rodando na porta ${PORT}
  Acesso local: http://localhost:${PORT}
  Acesso rede: ${ips.map(ip => `http://${ip}:${PORT}`).join('\n              ')}
=========================================
  `);
});

// ========== TRATAMENTO DE ERROS ==========
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERRO] Rejeição não tratada em:', promise, 'Motivo:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[ERRO] Exceção não tratada:', err);
  process.exit(1);
});
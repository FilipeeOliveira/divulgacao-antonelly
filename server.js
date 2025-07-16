const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 5200;

// Log inicial do ambiente
console.log('=== Ambiente de Execução ===');
console.log('Sistema Operacional:', os.platform(), os.release());
console.log('Node.js:', process.version);
console.log('Diretório Atual:', __dirname);
console.log('===========================');

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

// Configurações de caminhos
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(__dirname, 'public/src/uploads');

// Verifica e cria diretórios se necessário
if (!fs.existsSync(publicDir)) {
  console.log(`Diretório público não encontrado, criando: ${publicDir}`);
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  console.log(`Diretório de uploads não encontrado, criando: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

// Log de middleware estático
console.log('Middleware estático configurado para:');
console.log('- Público:', publicDir);
console.log('- Uploads:', uploadsDir);

// Configuração do multer com logs
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log(`Tentando salvar arquivo no diretório: ${uploadsDir}`);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      console.log(`Nome único gerado para o arquivo: ${uniqueName}`);
      cb(null, uniqueName);
    }
  })
});

// Upload e salvar metadados
app.post('/upload', upload.single('pdf'), (req, res) => {
  console.log('Requisição de upload recebida');
  console.log('Corpo da requisição:', req.body);
  console.log('Arquivo recebido:', req.file);

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
  console.log(`Caminho do arquivo de dados: ${dataPath}`);

  try {
    const existing = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
      : [];

    existing.push(newDoc);
    fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
    console.log(`Novo documento adicionado: ${name} (${category}) em ${fileUrl}`);
    
    // Verifica se o arquivo realmente foi salvo
    const filePath = path.join(uploadsDir, file.filename);
    if (fs.existsSync(filePath)) {
      console.log(`Arquivo confirmado no sistema de arquivos: ${filePath}`);
    } else {
      console.error(`ERRO: Arquivo não encontrado após upload: ${filePath}`);
    }

    return res.json(newDoc);
  } catch (err) {
    console.error('Erro ao processar upload:', err);
    return res.status(500).send('Erro interno do servidor');
  }
});

// Buscar documentos (corrigido o typo na rota)
app.get('/documents', (req, res) => {
  console.log('Requisição para listar documentos recebida');
  const dataPath = path.join(__dirname, 'data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.log('Arquivo data.json não encontrado, retornando array vazio');
    return res.json([]);
  }

  try {
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const documents = JSON.parse(fileContent);
    console.log(`Listagem de documentos: ${documents.length} documentos encontrados`);
    
    // Verifica os caminhos dos arquivos
    documents.forEach(doc => {
      const filePath = path.join(__dirname, 'public/src', doc.fileUrl);
      if (!fs.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath} (documento: ${doc.name})`);
      }
    });
    
    res.json(documents);
  } catch (err) {
    console.error('Erro ao ler data.json:', err);
    res.status(500).json({ error: 'Erro ao ler dados' });
  }
});

// Deletar documento
app.delete('/documents', (req, res) => {
  console.log('Requisição para deletar documento recebida');
  console.log('Corpo da requisição:', req.body);

  const { fileUrl } = req.body;

  if (!fileUrl) {
    console.log('Tentativa de exclusão sem fileUrl');
    return res.status(400).json({ message: 'Arquivo não informado' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  try {
    const documents = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
      : [];

    const updatedDocs = documents.filter(doc => doc.fileUrl !== fileUrl);
    const removedDoc = documents.find(doc => doc.fileUrl === fileUrl);

    if (removedDoc) {
      const filePath = path.join(__dirname, 'public/src', removedDoc.fileUrl);
      console.log(`Tentando remover arquivo: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Documento excluído: ${removedDoc.name}`);
      } else {
        console.error(`Arquivo não encontrado para exclusão: ${filePath}`);
      }
    }

    fs.writeFileSync(dataPath, JSON.stringify(updatedDocs, null, 2));
    res.json({ message: 'Documento removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar documento:', err);
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

// Atualizar nome do documento
app.put('/documents', (req, res) => {
  console.log('Requisição para atualizar documento recebida');
  console.log('Corpo da requisição:', req.body);

  const { fileUrl, newName } = req.body;

  if (!fileUrl || !newName) {
    console.log('Tentativa de atualização sem parâmetros necessários');
    return res.status(400).json({ message: 'Parâmetros faltando' });
  }

  const dataPath = path.join(__dirname, 'data.json');
  try {
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
  } catch (err) {
    console.error('Erro ao atualizar documento:', err);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// Iniciar servidor
const ips = getLocalIPs();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Servidor Iniciado ===`);
  console.log(`Porta: ${PORT}`);
  console.log(`Acesso local: http://localhost:${PORT}`);
  
  if (ips.length > 0) {
    console.log('\nAcesso pela rede local:');
    ips.forEach(ip => {
      console.log(`- http://${ip}:${PORT}`);
    });
  } else {
    console.log('\nNenhum endereço de rede local encontrado');
  }

  console.log('\nDiretórios importantes:');
  console.log('- Público:', publicDir);
  console.log('- Uploads:', uploadsDir);
  console.log('========================\n');
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('\n=== ERRO NÃO TRATADO ===');
  console.error('Mensagem:', err.message);
  console.error('Stack:', err.stack);
  console.error('=======================');
  process.exit(1);
});
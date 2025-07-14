// Variáveis globais
let uploadedFiles = {};
let documentCounters = {};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initializePdfViewer();
  initializeUploadModal();
  loadDocuments();
});


async function loadDocuments() {
  try {
    const response = await fetch('http://localhost:5200/documents');
    const documents = await response.json();

    documents.forEach(doc => {
      addDocumentToList(doc.name, doc.category, doc.fileUrl);
    });
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
  }
}

// ===== FUNCIONALIDADE ORIGINAL DO VISUALIZADOR DE PDF =====
function initializePdfViewer() {
  const pdfLinks = document.querySelectorAll(".pdf-link");
  const pdfModal = document.getElementById("pdfModal");
  const pdfIframe = document.getElementById("pdfIframe");
  const closeModalButton = document.getElementById("closeModal");

  pdfLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      pdfIframe.src = link.href;
      pdfModal.classList.remove("hidden");
    });
  });

  closeModalButton.addEventListener("click", () => {
    pdfModal.classList.add("hidden");
    pdfIframe.src = "";
  });

  pdfModal.addEventListener("click", event => {
    if (event.target === pdfModal) {
      pdfModal.classList.add("hidden");
      pdfIframe.src = "";
    }
  });
}

// ===== NOVAS FUNCIONALIDADES DE UPLOAD =====

// Funcionalidade do modal de upload
function initializeUploadModal() {
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const uploadForm = document.getElementById('uploadForm');

  // Eventos do input de arquivo
  fileInput.addEventListener('change', handleFileSelect);

  // Eventos de drag and drop
  dropArea.addEventListener('dragover', handleDragOver);
  dropArea.addEventListener('dragleave', handleDragLeave);
  dropArea.addEventListener('drop', handleDrop);

  // Envio do formulário
  uploadForm.addEventListener('submit', handleFormSubmit);

  // Event listener para fechar modal de upload
  document.getElementById('closeUploadModal').addEventListener('click', closeUploadModal);

  // Fechar modal clicando fora
  document.getElementById('uploadModal').addEventListener('click', function(event) {
    if (event.target === this) {
      closeUploadModal();
    }
  });
}

// Funções do modal de upload
function openUploadModal() {
  document.getElementById('uploadModal').classList.remove('hidden');
  resetUploadForm();
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden');
  resetUploadForm();
}

function resetUploadForm() {
  document.getElementById('fileInput').value = '';
  document.getElementById('fileInfo').classList.add('hidden');
  document.getElementById('uploadForm').classList.add('hidden');
  document.getElementById('documentName').value = '';
  document.getElementById('documentCategory').value = '';
}

// Manipulação de arquivos
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  const files = event.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/pdf') {
    processFile(files[0]);
  } else {
    alert('Por favor, selecione apenas arquivos PDF.');
  }
}

function processFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Por favor, selecione apenas arquivos PDF.');
    return;
  }

  // Mostrar informações do arquivo
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileInfo').classList.remove('hidden');
  document.getElementById('uploadForm').classList.remove('hidden');

  // Armazenar arquivo temporariamente
  uploadedFiles.temp = file;
}

// Envio do formulário
async function handleFormSubmit(event) {
  event.preventDefault();

  const documentName = document.getElementById('documentName').value;
  const documentCategory = document.getElementById('documentCategory').value;
  const file = uploadedFiles.temp;

  if (!file || !documentName || !documentCategory) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('name', documentName);
  formData.append('category', documentCategory);

  try {
    const response = await fetch('http://localhost:5200/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    addDocumentToList(data.name, data.category, data.fileUrl);
    closeUploadModal();
    delete uploadedFiles.temp;
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    alert('Erro ao enviar o documento.');
  }
}


// Adicionar documento à lista
function addDocumentToList(name, category, fileUrl) {
  const listId = category === 'touchComp' ? 'touchCompList' : 'procedimentosInternosList';
  const list = document.getElementById(listId);
  
  // Incrementar contador
  documentCounters[category]++;
  const number = documentCounters[category];
  
  // Criar elemento da lista
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-link pdf-link" data-url="${fileUrl}">
      <span>${number} - ${name}</span>
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.707 5.707V19a2 2 0 01-2 2z" />
        </svg>
        <button class="delete-button" onclick="deleteDocument(this, event)">×</button>
      </div>
    </div>
  `;
  
  list.appendChild(li);
  
  // Adicionar event listener para o novo link
  const newLink = li.querySelector('.pdf-link');
  newLink.addEventListener('click', function(event) {
    event.preventDefault();
    const pdfModal = document.getElementById("pdfModal");
    const pdfIframe = document.getElementById("pdfIframe");
    
    // Usar data-url se existir (arquivo novo), senão usar href (arquivo original)
    const url = this.dataset.url || this.href;
    pdfIframe.src = url;
    pdfModal.classList.remove("hidden");
  });
}

// Deletar documento
async function deleteDocument(button, event) {
  event.stopPropagation();
  const li = button.closest('li');
  const span = li.querySelector('span');
  const text = span.textContent;
  const fileUrl = li.querySelector('.pdf-link').dataset.url;

  if (confirm(`Tem certeza que deseja remover o documento "${text}"?`)) {
    try {
      await fetch('http://localhost:5200/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl })
      });

      li.remove();
      reorganizeDocuments();
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      alert('Erro ao deletar documento.');
    }
  }
}


// Reorganizar numeração dos documentos
function reorganizeDocuments() {
  const categories = ['touchCompList', 'procedimentosInternosList'];
  const categoryKeys = ['touchComp', 'procedimentosInternos'];
  
  categories.forEach((listId, index) => {
    const list = document.getElementById(listId);
    const items = list.querySelectorAll('li');
    
    documentCounters[categoryKeys[index]] = 0;
    
    items.forEach((item, itemIndex) => {
      const span = item.querySelector('span');
      const text = span.textContent;
      const nameWithoutNumber = text.replace(/^\d+\s*-\s*/, '');
      span.textContent = `${itemIndex + 1} - ${nameWithoutNumber}`;
      documentCounters[categoryKeys[index]] = itemIndex + 1;
    });
  });
}
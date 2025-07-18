// Variáveis globais
let uploadedFiles = {};
let documentCounters = {};
const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:5200'
  : window.location.origin;

let isAdmin = false;

function loginAsAdmin() {
  const password = document.getElementById('adminPasswordInput').value;
  if (password === 'admin01') { 
    isAdmin = true;
    document.getElementById('adminLoginModal').classList.add('hidden');
    showAdminControls();
    
    // Mostrar mensagem de sucesso
    const adminButton = document.getElementById('adminButton');
    adminButton.classList.add('bg-blue-500');
    adminButton.textContent = '✓ ADM';
    setTimeout(() => {
      adminButton.classList.remove('bg-blue-500');
      adminButton.textContent = 'ADM';
    }, 2000);
  } else {
    alert('Senha incorreta.');
  }
}

function showAdminControls() {
  document.querySelector('.upload-button.upload-pdf-button').classList.remove('hidden');  
  document.querySelectorAll('.edit-button, .delete-button').forEach(btn => {
    btn.classList.remove('hidden');
    btn.style.display = 'inline-block'; 
  });

  isAdmin = true;
  
  refreshDocumentLists();
}

async function refreshDocumentLists() {
  document.getElementById('touchCompList').innerHTML = '';
  document.getElementById('procedimentosInternosList').innerHTML = '';
  
  await loadDocuments();
}


// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initializePdfViewer();
  initializeUploadModal();
  loadDocuments();
  initializeAdminModal();
});

// Função para inicializar o modal de admin
function initializeAdminModal() {
  const adminButton = document.getElementById('adminButton');
  const adminModal = document.getElementById('adminLoginModal');
  const closeAdminModal = document.getElementById('closeAdminModal');
  
  adminButton.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
  });
  
  closeAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });
  
  adminModal.addEventListener('click', (event) => {
    if (event.target === adminModal) {
      adminModal.classList.add('hidden');
    }
  });
}


// Carregar documentos existentes
async function loadDocuments() {
  try {
    documentCounters = {
      touchComp: 0,
      procedimentosInternos: 0
    };

    const response = await fetch(`${API_BASE_URL}/documents`);
    const documents = await response.json();

    // Contar documentos por categoria
    documents.forEach(doc => {
      if (doc.category === 'touchComp') {
        documentCounters.touchComp++;
      } else if (doc.category === 'procedimentosInternos') {
        documentCounters.procedimentosInternos++;
      }
    });

    documents.forEach(doc => {
      addDocumentToList(doc.name, doc.category, doc.fileUrl, false, doc.createdAt, doc.updatedAt);
    });
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isNaN(date)) {
      return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return dateString;
    }
  } catch {
    return dateString;
  }
}
// Visualizador de PDF
function initializePdfViewer() {
  const closeModalButton = document.getElementById("closeModal");
  const pdfModal = document.getElementById("pdfModal");
  const pdfIframe = document.getElementById("pdfIframe");

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

  initializeEditModal();
}

// Modal de Upload
function initializeUploadModal() {
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const uploadForm = document.getElementById('uploadForm');

  fileInput.addEventListener('change', handleFileSelect);
  dropArea.addEventListener('dragover', handleDragOver);
  dropArea.addEventListener('dragleave', handleDragLeave);
  dropArea.addEventListener('drop', handleDrop);
  uploadForm.addEventListener('submit', handleFormSubmit);

  document.getElementById('closeUploadModal').addEventListener('click', closeUploadModal);
  document.getElementById('uploadModal').addEventListener('click', function(event) {
    if (event.target === this) closeUploadModal();
  });
}

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

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) processFile(file);
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

  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileInfo').classList.remove('hidden');
  document.getElementById('uploadForm').classList.remove('hidden');

  uploadedFiles.temp = file;
}

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
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    addDocumentToList(data.name, data.category, data.fileUrl, true, data.createdAt, data.updatedAt);
    closeUploadModal();
    delete uploadedFiles.temp;
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    alert('Erro ao enviar o documento.');
  }
}

function addDocumentToList(name, category, fileUrl, incrementCounter = true, createdAt, updatedAt) {
  const listId = category === 'touchComp' ? 'touchCompList' : 'procedimentosInternosList';
  const list = document.getElementById(listId);

  if (incrementCounter) {
    documentCounters[category]++;
  }

  const number = list.querySelectorAll('li').length + 1;

  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-link pdf-link" data-url="${fileUrl}">
      <div class="flex flex-col">
        <span>${number} - ${name}</span>
        <small class="text-xs text-gray-500">Importado: ${formatDate(createdAt)}</small>
        <small class="text-xs text-gray-500">Editado: ${formatDate(updatedAt)}</small>
      </div>
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.707 5.707V19a2 2 0 01-2 2z" />
        </svg>
        ${isAdmin ? `
          <button class="edit-button" onclick="openEditModal('${name}', '${fileUrl}', event)" style="display: ${isAdmin ? 'inline-block' : 'none'}">✎</button>
          <button class="delete-button" onclick="deleteDocument(this, event)" style="display: ${isAdmin ? 'inline-block' : 'none'}">×</button>
        ` : ''}
      </div>
    </div>
  `;
  list.appendChild(li);

  const newLink = li.querySelector('.pdf-link');
  newLink.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') return;
    event.preventDefault();
    const pdfModal = document.getElementById("pdfModal");
    const pdfIframe = document.getElementById("pdfIframe");

    const url = this.dataset.url || this.href;
    pdfIframe.src = url;
    pdfModal.classList.remove("hidden");
  });
}

async function deleteDocument(button, event) {
  event.stopPropagation();
  const li = button.closest('li');
  const span = li.querySelector('span');
  const text = span.textContent;
  const fileUrl = li.querySelector('.pdf-link').dataset.url;

  if (confirm(`Tem certeza que deseja remover o documento "${text}"?`)) {
    try {
      await fetch(`${API_BASE_URL}/documents`, {
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

function reorganizeDocuments() {
  const categories = ['touchCompList', 'procedimentosInternosList'];
  const categoryKeys = ['touchComp', 'procedimentosInternos'];

  categories.forEach((listId, index) => {
    const list = document.getElementById(listId);
    const items = list.querySelectorAll('li');
    
    documentCounters[categoryKeys[index]] = 0;

    items.forEach((item, itemIndex) => {
      documentCounters[categoryKeys[index]]++;
      const span = item.querySelector('span');
      const text = span.textContent;
      const nameWithoutNumber = text.replace(/^\d+\s*-\s*/, '');
      span.textContent = `${itemIndex + 1} - ${nameWithoutNumber}`;
    });
  });
}

// Edição
function openEditModal(name, fileUrl, event) {
  event.stopPropagation();
  document.getElementById('editDocumentName').value = name;
  document.getElementById('editDocumentUrl').value = fileUrl;
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

function initializeEditModal() {
  const editForm = document.getElementById('editForm');
  const closeEditModalButton = document.getElementById('closeEditModal');

  editForm.addEventListener('submit', handleEditSubmit);
  closeEditModalButton.addEventListener('click', closeEditModal);

  document.getElementById('editModal').addEventListener('click', function(event) {
    if (event.target === this) {
      closeEditModal();
    }
  });
}

async function handleEditSubmit(event) {
  event.preventDefault();

  const newName = document.getElementById('editDocumentName').value;
  const fileUrl = document.getElementById('editDocumentUrl').value;

  if (!newName || !fileUrl) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, newName })
    });

    if (response.ok) {
      const lists = ['touchCompList', 'procedimentosInternosList'];
      lists.forEach(listId => {
        const list = document.getElementById(listId);
        const items = list.querySelectorAll('li');

        items.forEach(item => {
          const link = item.querySelector('.pdf-link');
          if (link.dataset.url === fileUrl) {
            const span = item.querySelector('span');
            const currentText = span.textContent;
            const number = currentText.split(' - ')[0];
            span.textContent = `${number} - ${newName}`;
          }
        });
      });

      closeEditModal();
    } else {
      throw new Error('Erro ao atualizar documento');
    }
  } catch (error) {
    console.error('Erro ao editar documento:', error);
    alert('Erro ao editar documento.');
  }
}

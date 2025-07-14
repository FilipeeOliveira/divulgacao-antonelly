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
    // Inicializar contadores
    documentCounters = {
      touchComp: 0,
      procedimentosInternos: 0
    };

    const response = await fetch('http://localhost:5200/documents');
    const documents = await response.json();

    // Contar documentos por categoria
    documents.forEach(doc => {
      if (doc.category === 'touchComp') {
        documentCounters.touchComp++;
      } else if (doc.category === 'procedimentosInternos') {
        documentCounters.procedimentosInternos++;
      }
    });

    // Adicionar documentos à lista
    documents.forEach(doc => {
      addDocumentToList(doc.name, doc.category, doc.fileUrl, false); // false para não incrementar o contador novamente
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
  })
    initializeEditModal();
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
    addDocumentToList(data.name, data.category, data.fileUrl, true); // true para incrementar o contador
    closeUploadModal();
    delete uploadedFiles.temp;
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    alert('Erro ao enviar o documento.');
  }
}


// Adicionar documento à lista
function addDocumentToList(name, category, fileUrl, incrementCounter = true) {
  const listId = category === 'touchComp' ? 'touchCompList' : 'procedimentosInternosList';
  const list = document.getElementById(listId);
  
  // Incrementar contador apenas se solicitado
  if (incrementCounter) {
    documentCounters[category]++;
  }
  
  // Obter o número correto para exibição
  const itemsInCategory = list.querySelectorAll('li').length;
  const number = incrementCounter ? documentCounters[category] : itemsInCategory + 1;
  
  // Criar elemento da lista
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-link pdf-link" data-url="${fileUrl}">
      <span>${number} - ${name}</span>
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.707 5.707V19a2 2 0 01-2 2z" />
        </svg>
        <button class="edit-button" onclick="openEditModal('${name}', '${fileUrl}', event)">✎</button>
        <button class="delete-button" onclick="deleteDocument(this, event)">×</button>
      </div>
    </div>
  `;
  
  list.appendChild(li);
  
  // Adicionar event listener para o novo link
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
        <button class="edit-button" onclick="openEditModal('${name}', '${fileUrl}', event)">✎</button>
        <button class="delete-button" onclick="deleteDocument(this, event)">×</button>
      </div>
    </div>
  `;
  
  list.appendChild(li);
  
  // Adicionar event listener para o novo link
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

// Funções para edição de documentos
function openEditModal(name, fileUrl, event) {
  event.stopPropagation();
  document.getElementById('editDocumentName').value = name;
  document.getElementById('editDocumentUrl').value = fileUrl;
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

// Inicializar modal de edição
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

// Manipular envio do formulário de edição
async function handleEditSubmit(event) {
  event.preventDefault();

  const newName = document.getElementById('editDocumentName').value;
  const fileUrl = document.getElementById('editDocumentUrl').value;

  if (!newName || !fileUrl) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5200/documents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, newName })
    });

    if (response.ok) {
      // Atualizar a lista de documentos
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


// Reorganizar numeração dos documentos
function reorganizeDocuments() {
  const categories = ['touchCompList', 'procedimentosInternosList'];
  const categoryKeys = ['touchComp', 'procedimentosInternos'];
  
  categories.forEach((listId, index) => {
    const list = document.getElementById(listId);
    const items = list.querySelectorAll('li');
    
    // Resetar contador para esta categoria
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
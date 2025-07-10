document.addEventListener("DOMContentLoaded", () => {
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
});
document.addEventListener("DOMContentLoaded", () => {
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
});

// Dashboard View Module
(function() {
  'use strict';

  // AI Projects data
  const aiProjects = [
    {
      title: "DAY73-Cloud Setup",
      status: "completed",
      description: "Kompletní setup vývojové verze s Git, GitHub, Firebase deploy automation",
      links: [
        { label: "GitHub", url: "https://github.com/MichalD73/DAY73-cloud" },
        { label: "Live", url: "https://onlineday73.web.app/DAY73-cloud/grid-app-test.html" }
      ]
    },
    {
      title: "Manuál stránka",
      status: "completed",
      description: "Interaktivní manuál s přehledem projektu, workflow, moduly a dokumentací",
      links: [
        { label: "Manual", url: "https://onlineday73.web.app/DAY73-cloud/manual.html" }
      ]
    },
    {
      title: "Dashboard",
      status: "completed",
      description: "Dashboard s AI Projects view a My Kanban board integrovaný jako view",
      links: []
    }
  ];

  window.DashboardView = {
    init: async function() {
      console.log('[Dashboard] Initializing...');
      this.renderAIProjects();
      await this.loadKanbanCards();
      this.setupPasteHandler();
    },

    renderAIProjects: function() {
      const container = document.getElementById('aiProjectsList');
      if (!container) return;

      container.innerHTML = aiProjects.map(project => `
        <div class="project-card ${project.status}">
          <div class="project-title">
            ${project.title}
            <span class="project-status ${project.status}">
              ${project.status === 'completed' ? '✅ Hotovo' : '🔄 Probíhá'}
            </span>
          </div>
          <div class="project-desc">${project.description}</div>
          ${project.links.length > 0 ? `
            <div class="project-links">
              ${project.links.map(link => `
                <a href="${link.url}" target="_blank" class="project-link">${link.label}</a>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
    },

    kanbanCards: [],
    currentEditingCard: null,

    loadKanbanCards: async function() {
      try {
        const { db } = await import('./shared/firebase.js');
        const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        const cardsRef = collection(db, 'kanban-cards');
        onSnapshot(cardsRef, (snapshot) => {
          this.kanbanCards = [];
          snapshot.forEach(doc => {
            this.kanbanCards.push({ id: doc.id, ...doc.data() });
          });
          this.renderKanban();
        });
      } catch (error) {
        console.error('[Dashboard] Error loading cards:', error);
      }
    },

    renderKanban: function() {
      ['todo', 'doing', 'done'].forEach(status => {
        const container = document.getElementById(`${status}Cards`);
        if (!container) return;

        const statusCards = this.kanbanCards.filter(c => c.status === status);

        container.innerHTML = statusCards.map(card => `
          <div class="kanban-card"
               draggable="true"
               data-id="${card.id}"
               ondragstart="DashboardView.handleDragStart(event)"
               ondragend="DashboardView.handleDragEnd(event)">
            ${card.imageUrl ? `
              <img src="${card.imageUrl}"
                   class="kanban-card-image"
                   alt="${card.title}"
                   onclick="DashboardView.focusCard('${card.id}')">
            ` : `
              <div class="kanban-card-image-placeholder"
                   onclick="DashboardView.focusCard('${card.id}')">
                📷 Ctrl+V pro vložení obrázku
              </div>
            `}
            <div class="kanban-card-title">${card.title}</div>
            <div class="kanban-card-desc">${card.description || ''}</div>
          </div>
        `).join('');

        // Update count
        const countEl = document.getElementById(`${status}Count`);
        if (countEl) {
          countEl.textContent = statusCards.length;
        }
      });

      this.setupDragAndDrop();
    },

    showAddCardForm: function(status) {
      const container = document.getElementById(`${status}Cards`);
      if (!container) return;

      // Remove existing forms
      document.querySelectorAll('.card-form').forEach(form => form.remove());

      const formHtml = `
        <div class="card-form">
          <input type="text"
                 id="newCardTitle"
                 placeholder="Název karty..."
                 autofocus>
          <textarea id="newCardDesc"
                    placeholder="Popis (volitelné)..."></textarea>
          <div class="card-form-buttons">
            <button class="btn btn-primary" onclick="DashboardView.addCard('${status}')">
              Přidat kartu
            </button>
            <button class="btn btn-secondary" onclick="DashboardView.cancelCardForm()">
              Zrušit
            </button>
          </div>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', formHtml);
      document.getElementById('newCardTitle').focus();
    },

    addCard: async function(status) {
      const title = document.getElementById('newCardTitle').value.trim();
      const description = document.getElementById('newCardDesc').value.trim();

      if (!title) {
        alert('Zadej název karty');
        return;
      }

      try {
        const { db } = await import('./shared/firebase.js');
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        await addDoc(collection(db, 'kanban-cards'), {
          title,
          description,
          status,
          imageUrl: null,
          createdAt: serverTimestamp()
        });

        this.cancelCardForm();
      } catch (error) {
        console.error('[Dashboard] Error adding card:', error);
        alert('Chyba při vytváření karty');
      }
    },

    cancelCardForm: function() {
      document.querySelectorAll('.card-form').forEach(form => form.remove());
    },

    draggedCard: null,

    handleDragStart: function(e) {
      this.draggedCard = e.target;
      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.target.innerHTML);
    },

    handleDragEnd: function(e) {
      e.target.classList.remove('dragging');
    },

    setupDragAndDrop: function() {
      const columns = document.querySelectorAll('.kanban-cards');

      columns.forEach(column => {
        column.addEventListener('dragover', (e) => this.handleDragOver(e));
        column.addEventListener('drop', (e) => this.handleDrop(e));
      });
    },

    handleDragOver: function(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = 'move';
      return false;
    },

    handleDrop: async function(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }

      if (!this.draggedCard) return false;

      const newStatus = e.currentTarget.dataset.column;
      const cardId = this.draggedCard.dataset.id;

      try {
        const { db } = await import('./shared/firebase.js');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        await updateDoc(doc(db, 'kanban-cards', cardId), {
          status: newStatus
        });
      } catch (error) {
        console.error('[Dashboard] Error updating card:', error);
      }

      return false;
    },

    focusCard: function(cardId) {
      this.currentEditingCard = cardId;
      console.log('[Dashboard] Ready to paste image for card:', cardId);
    },

    setupPasteHandler: function() {
      document.addEventListener('paste', async (e) => {
        if (!this.currentEditingCard) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();

            const blob = item.getAsFile();
            await this.uploadCardImage(this.currentEditingCard, blob);
            break;
          }
        }
      });
    },

    uploadCardImage: async function(cardId, blob) {
      const indicator = document.getElementById('uploadIndicator');
      if (indicator) {
        indicator.classList.add('active');
      }

      try {
        const { storage, db } = await import('./shared/firebase.js');
        const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        const storageRef = ref(storage, `kanban-images/${cardId}-${Date.now()}.png`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'kanban-cards', cardId), {
          imageUrl: downloadURL
        });

        this.currentEditingCard = null;
      } catch (error) {
        console.error('[Dashboard] Error uploading image:', error);
        alert('Chyba při nahrávání obrázku');
      } finally {
        if (indicator) {
          indicator.classList.remove('active');
        }
      }
    }
  };

  // Global functions for onclick handlers
  window.showAddCardForm = (status) => window.DashboardView.showAddCardForm(status);
})();

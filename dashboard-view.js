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

      // Wait for Firebase to be ready
      await this.waitForFirebase();

      await this.loadKanbanCards();
      this.setupPasteHandler();
    },

    waitForFirebase: async function() {
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        if (window.firebase && window.firebase.db) {
          console.log('[Dashboard] Firebase ready');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.error('[Dashboard] Firebase failed to load after', maxAttempts * 100, 'ms');
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
        if (!window.firebase || !window.firebase.db) {
          console.error('[Dashboard] Firebase not loaded');
          return;
        }

        const { db, collection, query, orderBy, onSnapshot } = window.firebase;
        const cardsQuery = query(collection(db, 'kanban-cards'), orderBy('createdAt', 'desc'));

        onSnapshot(cardsQuery, (snapshot) => {
          this.kanbanCards = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            // Filter out archived cards
            if (!data.archived) {
              this.kanbanCards.push({ id: doc.id, ...data });
            }
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
               tabindex="0"
               data-id="${card.id}"
               ondblclick="DashboardView.openCardDetail('${card.id}')"
               ondragstart="DashboardView.handleDragStart(event)"
               ondragend="DashboardView.handleDragEnd(event)"
               onkeydown="DashboardView.handleCardKeydown(event, '${card.id}')">
            <div class="kanban-card-title">${card.title}</div>
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
            <button class="btn btn-primary" onclick="addCard('${status}')">
              Přidat kartu
            </button>
            <button class="btn btn-secondary" onclick="cancelCardForm()">
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
        const { db, collection, addDoc, serverTimestamp } = window.firebase;
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
        alert('Chyba při vytváření karty: ' + error.message);
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
        const { db, doc, updateDoc } = window.firebase;
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
        const { storage, db, doc, updateDoc, ref, uploadBytes, getDownloadURL } = window.firebase;
        const storageRef = ref(storage, `kanban-images/${cardId}-${Date.now()}.png`);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'kanban-cards', cardId), {
          imageUrl: downloadURL
        });

        this.currentEditingCard = null;
      } catch (error) {
        console.error('[Dashboard] Error uploading image:', error);
        alert('Chyba při nahrávání obrázku: ' + error.message);
      } finally {
        if (indicator) {
          indicator.classList.remove('active');
        }
      }
    },

    handleCardKeydown: async function(e, cardId) {
      // Backspace or Delete key
      if (e.key === 'Backspace' || e.key === 'Delete' || e.keyCode === 8 || e.keyCode === 46) {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        await this.archiveCard(cardId);
      }
    },

    archiveCard: async function(cardId) {
      try {
        const { db, doc, updateDoc } = window.firebase;
        await updateDoc(doc(db, 'kanban-cards', cardId), {
          archived: true,
          archivedAt: new Date()
        });
        console.log('[Dashboard] Card archived:', cardId);
      } catch (error) {
        console.error('[Dashboard] Error archiving card:', error);
        alert('Chyba při archivaci karty: ' + error.message);
      }
    },

    // Card Detail Panel
    currentDetailCardId: null,

    openCardDetail: function(cardId) {
      const card = this.kanbanCards.find(c => c.id === cardId);
      if (!card) return;

      this.currentDetailCardId = cardId;

      // Set title
      const titleInput = document.getElementById('cardDetailTitle');
      titleInput.value = card.title;

      // Save title on change
      titleInput.oninput = this.debounce(() => this.saveCardTitle(cardId), 1000);

      // Set editor content
      const editor = document.getElementById('cardDetailEditor');
      editor.contentEditable = 'true';
      editor.innerHTML = card.body || '<p>Začni psát...</p>';

      // Show panel
      document.getElementById('cardDetailOverlay').classList.add('active');
      document.getElementById('cardDetailPanel').classList.add('active');

      // Focus editor
      setTimeout(() => editor.focus(), 300);

      // Auto-save on input
      editor.oninput = this.debounce(() => this.saveCardBody(cardId), 1000);

      // Handle image paste in editor
      editor.onpaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = item.getAsFile();

            // Upload image to Firebase Storage
            const indicator = document.getElementById('uploadIndicator');
            if (indicator) indicator.classList.add('active');

            try {
              const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
              const storageRef = ref(storage, `card-body-images/${cardId}-${Date.now()}.png`);
              await uploadBytes(storageRef, blob);
              const downloadURL = await getDownloadURL(storageRef);

              // Insert image with URL instead of base64
              const img = document.createElement('img');
              img.src = downloadURL;
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.margin = '0.5rem 0';

              // Insert at cursor position
              const selection = window.getSelection();
              if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
                range.collapse(false);
              } else {
                editor.appendChild(img);
              }

              // Save immediately after image insert
              await this.saveCardBody(cardId);
            } catch (error) {
              console.error('[Dashboard] Error uploading image:', error);
              alert('Chyba při nahrávání obrázku: ' + error.message);
            } finally {
              if (indicator) indicator.classList.remove('active');
            }
            break;
          }
        }
      };
    },

    closeCardDetail: function() {
      // Save before closing
      if (this.currentDetailCardId) {
        this.saveCardTitle(this.currentDetailCardId);
        this.saveCardBody(this.currentDetailCardId);
      }

      document.getElementById('cardDetailOverlay').classList.remove('active');
      document.getElementById('cardDetailPanel').classList.remove('active');
      this.currentDetailCardId = null;
    },

    saveCardTitle: async function(cardId) {
      const titleInput = document.getElementById('cardDetailTitle');
      const title = titleInput.value.trim();

      if (!title) return;

      try {
        const { db, doc, updateDoc } = window.firebase;
        await updateDoc(doc(db, 'kanban-cards', cardId), {
          title: title
        });
        console.log('[Dashboard] Card title saved');
      } catch (error) {
        console.error('[Dashboard] Error saving card title:', error);
      }
    },

    saveCardBody: async function(cardId) {
      const editor = document.getElementById('cardDetailEditor');
      const body = editor.innerHTML;

      try {
        const { db, doc, updateDoc } = window.firebase;
        await updateDoc(doc(db, 'kanban-cards', cardId), {
          body: body
        });
        console.log('[Dashboard] Card body saved');
      } catch (error) {
        console.error('[Dashboard] Error saving card body:', error);
      }
    },

    debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

  // Global functions for onclick handlers
  window.showAddCardForm = (status) => window.DashboardView.showAddCardForm(status);
  window.addCard = (status) => window.DashboardView.addCard(status);
  window.cancelCardForm = () => window.DashboardView.cancelCardForm();
  window.closeCardDetail = () => window.DashboardView.closeCardDetail();
})();

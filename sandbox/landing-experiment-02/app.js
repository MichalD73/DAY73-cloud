import { firebase, isFirebaseReady, isStorageReady } from './firebase-placeholder.js';

const today = new Date();
const START_OF_TODAY = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACADEMIC_CALENDAR_URL = 'https://firebasestorage.googleapis.com/v0/b/central-asset-storage.firebasestorage.app/o/attachments%2Famy%2Famy-reading-journal%2F1759331983935-photo-2025-10-01-09-07-02.jpg?alt=media&token=e8b57163-833a-4a84-afe9-b8128e356005';

function offsetDate(daysFromToday) {
  const date = new Date(START_OF_TODAY);
  date.setDate(date.getDate() + Number(daysFromToday || 0));
  return date.toISOString().slice(0, 10);
}

const fallbackPlannerData = {
  students: [
    {
      id: 'amy',
      name: 'Amy Daniel',
      grade: '',
      school: {
        name: 'The Centner Academy',
        url: 'https://centneracademy.com/',
        logo: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1710/push/191892/Official%20Letterhead%20_%20(8)%20USHPAGE.png'
      },
      links: [
        {
          label: 'MyCA Portal',
          url: 'https://centneracademy.myschoolapp.com/app?svcid=edu#login'
        }
      ],
      focus: 'Amy si zvyká na rytmus první třídy. Potřebuje krátké, ale pravidelné bloky domácí přípravy a jasně viditelné termíny.',
      routine: [
        'Domácí příprava po příchodu ze školy kolem 16:00.',
        'Čtení deníku v úterý a čtvrtek před večeří.',
        'Nedělní příprava tašky s kontrolou úkolů.'
      ],
      projects: [
        {
          id: 'amy-reading-journal',
          title: 'Čtenářský deník – slabiky MA/LA',
          subject: 'Český jazyk',
          status: 'active',
          baselineStatus: 'active',
          dueDate: offsetDate(1),
          owner: 'Amy + mamka',
          description: 'První záznam do čtenářského deníku se zaměřením na slabiky MA a LA.',
          tasks: [
            {
              id: 'amy-reading-1',
              title: 'Přečíst kapitolu "Máma maluje" na straně 24',
              note: 'Číst nahlas alespoň dvakrát, soustředit se na tempo.',
              completed: true
            },
            {
              id: 'amy-reading-2',
              title: 'Vypsat tři nová slova do deníku',
              note: 'Použít barevné lepíky a napsat větu ke každému slovu.',
              completed: false
            },
            {
              id: 'amy-reading-3',
              title: 'Podepsat deník třídní učitelce',
              note: 'Odevzdat ve čtvrtek ráno při nástupu.',
              completed: false
            }
          ],
          milestones: [
            'Plynulé čtení delší pasáže bez zastavení.',
            'Zvládnuté shrnutí vlastními slovy.'
          ],
          notes: 'Amy nejlépe pracuje po svačině. Zkusíme číst v obýváku na gauči, aby měla klid.'
        },
        {
          id: 'amy-math-worksheet',
          title: 'Matematika: Sčítání do 20',
          subject: 'Matematika',
          status: 'active',
          baselineStatus: 'active',
          dueDate: offsetDate(4),
          owner: 'Amy + táta',
          description: 'Procvičování sčítání do 20 před pátečním prověrkovým testem.',
          tasks: [
            {
              id: 'amy-math-1',
              title: 'Vyplnit pracovní list na straně 12',
              note: 'Pozor na příklady s přechodem přes desítku.',
              completed: false
            },
            {
              id: 'amy-math-2',
              title: 'Procvičit příklady s kostkami',
              note: '5 minut hravé opakování na koberci.',
              completed: true
            },
            {
              id: 'amy-math-3',
              title: 'Zahrát 10 úloh v aplikaci Včelka',
              note: 'Zaměřit se na slovní úlohy.',
              completed: false
            },
            {
              id: 'amy-math-4',
              title: 'Projít výsledky s rodičem',
              note: 'Zkontrolovat chybné příklady a vysvětlit postup.',
              completed: false
            }
          ],
          milestones: [
            'Jistota v sčítání s přechodem přes desítku.',
            'Pozitivní nálada před pátečním testem.'
          ],
          notes: 'Krátké bloky po 10 minutách fungují lépe. Po každém bloku nechat Amy protáhnout.'
        },
        {
          id: 'amy-nature-collage',
          title: 'Podzimní pozorování přírody',
          subject: 'Prvouka · Výtvarná výchova',
          status: 'planned',
          baselineStatus: 'planned',
          dueDate: offsetDate(9),
          owner: 'Celá rodina',
          description: 'Víkendový mini projekt – sběr listů a vytvoření podzimní koláže do třídního portfolia.',
          tasks: [
            {
              id: 'amy-nature-1',
              title: 'Naplánovat sobotní procházku',
              note: 'Vybrat park nebo les s dostatkem listů.',
              completed: false
            },
            {
              id: 'amy-nature-2',
              title: 'Nasbírat 10 různých listů',
              note: 'Vzít si sáčky a fixy na označení.',
              completed: false
            },
            {
              id: 'amy-nature-3',
              title: 'Vylisovat a nalepit listy do bloku',
              note: 'Použít domácí lis z knih a pauzovacího papíru.',
              completed: false
            }
          ],
          milestones: [
            'Hotová koláž s popisky listů.',
            'Fotka projektu nahraná do třídního Teamsu.'
          ],
          notes: 'Připravit si v pátek večer lepidlo, štětce a podložku.'
        },
        {
          id: 'amy-school-tour',
          title: 'Seznámení se školou',
          subject: 'Adaptace',
          status: 'completed',
          baselineStatus: 'completed',
          dueDate: offsetDate(-4),
          completedOn: offsetDate(-4),
          owner: 'Amy + třídní učitelka',
          description: 'První školní týden – projít třídu, knihovnu a družinu, aby se Amy cítila jistě.',
          tasks: [
            {
              id: 'amy-tour-1',
              title: 'Najít tři oblíbená místa ve škole',
              note: 'Zapsat si je do notýsku.',
              completed: true
            },
            {
              id: 'amy-tour-2',
              title: 'Vyzkoušet cestu do jídelny',
              note: 'Jít s kamarádkou Nikčou.',
              completed: true
            },
            {
              id: 'amy-tour-3',
              title: 'Seznámit se s družinou',
              note: 'Popovídat si s vychovatelkou o pravidlech.',
              completed: true
            }
          ],
          milestones: [
            'Amy se cítí jistě v nové třídě.',
            'Zvládá přesun do jídelny bez doprovodu.'
          ],
          notes: 'Amy si oblíbila čtenářský koutek, stojí za to ho navštěvovat odpoledne.'
        }
      ]
    },
    {
      id: 'annie',
      name: 'Annie Daniel',
      grade: '',
      school: null,
      links: [],
      focus: 'Annie potřebuje hravý přístup. Projekty jsou krátké aktivity, aby se učila spolupracovat se sestrou.',
      routine: [
        'Středeční dopoledne patří tvoření s mamkou.',
        'Krátké písmenkové hry před spaním.',
        'Sobota dopoledne – společné aktivity s babičkou.'
      ],
      projects: [
        {
          id: 'annie-letter-hunt',
          title: 'Písmenkové hledání v bytě',
          subject: 'Předčtenářská příprava',
          status: 'active',
          baselineStatus: 'active',
          dueDate: offsetDate(2),
          owner: 'Annie + Amy',
          description: 'Hrací odpoledne zaměřené na hledání písmen A a M po bytě.',
          tasks: [
            {
              id: 'annie-letter-1',
              title: 'Připravit kartičky s písmeny',
              note: 'Vystřihnout 12 kartiček a vybarvit je.',
              completed: true
            },
            {
              id: 'annie-letter-2',
              title: 'Skrýt kartičky po pokojích',
              note: 'Zapojit Amy jako pomocníka.',
              completed: false
            },
            {
              id: 'annie-letter-3',
              title: 'Zapsat kolik písmenek našla',
              note: 'Použít magnetickou tabuli.',
              completed: false
            }
          ],
          milestones: [
            'Vybrat oblíbené písmenko na domácí nástěnku.'
          ],
          notes: 'Nastavit časovač na 10 minut, aby z aktivity byla zábavná honička.'
        },
        {
          id: 'annie-montessori-shapes',
          title: 'Montessori tvary z papíru',
          subject: 'Předmatematika',
          status: 'planned',
          baselineStatus: 'planned',
          dueDate: offsetDate(6),
          owner: 'Maminka',
          description: 'Domácí dílna se stříháním a lepením základních geometrických tvarů.',
          tasks: [
            {
              id: 'annie-shapes-1',
              title: 'Vybrat oblíbené barvy papíru',
              note: 'Nechat Annie zvolit tři barvy.',
              completed: false
            },
            {
              id: 'annie-shapes-2',
              title: 'Připravit šablony kruhu, čtverce a trojúhelníku',
              note: 'Použít tvrdší karton jako šablony.',
              completed: false
            },
            {
              id: 'annie-shapes-3',
              title: 'Nalepit tvary na velký plakát',
              note: 'Po nalepení napsat název tvaru tiskacím písmem.',
              completed: false
            }
          ],
          milestones: [
            'Hotové dílo vystavit na dveřích pokoje.'
          ],
          notes: 'Naplánovat na středu dopoledne, kdy má Annie nejvíc energie.'
        },
        {
          id: 'annie-garden-help',
          title: 'Pomoc na zahradě u babičky',
          subject: 'Rodinný projekt',
          status: 'completed',
          baselineStatus: 'completed',
          dueDate: offsetDate(-2),
          completedOn: offsetDate(-2),
          owner: 'Celá rodina',
          description: 'Návštěva u babičky – zalévání květin a sklizeň rajčat.',
          tasks: [
            {
              id: 'annie-garden-1',
              title: 'Naplňovat konve vodou',
              note: 'Dohlédnout na bezpečné přenášení.',
              completed: true
            },
            {
              id: 'annie-garden-2',
              title: 'Sklidit zralá rajčata',
              note: 'Počítat je nahlas.',
              completed: true
            },
            {
              id: 'annie-garden-3',
              title: 'Připravit květináče na nový výsev',
              note: 'Nasypat zeminu s pomocí babičky.',
              completed: true
            }
          ],
          milestones: [
            'Babička přichystá společnou odměnu – domácí buchtu.'
          ],
          notes: 'Připomenout Annie, že se jí dařilo zalévat květiny, a pochválit ji při další návštěvě.'
        }
      ]
    }
  ]
};

let plannerData = clonePlannerData(fallbackPlannerData);

const dataStatus = {
  loading: true,
  error: null,
  usingFallback: false
};

const FIREBASE_COLLECTION = 'students';
const LOCAL_STORAGE_KEY = 'school-project-fallback-data';
let memoryFallbackStore = {};
let shouldOfferSeed = false;

const state = {
  selectedStudentId: 'amy',
  selectedProjectId: null,
  showCompleted: false,
  sortImagesFirst: false,
  selectedAttachment: null
};

const elements = {
  studentList: document.getElementById('student-list'),
  studentSummary: document.getElementById('student-summary'),
  upcomingList: document.getElementById('upcoming-list'),
  projectGrid: document.getElementById('project-grid'),
  projectDetail: document.getElementById('project-detail'),
  toggleCompletedBtn: document.getElementById('toggle-show-completed'),
  projectCount: document.getElementById('project-count'),
  authButton: document.getElementById('auth-button'),
  authHint: document.getElementById('auth-hint'),
  seedButton: document.getElementById('seed-demo'),
  attachmentPreview: document.getElementById('attachment-preview'),
  projectOverviewDetail: document.getElementById('project-overview-detail'),
  calendarTrigger: document.getElementById('calendar-trigger')
};

let currentUser = null;

init();

function debugLog(...args) {
  if (typeof console !== 'undefined') {
    console.log('[SchoolProject]', ...args);
  }
}

async function init() {
  if (!elements.studentList || !elements.projectGrid) {
    return;
  }

  attachEvents();
  renderLoadingState();
  updateAuthUI();

  const authInstance = firebase.auth;
  const hasAuthObserver = authInstance && typeof firebase.onAuthStateChanged === 'function';

  if (hasAuthObserver) {
    firebase.onAuthStateChanged(authInstance, async (user) => {
      currentUser = user || null;
      updateAuthUI();
      renderLoadingState();
      await loadPlannerData();
      ensureInitialSelection();
      renderAll();
    });
  } else {
    await loadPlannerData();
    ensureInitialSelection();
    renderAll();
  }
}

function renderLoadingState() {
  const loadingMessage = '<div class="empty-state">Načítám data z Firebase...</div>';
  if (elements.studentList) {
    elements.studentList.innerHTML = loadingMessage;
  }
  if (elements.studentSummary) {
    elements.studentSummary.innerHTML = loadingMessage;
  }
  if (elements.upcomingList) {
    elements.upcomingList.innerHTML = loadingMessage;
  }
  if (elements.projectGrid) {
    elements.projectGrid.innerHTML = loadingMessage;
  }
  if (elements.projectCount) {
    elements.projectCount.textContent = '';
  }
  if (elements.attachmentPreview) {
    elements.attachmentPreview.innerHTML = loadingMessage;
  }
  if (elements.projectDetail) {
    elements.projectDetail.innerHTML = loadingMessage;
  }
  if (elements.toggleCompletedBtn) {
    elements.toggleCompletedBtn.disabled = true;
    elements.toggleCompletedBtn.setAttribute('aria-busy', 'true');
  }
  updateSeedUI();
}

function updateAuthHint() {
  if (!elements.authHint) return;
  if (!isFirebaseReady()) {
    elements.authHint.textContent = 'Firebase není nakonfigurované – zobrazená data jsou demo.';
    return;
  }
  if (!currentUser) {
    elements.authHint.textContent = 'Nepřihlášen – zobrazená data jsou pouze demo.';
    return;
  }
  if (shouldOfferSeed) {
    elements.authHint.textContent = 'Kolekce students je prázdná. Klikni na „Naplnit data z demoverze“ pro prvotní naplnění.';
    return;
  }
  if (dataStatus.usingFallback) {
    elements.authHint.textContent = 'Přihlášen, ale data se nepodařilo načíst – zobrazené jsou demo informace.';
    return;
  }
  const display = currentUser.displayName || currentUser.email || 'uživatel';
  elements.authHint.textContent = `Přihlášen: ${display}. Data jsou načtena z Firebase.`;
}

function updateSeedUI() {
  if (!elements.seedButton) return;
  const canSeed = Boolean(shouldOfferSeed && currentUser && isFirebaseReady());
  elements.seedButton.hidden = !canSeed;
  elements.seedButton.disabled = !canSeed || dataStatus.loading;
}

function updateAuthUI() {
  if (elements.authButton) {
    if (currentUser) {
      elements.authButton.textContent = 'Odhlásit';
      elements.authButton.dataset.state = 'signed';
    } else {
      elements.authButton.textContent = 'Přihlásit';
      elements.authButton.dataset.state = 'unsigned';
    }
  }
  updateAuthHint();
  updateSeedUI();
}

async function handleAuthButtonClick() {
  if (!firebase.auth || !firebase.GoogleAuthProvider || !firebase.signInWithPopup) {
    alert('Přihlášení není v tomto sandboxu dostupné.');
    return;
  }

  if (elements.authButton?.dataset.state === 'signed') {
    try {
      await firebase.signOut(firebase.auth);
    } catch (error) {
      console.error('[School Project] Odhlášení selhalo', error);
      alert('Odhlášení se nezdařilo. Zkus to prosím znovu.');
    }
    return;
  }

  try {
    const provider = new firebase.GoogleAuthProvider();
    if (provider.setCustomParameters) {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    await firebase.signInWithPopup(firebase.auth, provider);
  } catch (error) {
    console.error('[School Project] Přihlášení selhalo', error);
    alert('Přihlášení se nezdařilo. Zkontroluj konzoli pro více detailů.');
  }
}

async function loadPlannerData() {
  dataStatus.loading = true;
  dataStatus.error = null;
  dataStatus.usingFallback = false;

  if (!isFirebaseReady()) {
    console.info('Firebase není nakonfigurované - používám lokální testovací data.');
    plannerData = clonePlannerData(fallbackPlannerData);
    applyLocalOverrides();
    dataStatus.loading = false;
    dataStatus.usingFallback = true;
    shouldOfferSeed = false;
    updateAuthHint();
    updateSeedUI();
    return;
  }

  if (!currentUser) {
    plannerData = clonePlannerData(fallbackPlannerData);
    applyLocalOverrides();
    dataStatus.loading = false;
    dataStatus.usingFallback = true;
    shouldOfferSeed = false;
    updateAuthHint();
    updateSeedUI();
    return;
  }

  try {
    const snapshot = await firebase.getDocs(firebase.collection(firebase.db, FIREBASE_COLLECTION));
    const students = snapshot.docs.map((doc) => normalizeStudent(doc.data(), doc.id));

    if (students.length === 0) {
      throw new Error(`Kolekce ${FIREBASE_COLLECTION} neobsahuje žádné dokumenty.`);
    }

    plannerData = { students };
    dataStatus.usingFallback = false;
    shouldOfferSeed = false;
    debugLog('Načteno studentů z Firestore:', students.length);
  } catch (error) {
    console.error('Načtení dat z Firebase selhalo, používám lokální data.', error);
    dataStatus.error = error;
    plannerData = clonePlannerData(fallbackPlannerData);
    applyLocalOverrides();
    dataStatus.usingFallback = true;
    shouldOfferSeed = Boolean(error && /neobsahuje žádné dokumenty/i.test(error.message || ''));
  } finally {
    dataStatus.loading = false;
    updateAuthHint();
    updateSeedUI();
  }
}

function attachEvents() {
  if (elements.toggleCompletedBtn) {
    elements.toggleCompletedBtn.addEventListener('click', () => {
      state.showCompleted = !state.showCompleted;
      renderAll();
    });
  }

  if (elements.studentList) {
    elements.studentList.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-student-id]');
      if (!tab) return;
      const studentId = tab.dataset.studentId;
      if (!studentId || studentId === state.selectedStudentId) return;
      state.selectedStudentId = studentId;
      ensureProjectForStudent();
      renderAll();
    });
  }

  if (elements.projectGrid) {
    elements.projectGrid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-project-id]');
      if (!card) return;
      const projectId = card.dataset.projectId;
      if (!projectId || projectId === state.selectedProjectId) return;
      state.selectedProjectId = projectId;
      state.selectedAttachment = null;
      state.sortImagesFirst = true;
      renderAll();
    });
  }

  if (elements.upcomingList) {
    elements.upcomingList.addEventListener('click', (event) => {
      const card = event.target.closest('[data-project-id]');
      if (!card) return;
      const projectId = card.dataset.projectId;
      if (!projectId) return;
      state.selectedProjectId = projectId;
      state.selectedAttachment = null;
      state.sortImagesFirst = true;
      renderAll();
    });
  }

  if (elements.projectDetail) {
    elements.projectDetail.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-attachment-form]');
      if (!form) return;
      event.preventDefault();
      await handleAttachmentUpload(form);
    });
    elements.projectDetail.addEventListener('click', async (event) => {
      const removeBtn = event.target.closest('[data-action="remove-attachment"]');
      if (removeBtn) {
        event.preventDefault();
        await handleAttachmentRemove(removeBtn);
        return;
      }

      const sortBtn = event.target.closest('[data-action="sort-images"]');
      if (sortBtn) {
        event.preventDefault();
        handleSortImages(sortBtn);
        return;
      }

      const previewTrigger = event.target.closest('[data-action="preview-attachment"]');
      if (previewTrigger) {
        event.preventDefault();
        handleAttachmentPreview(previewTrigger);
      }
    });
  }

  if (elements.projectOverviewDetail) {
    elements.projectOverviewDetail.addEventListener('change', (event) => {
      const target = event.target;
      if (!target.matches('input[type="checkbox"][data-task-id][data-project-id]')) return;
      const { projectId, taskId } = target.dataset;
      toggleTaskCompletion(state.selectedStudentId, projectId, taskId, target.checked);
    });
  }

  if (elements.authButton) {
    elements.authButton.addEventListener('click', handleAuthButtonClick);
  }

  if (elements.seedButton) {
    elements.seedButton.addEventListener('click', handleSeedDemoClick);
  }

  if (elements.calendarTrigger) {
    elements.calendarTrigger.addEventListener('click', () => {
      state.selectedAttachment = {
        type: 'calendar',
        name: '2025-2026 Academic Calendar',
        url: ACADEMIC_CALENDAR_URL
      };
      renderAll();
    });
  }
}

function ensureInitialSelection() {
  const student = getSelectedStudent();
  if (!student && plannerData.students.length > 0) {
    state.selectedStudentId = plannerData.students[0].id;
  }
  ensureProjectForStudent();
}

function ensureProjectForStudent() {
  const student = getSelectedStudent();
  if (!student) {
    state.selectedProjectId = null;
    state.selectedAttachment = null;
    state.sortImagesFirst = true;
    return;
  }
  const preferred = pickDefaultProject(student);
  state.selectedProjectId = preferred ? preferred.id : null;
  state.selectedAttachment = null;
  state.sortImagesFirst = true;
}

function renderAll() {
  if (dataStatus.loading) {
    renderLoadingState();
    return;
  }

  const student = getSelectedStudent();
  renderStudents();
  renderAttachmentPreview(student);
  renderStudentSummary(student);
  renderProjectOverviewDetail(student);
  renderUpcoming(student);
  renderProjects(student);
  renderProjectDetail(student);
  updateToggleButton(student);
}

function renderStudents() {
  if (!elements.studentList) return;

  if (!plannerData.students.length) {
    elements.studentList.innerHTML = '<div class="empty-state">Ve Firestore zatím nejsou žádné děti.</div>';
    return;
  }

  const markup = plannerData.students
    .map((student) => {
      const stats = calculateStudentStats(student);
      return `
        <button type="button" class="student-tab" role="tab" aria-selected="${student.id === state.selectedStudentId}" data-student-id="${student.id}">
          <span class="student-name">${student.name}</span>
          <span class="student-stats">
            <span>${stats.activeProjects} aktivní</span>
            <span>${stats.tasksCompleted}/${stats.tasksTotal} úkolů</span>
          </span>
        </button>
      `;
    })
    .join('');

  elements.studentList.innerHTML = markup;
}

function renderStudentSummary(student) {
  if (!elements.studentSummary) return;

  if (!student) {
    elements.studentSummary.innerHTML = '<div class="empty-state">Vyber dítě v levém panelu.</div>';
    return;
  }

  const stats = calculateStudentStats(student);
  const badgeClass = stats.overdueProjects > 0 ? 'status-pill--overdue' : 'status-pill--upcoming';
  const badgeText = stats.overdueProjects > 0
    ? `${stats.overdueProjects} ${pluralizeProjects(stats.overdueProjects)} po termínu`
    : `${stats.activeProjects} ${pluralizeProjects(stats.activeProjects)} běží`;
  const dataSourceNote = dataStatus.usingFallback
    ? '<p class="summary-note summary-note--muted">Zobrazuji ukázková data - ověř nastavení Firebase.</p>'
    : '';
  const schoolMarkup = buildSchoolCard(student);
  const linksMarkup = buildStudentLinks(student);
  const extraMarkup = buildStudentExtra(student);
  const routineMarkup = student.routine && student.routine.length
    ? `
      <div class="summary-routine">
        <span class="summary-routine__title">Rodinný rytmus</span>
        <ul class="summary-routine__list">
          ${student.routine.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `
    : '';
  const nextDueText = stats.nextDueProject
    ? `${stats.nextDueProject.title} · ${stats.nextDueProject.dueDate ? formatDate(stats.nextDueProject.dueDate) : 'bez termínu'}`
    : 'Žádný termín v dohledu';

  const summarySubline = student.school?.name
    ? `<div class="summary-grade">${escapeHtml(student.school.name)}</div>`
    : (student.grade ? `<div class="summary-grade">${student.grade}</div>` : '');

  elements.studentSummary.innerHTML = `
    <div class="summary-header">
      <div>
        <h2 class="summary-title">${student.name}</h2>
        ${summarySubline}
      </div>
      <span class="status-pill ${badgeClass}">${badgeText}</span>
    </div>
    <p class="summary-note">${student.focus}</p>
    <p class="summary-note summary-note--muted">Nejbližší úkol: ${nextDueText}</p>
    ${dataSourceNote}
    ${schoolMarkup}
    ${linksMarkup}
    ${extraMarkup}
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card__label">Aktivní projekty</div>
        <div class="summary-card__value">${stats.activeProjects} / ${stats.projectTotal}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">Úkoly hotovo</div>
        <div class="summary-card__value">${stats.tasksCompleted} / ${stats.tasksTotal}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">Termín do 7 dní</div>
        <div class="summary-card__value">${stats.dueWithin7}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">Splněné projekty</div>
        <div class="summary-card__value">${stats.completedProjects}</div>
      </div>
    </div>
    ${routineMarkup}
  `;
}

function buildSchoolCard(student) {
  const school = student.school;
  if (!school || !school.name) return '';
  const safeName = escapeHtml(school.name);
  const safeUrl = escapeHtml(school.url || '#');
  const logo = school.logo ? `<img src="${escapeHtml(school.logo)}" alt="${safeName}" loading="lazy" />` : '';
  return `
    <a class="summary-school" href="${safeUrl}" target="_blank" rel="noopener">
      <div class="summary-school__media">
        ${logo}
        <span class="summary-school__overlay">${safeName}</span>
      </div>
    </a>
  `;
}

function buildStudentLinks(student) {
  const links = Array.isArray(student.links) ? student.links : [];
  if (!links.length) return '';
  const items = links
    .map((link) => {
      if (!link || !link.label || !link.url) return '';
      const safeLabel = escapeHtml(link.label);
      const safeUrl = escapeHtml(link.url);
      return `<a class="summary-link" href="${safeUrl}" target="_blank" rel="noopener">${safeLabel}</a>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<div class="summary-links">${items}</div>`;
}

function buildStudentExtra(student) {
  if (student.id !== 'amy') return '';

  return `
    <div class="summary-extra">
      <section class="summary-extra__section">
        <h3>Elective Selection · 1. pololetí</h3>
        <p><strong>Zvolený předmět:</strong> Zen Coloring / Yoga Connections.</p>
        <p><strong>Začínáme:</strong> pátek 3. října 2025.</p>
        <p>Týká se žáků 1.–5. třídy (Amy je zahrnuta). Cíl: soustředění, rovnováha těla a mysli, klidný prostor pro tvořivost.</p>
      </section>
      <section class="summary-extra__section">
        <h3>TOP domácí úkol – aktuální</h3>
        <p>Dnes si Amy přináší složku <em>Homework Folder</em>. Prosím projděte si ji společně:</p>
        <ul>
          <li><strong>Classwork</strong> – práce z týdne k nahlédnutí.</li>
          <li><strong>ELA Homework</strong> – dvě verze podle ELA skupiny.</li>
          <li><strong>Math (IXL)</strong> – přihlásit se a splnit úkoly v sekci „From Your Teacher“.</li>
        </ul>
        <p>Úkoly se zadávají každý pátek (ELA + matematika), termín odevzdání je následující pátek. Hodnotí se pouze splnění a snaha.</p>
        <p>Domácí úkoly tvoří 5 % celkové známky. Prosíme o podporu – vytvořit rutinu, klidné místo a nedělat práci za dítě. Pokud něco nejde, učitelky to potřebují vidět.</p>
        <p><strong>Love, Ms. Thalita &amp; Ms. Emilia</strong></p>
      </section>
    </div>
  `;
}

function renderUpcoming(student) {
  if (!elements.upcomingList) return;

  if (!student) {
    elements.upcomingList.innerHTML = '<div class="empty-state">Vyber dítě pro zobrazení termínů.</div>';
    return;
  }

  const sorted = [...student.projects]
    .filter((project) => (state.showCompleted ? true : project.status !== 'completed'))
    .filter((project) => project.dueDate)
    .sort((a, b) => {
      const diffA = daysUntil(a.dueDate);
      const diffB = daysUntil(b.dueDate);
      if (diffA === null && diffB === null) return 0;
      if (diffA === null) return 1;
      if (diffB === null) return -1;
      return diffA - diffB;
    })
    .slice(0, 4);

  if (sorted.length === 0) {
    elements.upcomingList.innerHTML = '<div class="empty-state">Momentálně žádné termíny v kalendáři.</div>';
    return;
  }

  const markup = sorted
    .map((project) => {
      const status = getProjectStatusMeta(project);
      const progress = projectProgress(project);
      const progressLabel = formatTaskProgress(progress);
      return `
        <article class="upcoming-card" role="listitem" data-project-id="${project.id}" data-active="${project.id === state.selectedProjectId}">
          <div class="upcoming-card__info">
            <h3 class="upcoming-card__title">${project.title}</h3>
            <p class="upcoming-card__meta">${project.subject} · ${formatDate(project.dueDate)}</p>
            <p class="project-card__progress">${progressLabel}</p>
          </div>
          <span class="upcoming-card__badge status-pill ${status.className}">${status.label}</span>
        </article>
      `;
    })
    .join('');

  elements.upcomingList.innerHTML = markup;
}

function renderAttachmentPreview(student) {
  if (!elements.attachmentPreview) return;

  const selection = state.selectedAttachment;
  if (!selection) {
    elements.attachmentPreview.innerHTML = '<div class="attachment-preview__placeholder">Vyber obrázek v pravém panelu pro jeho zobrazení.</div>';
    return;
  }

  if (selection.type === 'calendar') {
    const url = escapeHtml(selection.url || '');
    const name = escapeHtml(selection.name || 'Akademický kalendář');
    elements.attachmentPreview.innerHTML = `
      <div class="attachment-preview__content">
        <img class="attachment-preview__image" src="${url}" alt="${name}" loading="lazy" />
        <div class="attachment-preview__meta">
          <span>${name}</span>
          <a href="${url}" target="_blank" rel="noopener">Otevřít v novém okně</a>
        </div>
      </div>
    `;
    return;
  }

  if (!student || selection.studentId !== state.selectedStudentId) {
    elements.attachmentPreview.innerHTML = '<div class="attachment-preview__placeholder">Vyber obrázek v pravém panelu pro jeho zobrazení.</div>';
    return;
  }

  const project = student.projects.find((item) => item.id === selection.projectId);
  if (!project) {
    elements.attachmentPreview.innerHTML = '<div class="attachment-preview__placeholder">Projekt nenalezen.</div>';
    return;
  }

  const attachment = project.attachments?.find((item) => item.id === selection.attachmentId);
  if (!attachment) {
    elements.attachmentPreview.innerHTML = '<div class="attachment-preview__placeholder">Příloha nenalezena.</div>';
    return;
  }

  if (!isImageAttachment(attachment)) {
    elements.attachmentPreview.innerHTML = '<div class="attachment-preview__placeholder">Tento soubor není obrázek. Otevři ho v novém okně z pravého panelu.</div>';
    return;
  }

  const safeUrl = escapeHtml(attachment.url || '#');
  const safeName = escapeHtml(attachment.name || 'Příloha');
  const sizeLabel = typeof attachment.size === 'number' ? formatFileSize(attachment.size) : '';

  elements.attachmentPreview.innerHTML = `
    <div class="attachment-preview__content">
      <img class="attachment-preview__image" src="${safeUrl}" alt="${safeName}" loading="lazy" />
      <div class="attachment-preview__meta">
        <span>${safeName}${sizeLabel ? ` · ${sizeLabel}` : ''}</span>
        <a href="${safeUrl}" target="_blank" rel="noopener">Otevřít v novém okně</a>
      </div>
    </div>
  `;
}

function renderProjectOverviewDetail(student) {
  if (!elements.projectOverviewDetail) return;

  if (!student) {
    elements.projectOverviewDetail.innerHTML = '<div class="attachment-preview__placeholder">Vyber projekt pro zobrazení detailu.</div>';
    return;
  }

  const project = student.projects.find((item) => item.id === state.selectedProjectId);
  if (!project) {
    elements.projectOverviewDetail.innerHTML = '<div class="attachment-preview__placeholder">Vyber projekt z pravého panelu.</div>';
    return;
  }

  const status = getProjectStatusMeta(project);
  const progress = projectProgress(project);
  const safeTitle = escapeHtml(project.title);
  const safeSubject = escapeHtml(project.subject);
  const safeOwner = escapeHtml(project.owner || '');
  const safeDescription = escapeHtml(project.description || '');
  const tasksMarkup = project.tasks && project.tasks.length
    ? `
      <ul class="task-list">
        ${project.tasks
          .map((task) => {
            const checkboxId = `${project.id}-${task.id}`;
            const taskTitle = escapeHtml(task.title || '');
            const taskNote = escapeHtml(task.note || '');
            return `
              <li class="task-item">
                <input type="checkbox" id="${checkboxId}" data-project-id="${project.id}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} />
                <label class="task-item__content" for="${checkboxId}">
                  <span class="task-item__title">${taskTitle}</span>
                  ${task.note ? `<span class="task-item__note">${taskNote}</span>` : ''}
                </label>
              </li>
            `;
          })
          .join('')}
      </ul>
    `
    : '<div class="empty-state">Žádné úkoly – jen sledování.</div>';

  const milestonesMarkup = project.milestones && project.milestones.length
    ? `
      <section class="project-detail__section">
        <h3>Milníky</h3>
        <ul class="milestone-list">
          ${project.milestones.map((item) => `<li>${escapeHtml(item || '')}</li>`).join('')}
        </ul>
      </section>
    `
    : '';

  const safeNotes = escapeHtml(project.notes || '');

  const notesMarkup = project.notes
    ? `
      <section class="project-detail__section">
        <h3>Poznámky pro rodiče</h3>
        <p class="project-overview-detail__description">${safeNotes}</p>
      </section>
    `
    : '';

  elements.projectOverviewDetail.innerHTML = `
    <div class="project-overview-detail__header">
      <span class="status-pill ${status.className}">${status.label}</span>
      <h2 class="project-detail__title">${safeTitle}</h2>
      <div class="project-overview-detail__meta">
        <span><strong>Předmět:</strong> ${safeSubject}</span>
        ${project.dueDate ? `<span><strong>Termín:</strong> ${formatDate(project.dueDate)} (${formatRelative(project.dueDate)})</span>` : ''}
        <span><strong>Úkoly:</strong> ${progress.completed}/${progress.total}</span>
        ${project.owner ? `<span><strong>Děláme s:</strong> ${safeOwner}</span>` : ''}
      </div>
    </div>
    <section class="project-detail__section">
      <h3>Popis</h3>
      <p class="project-overview-detail__description">${safeDescription}</p>
    </section>
    <section class="project-detail__section">
      <h3>Úkoly</h3>
      ${tasksMarkup}
    </section>
    ${milestonesMarkup}
    ${notesMarkup}
  `;
}

function renderProjects(student) {
  if (!elements.projectGrid || !elements.projectCount) return;

  if (!student) {
    elements.projectGrid.innerHTML = '<div class="empty-state">Vyber dítě pro seznam projektů.</div>';
    elements.projectCount.textContent = '';
    return;
  }

  const visible = getVisibleProjects(student);
  if (visible.length === 0) {
    elements.projectGrid.innerHTML = '<div class="empty-state">Žádné projekty v této kategorii.</div>';
    elements.projectCount.textContent = formatProjectCount(0, student.projects.length);
    state.selectedProjectId = null;
    return;
  }

  const sorted = [...visible].sort(projectSortComparator);
  if (!sorted.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = sorted[0].id;
    state.selectedAttachment = null;
    state.sortImagesFirst = true;
  }

  const markup = sorted
    .map((project) => {
      const status = getProjectStatusMeta(project);
      const progress = formatTaskProgress(projectProgress(project));
      const selected = project.id === state.selectedProjectId;
      return `
        <button type="button" class="project-card" role="listitem" data-project-id="${project.id}" aria-selected="${selected}">
          <span class="status-pill ${status.className}">${status.label}</span>
          <h3 class="project-card__title">${project.title}</h3>
          <p class="project-card__meta">${project.subject}${project.owner ? ` · ${project.owner}` : ''}</p>
          <p class="project-card__progress">${progress}</p>
        </button>
      `;
    })
    .join('');

  elements.projectGrid.innerHTML = markup;
  elements.projectCount.textContent = formatProjectCount(sorted.length, student.projects.length);
}

function renderProjectDetail(student) {
  if (!elements.projectDetail) return;

  if (!student) {
    elements.projectDetail.innerHTML = '<div class="project-detail__placeholder">Vyber dítě pro detaily projektu.</div>';
    return;
  }

  if (!state.selectedProjectId) {
    elements.projectDetail.innerHTML = '<div class="project-detail__placeholder">Vyber projekt z prostředního panelu.</div>';
    return;
  }

  const project = student.projects.find((item) => item.id === state.selectedProjectId);
  if (!project) {
    elements.projectDetail.innerHTML = '<div class="project-detail__placeholder">Projekt nenalezen.</div>';
    return;
  }

  syncSelectedAttachment(student, project);

  const orderedAttachments = getOrderedAttachments(project);
  const attachmentsListMarkup = orderedAttachments.length
    ? `
      <ul class="attachment-list">
        ${orderedAttachments
          .map((attachment) => {
            const name = attachment.name || 'Priloha';
            const safeName = escapeHtml(name);
            const sizeLabel = typeof attachment.size === 'number' ? ` (${formatFileSize(attachment.size)})` : '';
            const uploadedDate = attachment.uploadedAt ? attachment.uploadedAt.slice(0, 10) : '';
            const uploadedText = uploadedDate ? ` · ${formatDate(uploadedDate)} (${formatRelative(uploadedDate)})` : '';
            const locationNote = attachment.storage === 'local' ? ' · uložené lokálně' : '';
            const metaParts = [];
            if (uploadedText) metaParts.push(uploadedText.trim());
            if (locationNote) metaParts.push(locationNote.trim());
            const metaMarkup = metaParts.length
              ? `<span class="attachment-meta">${metaParts.join(' ')}</span>`
              : '';
            const isSelected = isAttachmentSelected(student.id, project.id, attachment.id);
            return `
              <li class="attachment-item" data-selected="${isSelected ? 'true' : 'false'}">
                <div class="attachment-item__body">
                  <button type="button" class="attachment-link" data-action="preview-attachment" data-student-id="${student.id}" data-project-id="${project.id}" data-attachment-id="${attachment.id}">${safeName}${sizeLabel}</button>
                  ${metaMarkup}
                </div>
                <button type="button" class="attachment-remove" data-action="remove-attachment" data-student-id="${student.id}" data-project-id="${project.id}" data-attachment-id="${attachment.id}" aria-label="Smazat přílohu ${safeName}">
                  &times;
                </button>
              </li>
            `;
          })
          .join('')}
      </ul>
    `
    : '<div class="empty-state">Zatím žádné přílohy.</div>';
  const imageAttachments = orderedAttachments.filter(isImageAttachment);
  const galleryMarkup = imageAttachments.length
    ? `
      <div class="attachment-gallery" role="group" aria-label="Galerie příloh">
        ${imageAttachments
          .map((attachment) => {
            const label = escapeHtml(attachment.name || 'Příloha');
            const thumb = escapeHtml(attachment.url || '#');
            const isSelected = isAttachmentSelected(student.id, project.id, attachment.id);
            return `
              <button type="button" class="attachment-gallery__item" data-action="preview-attachment" data-student-id="${student.id}" data-project-id="${project.id}" data-attachment-id="${attachment.id}" title="${label}" aria-label="${label}" data-selected="${isSelected ? 'true' : 'false'}">
                <img src="${thumb}" alt="${label}" loading="lazy" />
              </button>
            `;
          })
          .join('')}
      </div>
    `
    : '';
  const canUploadAttachments = isFirebaseReady() && isStorageReady() && !dataStatus.usingFallback && Boolean(firebase.storage);
  const uploadEnabled = canUploadAttachments || dataStatus.usingFallback;
  const uploadHelpText = canUploadAttachments
    ? 'Maximální velikost souboru je 10 MB. Podporujeme obrázky a PDF.'
    : dataStatus.usingFallback
      ? 'Soubor se uloží jen v tomto prohlížeči, dokud nebude Firebase dostupné.'
      : 'Nahrávání není dostupné – zkontroluj Firebase připojení.';
  const attachmentUploadMarkup = `
    <form class="attachment-upload" data-attachment-form data-project-id="${project.id}">
      <label class="attachment-upload__label">
        <span>Nahrát přílohu</span>
        <input type="file" name="attachment" accept="image/*,.pdf" ${uploadEnabled ? '' : 'disabled'} multiple />
      </label>
      <button type="submit" ${uploadEnabled ? '' : 'disabled'}>Nahrát</button>
      <p class="attachment-upload__hint">${uploadHelpText}</p>
      <p class="attachment-upload__error" data-role="upload-error"></p>
    </form>
  `;
  const attachmentsMarkup = `
    <section class="project-detail__section project-detail__section--attachments">
      <div class="attachment-section-header">
        <h3>Přílohy</h3>
        <button type="button" class="attachment-sort-btn" data-action="sort-images" aria-pressed="${state.sortImagesFirst ? 'true' : 'false'}" title="Posunout obrázky nahoru" aria-label="Posunout obrázky nahoru">🖼</button>
      </div>
      ${galleryMarkup}
      ${attachmentsListMarkup}
      ${attachmentUploadMarkup}
    </section>
  `;
  elements.projectDetail.innerHTML = attachmentsMarkup;
}

function updateToggleButton(student) {
  if (!elements.toggleCompletedBtn) return;

  if (dataStatus.loading) {
    elements.toggleCompletedBtn.disabled = true;
    elements.toggleCompletedBtn.setAttribute('aria-busy', 'true');
    return;
  }

  elements.toggleCompletedBtn.removeAttribute('aria-busy');
  elements.toggleCompletedBtn.textContent = state.showCompleted ? 'Skrýt splněné' : 'Zobrazit splněné';
  elements.toggleCompletedBtn.setAttribute('aria-pressed', state.showCompleted ? 'true' : 'false');

  if (!student) {
    elements.toggleCompletedBtn.disabled = true;
    elements.toggleCompletedBtn.title = 'Vyber dítě pro zobrazení projektů.';
    return;
  }

  const completedCount = student.projects.filter((project) => project.status === 'completed').length;
  elements.toggleCompletedBtn.disabled = completedCount === 0;
  elements.toggleCompletedBtn.title = completedCount === 0
    ? 'Žádné splněné projekty k zobrazení.'
    : `${completedCount} ${pluralizeProjects(completedCount)} je splněno.`;
}

function toggleTaskCompletion(studentId, projectId, taskId, completed) {
  const student = plannerData.students.find((item) => item.id === studentId);
  if (!student) return;
  const project = student.projects.find((item) => item.id === projectId);
  if (!project) return;
  const task = project.tasks?.find((item) => item.id === taskId);
  if (!task) return;

  task.completed = completed;
  const progress = projectProgress(project);
  const baseline = project.baselineStatus || 'active';

  if (progress.total > 0 && progress.completed === progress.total) {
    project.status = 'completed';
    project.completedOn = project.completedOn || offsetDate(0);
  } else {
    project.completedOn = undefined;
    if (progress.completed === 0) {
      project.status = baseline === 'completed' ? 'active' : baseline;
    } else {
      project.status = 'active';
    }
  }

  persistStudentProjects(studentId, student.projects).catch(() => {});
  renderAll();
}

async function handleAttachmentUpload(form) {
  const fileInput = form.querySelector('input[type="file"][name="attachment"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorEl = form.querySelector('[data-role="upload-error"]');

  if (errorEl) {
    errorEl.textContent = '';
  }

  if (!fileInput) {
    if (errorEl) {
      errorEl.textContent = 'Soubor se nepodarilo nacist. Zkus to znovu.';
    }
    return;
  }

  const files = Array.from(fileInput.files || []).filter(Boolean);
  if (files.length === 0) {
    if (errorEl) {
      errorEl.textContent = 'Vyber soubory, které chceš nahrát.';
    }
    return;
  }

  const usingLocalUpload = dataStatus.usingFallback || !isFirebaseReady() || !isStorageReady() || !firebase.storage;

  if (!usingLocalUpload && (!firebase.storageRef || !firebase.uploadBytes || !firebase.getDownloadURL)) {
    if (errorEl) {
      errorEl.textContent = 'Firebase Storage klient není dostupný.';
    }
    return;
  }

  const studentId = state.selectedStudentId;
  const projectId = form.dataset.projectId;
  if (!studentId || !projectId) {
    if (errorEl) {
      errorEl.textContent = 'Nepodarilo se urcit projekt pro nahrani.';
    }
    return;
  }

  const originalBtnText = submitBtn ? submitBtn.textContent : '';
  const sizeLimit = 10 * 1024 * 1024;
  const failedMessages = [];
  let feedbackMessage = '';
  let uploadedAny = false;

  try {
    debugLog('Upload start', { studentId, projectId, usingLocalUpload, files: files.map((file) => ({ name: file.name, size: file.size })) });
    debugLog('Aktuální storage bucket', firebase?.storage?.app?.options?.storageBucket);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Nahrávám...';
    }
    fileInput.disabled = true;
    form.dataset.uploading = 'true';
    for (const file of files) {
      if (file.size > sizeLimit) {
        failedMessages.push(`${file.name} je příliš velký (limit 10 MB).`);
        continue;
      }

      try {
        if (usingLocalUpload) {
          const dataUrl = await readFileAsDataUrl(file);
          const attachmentPayload = {
            name: file.name,
            url: dataUrl,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            uploadedAt: new Date().toISOString(),
            storage: 'local'
          };
          debugLog('Upload fallback - ukládám lokálně');
          await addAttachmentToProject(studentId, projectId, attachmentPayload, { renderAfter: false });
          uploadedAny = true;
        } else {
          const storagePath = buildStoragePath(studentId, projectId, file.name);
          const storageReference = firebase.storageRef(firebase.storage, storagePath);
          const metadata = file.type ? { contentType: file.type } : undefined;

          debugLog('Nahrávám do Storage', storagePath);
          await firebase.uploadBytes(storageReference, file, metadata);
          debugLog('Upload do Storage dokončen');
          const downloadUrl = await firebase.getDownloadURL(storageReference);
          debugLog('Načtena download URL', downloadUrl);

          const attachmentPayload = {
            name: file.name,
            url: downloadUrl,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            uploadedAt: new Date().toISOString(),
            storage: 'remote',
            storagePath
          };

          await addAttachmentToProject(studentId, projectId, attachmentPayload, { renderAfter: false });
          uploadedAny = true;
          debugLog('Příloha uložená do Firestore');
        }
      } catch (innerError) {
        console.error('Nahrávání přílohy selhalo.', innerError);
        failedMessages.push(`${file.name}: nahrávání se nepovedlo.`);
      }
    }
    if (failedMessages.length > 0) {
      feedbackMessage = failedMessages.join(' ');
    } else if (usingLocalUpload) {
      feedbackMessage = 'Přílohy jsou uložené jen v tomto prohlížeči.';
    } else {
      feedbackMessage = '';
    }
    if (uploadedAny) {
      renderAll();
    }
  } catch (error) {
    console.error('Nahrávání přílohy selhalo.', error);
    feedbackMessage = 'Nahrávání se nepovedlo. Zkus to prosím znovu.';
  } finally {
    form.dataset.uploading = 'false';
    const currentForm = elements.projectDetail?.querySelector(`[data-attachment-form][data-project-id="${projectId}"]`) || form;
    const currentSubmitBtn = currentForm?.querySelector('button[type="submit"]') || submitBtn;
    const currentFileInput = currentForm?.querySelector('input[type="file"][name="attachment"]') || fileInput;
    const currentErrorEl = currentForm?.querySelector('[data-role="upload-error"]') || errorEl;

    if (currentSubmitBtn) {
      currentSubmitBtn.disabled = false;
      currentSubmitBtn.textContent = originalBtnText || 'Nahrát';
    }
    if (currentFileInput) {
      currentFileInput.disabled = false;
      currentFileInput.value = '';
    }
    if (currentErrorEl) {
      currentErrorEl.textContent = feedbackMessage;
    }
  }
}

async function handleAttachmentRemove(button) {
  const projectId = button.dataset.projectId;
  const attachmentId = button.dataset.attachmentId;
  const studentId = button.dataset.studentId || state.selectedStudentId;

  if (!projectId || !attachmentId || !studentId) {
    return;
  }

  const student = plannerData.students.find((item) => item.id === studentId);
  if (!student) return;
  const project = student.projects.find((item) => item.id === projectId);
  if (!project) return;
  const attachment = project.attachments?.find((item) => item.id === attachmentId);
  if (!attachment) return;

  const label = attachment.name || 'přílohu';
  if (!window.confirm(`Opravdu chceš smazat ${label}?`)) {
    return;
  }

  const previousAttachments = [...(project.attachments || [])];
  project.attachments = previousAttachments.filter((item) => item.id !== attachmentId);

  if (state.selectedAttachment && state.selectedAttachment.type === 'attachment' && state.selectedAttachment.projectId === projectId && state.selectedAttachment.attachmentId === attachmentId) {
    state.selectedAttachment = null;
  }

  try {
    await persistStudentProjects(student.id, student.projects);
    if (attachment.storage === 'remote' && isFirebaseReady() && isStorageReady() && firebase.deleteObject) {
      const storagePath = getStoragePathForAttachment(attachment);
      if (storagePath) {
        try {
          debugLog('Mažu soubor ze Storage', storagePath);
          const ref = firebase.storageRef(firebase.storage, storagePath);
          await firebase.deleteObject(ref);
        } catch (storageError) {
          console.warn('Soubor ve Storage se nepodařilo smazat.', storageError);
        }
      }
    }
    renderAll();
  } catch (error) {
    console.error('Smazání přílohy selhalo.', error);
    if (window.alert) {
      window.alert('Smazání přílohy se nepodařilo. Zkus to prosím znovu.');
    }
    project.attachments = previousAttachments;
    await persistStudentProjects(student.id, student.projects).catch(() => {});
    renderAll();
  }
}

function handleAttachmentPreview(trigger) {
  const projectId = trigger.dataset.projectId;
  const attachmentId = trigger.dataset.attachmentId;
  const studentId = trigger.dataset.studentId || state.selectedStudentId;

  if (!projectId || !attachmentId || !studentId) {
    return;
  }

  state.selectedAttachment = {
    type: 'attachment',
    studentId,
    projectId,
    attachmentId
  };

  renderAll();
}

function handleSortImages(button) {
  if (!state.selectedProjectId) return;
  state.sortImagesFirst = !state.sortImagesFirst;

  const student = getSelectedStudent();
  const project = student?.projects.find((item) => item.id === state.selectedProjectId);
  if (project) {
    const ordered = getOrderedAttachments(project);
    const firstImage = ordered.find((attachment) => isImageAttachment(attachment));
    if (state.sortImagesFirst && firstImage) {
      state.selectedAttachment = {
        type: 'attachment',
        studentId: student.id,
        projectId: project.id,
        attachmentId: firstImage.id
      };
    } else if (!state.sortImagesFirst) {
      state.selectedAttachment = null;
    }
  }

  renderAll();
}

async function handleSeedDemoClick() {
  if (!elements.seedButton) return;
  if (!currentUser) {
    alert('Přihlas se, prosím, abych mohl naplnit data do Firestore.');
    return;
  }
  if (!isFirebaseReady()) {
    alert('Firebase není dostupné – zkontroluj konfiguraci.');
    return;
  }

  const originalText = elements.seedButton.textContent;
  elements.seedButton.disabled = true;
  elements.seedButton.textContent = 'Nahrávám...';
  debugLog('Seed demo dat - START');

  try {
    await seedFirestoreWithFallback();
    shouldOfferSeed = false;
    await loadPlannerData();
    ensureInitialSelection();
    renderAll();
    debugLog('Seed demo dat - HOTOVO');
  } catch (error) {
    console.error('Naplnění Firestore selhalo.', error);
    alert('Naplnění dat se nepodařilo. Mrkni do konzole pro detaily.');
  } finally {
    elements.seedButton.textContent = originalText;
    updateSeedUI();
  }
}

async function seedFirestoreWithFallback() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase není připravené.');
  }

  const students = fallbackPlannerData.students || [];
  if (students.length === 0) {
    throw new Error('Fallback data neobsahují žádné studenty.');
  }

  for (const student of students) {
    const docRef = firebase.doc(firebase.db, FIREBASE_COLLECTION, student.id);
    const payload = serializeStudent(student);
    await firebase.setDoc(docRef, payload, { merge: true });
  }
}

async function addAttachmentToProject(studentId, projectId, attachment, options = {}) {
  const { renderAfter = true } = options;
  const student = plannerData.students.find((item) => item.id === studentId);
  if (!student) {
    throw new Error('Student nenalezen pro uložení přílohy.');
  }
  const project = student.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Projekt nenalezen pro uložení přílohy.');
  }

  if (attachment.storage === 'remote') {
    project.attachments = (project.attachments || []).filter((item) => {
      return !(item.storage === 'local' && item.name === attachment.name);
    });
  }

  const normalizedAttachment = normalizeAttachment(attachment, projectId);
  project.attachments = [...(project.attachments || []), normalizedAttachment];

  try {
    debugLog('Ukládám projekty do Firestore', { studentId, projectId, attachments: project.attachments.length });
    await persistStudentProjects(studentId, student.projects);
    debugLog('Persist hotov');
  } catch (error) {
    debugLog('Persist selhal, rollback přílohy');
    project.attachments = project.attachments.filter((item) => item.id !== normalizedAttachment.id);
    throw error;
  }

  if (renderAfter) {
    renderAll();
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Čtení souboru selhalo.'));
    reader.readAsDataURL(file);
  });
}

function buildStoragePath(studentId, projectId, fileName) {
  const safeStudent = sanitizePathSegment(studentId);
  const safeProject = sanitizePathSegment(projectId);
  const safeFile = sanitizeFileName(fileName);
  const timestamp = Date.now();
  return `attachments/${safeStudent}/${safeProject}/${timestamp}-${safeFile}`;
}

function getStoragePathForAttachment(attachment) {
  if (!attachment) return null;
  if (attachment.storagePath) {
    return attachment.storagePath;
  }
  try {
    const url = new URL(attachment.url);
    const match = url.pathname.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch (error) {
    debugLog('Nepodařilo se odvodit storagePath z URL', error);
  }
  return null;
}

function sanitizePathSegment(value) {
  return ensureString(value, 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function sanitizeFileName(fileName) {
  const lowered = ensureString(fileName, 'soubor').toLowerCase();
  const cleaned = lowered.replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
  return cleaned.replace(/^-|-$/g, '') || 'soubor';
}

function getVisibleProjects(student) {
  return student.projects.filter((project) => (state.showCompleted ? true : project.status !== 'completed'));
}

function projectSortComparator(a, b) {
  const weight = { active: 0, planned: 1, completed: 2 };
  const weightA = weight[a.status] ?? 1;
  const weightB = weight[b.status] ?? 1;
  if (weightA !== weightB) return weightA - weightB;

  const diffA = daysUntil(a.dueDate);
  const diffB = daysUntil(b.dueDate);

  if (diffA === null && diffB === null) {
    return a.title.localeCompare(b.title, 'cs');
  }
  if (diffA === null) return 1;
  if (diffB === null) return -1;
  if (diffA !== diffB) return diffA - diffB;
  return a.title.localeCompare(b.title, 'cs');
}

function calculateStudentStats(student) {
  const projects = student.projects;
  const tasks = projects.flatMap((project) => project.tasks || []);

  const activeProjects = projects.filter((project) => project.status === 'active').length;
  const completedProjects = projects.filter((project) => project.status === 'completed').length;
  const plannedProjects = projects.filter((project) => project.status === 'planned').length;
  const projectTotal = projects.length;
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((task) => task.completed).length;

  const dueWithin7 = projects
    .filter((project) => project.status !== 'completed')
    .filter((project) => {
      const diff = daysUntil(project.dueDate);
      return diff !== null && diff >= 0 && diff <= 7;
    }).length;

  const overdueProjects = projects
    .filter((project) => project.status !== 'completed')
    .filter((project) => {
      const diff = daysUntil(project.dueDate);
      return diff !== null && diff < 0;
    }).length;

  const nextDueProject = projects
    .filter((project) => project.status !== 'completed')
    .filter((project) => {
      const diff = daysUntil(project.dueDate);
      return diff !== null && diff >= 0;
    })
    .sort((a, b) => {
      const diffA = daysUntil(a.dueDate);
      const diffB = daysUntil(b.dueDate);
      if (diffA === null && diffB === null) return 0;
      if (diffA === null) return 1;
      if (diffB === null) return -1;
      return diffA - diffB;
    })[0] || null;

  return {
    activeProjects,
    completedProjects,
    plannedProjects,
    projectTotal,
    tasksTotal,
    tasksCompleted,
    dueWithin7,
    overdueProjects,
    nextDueProject
  };
}

function pickDefaultProject(student) {
  if (!student) return null;
  const candidates = [...student.projects].sort(projectSortComparator);
  return candidates.find((project) => project.status === 'active') || candidates[0] || null;
}

function projectProgress(project) {
  const tasks = project.tasks || [];
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { completed, total };
}

function formatTaskProgress(progress) {
  if (progress.total === 0) {
    return 'Bez úkolů';
  }
  return `${progress.completed}/${progress.total} ${pluralizeTasks(progress.total)} hotovo`;
}

function formatProjectCount(visibleCount, totalCount) {
  if (visibleCount === totalCount) {
    return `${visibleCount} ${pluralizeProjects(visibleCount)}`;
  }
  return `${visibleCount}/${totalCount} ${pluralizeProjects(totalCount)}`;
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size)) {
    return '';
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  if (size === 0) {
    return '0 B';
  }
  return `${size} B`;
}

function parseDateSafe(value) {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function daysUntil(value) {
  const date = parseDateSafe(value);
  if (!date) return null;
  return Math.round((date - START_OF_TODAY) / MS_PER_DAY);
}

function formatDate(value) {
  const date = parseDateSafe(value);
  if (!date) return 'Bez termínu';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}. ${month}. ${date.getFullYear()}`;
}

function formatRelative(value) {
  const diff = daysUntil(value);
  if (diff === null) return 'bez termínu';
  if (diff === 0) return 'dnes';
  if (diff === 1) return 'zítra';
  if (diff > 1) return `za ${diff} ${pluralizeDays(diff)}`;
  if (diff === -1) return 'včera';
  return `před ${Math.abs(diff)} ${pluralizeDays(Math.abs(diff))}`;
}

function pluralizeDays(count) {
  const abs = Math.abs(count);
  if (abs === 1) return 'den';
  if (abs >= 2 && abs <= 4) return 'dny';
  return 'dní';
}

function pluralizeProjects(count) {
  const abs = Math.abs(count);
  if (abs === 1) return 'projekt';
  if (abs >= 2 && abs <= 4) return 'projekty';
  return 'projektů';
}

function pluralizeTasks(count) {
  const abs = Math.abs(count);
  if (abs === 1) return 'úkol';
  if (abs >= 2 && abs <= 4) return 'úkoly';
  return 'úkolů';
}

function getProjectStatusMeta(project) {
  if (project.status === 'completed') {
    const completedDate = project.completedOn ? ` ${formatDate(project.completedOn)}` : '';
    return {
      className: 'status-pill--complete',
      label: `Splněno${completedDate}`
    };
  }

  const diff = daysUntil(project.dueDate);
  if (diff === null) {
    return {
      className: 'status-pill--upcoming',
      label: project.status === 'planned' ? 'V přípravě' : 'Bez termínu'
    };
  }

  if (diff < 0) {
    return {
      className: 'status-pill--overdue',
      label: `Po termínu (${formatRelative(project.dueDate)})`
    };
  }

  if (diff === 0) {
    return {
      className: 'status-pill--due-soon',
      label: 'Termín dnes'
    };
  }

  if (diff === 1) {
    return {
      className: 'status-pill--due-soon',
      label: 'Termín zítra'
    };
  }

  if (diff <= 3) {
    return {
      className: 'status-pill--due-soon',
      label: `Termín za ${diff} ${pluralizeDays(diff)}`
    };
  }

  return {
    className: 'status-pill--upcoming',
    label: project.status === 'planned'
      ? 'V přípravě'
      : `Termín ${formatDate(project.dueDate)}`
  };
}

function getSelectedStudent() {
  return plannerData.students.find((student) => student.id === state.selectedStudentId) || null;
}

function persistStudentProjects(studentId, projects) {
  if (!isFirebaseReady() || dataStatus.usingFallback) {
    saveProjectsToLocal(studentId, projects);
    return Promise.resolve();
  }

  if (!firebase.db || !firebase.doc || !firebase.setDoc) {
    console.warn('Firebase klient není kompletní - změny se neuloží.');
    return Promise.reject(new Error('Firebase klient není kompletní.'));
  }

  const docRef = firebase.doc(firebase.db, FIREBASE_COLLECTION, studentId);
  const payload = projects.map((project) => serializeProject(project));

  return firebase
    .setDoc(docRef, { projects: payload }, { merge: true })
    .catch((error) => {
      console.error('Uložení změn do Firebase selhalo.', error);
      throw error;
    })
    .finally(() => {
      debugLog('Ukládám snapshot projektů do localStorage');
      saveProjectsToLocal(studentId, projects);
    });
}

function clonePlannerData(data) {
  return JSON.parse(JSON.stringify(data));
}

function applyLocalOverrides() {
  const store = getLocalStore();
  if (!store || !plannerData?.students) return;

  plannerData.students.forEach((student) => {
    const overrides = store[student.id];
    if (!overrides || !overrides.projects) return;

    student.projects.forEach((project) => {
      const projectOverride = overrides.projects[project.id];
      if (!projectOverride) return;

      if (projectOverride.status) {
        project.status = projectOverride.status;
      }
      if (projectOverride.completedOn) {
        project.completedOn = projectOverride.completedOn;
      }

      if (projectOverride.tasks && Array.isArray(project.tasks)) {
        project.tasks.forEach((task) => {
          if (Object.prototype.hasOwnProperty.call(projectOverride.tasks, task.id)) {
            task.completed = Boolean(projectOverride.tasks[task.id]);
          }
        });
      }

      if (Array.isArray(projectOverride.attachments)) {
        project.attachments = projectOverride.attachments.map((attachment) => normalizeAttachment(attachment, project.id));
      }
    });
  });
}

function saveProjectsToLocal(studentId, projects) {
  if (!studentId || !Array.isArray(projects)) return;
  const store = getLocalStore();
  const nextStore = { ...store };
  const projectOverrides = {};

  projects.forEach((project) => {
    const tasks = {};
    (project.tasks || []).forEach((task) => {
      tasks[task.id] = Boolean(task.completed);
    });

    const localAttachments = (project.attachments || [])
      .filter((attachment) => attachment.storage === 'local')
      .map((attachment) => serializeAttachment(attachment));

    projectOverrides[project.id] = {
      status: project.status,
      completedOn: project.completedOn || null,
      tasks,
      attachments: localAttachments
    };
  });

  nextStore[studentId] = {
    projects: projectOverrides
  };

  setLocalStore(nextStore);
}

function getLocalStore() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryFallbackStore;
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return memoryFallbackStore || {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      memoryFallbackStore = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn('Nepodařilo se načíst lokální cache.', error);
  }
  return memoryFallbackStore || {};
}

function setLocalStore(store) {
  memoryFallbackStore = store || {};
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryFallbackStore));
  } catch (error) {
    console.warn('Nepodařilo se uložit lokální cache.', error);
  }
}

function normalizeStudent(raw, fallbackId) {
  const source = raw || {};
  const studentId = ensureId(source.id || fallbackId, 'student', source.name);
  let name = ensureString(source.name, 'Bez jména');
  if (studentId === 'amy') {
    name = 'Amy Daniel';
  } else if (studentId === 'annie') {
    name = 'Annie Daniel';
  }
  let school = normalizeSchool(source.school);
  if (!school && (studentId === 'amy')) {
    school = {
      name: 'The Centner Academy',
      url: 'https://centneracademy.com/',
      logo: 'https://bbk12e1-cdn.myschoolcdn.com/ftpimages/1710/push/191892/Official%20Letterhead%20_%20(8)%20USHPAGE.png'
    };
  }
  const links = Array.isArray(source.links)
    ? source.links.map((link) => normalizeLink(link)).filter(Boolean)
    : (studentId === 'amy'
      ? [{ label: 'MyCA Portal', url: 'https://centneracademy.myschoolapp.com/app?svcid=edu#login' }]
      : []);

  return {
    id: studentId,
    name,
    grade: ensureString(source.grade),
    focus: ensureString(source.focus),
    school,
    links,
    routine: Array.isArray(source.routine) ? source.routine.map((item) => ensureString(item)) : [],
    projects: Array.isArray(source.projects)
      ? source.projects.map((project) => normalizeProject(project))
      : []
  };
}

function normalizeProject(raw) {
  const source = raw || {};
  const projectId = ensureId(source.id, 'project', source.title);
  const baselineStatus = source.baselineStatus || source.status || 'active';
  return {
    id: projectId,
    title: ensureString(source.title, 'Bez názvu projektu'),
    subject: ensureString(source.subject),
    status: source.status || baselineStatus || 'active',
    baselineStatus,
    dueDate: normalizeDateValue(source.dueDate),
    owner: ensureString(source.owner),
    description: ensureString(source.description),
    tasks: Array.isArray(source.tasks)
      ? source.tasks.map((task) => normalizeTask(task, projectId))
      : [],
    attachments: Array.isArray(source.attachments)
      ? source.attachments.map((attachment) => normalizeAttachment(attachment, projectId))
      : [],
    milestones: Array.isArray(source.milestones) ? source.milestones.map((item) => ensureString(item)) : [],
    notes: ensureString(source.notes),
    completedOn: normalizeDateValue(source.completedOn) || null
  };
}

function normalizeTask(raw, projectId) {
  const source = raw || {};
  return {
    id: ensureId(source.id, `task-${projectId}`, source.title),
    title: ensureString(source.title, 'Bez názvu úkolu'),
    note: ensureString(source.note),
    completed: Boolean(source.completed)
  };
}

function normalizeAttachment(raw, projectId) {
  const source = raw || {};
  const sizeValue = Number(source.size);
  const inferredStorage = typeof source.url === 'string' && source.url.startsWith('data:') ? 'local' : 'remote';
  const storageValue = ensureString(source.storage) || inferredStorage;
  return {
    id: ensureId(source.id, `attachment-${projectId}`, source.name),
    name: ensureString(source.name, 'Priloha'),
    url: ensureString(source.url),
    contentType: ensureString(source.contentType),
    size: Number.isFinite(sizeValue) ? sizeValue : null,
    uploadedAt: normalizeTimestamp(source.uploadedAt),
    storage: storageValue,
    storagePath: ensureString(source.storagePath)
  };
}

function serializeStudent(student) {
  return {
    name: student.name || '',
    grade: student.grade || '',
    focus: student.focus || '',
     school: student.school ? serializeSchool(student.school) : null,
    links: Array.isArray(student.links)
      ? student.links.map((link) => serializeLink(link)).filter(Boolean)
      : [],
    routine: Array.isArray(student.routine) ? student.routine : [],
    projects: (student.projects || []).map((project) => serializeProject(project))
  };
}

function normalizeSchool(raw) {
  if (!raw) return null;
  const name = ensureString(raw.name);
  const url = ensureString(raw.url);
  const logo = ensureString(raw.logo);
  if (!name && !url && !logo) {
    return null;
  }
  return {
    name,
    url,
    logo
  };
}

function normalizeLink(raw) {
  if (!raw) return null;
  const label = ensureString(raw.label);
  const url = ensureString(raw.url);
  if (!label || !url) {
    return null;
  }
  return { label, url };
}

function serializeProject(project) {
  return {
    id: project.id,
    title: project.title,
    subject: project.subject,
    status: project.status,
    baselineStatus: project.baselineStatus,
    dueDate: project.dueDate || null,
    owner: project.owner || '',
    description: project.description || '',
    tasks: (project.tasks || []).map((task) => serializeTask(task)),
    attachments: (project.attachments || []).map((attachment) => serializeAttachment(attachment)),
    milestones: project.milestones || [],
    notes: project.notes || '',
    completedOn: project.completedOn || null
  };
}

function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    note: task.note || '',
    completed: Boolean(task.completed)
  };
}

function serializeSchool(school) {
  if (!school) return null;
  return {
    name: school.name || '',
    url: school.url || '',
    logo: school.logo || ''
  };
}

function serializeLink(link) {
  if (!link) return null;
  return {
    label: link.label || '',
    url: link.url || ''
  };
}

function serializeAttachment(attachment) {
  return {
    id: attachment.id,
    name: attachment.name || 'Priloha',
    url: attachment.url || '',
    contentType: attachment.contentType || '',
    size: typeof attachment.size === 'number' && Number.isFinite(attachment.size) ? attachment.size : null,
    uploadedAt: attachment.uploadedAt || '',
    storage: attachment.storage || '',
    storagePath: attachment.storagePath || ''
  };
}

function isImageAttachment(attachment) {
  if (!attachment || !attachment.url) return false;
  const type = ensureString(attachment.contentType).toLowerCase();
  if (type.startsWith('image/')) {
    return true;
  }
  const name = ensureString(attachment.name).toLowerCase();
  return /(\.)(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(name || attachment.url);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getOrderedAttachments(project) {
  const attachments = project.attachments || [];
  if (!state.sortImagesFirst) {
    return attachments;
  }
  return [...attachments].sort((a, b) => {
    const aIsImage = isImageAttachment(a) ? 0 : 1;
    const bIsImage = isImageAttachment(b) ? 0 : 1;
    if (aIsImage !== bIsImage) return aIsImage - bIsImage;
    return 0;
  });
}

function isAttachmentSelected(studentId, projectId, attachmentId) {
  if (!state.selectedAttachment || state.selectedAttachment.type !== 'attachment') return false;
  return state.selectedAttachment.studentId === studentId
    && state.selectedAttachment.projectId === projectId
    && state.selectedAttachment.attachmentId === attachmentId;
}

function syncSelectedAttachment(student, project) {
  if (!state.selectedAttachment || state.selectedAttachment.type !== 'attachment') return;
  if (state.selectedAttachment.studentId !== student.id || state.selectedAttachment.projectId !== project.id) {
    return;
  }
  const exists = (project.attachments || []).some((item) => item.id === state.selectedAttachment.attachmentId);
  if (!exists) {
    state.selectedAttachment = null;
  }

  if (!state.selectedAttachment && state.sortImagesFirst) {
    const ordered = getOrderedAttachments(project);
    const preferred = state.sortImagesFirst
      ? ordered.find((attachment) => isImageAttachment(attachment)) || ordered[0]
      : ordered[0];
    if (preferred) {
      state.selectedAttachment = {
        type: 'attachment',
        studentId: student.id,
        projectId: project.id,
        attachmentId: preferred.id
      };
    }
  }
}

function ensureString(value, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function normalizeDateValue(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toDate === 'function') {
      return normalizeDateValue(value.toDate());
    }
    if (typeof value.seconds === 'number') {
      return normalizeDateValue(new Date(value.seconds * 1000));
    }
  }
  return ensureString(value);
}

function normalizeTimestamp(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000).toISOString();
    }
  }
  return ensureString(value);
}

function ensureId(rawId, prefix, fallbackValue = '') {
  if (typeof rawId === 'string' && rawId.trim()) {
    return rawId;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const base = ensureString(fallbackValue, prefix).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${base || 'auto'}-${suffix}`;
}

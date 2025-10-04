import { firebase, isFirebaseReady, isStorageReady } from './firebase-placeholder.js';

const today = new Date();
const START_OF_TODAY = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function offsetDate(daysFromToday) {
  const date = new Date(START_OF_TODAY);
  date.setDate(date.getDate() + Number(daysFromToday || 0));
  return date.toISOString().slice(0, 10);
}

const fallbackPlannerData = {
  students: [
    {
      id: 'amy',
      name: 'Amy Nováková',
      grade: '1. třída · ZŠ Komenského',
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
      name: 'Annie Nováková',
      grade: 'Předškolák · MŠ Pohádka',
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

const state = {
  selectedStudentId: 'amy',
  selectedProjectId: null,
  showCompleted: false
};

const elements = {
  studentList: document.getElementById('student-list'),
  studentSummary: document.getElementById('student-summary'),
  upcomingList: document.getElementById('upcoming-list'),
  projectGrid: document.getElementById('project-grid'),
  projectDetail: document.getElementById('project-detail'),
  toggleCompletedBtn: document.getElementById('toggle-show-completed'),
  projectCount: document.getElementById('project-count')
};

init();

async function init() {
  if (!elements.studentList || !elements.projectGrid) {
    return;
  }

  attachEvents();
  renderLoadingState();
  await loadPlannerData();
  ensureInitialSelection();
  renderAll();
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
  if (elements.projectDetail) {
    elements.projectDetail.innerHTML = loadingMessage;
  }
  if (elements.toggleCompletedBtn) {
    elements.toggleCompletedBtn.disabled = true;
    elements.toggleCompletedBtn.setAttribute('aria-busy', 'true');
  }
}

async function loadPlannerData() {
  dataStatus.loading = true;
  dataStatus.error = null;
  dataStatus.usingFallback = false;

  if (!isFirebaseReady()) {
    console.info('Firebase není nakonfigurované - používám lokální testovací data.');
    plannerData = clonePlannerData(fallbackPlannerData);
    dataStatus.loading = false;
    dataStatus.usingFallback = true;
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
  } catch (error) {
    console.error('Načtení dat z Firebase selhalo, používám lokální data.', error);
    dataStatus.error = error;
    plannerData = clonePlannerData(fallbackPlannerData);
    dataStatus.usingFallback = true;
  } finally {
    dataStatus.loading = false;
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
      renderAll();
    });
  }

  if (elements.projectDetail) {
    elements.projectDetail.addEventListener('change', (event) => {
      const target = event.target;
      if (!target.matches('input[type="checkbox"][data-task-id][data-project-id]')) return;
      const { projectId, taskId } = target.dataset;
      toggleTaskCompletion(state.selectedStudentId, projectId, taskId, target.checked);
    });
    elements.projectDetail.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-attachment-form]');
      if (!form) return;
      event.preventDefault();
      await handleAttachmentUpload(form);
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
    return;
  }
  const preferred = pickDefaultProject(student);
  state.selectedProjectId = preferred ? preferred.id : null;
}

function renderAll() {
  if (dataStatus.loading) {
    renderLoadingState();
    return;
  }

  const student = getSelectedStudent();
  renderStudents();
  renderStudentSummary(student);
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
          <span class="student-meta">${student.grade}</span>
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

  elements.studentSummary.innerHTML = `
    <div class="summary-header">
      <div>
        <h2 class="summary-title">${student.name}</h2>
        <div class="summary-grade">${student.grade}</div>
      </div>
      <span class="status-pill ${badgeClass}">${badgeText}</span>
    </div>
    <p class="summary-note">${student.focus}</p>
    <p class="summary-note summary-note--muted">Nejbližší úkol: ${nextDueText}</p>
    ${dataSourceNote}
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

  const status = getProjectStatusMeta(project);
  const progress = projectProgress(project);
  const attachments = project.attachments || [];
  const attachmentsListMarkup = attachments.length
    ? `
      <ul class="attachment-list">
        ${attachments
          .map((attachment) => {
            const name = attachment.name || 'Priloha';
            const sizeLabel = typeof attachment.size === 'number' ? ` (${formatFileSize(attachment.size)})` : '';
            const uploadedDate = attachment.uploadedAt ? attachment.uploadedAt.slice(0, 10) : '';
            const uploadedText = uploadedDate ? ` · ${formatDate(uploadedDate)} (${formatRelative(uploadedDate)})` : '';
            const metaMarkup = uploadedText ? `<span class="attachment-meta">${uploadedText}</span>` : '';
            return `
              <li class="attachment-item">
                <a href="${attachment.url}" target="_blank" rel="noopener">${name}${sizeLabel}</a>
                ${metaMarkup}
              </li>
            `;
          })
          .join('')}
      </ul>
    `
    : '<div class="empty-state">Zatím žádné přílohy.</div>';
  const canUploadAttachments = isFirebaseReady() && isStorageReady() && !dataStatus.usingFallback && Boolean(firebase.storage);
  const uploadHelpText = canUploadAttachments
    ? 'Maximální velikost souboru je 10 MB. Podporujeme obrázky a PDF.'
    : 'Nahrávání je dostupné jen s aktivním Firebase připojením.';
  const attachmentUploadMarkup = `
    <form class="attachment-upload" data-attachment-form data-project-id="${project.id}">
      <label class="attachment-upload__label">
        <span>Nahrát přílohu</span>
        <input type="file" name="attachment" accept="image/*,.pdf" ${canUploadAttachments ? '' : 'disabled'} />
      </label>
      <button type="submit" ${canUploadAttachments ? '' : 'disabled'}>Nahrát</button>
      <p class="attachment-upload__hint">${uploadHelpText}</p>
      <p class="attachment-upload__error" data-role="upload-error"></p>
    </form>
  `;
  const attachmentsMarkup = `
    <section class="project-detail__section">
      <h3>Přílohy</h3>
      ${attachmentsListMarkup}
      ${attachmentUploadMarkup}
    </section>
  `;
  const tasksMarkup = project.tasks && project.tasks.length
    ? `
      <ul class="task-list">
        ${project.tasks
          .map((task) => {
            const checkboxId = `${project.id}-${task.id}`;
            return `
              <li class="task-item">
                <input type="checkbox" id="${checkboxId}" data-project-id="${project.id}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} />
                <label class="task-item__content" for="${checkboxId}">
                  <span class="task-item__title">${task.title}</span>
                  ${task.note ? `<span class="task-item__note">${task.note}</span>` : ''}
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
          ${project.milestones.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    `
    : '';

  const notesMarkup = project.notes
    ? `
      <section class="project-detail__section">
        <h3>Poznámky pro rodiče</h3>
        <p>${project.notes}</p>
      </section>
    `
    : '';

  elements.projectDetail.innerHTML = `
    <header class="project-detail__header">
      <span class="status-pill ${status.className}">${status.label}</span>
      <h2 class="project-detail__title">${project.title}</h2>
      <div class="project-detail__meta">
        <span><strong>Předmět:</strong> ${project.subject}</span>
        ${project.dueDate ? `<span><strong>Termín:</strong> ${formatDate(project.dueDate)} (${formatRelative(project.dueDate)})</span>` : ''}
        <span><strong>Úkoly:</strong> ${progress.completed}/${progress.total}</span>
        ${project.owner ? `<span><strong>Děláme s:</strong> ${project.owner}</span>` : ''}
      </div>
    </header>
    <section class="project-detail__section">
      <h3>Popis</h3>
      <p>${project.description}</p>
    </section>
    <section class="project-detail__section">
      <h3>Úkoly</h3>
      ${tasksMarkup}
    </section>
    ${attachmentsMarkup}
    ${milestonesMarkup}
    ${notesMarkup}
  `;
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

  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    if (errorEl) {
      errorEl.textContent = 'Vyber soubor, ktery chces nahrat.';
    }
    return;
  }

  if (!isFirebaseReady() || !isStorageReady() || dataStatus.usingFallback || !firebase.storage) {
    if (errorEl) {
      errorEl.textContent = 'Firebase neni pripravene. Soubor se nenahrál.';
    }
    return;
  }

  if (!firebase.storageRef || !firebase.uploadBytes || !firebase.getDownloadURL) {
    if (errorEl) {
      errorEl.textContent = 'Firebase Storage klient neni dostupny.';
    }
    return;
  }

  const sizeLimit = 10 * 1024 * 1024;
  if (file.size > sizeLimit) {
    if (errorEl) {
      errorEl.textContent = 'Soubor je prilis velky (limit je 10 MB).';
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

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Nahrávám...';
    }
    fileInput.disabled = true;
    form.dataset.uploading = 'true';

    const storagePath = buildStoragePath(studentId, projectId, file.name);
    const storageReference = firebase.storageRef(firebase.storage, storagePath);
    const metadata = file.type ? { contentType: file.type } : undefined;

    await firebase.uploadBytes(storageReference, file, metadata);
    const downloadUrl = await firebase.getDownloadURL(storageReference);

    const attachmentPayload = {
      name: file.name,
      url: downloadUrl,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString()
    };

    await addAttachmentToProject(studentId, projectId, attachmentPayload);
    fileInput.value = '';
  } catch (error) {
    console.error('Nahrávání přílohy selhalo.', error);
    if (errorEl) {
      errorEl.textContent = 'Nahrávání se nepovedlo. Zkus to prosím znovu.';
    }
  } finally {
    form.dataset.uploading = 'false';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText || 'Nahrát';
    }
    fileInput.disabled = false;
  }
}

async function addAttachmentToProject(studentId, projectId, attachment) {
  const student = plannerData.students.find((item) => item.id === studentId);
  if (!student) {
    throw new Error('Student nenalezen pro uložení přílohy.');
  }
  const project = student.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Projekt nenalezen pro uložení přílohy.');
  }

  const normalizedAttachment = normalizeAttachment(attachment, projectId);
  project.attachments = [...(project.attachments || []), normalizedAttachment];

  try {
    await persistStudentProjects(studentId, student.projects);
  } catch (error) {
    project.attachments = project.attachments.filter((item) => item.id !== normalizedAttachment.id);
    throw error;
  }

  renderAll();
}

function buildStoragePath(studentId, projectId, fileName) {
  const safeStudent = sanitizePathSegment(studentId);
  const safeProject = sanitizePathSegment(projectId);
  const safeFile = sanitizeFileName(fileName);
  const timestamp = Date.now();
  return `attachments/${safeStudent}/${safeProject}/${timestamp}-${safeFile}`;
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
    });
}

function clonePlannerData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeStudent(raw, fallbackId) {
  const source = raw || {};
  const studentId = ensureId(source.id || fallbackId, 'student', source.name);
  return {
    id: studentId,
    name: ensureString(source.name, 'Bez jména'),
    grade: ensureString(source.grade),
    focus: ensureString(source.focus),
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
  return {
    id: ensureId(source.id, `attachment-${projectId}`, source.name),
    name: ensureString(source.name, 'Priloha'),
    url: ensureString(source.url),
    contentType: ensureString(source.contentType),
    size: Number.isFinite(sizeValue) ? sizeValue : null,
    uploadedAt: normalizeTimestamp(source.uploadedAt)
  };
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

function serializeAttachment(attachment) {
  return {
    id: attachment.id,
    name: attachment.name || 'Priloha',
    url: attachment.url || '',
    contentType: attachment.contentType || '',
    size: typeof attachment.size === 'number' && Number.isFinite(attachment.size) ? attachment.size : null,
    uploadedAt: attachment.uploadedAt || ''
  };
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

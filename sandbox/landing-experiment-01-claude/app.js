import { firebase } from './firebase-placeholder.js';

const {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot
} = firebase || {};

const hasFirestore = Boolean(
  db &&
  typeof collection === 'function' &&
  typeof addDoc === 'function' &&
  typeof serverTimestamp === 'function'
);

if (!hasFirestore) {
  console.warn('[Landing Lab Claude] Firebase API není dostupné. UI poběží v read-only módu, zapisování do sandboxu bude vypnuté.');
}

const LAB_NAMESPACE = 'landing-lab-claude';

const DOCS_COLLECTION = hasFirestore
  ? collection(db, 'sandboxProjects', LAB_NAMESPACE, 'docs')
  : null;
const EVENTS_COLLECTION = hasFirestore
  ? collection(db, 'sandboxProjects', LAB_NAMESPACE, 'events')
  : null;
const ASSETS_COLLECTION = hasFirestore
  ? collection(db, 'sandboxProjects', LAB_NAMESPACE, 'assets')
  : null;
const MODULES_COLLECTION = hasFirestore
  ? collection(db, 'sandboxProjects', LAB_NAMESPACE, 'modules')
  : null;

const dom = {
  status: document.getElementById('lab-status'),
  signin: document.getElementById('lab-signin'),
  signout: document.getElementById('lab-signout'),
  userLabel: document.getElementById('lab-user-label'),
  form: document.getElementById('lab-doc-form'),
  title: document.getElementById('lab-doc-title'),
  note: document.getElementById('lab-doc-note'),
  list: document.getElementById('lab-doc-list'),
  reset: document.getElementById('lab-reset'),
  cta: document.getElementById('lab-cta-example'),
  placeholder: document.getElementById('lab-placeholder'),
  brandDashboard: document.getElementById('brand-dashboard'),
  brandList: document.getElementById('brand-list'),
  brandDetail: document.getElementById('brand-detail')
};

let currentUser = null;
let unsubscribeDocs = null;
let unsubscribeSavedModules = null;
let savedModules = [];

const canUseAuth = Boolean(auth && typeof onAuthStateChanged === 'function');
const canUseRealtime = Boolean(hasFirestore && typeof onSnapshot === 'function' && typeof query === 'function' && typeof orderBy === 'function');

const BOSCH_GALLERY_CSS = `
.bosch-gallery {
  background: #eef1f6;
  border-radius: 28px;
  padding: 40px 48px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.bosch-gallery__item {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 32px 48px rgba(15, 23, 42, 0.18);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bosch-gallery__item:hover {
  transform: translateY(-4px);
  box-shadow: 0 40px 64px rgba(15, 23, 42, 0.25);
}

.bosch-gallery__item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
}

@media (max-width: 1024px) {
  .bosch-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 32px;
    gap: 24px;
  }
}

@media (max-width: 640px) {
  .bosch-gallery {
    grid-template-columns: 1fr;
    padding: 24px 20px;
    gap: 20px;
  }
}
`;

const BOSCH_INNOVATIONS_CSS = `
.bosch-innovations {
  background: #f1f4f7;
  border-radius: 28px;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.bosch-innovations__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bosch-innovations__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  color: #0f172a;
}

.bosch-innovations__dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bosch-innovations__dots span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #c7d2fe;
  opacity: 0.45;
}

.bosch-innovations__dots span.is-active {
  background: #2563eb;
  opacity: 1;
}

.bosch-innovations__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.bosch-innovations__card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 34px 64px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bosch-innovations__card:hover {
  transform: translateY(-6px);
  box-shadow: 0 42px 72px rgba(15, 23, 42, 0.2);
}

.bosch-innovations__card figure {
  margin: 0;
}

.bosch-innovations__card img {
  width: 100%;
  height: auto;
  display: block;
}

.bosch-innovations__body {
  padding: 24px 26px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bosch-innovations__body h3 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  color: #0f172a;
}

.bosch-innovations__body p {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.bosch-innovations__cta {
  margin-top: auto;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.bosch-innovations__cta span {
  font-size: 16px;
}

.bosch-innovations__nav {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.bosch-innovations__nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: none;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.15);
  color: #0f172a;
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bosch-innovations__nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.18);
}

@media (max-width: 1024px) {
  .bosch-innovations {
    padding: 40px 40px;
  }

  .bosch-innovations__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .bosch-innovations {
    padding: 32px 24px;
    gap: 24px;
  }

  .bosch-innovations__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .bosch-innovations__grid {
    grid-template-columns: 1fr;
  }
}
`;

const BOSCH_INNOVATIONS_HTML = `
<section class="bosch-innovations" data-module="bosch-innovations-carousel">
  <header class="bosch-innovations__header">
    <h2>Nejdůležitější inovace a nabídky</h2>
    <div class="bosch-innovations__dots" aria-hidden="true">
      <span class="is-active"></span>
      <span></span>
      <span></span>
    </div>
  </header>
  <div class="bosch-innovations__grid">
    <article class="bosch-innovations__card">
      <figure>
        <img src="https://media3.bosch-home.com/Images/1200x/25749937_2022_bsh_eox6021_3_4.jpg" alt="Trouby Serie 6 a 8" loading="lazy" />
      </figure>
      <div class="bosch-innovations__body">
        <h3>Nové trouby Serie 6 a 8</h3>
        <p>Konečně pečicí trouba, která přesně odpovídá vašim požadavkům. Prozkoumejte nové modely trub Bosch Serie&nbsp;6 a&nbsp;8.</p>
        <a class="bosch-innovations__cta" href="https://www.bosch-home.com/cz/novinky/trouby-prehled" target="_blank" rel="noopener">
          <span>Zobrazit více</span>
          <span aria-hidden="true">›</span>
        </a>
      </div>
    </article>
    <article class="bosch-innovations__card">
      <figure>
        <img src="https://media3.bosch-home.com/Images/1200x/24716090_Bosch_WasherDryer_3_4_home.jpg" alt="Minimalistická prádelna s pračkou se суšičkou" loading="lazy" />
      </figure>
      <div class="bosch-innovations__body">
        <h3>Nové pračky se sušičkou s i-DOS</h3>
        <p>Perte a sušte najednou s našimi pračkami se sušičkou se systémem i-DOS. Přeskočte dávkování, začněte šetřit.</p>
        <a class="bosch-innovations__cta" href="https://www.bosch-home.com/cz/novinky/pracky-se-susickou" target="_blank" rel="noopener">
          <span>Zobrazit více</span>
          <span aria-hidden="true">›</span>
        </a>
      </div>
    </article>
    <article class="bosch-innovations__card">
      <figure>
        <img src="https://media3.bosch-home.com/Images/1200x/22999295_Bosch_Cooling_BIXXL23_LandingPage_Teaser_900x1200px.jpg" alt="Vestavná lednice Bosch XXL" loading="lazy" />
      </figure>
      <div class="bosch-innovations__body">
        <h3>Nové extra prostorné chladničky</h3>
        <p>Extra prostor, extra komfort. Objevte vestavné chladničky Bosch XXL s promyšleným uspořádáním.</p>
        <a class="bosch-innovations__cta" href="https://www.bosch-home.com/cz/novinky/vestavne-xxl" target="_blank" rel="noopener">
          <span>Zobrazit více</span>
          <span aria-hidden="true">›</span>
        </a>
      </div>
    </article>
  </div>
  <div class="bosch-innovations__nav" aria-hidden="true">
    <button type="button" class="bosch-innovations__nav-btn" aria-label="Předchozí slide">
      ‹
    </button>
    <button type="button" class="bosch-innovations__nav-btn" aria-label="Další slide">
      ›
    </button>
  </div>
</section>
`;

const brandCatalog = [
  {
    id: 'bosch',
    name: 'Bosch',
    tagline: 'Technologie pro život a důraz na spolehlivost.',
    status: 'active',
    statusLabel: 'Landing toolkit připraven',
    narrative: 'Bosch kombinuje německou preciznost s empatickým přístupem k domácnostem. Landing page by měla vyvažovat technickou jistotu s pohodlím uživatele.',
    pillars: ['Německá kvalita', 'Inovace pro domácnost', 'Servisní záruky'],
    focusAreas: [
      'Domácí spotřebiče (vestavné kuchyně, praní, péče o domácnost)',
      'Chytrá domácnost a IoT pro propojené ovládání',
      'Nadstandardní záruky, servis a dostupnost náhradních dílů'
    ],
    modules: [
      {
        id: 'bosch-hero-product',
        type: 'Hero',
        name: 'Hero: Produkt v akci',
        description: 'Full-width hero se split layoutem a reálným produktem v životní situaci, doplněný CTA na katalog nebo konzultaci.',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Headline s jasným příslibem (např. "Vaříme přesně. Každý den.")',
          'Podheadline s konkrétním benefitem a důkazem kvality',
          'Primární CTA na domluvení konzultace nebo stažení katalogu',
          'Sekundární CTA na servis nebo konfigurátor'
        ]
      },
      {
        id: 'bosch-benefits-reliability',
        type: 'Benefits',
        name: 'Benefit list: Důvěryhodnost & inovace',
        description: 'Tři až čtyři benefity s ikonou (záruky, úspora energie, chytré ovládání, servisní síť).',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Každý benefit má mikroheadline + krátkou větu s výsledkem pro zákazníka',
          'Vložit numerický důkaz (např. 5 let záruky, 24/7 podpora)',
          'Ikona nebo minifoto produktu pro vizuální orientaci'
        ]
      },
      {
        id: 'bosch-proof',
        type: 'Trust',
        name: 'Social proof & certifikace',
        description: 'Pruh s logy prodejních partnerů, oceněními a recenzemi, které posilují důvěryhodnost značky Bosch.',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Loga klíčových partnerů (Alza, Datart, Mall)',
          'Hodnocení z Heureky nebo Trustpilotu',
          'Krátké citace spokojených zákazníků'
        ]
      },
      {
        id: 'bosch-feature-showcase',
        type: 'Feature',
        name: 'Feature highlight: Technologie v detailu',
        description: 'Sekce se střídajícími bloky text + foto/screenshot pro vysvětlení konkrétních funkcí (Home Connect, PerfectBake, PerfectDry...).',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Vždy začít problémem zákazníka a jak funkce pomáhá',
          'Zvýraznit reálný výsledek (časová úspora, kvalita pečení)',
          'CTA na konfigurátor nebo video tutoriál'
        ]
      },
      {
        id: 'bosch-offer',
        type: 'CTA banner',
        name: 'Promo & lead capture',
        description: 'Výrazný banner s aktuální kampaní (např. cashback, prodloužená záruka) a formulářem pro získání leadu.',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Headline zaměřený na benefit akce',
          'Krátký formulář (jméno, e-mail, preferovaný produkt)',
          'Zvýraznit deadline promo akce a podmínky'
        ]
      },
      {
        id: 'bosch-gallery-lifestyle',
        type: 'Gallery',
        name: 'Lifestyle galerie 3×1',
        description: 'Tři velkoformátové lifestyle fotky v bílém rámečku. Hodí se pro storytelling sekce nebo přehled služeb.',
        layoutHint: 'Desktop 3 sloupce, tablet 2, mobil 1; vnitřní padding rámuje fotku.',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Využij jednotnou výšku fotek (poměr 16 : 9) kvůli konzistenci.',
          'Ponech rámečky s dostatkem prostoru pro dýchání (min. 32 px).',
          'Na mobilech obrázky srovnej do jednoho sloupce.'
        ],
        gallery: {
          layout: 'three-up',
          images: [
            {
              id: 'bosch-gallery-kitchen-planning',
              src: 'https://media3.bosch-home.com/Images/1200x/25719588_Bosch_Home_Kitchen_Planning_Teaser_1200x676.jpg',
              webp: 'https://media3.bosch-home.com/Images/1200x/25719588_Bosch_Home_Kitchen_Planning_Teaser_1200x676.webp',
              alt: 'Vzdušná kuchyně s vestavnými spotřebiči Bosch a výhledem do zahrady.',
              width: 1200,
              height: 676
            },
            {
              id: 'bosch-gallery-product-finder',
              src: 'https://media3.bosch-home.com/Images/1200x/25719589_Bosch_Home_Product_Finders_Teaser_1200x676.jpg',
              webp: 'https://media3.bosch-home.com/Images/1200x/25719589_Bosch_Home_Product_Finders_Teaser_1200x676.webp',
              alt: 'Otevřená lednice s přehledně uspořádanými potravinami v moderní kuchyni.',
              width: 1200,
              height: 676
            },
            {
              id: 'bosch-gallery-service-visit',
              src: 'https://media3.bosch-home.com/Images/1200x/25719587_Bosch_Home_Service_Teaser_1200x676.jpg',
              webp: 'https://media3.bosch-home.com/Images/1200x/25719587_Bosch_Home_Service_Teaser_1200x676.webp',
              alt: 'Technik Bosch konzultuje spotřebič se zákazníky v jejich kuchyni.',
              width: 1200,
              height: 676
            }
          ]
        }
      },
      {
        id: 'bosch-innovations-carousel',
        type: 'Carousel',
        name: 'Carousel: Nejdůležitější inovace',
        description: 'Tři produktové karty s CTA a doprovodnými odkazy – hlavní promo blok z homepage Bosch.',
        layoutHint: 'Desktop 3 karty, tablet 2, mobil 1. Široké stíny a světlé pozadí #f1f4f7.',
        source: 'https://www.bosch-home.com/cz/',
        checklist: [
          'Dodržet bílé karty se stíny a šedé pozadí sekce.',
          'CTA používat jako odkazy a vést na produktové stránky.',
          'Ponechat navigační tečky a šipky kvůli familiárnímu vzezření.'
        ],
        gallery: {
          layout: 'three-up',
          images: [
            {
              id: 'bosch-innovations-ovens',
              src: 'https://media3.bosch-home.com/Images/1200x/25749937_2022_bsh_eox6021_3_4.jpg',
              alt: 'Nové trouby Serie 6 a 8'
            },
            {
              id: 'bosch-innovations-washer',
              src: 'https://media3.bosch-home.com/Images/1200x/24716090_Bosch_WasherDryer_3_4_home.jpg',
              alt: 'Nové pračky se sušičkou s i-DOS'
            },
            {
              id: 'bosch-innovations-fridge',
              src: 'https://media3.bosch-home.com/Images/1200x/22999295_Bosch_Cooling_BIXXL23_LandingPage_Teaser_900x1200px.jpg',
              alt: 'Nové extra prostorné chladničky'
            }
          ]
        },
        html: BOSCH_INNOVATIONS_HTML,
        css: BOSCH_INNOVATIONS_CSS
      }
    ],
    pages: [
      {
        id: 'bosch-home',
        name: 'Bosch Home – hlavní landing',
        goal: 'Generovat leady pro prémiové kuchyňské studio a spotřebiče.',
        status: 'draft'
      },
      {
        id: 'bosch-smart-home',
        name: 'Bosch Smart Home',
        goal: 'Edukovat o IoT řešeních a vést na demo instalaci.',
        status: 'concept'
      },
      {
        id: 'bosch-service',
        name: 'Bosch Servis & záruky',
        goal: 'Zajistit registraci prodloužené záruky a příjem servisních požadavků.',
        status: 'live'
      }
    ],
    quickWins: [
      'Zahrň reálné recenze zákazníků a ocenění z nezávislých testů.',
      'Zobraz informaci o dostupnosti servisu do 48 hodin – posiluje důvěru.',
      'V CTA pracuj s benefitním jazykem ("Domluvte si chytrou domácnost na míru").'
    ],
    resources: [
      {
        id: 'bosch-cz-home',
        label: 'Kvalitní a udržitelné domácí spotřebiče | Bosch Česká republika',
        url: 'https://www.bosch-home.com/cz/',
        locale: 'cs-CZ'
      },
      {
        id: 'bosch-cz-akce',
        label: 'Akce Bosch | Bosch Finish',
        url: 'https://akce-bosch.cz/kvalitapogenerace/',
        locale: 'cs-CZ'
      },
      {
        id: 'bosch-sk-home',
        label: 'Kvalitné, udržateľné domáce spotrebiče | Bosch',
        url: 'https://www.bosch-home.com/sk/',
        locale: 'sk-SK'
      },
      {
        id: 'bosch-sk-akcie',
        label: 'Akcie Bosch | Bosch Finish',
        url: 'https://akcie-bosch.sk/kvalitapogeneracie/',
        locale: 'sk-SK'
      }
    ],
    assets: [
      {
        id: 'bosch-logo-primary',
        type: 'logo',
        label: 'Bosch logo – primární',
        format: 'png',
        sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/2560px-Bosch-logo.svg.png',
        previewUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/512px-Bosch-logo.svg.png',
        recommendedUsage: 'Hero sekce, navigace, patičky a promo bannery pro Bosch landing page.',
        dimensions: { width: 2560, height: 1046 }
      }
    ]
  },
  {
    id: 'siemens',
    name: 'Siemens',
    tagline: 'Engineering the future of home.',
    status: 'in-progress',
    statusLabel: 'V přípravě',
    narrative: 'Modularita zaměřená na high-tech a prémiový minimalismus. Materiály připravujeme.'
  },
  {
    id: 'neff',
    name: 'NEFF',
    tagline: 'Pro šéfkuchaře domácí kuchyně.',
    status: 'planned',
    statusLabel: 'Backlog',
    narrative: 'Moduly s důrazem na zážitkovou gastronomii budou následovat.'
  }
];

let selectedBrandId = brandCatalog[0]?.id || null;


function setStatus(message, tone = 'info', timeout = 4000) {
  if (!dom.status) return;
  if (!message) {
    dom.status.style.display = 'none';
    dom.status.textContent = '';
    dom.status.removeAttribute('data-tone');
    return;
  }
  dom.status.textContent = message;
  dom.status.dataset.tone = tone;
  dom.status.style.display = 'block';
  if (timeout > 0) {
    window.clearTimeout(setStatus._timer);
    setStatus._timer = window.setTimeout(() => setStatus(''), timeout);
  }
}

function requireUser() {
  if (!currentUser) {
    setStatus('Přihlas se, prosím.', 'error');
    return false;
  }
  return true;
}

async function signIn() {
  if (!canUseAuth || typeof GoogleAuthProvider !== 'function' || typeof signInWithPopup !== 'function') {
    setStatus('Přihlášení není v tomto prostředí dostupné.', 'error');
    return;
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('[Landing Lab] signIn failed', error);
    setStatus('Přihlášení se nezdařilo.', 'error');
  }
}

async function signOutUser() {
  if (!canUseAuth || typeof signOut !== 'function') {
    setStatus('Odhlášení není v tomto prostředí dostupné.', 'error');
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[Landing Lab] signOut failed', error);
    setStatus('Odhlášení se nezdařilo.', 'error');
  }
}

function subscribeDocs() {
  if (!hasFirestore || !canUseRealtime) {
    dom.list.innerHTML = '<p class="lab-doc-empty">Firestore není dostupný.</p>';
    dom.reset.hidden = true;
    return;
  }
  if (unsubscribeDocs) unsubscribeDocs();
  if (!currentUser) {
    dom.list.innerHTML = '';
    dom.reset.hidden = true;
    return;
  }

  const docsQuery = query(DOCS_COLLECTION, orderBy('createdAt', 'desc'));
  unsubscribeDocs = onSnapshot(docsQuery, (snapshot) => {
    const fragment = document.createDocumentFragment();
    dom.list.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement('div');
      item.className = 'lab-doc-item';
      const title = data?.title || 'Bez názvu';
      const note = data?.note || '';
      const createdAt = data?.createdAt?.toDate?.();
      item.innerHTML = `
        <strong>${escapeHtml(title)}</strong>
        <span>${createdAt ? createdAt.toLocaleString('cs-CZ') : 'bez data'}</span>
        ${note ? `<p>${escapeHtml(note)}</p>` : ''}
      `;
      fragment.appendChild(item);
    });
    dom.list.appendChild(fragment);
    dom.reset.hidden = snapshot.empty;
  }, (error) => {
    console.error('[Landing Lab] subscribeDocs failed', error);
    setStatus('Načtení dokumentů selhalo.', 'error');
  });
}

function subscribeSavedModules() {
  if (!hasFirestore || !MODULES_COLLECTION || !canUseRealtime) {
    if (unsubscribeSavedModules) unsubscribeSavedModules();
    unsubscribeSavedModules = null;
    savedModules = [];
    renderBrandDetail();
    return;
  }

  if (unsubscribeSavedModules) unsubscribeSavedModules();

  const modulesQuery = query(MODULES_COLLECTION, orderBy('createdAt', 'desc'));
  unsubscribeSavedModules = window.firebase.onSnapshot(modulesQuery, (snapshot) => {
    savedModules = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderBrandDetail();
  }, (error) => {
    console.error('[Landing Lab] subscribeSavedModules failed', error);
    setStatus('Načtení uložených modulů selhalo.', 'error');
  });
}

async function loadSavedModulesOnce() {
  if (!hasFirestore || !MODULES_COLLECTION || typeof getDocs !== 'function') return;
  try {
    const snapshot = await getDocs(query(MODULES_COLLECTION, orderBy('createdAt', 'desc')));
    savedModules = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderBrandDetail();
  } catch (error) {
    console.error('[Landing Lab] loadSavedModulesOnce failed', error);
    setStatus(`Načtení uložených modulů selhalo: ${error.message || error}`, 'error');
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (!hasFirestore) {
    setStatus('Firestore není dostupný, zápis je vypnutý.', 'error');
    return;
  }
  if (!requireUser()) return;

  const title = dom.title.value.trim();
  const note = dom.note.value.trim();
  if (!title) {
    setStatus('Vyplň titulek.', 'error');
    return;
  }

  try {
    await addDoc(DOCS_COLLECTION, {
      title,
      note,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    dom.title.value = '';
    dom.note.value = '';
    setStatus('Dokument uložen.', 'success');
    await logEvent('doc_created', { title });
  } catch (error) {
    console.error('[Landing Lab] addDoc failed', error);
    setStatus('Uložení dokumentu se nezdařilo.', 'error');
  }
}

async function logEvent(action, payload = {}) {
  if (!hasFirestore || !EVENTS_COLLECTION || typeof addDoc !== 'function') return;
  try {
    await addDoc(EVENTS_COLLECTION, {
      action,
      payload,
      uid: currentUser?.uid || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('[Landing Lab] Nepodařilo se zapsat event.', error);
  }
}

async function handleReset() {
  if (!hasFirestore) {
    setStatus('Firestore není dostupný, nelze mazat sandbox.', 'error');
    return;
  }
  if (!requireUser()) return;
  if (!confirm('Opravdu smazat všechny testovací záznamy v tomto sandboxu?')) return;
  try {
    const snapshot = await getDocs(DOCS_COLLECTION);
    if (snapshot.empty) {
      setStatus('Sandbox je už prázdný.', 'info');
      return;
    }
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(doc(db, 'sandboxProjects', LAB_NAMESPACE, 'docs', docSnap.id));
    });
    await batch.commit();
    setStatus('Sandbox byl vyčištěn.', 'success');
    await logEvent('sandbox_reset');
  } catch (error) {
    console.error('[Landing Lab] reset failed', error);
    setStatus('Vyčištění se nezdařilo.', 'error');
  }
}

async function handleCtaClick() {
  if (!requireUser()) return;
  if (!hasFirestore) {
    setStatus('Event byl zaznamenán lokálně. (Firestore offline)', 'info');
    return;
  }
  setStatus('Event odeslán do Firestore.', 'success');
  await logEvent('cta_clicked', { label: 'Demo CTA' });
}

function initializeBrandDashboard() {
  if (!dom.brandDashboard) return;
  if (!selectedBrandId) {
    selectedBrandId = brandCatalog[0]?.id || null;
  }
  renderBrandList();
  renderBrandDetail();

  dom.brandList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-brand-id]');
    if (!button) return;
    const { brandId } = button.dataset;
    if (!brandId || brandId === selectedBrandId) return;
    selectedBrandId = brandId;
    renderBrandList();
    renderBrandDetail();
  });
}

function renderBrandList() {
  if (!dom.brandList) return;
  const items = brandCatalog.map((brand) => {
    const isActive = brand.id === selectedBrandId;
    const plannedClass = brand.status !== 'active' ? ' brand-card--planned' : '';
    const activeClass = isActive ? ' brand-card--active' : '';
    const meta = brand.status === 'active'
      ? (brand.statusLabel || brand.tagline || '')
      : (brand.statusLabel || 'V přípravě');
    return `
      <button type="button" class="brand-card${activeClass}${plannedClass}" data-brand-id="${escapeHtml(brand.id)}">
        <span class="brand-card__title">${escapeHtml(brand.name)}</span>
        <p class="brand-card__meta">${escapeHtml(meta)}</p>
      </button>
    `;
  }).join('');
  dom.brandList.innerHTML = items;
}

function renderBrandDetail() {
  if (!dom.brandDetail) return;
  const brand = getBrandById(selectedBrandId) || brandCatalog[0];
  if (!brand) {
    dom.brandDetail.innerHTML = '<p>Aktuálně nejsou žádné značky k dispozici.</p>';
    return;
  }

  if (brand.status !== 'active') {
    dom.brandDetail.innerHTML = `
      <div class="brand-detail__header">
        <h4>${escapeHtml(brand.name)}</h4>
        <p>${escapeHtml(brand.narrative || 'Materiály pro tuto značku právě připravujeme.')}</p>
      </div>
      <div class="brand-detail__section">
        <p>Jakmile budeme mít data, přidáme modulární knihovnu a doporučené landing page setupy.</p>
      </div>
    `;
    return;
  }

  const metaBadges = [
    brand.statusLabel ? createMetaBadge(brand.statusLabel) : '',
    createMetaBadge(`${brand.modules?.length || 0} modulů`),
    createMetaBadge(`${brand.pages?.length || 0} stránek`)
  ].filter(Boolean).join('');

  const pillarChips = (brand.pillars || []).map((pillar) => `<span>${escapeHtml(pillar)}</span>`).join('');
  const focusList = (brand.focusAreas || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const moduleCards = renderModuleCards(brand.modules, brand);
  const assetCards = renderAssetCards(brand);
  const savedModuleSection = renderSavedModulesSection(brand);
  const pageCards = renderPageCards(brand.pages);
  const quickWins = (brand.quickWins || []).map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
  const resourceList = renderResourceList(brand.resources);

  dom.brandDetail.innerHTML = `
    <div class="brand-detail__header">
      <h4>${escapeHtml(brand.name)}</h4>
      <p>${escapeHtml(brand.narrative || brand.tagline || '')}</p>
      <div class="brand-detail__meta">${metaBadges}</div>
    </div>
    ${pillarChips ? `<div class="brand-detail__section"><h5>Brand pilíře</h5><div class="brand-detail__pillars">${pillarChips}</div></div>` : ''}
    ${focusList ? `<div class="brand-detail__section"><h5>Klíčové oblasti</h5><ul>${focusList}</ul></div>` : ''}
    <div class="brand-detail__section">
      <h5>Doporučené moduly</h5>
      <div class="module-grid">${moduleCards}</div>
    </div>
    ${assetCards ? `<div class="brand-detail__section"><h5>Brand assets</h5>${assetCards}</div>` : ''}
    ${savedModuleSection}
    <div class="brand-detail__section">
      <h5>Připravované landing page</h5>
      <div class="brand-detail__pages">${pageCards}</div>
    </div>
    ${quickWins ? `<div class="brand-detail__section"><h5>Quick wins</h5><ul>${quickWins}</ul></div>` : ''}
    ${resourceList ? `<div class="brand-detail__section"><h5>Zdroje &amp; odkazy</h5>${resourceList}</div>` : ''}
  `;
}

function renderModuleCards(modules = [], brand = null) {
  if (!modules.length) {
    return '<p>Ještě nemáme zapsané žádné moduly.</p>';
  }
  const brandId = brand?.id || '';
  return modules.map((module) => {
    const checklist = (module.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const layoutHint = module.layoutHint ? `<p class="module-card__hint">${escapeHtml(module.layoutHint)}</p>` : '';
    const previewMarkup = getModulePreviewHtml(module);
    const preview = previewMarkup
      ? `<div class="module-card__preview module-preview"><div class="module-preview__stage">${previewMarkup}</div></div>`
      : (module.gallery ? renderGalleryPreview(module.gallery) : '');
    const sourceInfo = module.source ? `<p class="module-card__source"><a href="${escapeAttribute(module.source)}" target="_blank" rel="noopener">Zdroj: ${escapeHtml(module.source)}</a></p>` : '';
    return `
      <article class="module-card">
        ${module.type ? `<span>${escapeHtml(module.type)}</span>` : ''}
        <strong>${escapeHtml(module.name)}</strong>
        <p>${escapeHtml(module.description || '')}</p>
        ${layoutHint}
        ${preview}
        ${sourceInfo}
        ${checklist ? `<ul>${checklist}</ul>` : ''}
        <div class="module-card__actions">
          <button type="button" class="module-card__action" data-action="save-module" data-brand-id="${escapeHtml(brandId)}" data-module-id="${escapeHtml(module.id)}">Uložit modul do sandboxu</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderGalleryPreview(gallery = {}) {
  const images = (gallery.images || []).map((image) => {
    const imageSrc = image.src || image.webp || '';
    return `
    <figure>
      <div class="module-gallery__imgwrap">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(image.alt || '')}" loading="lazy" />
      </div>
    </figure>
  `;
  }).join('');
  return `<div class="module-card__preview module-gallery" data-layout="${escapeHtml(gallery.layout || 'default')}">${images}</div>`;
}

function getModulePreviewHtml(module = {}) {
  if (module.previewHtml) return module.previewHtml;

  switch (module.id) {
    case 'bosch-hero-product':
      return `
        <section class="preview-hero">
          <div class="preview-hero__content">
            <span class="preview-eyebrow">Prémiová řada</span>
            <h4>Silný hero headline</h4>
            <p>Krátký podheadline vysvětluje benefit a přidává důvěru.</p>
            <div class="preview-hero__actions">
              <span class="btn-primary">Domluvit konzultaci</span>
              <span class="btn-secondary">Zjistit více</span>
            </div>
          </div>
          <div class="preview-hero__image"></div>
        </section>
      `;
    case 'bosch-benefits-reliability':
      return `
        <section class="preview-benefits">
          <article>
            <span class="benefit-icon"></span>
            <h5>Servis do 48h</h5>
            <p>Rychlá podpora, certifikovaní technici.</p>
          </article>
          <article>
            <span class="benefit-icon"></span>
            <h5>Energetická úspora</h5>
            <p>Až 30% nižší spotřeba díky Eco režimu.</p>
          </article>
          <article>
            <span class="benefit-icon"></span>
            <h5>Home Connect</h5>
            <p>Ovládání na dálku a chytré scénáře.</p>
          </article>
        </section>
      `;
    case 'bosch-proof':
      return `
        <section class="preview-trust">
          <div class="preview-trust__row">
            <span class="trust-badge">Heureka 4.9★</span>
            <span class="trust-badge">Datart</span>
            <span class="trust-badge">Mall</span>
            <span class="trust-badge">Alza</span>
          </div>
          <div class="preview-trust__quote">
            <p>„Bosch je naše první volba pro vestavné spotřebiče už 5 let.“</p>
          </div>
        </section>
      `;
    case 'bosch-feature-showcase':
      return `
        <section class="preview-feature">
          <div class="preview-feature__row">
            <div class="preview-feature__text">
              <h5>PerfectBake senzory</h5>
              <p>Automaticky hlídají vlhkost v troubě a přizpůsobí pečení.</p>
            </div>
            <div class="preview-feature__image"></div>
          </div>
          <div class="preview-feature__row is-reversed">
            <div class="preview-feature__text">
              <h5>PerfectDry s Zeolith</h5>
              <p>Dokonalé sušení nádobí bez zaschlých kapek.</p>
            </div>
            <div class="preview-feature__image"></div>
          </div>
        </section>
      `;
    case 'bosch-offer':
      return `
        <section class="preview-cta">
          <div class="preview-cta__content">
            <h4>Cashback až 5&nbsp;000&nbsp;Kč</h4>
            <p>Registruj nákup vybraných spotřebičů Bosch a získej bonus zpět.</p>
          </div>
          <div class="preview-cta__action">
            <span class="btn-primary">Získat cashback</span>
          </div>
        </section>
      `;
    case 'bosch-gallery-lifestyle':
      return `
        <section class="preview-gallery">
          <div class="preview-gallery__item"></div>
          <div class="preview-gallery__item"></div>
          <div class="preview-gallery__item"></div>
        </section>
      `;
    case 'bosch-innovations-carousel':
      return `
        <section class="preview-innovations">
          <header>
            <h4>Nejdůležitější inovace a nabídky</h4>
            <div class="preview-dots"><span class="is-active"></span><span></span><span></span></div>
          </header>
          <div class="preview-innovations__cards">
            <article>
              <div class="card-image"></div>
              <h5>Nové trouby Serie 6 a 8</h5>
              <p>Precizní výsledky pečení s inteligentní asistencí.</p>
              <span class="link">Zobrazit více</span>
            </article>
            <article>
              <div class="card-image"></div>
              <h5>Pračky se sušičkou i-DOS</h5>
              <p>Automatické dávkování a úspora vody při každém cyklu.</p>
              <span class="link">Zobrazit více</span>
            </article>
            <article>
              <div class="card-image"></div>
              <h5>Vestavné chladničky XXL</h5>
              <p>Víc prostoru pro čerstvé suroviny a rodinné zásoby.</p>
              <span class="link">Zobrazit více</span>
            </article>
          </div>
        </section>
      `;
    default:
      return '';
  }
}

function renderAssetCards(brand) {
  const assets = brand?.assets || [];
  if (!assets.length) {
    return '';
  }
  const brandId = brand.id;
  const cards = assets.map((asset) => {
    const preview = asset.previewUrl || asset.sourceUrl;
    const formatBadge = asset.format ? `<span class="badge badge--format">${escapeHtml(String(asset.format).toUpperCase())}</span>` : '';
    const dimensions = asset.dimensions?.width && asset.dimensions?.height
      ? `${asset.dimensions.width} × ${asset.dimensions.height} px`
      : null;
    const usage = asset.recommendedUsage ? `<p>${escapeHtml(asset.recommendedUsage)}</p>` : '';
    const dimensionRow = dimensions ? `<div><span>Rozměry</span><strong>${escapeHtml(dimensions)}</strong></div>` : '';
    return `
      <article class="asset-card">
        ${preview ? `<div class="asset-card__preview"><img src="${escapeHtml(preview)}" alt="${escapeHtml(asset.label || 'Brand asset')}" loading="lazy" /></div>` : ''}
        <div class="asset-card__body">
          <div class="asset-card__heading">
            <strong>${escapeHtml(asset.label || 'Asset')}</strong>
            ${formatBadge}
          </div>
          ${usage}
          <div class="asset-card__specs">
            ${dimensionRow}
            ${asset.sourceUrl ? `<div><span>Zdroj</span><a href="${escapeHtml(asset.sourceUrl)}" target="_blank" rel="noopener">Otevřít</a></div>` : ''}
          </div>
          <div class="asset-card__actions">
            <button type="button" class="asset-card__action" data-action="save-asset" data-brand-id="${escapeHtml(brandId)}" data-asset-id="${escapeHtml(asset.id)}">Uložit do sandboxu</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
  return `<div class="asset-grid">${cards}</div>`;
}

function renderPageCards(pages = []) {
  if (!pages.length) {
    return '<p>Landing page koncepty budou doplněny.</p>';
  }
  return pages.map((page) => {
    const badge = page.status ? renderStatusBadge(page.status) : '';
    return `
      <div class="brand-detail__page">
        <div>
          <h6>${escapeHtml(page.name)}</h6>
          ${badge}
        </div>
        <p>${escapeHtml(page.goal || '')}</p>
      </div>
    `;
  }).join('');
}

function renderResourceList(resources = []) {
  if (!resources.length) {
    return '';
  }
  const items = resources.map((resource) => {
    const badge = resource.locale ? `<span class="badge badge--locale">${escapeHtml(resource.locale)}</span>` : '';
    return `
      <li class="resource-item">
        <div>
          <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">${escapeHtml(resource.label)}</a>
          ${badge}
        </div>
      </li>
    `;
  }).join('');
  return `<ul class="resource-list">${items}</ul>`;
}

function renderStatusBadge(status) {
  if (!status) return '';
  const normalized = String(status).toLowerCase();
  const map = {
    live: { cls: 'badge--live', label: 'Live' },
    draft: { cls: 'badge--draft', label: 'Draft' },
    concept: { cls: 'badge--concept', label: 'Concept' }
  };
  const meta = map[normalized] || { cls: 'badge--draft', label: status };
  return `<span class="badge ${meta.cls}">${escapeHtml(meta.label)}</span>`;
}

function getBrandById(id) {
  if (!id) return null;
  return brandCatalog.find((item) => item.id === id) || null;
}

function createMetaBadge(label) {
  if (!label) return '';
  return `<span class="brand-detail__badge">${escapeHtml(label)}</span>`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSavedModulesSection(brand) {
  if (!brand?.id) return '';
  const modulesForBrand = savedModules.filter((mod) => (mod.brandId || brand.id) === brand.id);
  const hasAny = modulesForBrand.length > 0;
  const content = hasAny
    ? modulesForBrand.map((module) => renderSavedModuleCard(module)).join('')
    : `<p class="saved-modules__empty">Zatím nemáš žádný modul uložený pro značku ${escapeHtml(brand.name)}. Ulož některý z výše uvedených modulů do sandboxu.</p>`;

  return `
    <div class="brand-detail__section">
      <h5>Uložené moduly ze sandboxu</h5>
      <div class="saved-modules">${content}</div>
    </div>
  `;
}

function renderSavedModuleCard(module) {
  const savedAt = module.createdAt?.toDate?.() || null;
  const savedMeta = savedAt ? savedAt.toLocaleString('cs-CZ') : 'bez data';
  const checklist = Array.isArray(module.checklist) && module.checklist.length
    ? `<ul>${module.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  const layoutHint = module.layoutHint || module.gallery?.layoutHint || '';
  const htmlMarkup = module.html || generateGalleryHtml(module.gallery);
  const cssSnippet = module.css || BOSCH_GALLERY_CSS;
  const previewDoc = htmlMarkup ? buildModulePreviewDocument(module, htmlMarkup, cssSnippet) : '';
  const previewUrl = previewDoc ? `data:text/html;charset=utf-8,${encodeURIComponent(previewDoc)}` : '';
  const livePreview = htmlMarkup
    ? `<div class="saved-module__live" data-module-id="${escapeHtml(module.moduleId || module.id || '')}"><div class="sandbox-preview-stage">${htmlMarkup}</div></div>`
    : (module.gallery ? renderSavedGallery(module.gallery) : '');
  const previewButton = previewUrl
    ? `<div class="saved-module__actions"><a class="saved-module__preview" href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener">Otevřít náhled v novém okně</a></div>`
    : '';
  const sourceInfo = module.source ? `<p class="saved-module__source">Zdroj: <a href="${escapeAttribute(module.source)}" target="_blank" rel="noopener">${escapeHtml(module.source)}</a></p>` : '';

  return `
    <article class="saved-module">
      <header class="saved-module__header">
        <div>
          <h6>${escapeHtml(module.name || module.moduleId || 'Uložený modul')}</h6>
          <span class="saved-module__meta">${escapeHtml(savedMeta)}</span>
        </div>
        <span class="badge badge--saved">${escapeHtml(module.type || 'module')}</span>
      </header>
      ${sourceInfo}
      ${layoutHint ? `<p class="saved-module__hint">${escapeHtml(layoutHint)}</p>` : ''}
      ${livePreview}
      ${previewButton}
      ${checklist}
      ${htmlMarkup ? `<details class="saved-module__details"><summary>HTML &amp; CSS kód</summary><div class="saved-module__code"><label>HTML</label><textarea readonly>${htmlMarkup}</textarea><label>CSS</label><textarea readonly>${cssSnippet}</textarea></div></details>` : ''}
    </article>
  `;
}

function renderSavedGallery(gallery = {}) {
  const layout = gallery.layout || 'three-up';
  const images = (gallery.images || []).map((image) => {
    const src = image.src || image.webp || '';
    return `
      <figure>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt || '')}" loading="lazy" />
      </figure>
    `;
  }).join('');
  return `<div class="saved-gallery" data-layout="${escapeHtml(layout)}">${images}</div>`;
}

function generateGalleryHtml(gallery = {}) {
  if (!gallery || !Array.isArray(gallery.images) || !gallery.images.length) {
    return '';
  }
  const imagesMarkup = gallery.images.map((image) => {
    const src = escapeAttribute(image.src || image.webp || '');
    const alt = escapeAttribute(image.alt || '');
    return `
      <div class="bosch-gallery__item">
        <img src="${src}" alt="${alt}" loading="lazy" />
      </div>`;
  }).join('\n');

  return `
<section class="bosch-gallery" data-layout="${escapeAttribute(gallery.layout || 'three-up')}">
${imagesMarkup}
</section>`;
}

function buildModulePreviewDocument(module, htmlMarkup, cssSnippet) {
  return `<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeAttribute(module.name || 'Preview')}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 48px;
        background: #eef1f6;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        justify-content: center;
      }
      .preview-stage {
        width: min(100%, 1400px);
      }
      ${cssSnippet}
    </style>
  </head>
  <body>
    <div class="preview-stage">
${htmlMarkup}
    </div>
  </body>
</html>`;
}

function escapeAttribute(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function saveBrandAsset(brand, asset) {
  if (!hasFirestore || !ASSETS_COLLECTION || typeof addDoc !== 'function') {
    throw new Error('Firestore není dostupný');
  }
  if (!brand || !asset) {
    throw new Error('Missing brand or asset definition');
  }
  const payload = {
    brandId: brand.id,
    assetId: asset.id,
    type: asset.type || 'asset',
    label: asset.label || '',
    format: asset.format || '',
    sourceUrl: asset.sourceUrl || '',
    previewUrl: asset.previewUrl || asset.sourceUrl || '',
    recommendedUsage: asset.recommendedUsage || '',
    dimensions: asset.dimensions || null,
    createdBy: currentUser?.uid || null,
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(ASSETS_COLLECTION, payload);
  await logEvent('brand_asset_saved', {
    brandId: brand.id,
    assetId: asset.id,
    assetLabel: asset.label || '',
    docId: docRef?.id || null
  });
  return docRef;
}

async function saveBrandModule(brand, module) {
  if (!hasFirestore || !MODULES_COLLECTION || typeof addDoc !== 'function') {
    throw new Error('Firestore není dostupný');
  }
  if (!brand || !module) {
    throw new Error('Missing brand or module definition');
  }
  const payload = {
    brandId: brand.id,
    moduleId: module.id,
    type: module.type || 'module',
    name: module.name || '',
    description: module.description || '',
    layoutHint: module.layoutHint || '',
    checklist: module.checklist || [],
    gallery: module.gallery || null,
    html: module.html || generateGalleryHtml(module.gallery),
    css: module.css || BOSCH_GALLERY_CSS,
    source: module.source || '',
    createdBy: currentUser?.uid || null,
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(MODULES_COLLECTION, payload);
  await logEvent('brand_module_saved', {
    brandId: brand.id,
    moduleId: module.id,
    moduleName: module.name || '',
    docId: docRef?.id || null
  });
  if (!canUseRealtime) {
    await loadSavedModulesOnce();
  } else {
    if (docRef?.id) {
      const localRecord = {
        id: docRef.id,
        ...payload,
        createdAt: {
          toDate: () => new Date()
        }
      };
      savedModules = [localRecord, ...savedModules.filter((item) => item.id !== docRef.id)];
      renderBrandDetail();
    }
  }
  return docRef;
}

function updateUiForUser() {
  if (currentUser) {
    dom.userLabel.textContent = currentUser.displayName || currentUser.email || 'Bez jména';
    dom.signin.hidden = true;
    dom.signout.hidden = false;
    dom.form.querySelectorAll('input, textarea, button').forEach((el) => el.disabled = false);
  } else {
    dom.userLabel.textContent = 'Nepřihlášen';
    dom.signin.hidden = !canUseAuth;
    dom.signout.hidden = true;
    dom.form.querySelectorAll('input, textarea, button').forEach((el) => {
      if (el.type !== 'button') el.value = '';
      el.disabled = true;
    });
    dom.reset.hidden = true;
    dom.list.innerHTML = '';
    if (!hasFirestore) {
      dom.list.innerHTML = '<p class="lab-doc-empty">Firestore není načtený – sandboxové dokumenty se zde nezobrazí.</p>';
    }
  }
}

function init() {
  initializeBrandDashboard();
  dom.brandDetail?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    event.preventDefault();
    if (!requireUser()) return;

    const action = button.dataset.action;
    const { brandId } = button.dataset;
    const brand = getBrandById(brandId);
    if (!brand) {
      setStatus('Značku se nepodařilo najít.', 'error');
      return;
    }

    try {
      button.disabled = true;
      if (action === 'save-asset') {
        const { assetId } = button.dataset;
        const asset = brand.assets?.find((item) => item.id === assetId) || null;
        if (!asset) {
          setStatus('Asset se nepodařilo najít.', 'error');
          return;
        }
        setStatus('Ukládám asset do sandboxu…', 'info', 0);
        await saveBrandAsset(brand, asset);
        setStatus('Asset uložen do sandboxu.', 'success');
      } else if (action === 'save-module') {
        const { moduleId } = button.dataset;
        const module = brand.modules?.find((item) => item.id === moduleId) || null;
        if (!module) {
          setStatus('Modul se nepodařilo najít.', 'error');
          return;
        }
        setStatus('Ukládám modul do sandboxu…', 'info', 0);
        await saveBrandModule(brand, module);
        setStatus('Modul uložen do sandboxu.', 'success');
  }
    } catch (error) {
      console.error('[Landing Lab] brand action failed', error);
      setStatus(`Operace se nezdařila: ${error.message || error}`, 'error');
    } finally {
      button.disabled = false;
    }
  });
  dom.signin?.addEventListener('click', signIn);
  dom.signout?.addEventListener('click', signOutUser);
  dom.form?.addEventListener('submit', handleFormSubmit);
  dom.reset?.addEventListener('click', handleReset);
  dom.cta?.addEventListener('click', handleCtaClick);

  // Disable inputs until auth loads
  updateUiForUser();

  if (canUseAuth) {
    onAuthStateChanged(auth, (user) => {
      currentUser = user || null;
      updateUiForUser();
      subscribeDocs();
      if (currentUser) {
        subscribeSavedModules();
        loadSavedModulesOnce();
      } else {
        if (unsubscribeSavedModules) unsubscribeSavedModules();
        unsubscribeSavedModules = null;
        savedModules = [];
        renderBrandDetail();
      }
      if (currentUser) {
        logEvent('session_started');
      }
    });
  } else {
    subscribeDocs();
    subscribeSavedModules();
    loadSavedModulesOnce();
  }
}

init();

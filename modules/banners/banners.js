const BannerCreatorModule = (() => {
  const ROOT_ID = 'banners-view';
  const DEFAULT_APP_ID = 'banner-creator-app';
  const ARTIFACT_ROOT = 'artifacts';
  const CANVAS_WIDTH = 2600;
  const CANVAS_HEIGHT = 674;

  let rootEl;
  let mainCanvasContainer;
  let compareCanvasContainer;
  let canvas;
  let ctx;
  let logoImageInput;
  let productImageURLInput;
  let compareImageInput;
  let headline1Input;
  let headline2Input;
  let ctaTextInput;
  let sloganTextInput;
  let brandColorInput;
  let canvasWidthInput;
  let canvasHeightInput;
  let downloadBtn;
  let toggleCompareBtn;
  let compareContainer;
  let compareImage;
  let compareError;
  let saveTemplateBtn;
  let templateNameInput;
  let templateList;
  let stickerUploadInput;
  let stickerUploadProgress;
  let stickerUploadProgressBar;
  let stickerGallery;
  let referenceUploadInput;
  let referenceUploadProgress;
  let referenceUploadProgressBar;
  let referenceSamplesContainer;
  let referenceSamplesEmpty;
  let tabSettingsBtn;
  let tabManualBtn;
  let tabSettingsContent;
  let tabManualContent;

  let logoImage;
  let productImage;
  let activeStickers = [];
  let selectedSticker = null;
  let offsetX = 0;
  let offsetY = 0;
  let listenersAttached = false;
  let initialized = false;

  // Firebase state
  let firebaseApi = null;
  let db = null;
  let auth = null;
  let storage = null;
  let templatesCollection = null;
  let stickersCollection = null;
  let referenceCollection = null;
  let templatesUnsubscribe = null;
  let stickersUnsubscribe = null;
  let referenceUnsubscribe = null;
  let authUnsubscribe = null;
  let appId = DEFAULT_APP_ID;
  let firebaseReady = false;
  let currentUser = null;

  function ensureRoot() {
    if (!rootEl) {
      rootEl = document.getElementById(ROOT_ID);
    }
    return rootEl;
  }

  function cacheDom() {
    if (canvas) return true;
    const root = ensureRoot();
    if (!root) return false;

    mainCanvasContainer = root.querySelector('[data-role="banners-main-canvas"]');
    compareCanvasContainer = root.querySelector('[data-role="banners-compare-canvas"]');
    canvas = root.querySelector('#bannerCanvas');
    compareContainer = root.querySelector('#compareContainer');
    compareImage = root.querySelector('#compareImage');
    compareError = root.querySelector('#compareError');
    logoImageInput = root.querySelector('#logoImage');
    productImageURLInput = root.querySelector('#productImageURL');
    compareImageInput = root.querySelector('#compareImageInput');
    headline1Input = root.querySelector('#headline1');
    headline2Input = root.querySelector('#headline2');
    ctaTextInput = root.querySelector('#ctaText');
    sloganTextInput = root.querySelector('#sloganText');
    brandColorInput = root.querySelector('#brandColor');
    canvasWidthInput = root.querySelector('#canvasWidth');
    canvasHeightInput = root.querySelector('#canvasHeight');
    downloadBtn = root.querySelector('#downloadBtn');
    toggleCompareBtn = root.querySelector('#toggleCompareBtn');
    saveTemplateBtn = root.querySelector('#saveTemplateBtn');
    templateNameInput = root.querySelector('#templateName');
    templateList = root.querySelector('#templateList');
    stickerUploadInput = root.querySelector('#stickerUpload');
    stickerUploadProgress = root.querySelector('#stickerUploadProgress');
    stickerUploadProgressBar = stickerUploadProgress?.querySelector('div');
    stickerGallery = root.querySelector('#stickerGallery');
    referenceUploadInput = root.querySelector('#referenceBannerUpload');
    referenceUploadProgress = root.querySelector('#referenceUploadProgress');
    referenceUploadProgressBar = referenceUploadProgress?.querySelector('div');
    referenceSamplesContainer = root.querySelector('#referenceSamples');
    referenceSamplesEmpty = root.querySelector('#referenceSamplesEmpty');
    tabSettingsBtn = root.querySelector('#tab-settings-btn');
    tabManualBtn = root.querySelector('#tab-manual-btn');
    tabSettingsContent = root.querySelector('#tab-settings-content');
    tabManualContent = root.querySelector('#tab-manual-content');

    if (!canvas) {
      return false;
    }
    ctx = canvas.getContext('2d');

    logoImage = new Image();
    logoImage.crossOrigin = 'anonymous';
    productImage = new Image();
    productImage.crossOrigin = 'anonymous';

    if (canvasWidthInput) {
      canvasWidthInput.value = CANVAS_WIDTH;
      canvasWidthInput.disabled = true;
    }
    if (canvasHeightInput) {
      canvasHeightInput.value = CANVAS_HEIGHT;
      canvasHeightInput.disabled = true;
    }

    return true;
  }

  function firebaseAvailable() {
    return typeof window !== 'undefined' && window.firebase;
  }

  function ensureFirebase() {
    if (firebaseReady) return;
    if (!firebaseAvailable()) {
      throw new Error('Firebase není inicializováno.');
    }

    firebaseApi = window.firebase;
    db = firebaseApi.db;
    auth = firebaseApi.auth;
    storage = firebaseApi.storage;
    firebaseReady = true;

    if (typeof window.__app_id !== 'undefined' && window.__app_id) {
      appId = window.__app_id;
    }

    const handleAuthChange = (user) => {
      currentUser = user;
      if (user) {
        const templatePath = `${ARTIFACT_ROOT}/${appId}/public/data/banner_templates`;
        const stickerPath = `${ARTIFACT_ROOT}/${appId}/public/data/stickers`;
        const referencePath = `${ARTIFACT_ROOT}/${appId}/public/data/banner_samples`;
        templatesCollection = firebaseApi.collection(db, templatePath);
        stickersCollection = firebaseApi.collection(db, stickerPath);
        referenceCollection = firebaseApi.collection(db, referencePath);
        subscribeTemplates();
        subscribeStickers();
        subscribeReferenceSamples();
      } else {
        clearCollections();
      }
    };

    if (firebaseApi.onAuthStateChanged && auth) {
      if (authUnsubscribe) authUnsubscribe();
      authUnsubscribe = firebaseApi.onAuthStateChanged(auth, handleAuthChange);
      handleAuthChange(auth.currentUser || null);
    }
  }

  function clearCollections() {
    if (templatesUnsubscribe) {
      templatesUnsubscribe();
      templatesUnsubscribe = null;
    }
    if (stickersUnsubscribe) {
      stickersUnsubscribe();
      stickersUnsubscribe = null;
    }
    if (referenceUnsubscribe) {
      referenceUnsubscribe();
      referenceUnsubscribe = null;
    }
    templatesCollection = null;
    stickersCollection = null;
    referenceCollection = null;
    if (templateList) templateList.innerHTML = '';
    if (stickerGallery) stickerGallery.innerHTML = '';
    if (referenceSamplesContainer) referenceSamplesContainer.innerHTML = '';
    if (referenceSamplesEmpty) referenceSamplesEmpty.hidden = true;
  }

  function subscribeTemplates() {
    if (!templatesCollection || templatesUnsubscribe) return;
    templatesUnsubscribe = firebaseApi.onSnapshot(templatesCollection, (snapshot) => {
      if (!templateList) return;
      templateList.innerHTML = '';
      snapshot.forEach((docSnap) => {
        const template = docSnap.data();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = template.name || 'Neznámá šablona';
        btn.className = 'template-button w-full text-left bg-gray-100 text-gray-800 p-2 rounded-lg hover:bg-indigo-100';
        btn.addEventListener('click', () => applyTemplate(template));
        templateList.appendChild(btn);
      });
    });
  }

  function subscribeStickers() {
    if (!stickersCollection || stickersUnsubscribe) return;
    stickersUnsubscribe = firebaseApi.onSnapshot(stickersCollection, (snapshot) => {
      if (!stickerGallery) return;
      stickerGallery.innerHTML = '';
      snapshot.forEach((docSnap) => {
        const sticker = docSnap.data();
        if (!sticker?.url) return;
        const img = document.createElement('img');
        img.src = sticker.url;
        img.crossOrigin = 'anonymous';
        img.className = 'sticker-button w-16 h-16 object-contain bg-white p-1 rounded-md cursor-pointer border';
        img.addEventListener('click', () => addStickerToCanvas(sticker.url));
        stickerGallery.appendChild(img);
      });
    });
  }

  function updateCanvasSizeAndDraw() {
    if (!canvas) return;
    if (canvasWidthInput) canvasWidthInput.value = CANVAS_WIDTH;
    if (canvasHeightInput) canvasHeightInput.value = CANVAS_HEIGHT;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawBanner();
  }

  function drawBanner() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const textColumnWidth = canvas.width / 3;
    const imageColumnX = textColumnWidth;
    const imageColumnWidth = canvas.width - textColumnWidth;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(imageColumnX, 0, imageColumnWidth, canvas.height);

    if (productImage?.src && productImage.complete && productImage.naturalWidth) {
      try {
        const imageAspect = productImage.naturalWidth / productImage.naturalHeight;
        const canvasAspect = imageColumnWidth / canvas.height;
        let sX = 0;
        let sY = 0;
        let sWidth = productImage.naturalWidth;
        let sHeight = productImage.naturalHeight;

        if (imageAspect > canvasAspect) {
          sWidth = sHeight * canvasAspect;
          sX = (productImage.naturalWidth - sWidth) / 2;
        } else {
          sHeight = sWidth / canvasAspect;
          sY = (productImage.naturalHeight - sHeight) / 2;
        }
        ctx.drawImage(productImage, sX, sY, sWidth, sHeight, imageColumnX, 0, imageColumnWidth, canvas.height);
      } catch (error) {
        console.error('Error drawing product image:', error);
        drawPlaceholder('Obrázek produktu nelze načíst', imageColumnX, imageColumnWidth);
      }
    } else {
      drawPlaceholder('Vložte URL obrázku produktu', imageColumnX, imageColumnWidth);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, textColumnWidth, canvas.height);

    const padding = textColumnWidth * 0.1;
    let currentY = padding;

    if (logoImage?.src && logoImage.complete && logoImage.naturalWidth) {
      try {
        const logoMaxHeight = canvas.height * 0.1;
        const logoScale = Math.min(
          (textColumnWidth - padding * 2) / logoImage.naturalWidth,
          logoMaxHeight / logoImage.naturalHeight
        );
        const logoW = logoImage.naturalWidth * logoScale;
        const logoH = logoImage.naturalHeight * logoScale;
        ctx.drawImage(logoImage, padding, currentY, logoW, logoH);
        currentY += logoH + padding * 1.5;
      } catch (error) {
        console.warn('Error drawing logo:', error);
      }
    } else {
      currentY += (canvas.height * 0.1) + (padding * 1.5);
    }

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const headlineSize = Math.max(24, textColumnWidth * 0.12);
    ctx.font = `900 ${headlineSize}px Inter`;
    ctx.fillText(headline1Input?.value || '', padding, currentY);
    currentY += headlineSize * 1.2;
    ctx.font = `500 ${headlineSize}px Inter`;
    ctx.fillText(headline2Input?.value || '', padding, currentY);
    currentY += headlineSize * 2;

    const buttonHeight = Math.max(40, canvas.height * 0.1);
    const buttonWidth = textColumnWidth - padding * 2;
    ctx.fillStyle = brandColorInput?.value || '#007BC0';
    ctx.fillRect(padding, currentY, buttonWidth, buttonHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ctaTextSize = Math.max(16, buttonHeight * 0.3);
    ctx.font = `700 ${ctaTextSize}px Inter`;
    ctx.fillText(ctaTextInput?.value || '', padding + buttonWidth / 2, currentY + buttonHeight / 2);

    if (sloganTextInput?.value) {
      const sloganSize = Math.max(14, textColumnWidth * 0.05);
      ctx.fillStyle = '#555555';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = `400 ${sloganSize}px Inter`;
      ctx.fillText(sloganTextInput.value, padding, canvas.height - padding);
    }

    activeStickers.forEach((sticker) => {
      if (sticker.img.complete) {
        ctx.drawImage(sticker.img, sticker.x, sticker.y, sticker.width, sticker.height);
      }
    });
  }

  function drawPlaceholder(text, x, width) {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x, 0, width, canvas.height);
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.05}px Inter`;
    ctx.fillText(text, x + width / 2, canvas.height / 2);
  }

  async function uploadSticker(file) {
    if (!storage || !stickersCollection || !firebaseApi) return;
    const fileName = `${Date.now()}-${file.name}`;
    const path = `${ARTIFACT_ROOT}/${appId}/public/stickers/${fileName}`;
    const storageRef = firebaseApi.ref(storage, path);
    try {
      if (stickerUploadProgress) {
        stickerUploadProgress.classList.remove('hidden');
        if (stickerUploadProgressBar) stickerUploadProgressBar.style.width = '0%';
      }
      const uploadTask = firebaseApi.uploadBytes(storageRef, file);
      await uploadTask;
      if (stickerUploadProgressBar) stickerUploadProgressBar.style.width = '100%';
      const downloadURL = await firebaseApi.getDownloadURL(storageRef);
      await firebaseApi.addDoc(stickersCollection, { url: downloadURL });
    } catch (error) {
      console.error('Error uploading sticker:', error);
      alert('Nahrání samolepky selhalo.');
    } finally {
      if (stickerUploadProgress) {
        setTimeout(() => {
          stickerUploadProgress.classList.add('hidden');
          if (stickerUploadProgressBar) stickerUploadProgressBar.style.width = '0%';
        }, 600);
      }
      stickerUploadInput.value = '';
    }
  }

  function addStickerToCanvas(url) {
    if (!url) return;
    const stickerImg = new Image();
    stickerImg.crossOrigin = 'anonymous';
    stickerImg.onload = () => {
      const targetWidth = 150;
      const ratio = stickerImg.naturalHeight / Math.max(stickerImg.naturalWidth, 1);
      const newSticker = {
        img: stickerImg,
        x: 50,
        y: 50,
        width: targetWidth,
        height: targetWidth * ratio,
        src: url
      };
      activeStickers.push(newSticker);
      drawBanner();
    };
    stickerImg.onerror = (error) => console.warn('Sticker load failed', error);
    stickerImg.src = url;
  }

  async function uploadReferenceBanner(file) {
    if (!storage || !referenceCollection || !firebaseApi) return;
    const safeName = sanitizeFileName(file?.name || 'reference.png');
    const fileName = `${Date.now()}-${safeName}`;
    const storagePath = `${ARTIFACT_ROOT}/${appId}/public/samples/${fileName}`;
    const storageRef = firebaseApi.ref(storage, storagePath);

    let downloadURL = '';
    try {
      if (referenceUploadProgress) {
        referenceUploadProgress.dataset.active = 'true';
        if (referenceUploadProgressBar) referenceUploadProgressBar.style.width = '0%';
      }

      if (firebaseApi.uploadBytesResumable) {
        await new Promise((resolve, reject) => {
          const uploadTask = firebaseApi.uploadBytesResumable(storageRef, file);
          uploadTask.on('state_changed', (snapshot) => {
            if (!referenceUploadProgressBar || !snapshot.totalBytes) return;
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            referenceUploadProgressBar.style.width = `${percent.toFixed(1)}%`;
          }, reject, async () => {
            downloadURL = await firebaseApi.getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          });
        });
      } else {
        const snapshot = await firebaseApi.uploadBytes(storageRef, file);
        downloadURL = await firebaseApi.getDownloadURL(snapshot.ref);
      }

      if (!downloadURL) {
        throw new Error('Chybí URL nahraného souboru');
      }

      await firebaseApi.addDoc(referenceCollection, {
        url: downloadURL,
        filename: file?.name || safeName,
        storagePath,
        createdAt: firebaseApi.serverTimestamp ? firebaseApi.serverTimestamp() : Date.now()
      });
    } catch (error) {
      console.error('Error uploading reference banner:', error);
      alert('Nahrání vzoru selhalo. Zkus to prosím znovu.');
    } finally {
      if (referenceUploadProgress) referenceUploadProgress.dataset.active = 'false';
      if (referenceUploadProgressBar) referenceUploadProgressBar.style.width = '0%';
      if (referenceUploadInput) referenceUploadInput.value = '';
    }
  }

  function subscribeReferenceSamples() {
    if (!referenceCollection || referenceUnsubscribe) return;
    const refQuery = firebaseApi.query
      ? firebaseApi.query(referenceCollection, firebaseApi.orderBy('createdAt', 'desc'))
      : referenceCollection;

    referenceUnsubscribe = firebaseApi.onSnapshot(refQuery, (snapshot) => {
      if (!referenceSamplesContainer) return;
      referenceSamplesContainer.innerHTML = '';
      let count = 0;
      snapshot.forEach((docSnap) => {
        const sample = docSnap.data();
        if (!sample?.url) return;
        count += 1;
        referenceSamplesContainer.appendChild(buildReferenceCard(sample));
      });
      if (referenceSamplesEmpty) referenceSamplesEmpty.hidden = count !== 0;
      if (count === 0) referenceSamplesContainer.innerHTML = '';
    });
  }

  function buildReferenceCard(sample) {
    const card = document.createElement('div');
    card.className = 'banners-sample-card';

    const img = document.createElement('img');
    img.src = sample.url;
    img.alt = sample.filename || 'Vzorek banneru';
    img.loading = 'lazy';
    img.className = 'banners-sample-thumb';
    card.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'banners-sample-meta';
    const title = document.createElement('strong');
    title.textContent = sample.filename || 'Bez názvu';
    meta.appendChild(title);
    const timeLabel = formatTimestamp(sample.createdAt);
    if (timeLabel) {
      const timeEl = document.createElement('span');
      timeEl.textContent = timeLabel;
      meta.appendChild(timeEl);
    }
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'banners-sample-actions';
    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'banners-sample-btn banners-sample-btn--primary';
    useBtn.textContent = 'Zobrazit vzor';
    useBtn.addEventListener('click', () => setCompareFromUrl(sample.url));
    actions.appendChild(useBtn);

    const openBtn = document.createElement('a');
    openBtn.href = sample.url;
    openBtn.target = '_blank';
    openBtn.rel = 'noopener noreferrer';
    openBtn.className = 'banners-sample-btn';
    openBtn.textContent = 'Otevřít';
    actions.appendChild(openBtn);

    card.appendChild(actions);
    return card;
  }

  function setCompareFromUrl(url) {
    if (!url || !compareImage || !compareContainer) return;
    compareImage.src = url;
    compareContainer.classList.remove('hidden');
    compareContainer.classList.add('flex');
    updateCanvasSizeAndDraw();
  }

  function sanitizeFileName(name = '') {
    return name
      .toString()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'banner.png';
  }

  function formatTimestamp(value) {
    if (!value) return '';
    let date;
    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('cs-CZ');
  }

  async function saveTemplate() {
    if (!templatesCollection || !firebaseApi) {
      alert('Spojení s databází selhalo.');
      return;
    }
    const name = templateNameInput?.value?.trim();
    if (!name) {
      alert('Zadejte prosím název šablony.');
      return;
    }

    const stickersData = activeStickers.map((sticker) => ({
      src: sticker.src,
      x: sticker.x,
      y: sticker.y,
      width: sticker.width,
      height: sticker.height
    }));

    const templateData = {
      name,
      headline1: headline1Input?.value || '',
      headline2: headline2Input?.value || '',
      ctaText: ctaTextInput?.value || '',
      sloganText: sloganTextInput?.value || '',
      brandColor: brandColorInput?.value || '#007BC0',
      canvasWidth: canvasWidthInput?.value || '1531',
      canvasHeight: canvasHeightInput?.value || '396',
      productImageURL: productImageURLInput?.value || '',
      logoBase64: logoImage?.src && logoImage.src.startsWith('data:image') ? logoImage.src : null,
      compareImageBase64: compareImage?.src && compareImage.src.startsWith('data:image') ? compareImage.src : null,
      stickers: stickersData,
      savedAt: firebaseApi.serverTimestamp?.() || null
    };

    try {
      await firebaseApi.addDoc(templatesCollection, templateData);
      templateNameInput.value = '';
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Uložení šablony selhalo.');
    }
  }

  function applyTemplate(template) {
    if (!template) return;
    if (headline1Input) headline1Input.value = template.headline1 || '';
    if (headline2Input) headline2Input.value = template.headline2 || '';
    if (ctaTextInput) ctaTextInput.value = template.ctaText || '';
    if (sloganTextInput) sloganTextInput.value = template.sloganText || '';
    if (brandColorInput) brandColorInput.value = template.brandColor || '#007BC0';
    if (canvasWidthInput) canvasWidthInput.value = template.canvasWidth || '1531';
    if (canvasHeightInput) canvasHeightInput.value = template.canvasHeight || '396';
    if (productImageURLInput) productImageURLInput.value = template.productImageURL || '';

    if (template.logoBase64) {
      logoImage.src = template.logoBase64;
    }
    if (template.compareImageBase64) {
      compareImage.src = template.compareImageBase64;
    }
    if (template.productImageURL) {
      productImage.src = template.productImageURL;
    }

    activeStickers = [];
    const stickerPromises = [];

    if (Array.isArray(template.stickers)) {
      template.stickers.forEach((data) => {
        if (!data?.src) return;
        const stickerImg = new Image();
        stickerImg.crossOrigin = 'anonymous';
        const promise = new Promise((resolve, reject) => {
          stickerImg.onload = resolve;
          stickerImg.onerror = reject;
        });
        stickerPromises.push(promise);
        stickerImg.src = data.src;
        activeStickers.push({
          img: stickerImg,
          x: data.x || 0,
          y: data.y || 0,
          width: data.width || 120,
          height: data.height || 120,
          src: data.src
        });
      });
    }

    Promise.allSettled(stickerPromises).finally(() => {
      updateCanvasSizeAndDraw();
    });
  }

  function setupEventListeners() {
    if (listenersAttached) return;

    const inputs = rootEl.querySelectorAll('input[type="text"], input[type="color"], input[type="number"]');
    inputs.forEach((input) => {
      if (input.disabled) return;
      const id = input.id;
      if (id === 'productImageURL') {
        if (!listenersAttached) {
          input.addEventListener('input', () => {
            productImage.src = productImageURLInput.value || '';
          });
        }
        return;
      }
      if (id === 'templateName') return;
      input.addEventListener('input', () => drawBanner());
    });

    referenceUploadInput?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) uploadReferenceBanner(file);
    });

    function bindFileInput(input, imageTarget) {
      input?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          imageTarget.src = loadEvent.target?.result || '';
        };
        reader.readAsDataURL(file);
      });
    }

    bindFileInput(logoImageInput, logoImage);
    bindFileInput(compareImageInput, compareImage);

    stickerUploadInput?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) uploadSticker(file);
    });

    if (compareImage) {
      compareImage.onload = () => {
        if (!compareContainer?.classList.contains('hidden')) {
          updateCanvasSizeAndDraw();
        }
      };
    }

    logoImage.onload = () => drawBanner();
    productImage.onload = () => drawBanner();
    productImage.onerror = () => {
      productImage.src = '';
      drawBanner();
    };

    downloadBtn?.addEventListener('click', () => {
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'banner.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    toggleCompareBtn?.addEventListener('click', () => {
      if (!compareImage?.src) {
        if (compareError) {
          compareError.textContent = 'Nejdříve nahrajte vzorový banner.';
          compareError.classList.remove('opacity-0');
          setTimeout(() => compareError.classList.add('opacity-0'), 3000);
        }
        return;
      }
      compareContainer.classList.toggle('hidden');
      compareContainer.classList.toggle('flex');
      updateCanvasSizeAndDraw();
    });

    saveTemplateBtn?.addEventListener('click', saveTemplate);

    canvas?.addEventListener('mousedown', (event) => {
      const mouseX = event.offsetX;
      const mouseY = event.offsetY;
      for (let i = activeStickers.length - 1; i >= 0; i -= 1) {
        const sticker = activeStickers[i];
        if (
          mouseX > sticker.x &&
          mouseX < sticker.x + sticker.width &&
          mouseY > sticker.y &&
          mouseY < sticker.y + sticker.height
        ) {
          selectedSticker = sticker;
          offsetX = mouseX - sticker.x;
          offsetY = mouseY - sticker.y;
          break;
        }
      }
    });

    canvas?.addEventListener('mousemove', (event) => {
      if (!selectedSticker) return;
      selectedSticker.x = event.offsetX - offsetX;
      selectedSticker.y = event.offsetY - offsetY;
      drawBanner();
    });

    const stopDrag = () => {
      selectedSticker = null;
    };
    canvas?.addEventListener('mouseup', stopDrag);
    canvas?.addEventListener('mouseout', stopDrag);

    tabSettingsBtn?.addEventListener('click', () => {
      tabManualBtn?.classList.remove('active');
      tabSettingsBtn?.classList.add('active');
      tabManualContent?.classList.remove('active');
      tabSettingsContent?.classList.add('active');
    });

    tabManualBtn?.addEventListener('click', () => {
      tabSettingsBtn?.classList.remove('active');
      tabManualBtn?.classList.add('active');
      tabSettingsContent?.classList.remove('active');
      tabManualContent?.classList.add('active');
    });

    listenersAttached = true;
  }

  function teardown() {
    if (templatesUnsubscribe) {
      templatesUnsubscribe();
      templatesUnsubscribe = null;
    }
    if (stickersUnsubscribe) {
      stickersUnsubscribe();
      stickersUnsubscribe = null;
    }
    if (referenceUnsubscribe) {
      referenceUnsubscribe();
      referenceUnsubscribe = null;
    }
  }

  async function init() {
    if (initialized) return;
    const root = ensureRoot();
    if (!root) return;
    if (!cacheDom()) return;
    ensureFirebase();
    setupEventListeners();

    if (productImageURLInput?.value) {
      productImage.src = productImageURLInput.value;
    }
    updateCanvasSizeAndDraw();
    initialized = true;
  }

  return {
    async show() {
      const root = ensureRoot();
      if (!root) return;
      root.hidden = false;
      if (!initialized) {
        try {
          await init();
        } catch (error) {
          console.error('[Banners] init failed', error);
        }
      } else {
        updateCanvasSizeAndDraw();
      }
    },
    hide() {
      const root = ensureRoot();
      if (root) {
        root.hidden = true;
      }
    },
    destroy() {
      teardown();
      if (authUnsubscribe) authUnsubscribe();
      authUnsubscribe = null;
      initialized = false;
      listenersAttached = false;
    }
  };
})();

window.P73Banners = BannerCreatorModule;

export default BannerCreatorModule;

/* Backend integration placeholders. Keep empty until your endpoints are ready. */
const CONFIG = {
  // Google Drive image ID. The thumbnail endpoint is more reliable for public images.
  LOGO_FILE_ID: '1IqFbIfsFWGIXY08pwF8AnitxAuykh-fm',
  LOGO_URL: 'https://drive.google.com/thumbnail?id=1IqFbIfsFWGIXY08pwF8AnitxAuykh-fm&sz=w1200',
  GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyW7ragXe4PJnsLqXAftdjGQ5LXK_uB05rL3sFu21J_KMSTePvUXnIinNEUbVM_XeTk6g/exec',
  // Telegram credentials stay in Google Apps Script, not in the browser.
  FACEBOOK_URL: 'https://www.facebook.com/lorizcosmetics.bd',
  INSTAGRAM_URL: 'https://www.instagram.com/lorizcosmeticscare',
  WHATSAPP_URL: 'https://wa.me/8801876954397',
  WP_GROUP_URL: 'https://chat.whatsapp.com/KYouqwqaPOD54YcXnZiJZz'
};

const MAX_CV_SIZE = 10 * 1024 * 1024;
const ALLOWED_CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const ALLOWED_CV_EXTENSIONS = /\.(pdf|doc|docx)$/i;

const form = document.getElementById('application-form');
const applicationView = document.getElementById('application-view');
const successView = document.getElementById('success-view');
const submitButton = form.querySelector('.submit-button');
const experienceDetails = document.getElementById('experience-details');
const cvInput = document.getElementById('cv');
const cvFileName = document.getElementById('cv-file-name');
const progressBar = document.querySelector('.progress-line span');
const progressCount = document.getElementById('progress-count');
const progressItems = [...document.querySelectorAll('.progress-list li')];

function applyBrandLogo() {
  if (!CONFIG.LOGO_URL) return;
  ['brand-logo', 'success-logo'].forEach((id) => {
    const image = document.getElementById(id);
    if (!image) return;
    image.src = CONFIG.LOGO_URL;
    image.hidden = false;
    image.addEventListener('error', () => {
      image.hidden = true;
      image.removeAttribute('src');
    }, { once: true });
  });
}

function showError(element, message) {
  const field = element.closest('.field, .choice-group');
  if (!field) return;
  field.classList.add('invalid');
  const error = field.querySelector('.error');
  if (error) error.textContent = message;
}

function clearErrors() {
  form.querySelectorAll('.invalid').forEach((field) => field.classList.remove('invalid'));
  form.querySelectorAll('.error').forEach((error) => { error.textContent = ''; });
}

function validateCv(file) {
  if (!file) return true;
  const validType = ALLOWED_CV_TYPES.has(file.type) || ALLOWED_CV_EXTENSIONS.test(file.name);
  if (!validType) {
    showError(cvInput, 'Please choose a PDF, DOC or DOCX file.');
    return false;
  }
  if (file.size > MAX_CV_SIZE) {
    showError(cvInput, 'Please choose a file smaller than 10 MB.');
    return false;
  }
  return true;
}

function validateForm() {
  clearErrors();
  let valid = true;
  const requiredFields = [...form.querySelectorAll('[required]')].filter((field) => field.offsetParent !== null);
  requiredFields.forEach((field) => {
    if (field.type === 'radio') return;
    if (!field.value.trim()) { showError(field, 'Please complete this field.'); valid = false; }
  });

  [...form.querySelectorAll('fieldset')].forEach((group) => {
    const requiredRadio = group.querySelector('input[type="radio"][required]');
    if (requiredRadio && !group.querySelector('input[type="radio"]:checked')) {
      showError(group, 'Please select an option.'); valid = false;
    }
  });

  const age = document.getElementById('age');
  if (age.value && (Number(age.value) < 18 || Number(age.value) > 70)) {
    showError(age, 'Please enter an age between 18 and 70.');
    valid = false;
  }
  if (!validateCv(cvInput.files[0])) valid = false;

  if (!valid) {
    form.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return valid;
}

function getValue(name) {
  return form.querySelector(`[name="${name}"]:checked`)?.value || form.elements[name]?.value || '';
}

function buildSubmissionPayload(cvData = {}) {
  return {
    name: getValue('fullName'),
    age: getValue('age'),
    phone: getValue('phone'),
    location: getValue('location'),
    education: getValue('education'),
    experience: getValue('experience'),
    skincareKnowledge: getValue('knowledge'),
    communication: getValue('communication'),
    dailyAvailability: getValue('dailyAvailability'),
    remoteWork: getValue('remote'),
    deviceInternet: getValue('equipment'),
    mathAnswer: getValue('mathAnswer'),
    communicationRating: getValue('communicationRating'),
    colorAnswer: getValue('colorAnswer'),
    customerMeaning: getValue('customerMeaning'),
    pressureHandling: getValue('pressureHandling'),
    unclearTask: getValue('unclearTask'),
    customerDisagreement: getValue('customerDisagreement'),
    repetitiveWork: getValue('repetitiveWork'),
    teamDisagreement: getValue('teamDisagreement'),
    mistakeResponse: getValue('mistakeResponse'),
    workPriority: getValue('workPriority'),
    learningInterest: getValue('learningInterest'),
    customerService: getValue('customerService'),
    skillImprove: getValue('skillImprove'),
    assessment: getValue('customerAnswer'),
    whyLoriz: getValue('whyJoin'),
    anythingElse: getValue('anythingElse'),
    cvName: cvData.name || '',
    cvMimeType: cvData.mimeType || '',
    cvBase64: cvData.base64 || ''
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Unable to read the selected CV.'));
    reader.readAsDataURL(file);
  });
}

async function prepareSubmissionPayload() {
  const file = cvInput.files[0];
  if (!file) return buildSubmissionPayload();
  return buildSubmissionPayload({
    name: file.name,
    mimeType: file.type,
    base64: await fileToBase64(file)
  });
}

async function sendToAppsScript(payload) {
  if (!CONFIG.GOOGLE_APPS_SCRIPT_URL) return false;
  const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('The application could not be submitted.');

  const result = await response.json().catch(() => ({}));
  if (result.success === false) {
    throw new Error(result.error || 'The application could not be saved.');
  }
  if (result.telegramSent === false && result.telegramError) {
    console.warn('Telegram notification failed:', result.telegramError);
  }
  return true;
}

function buildTelegramMessage(payload) {
  const rows = [
    ['Name', payload.name],
    ['Age', payload.age],
    ['Phone', payload.phone],
    ['Location', payload.location],
    ['Education', payload.education],
    ['Experience', payload.experience],
    ['Skincare knowledge', payload.skincareKnowledge],
    ['Communication', payload.communication],
    ['Availability', payload.dailyAvailability],
    ['Remote work', payload.remoteWork],
    ['Device/internet', payload.deviceInternet],
    ['Communication rating', payload.communicationRating],
    ['Color answer', payload.colorAnswer],
    ['Math answer', payload.mathAnswer],
    ['Customer meaning', payload.customerMeaning],
    ['Pressure handling', payload.pressureHandling],
    ['Unclear task', payload.unclearTask],
    ['Customer disagreement', payload.customerDisagreement],
    ['Repetitive work', payload.repetitiveWork],
    ['Team disagreement', payload.teamDisagreement],
    ['Mistake response', payload.mistakeResponse],
    ['Work priority', payload.workPriority],
    ['Learning interest', payload.learningInterest],
    ['Customer service', payload.customerService],
    ['Skill to improve', payload.skillImprove],
    ['Skincare assessment', payload.assessment],
    ['Why LO\'RIZ', payload.whyLoriz],
    ['CV', payload.cvName || 'Not uploaded']
  ];
  return `<b>New LO'RIZ Team Application</b>\\n\\n${rows
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => `<b>${label}:</b> ${escapeTelegramHtml(value)}`)
    .join('\\n')}`;
}

function escapeTelegramHtml(value) {
  return String(value).replace(/[&<>]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[character]));
}

async function sendToTelegram(payload) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return false;
  const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: buildTelegramMessage(payload),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!response.ok) throw new Error('Telegram notification could not be sent.');
  return true;
}

function updateProgress() {
  const sections = [...document.querySelectorAll('.form-section')];
  const visible = sections.filter((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top < window.innerHeight * .55 && rect.bottom > 100;
  });
  const index = Math.min(sections.length - 1, Math.max(0, sections.indexOf(visible[0] || sections[0])));
  progressBar.style.width = `${((index + 1) / sections.length) * 100}%`;
  progressCount.textContent = String(index + 1).padStart(2, '0');
  progressItems.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex <= index));
}

document.querySelectorAll('input[name="experience"]').forEach((input) => input.addEventListener('change', (event) => {
  const show = event.target.value === 'Yes' && event.target.checked;
  experienceDetails.classList.toggle('visible', show);
  document.getElementById('previousExperience').required = show;
}));

cvInput.addEventListener('change', () => {
  clearErrors();
  const file = cvInput.files[0];
  cvFileName.textContent = file ? file.name : 'PDF, DOC or DOCX · Max 10 MB';
  validateCv(file);
});

document.querySelectorAll('input, textarea').forEach((input) => input.addEventListener('input', () => {
  input.closest('.field, .choice-group')?.classList.remove('invalid');
}));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled || !validateForm()) return;

  submitButton.disabled = true;
  submitButton.classList.add('loading');
  submitButton.setAttribute('aria-busy', 'true');

  try {
    const payload = await prepareSubmissionPayload();
    /* Future flow: send payload to Google Apps Script, which can save the CV
       to Drive, write the sheet row, and notify Telegram. */
    await sendToAppsScript(payload);

    applicationView.hidden = true;
    document.querySelector('.hero').hidden = true;
    successView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(cvInput, error.message || 'Please try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
    submitButton.removeAttribute('aria-busy');
  }
});

document.querySelectorAll('[data-config-link]').forEach((link) => {
  const url = CONFIG[link.dataset.configLink];
  if (url) { link.href = url; link.target = '_blank'; link.rel = 'noopener'; }
  else {
    link.classList.add('unavailable');
    link.setAttribute('aria-disabled', 'true');
    link.addEventListener('click', (event) => event.preventDefault());
  }
});

document.getElementById('back-button').addEventListener('click', () => {
  successView.hidden = true;
  document.querySelector('.hero').hidden = false;
  applicationView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', updateProgress, { passive: true });
applyBrandLogo();
updateProgress();

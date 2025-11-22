// Simple EN/NE language toggler
const LANG = {
  en: {
    brand: 'Student Portal',
    nav: { dash:'Dashboard', courses:'Courses', assign:'Assignments', attend:'Attendance', visa:'Visa', msg:'Messages', res:'Resources', profile:'Profile' },
    kpi: { attendance:'Attendance', assignments:'Assignments', documents:'Documents', next:'Next Deadline' },
    ann: 'Announcements',
    ielts: 'IELTS Prep', pte: 'PTE Prep',
    upload: 'Upload', status: 'Status', due: 'Due',
    table: { date: 'Date', in:'In', out:'Out', remarks:'Remarks' },
    visaTitle: 'Visa & Documentation',
    msgs: 'Messages',
    resources: 'Resources',
    profile: 'Profile', save: 'Save',
  },
  ne: {
    brand: 'विद्यार्थी पोर्टल',
    nav: { dash:'ड्यासबोर्ड', courses:'कोर्स', assign:'असाइनमेन्ट', attend:'हाजिरी', visa:'भिसा', msg:'सन्देश', res:'स्रोतहरू', profile:'प्रोफाइल' },
    kpi: { attendance:'हाजिरी', assignments:'असाइनमेन्ट', documents:'कागजात', next:'आगामी समय' },
    ann: 'सूचनाहरू',
    ielts: 'IELTS तयारी', pte: 'PTE तयारी',
    upload: 'अपलोड', status: 'स्थिति', due: 'म्याद',
    table: { date: 'मिति', in:'इन', out:'आउट', remarks:'टिप्पणी' },
    visaTitle: 'भिसा र कागजात',
    msgs: 'सन्देश',
    resources: 'स्रोतहरू',
    profile: 'प्रोफाइल', save: 'सेभ',
  }
};

function applyLang(lang='en'){
  const dict = LANG[lang] || LANG.en;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const parts = key.split('.');
    let obj = dict; for(const p of parts){ obj = obj?.[p]; }
    if(typeof obj === 'string') el.textContent = obj;
  });
  localStorage.setItem('lang', lang);
}

function initLangToggle(){
  const cur = localStorage.getItem('lang') || 'en';
  applyLang(cur);
  document.getElementById('langToggle')?.addEventListener('click',()=>{
    const next = (localStorage.getItem('lang')||'en') === 'en' ? 'ne' : 'en';
    applyLang(next);
  });
}

document.addEventListener('DOMContentLoaded', initLangToggle);


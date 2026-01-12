// content/languages.js
// Worldwide Language Library and Configuration for SpicySwipe
// Contains supported languages and language selection utilities

const WORLDWIDE_LANGUAGES = {
    en: { name: "English", native: "English" },
    es: { name: "Spanish", native: "Español" },
    fr: { name: "French", native: "Français" },
    de: { name: "German", native: "Deutsch" },
    ar: { name: "Arabic", native: "العربية" },
    pt: { name: "Portuguese", native: "Português" },
    it: { name: "Italian", native: "Italiano" },
    ru: { name: "Russian", native: "Русский" },
    ja: { name: "Japanese", native: "日本語" },
    ko: { name: "Korean", native: "한국어" },
    zh: { name: "Chinese", native: "中文" },
    hi: { name: "Hindi", native: "हिन्दी" },
    tr: { name: "Turkish", native: "Türkçe" },
    nl: { name: "Dutch", native: "Nederlands" },
    sv: { name: "Swedish", native: "Svenska" },
    da: { name: "Danish", native: "Dansk" },
    no: { name: "Norwegian", native: "Norsk" },
    fi: { name: "Finnish", native: "Suomi" },
    pl: { name: "Polish", native: "Polski" },
    cs: { name: "Czech", native: "Čeština" },
    sk: { name: "Slovak", native: "Slovenčina" },
    hu: { name: "Hungarian", native: "Magyar" },
    ro: { name: "Romanian", native: "Română" },
    bg: { name: "Bulgarian", native: "Български" },
    hr: { name: "Croatian", native: "Hrvatski" },
    sr: { name: "Serbian", native: "Српски" },
    sl: { name: "Slovenian", native: "Slovenščina" },
    et: { name: "Estonian", native: "Eesti" },
    lv: { name: "Latvian", native: "Latviešu" },
    lt: { name: "Lithuanian", native: "Lietuvių" },
    he: { name: "Hebrew", native: "עברית" },
    th: { name: "Thai", native: "ไทย" },
    vi: { name: "Vietnamese", native: "Tiếng Việt" },
    id: { name: "Indonesian", native: "Bahasa Indonesia" },
    ms: { name: "Malay", native: "Bahasa Melayu" },
    fil: { name: "Filipino", native: "Filipino" },
    uk: { name: "Ukrainian", native: "Українська" },
    be: { name: "Belarusian", native: "Беларуская" },
    kk: { name: "Kazakh", native: "Қазақ" },
    uz: { name: "Uzbek", native: "O'zbek" },
    ky: { name: "Kyrgyz", native: "Кыргызча" },
    tg: { name: "Tajik", native: "Тоҷикӣ" },
    mn: { name: "Mongolian", native: "Монгол" },
    fa: { name: "Persian", native: "فارسی" },
    ur: { name: "Urdu", native: "اردو" },
    bn: { name: "Bengali", native: "বাংলা" },
    ta: { name: "Tamil", native: "தமிழ்" },
    te: { name: "Telugu", native: "తెలుగు" },
    kn: { name: "Kannada", native: "ಕನ್ನಡ" },
    ml: { name: "Malayalam", native: "മലയാളം" },
    gu: { name: "Gujarati", native: "ગુજરાતી" },
    mr: { name: "Marathi", native: "मराठी" },
    pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    ne: { name: "Nepali", native: "नेपाली" },
    si: { name: "Sinhala", native: "සිංහල" },
    my: { name: "Burmese", native: "မြန်မာ" },
    km: { name: "Khmer", native: "ខ្មែរ" },
    lo: { name: "Lao", native: "ລາວ" },
    am: { name: "Amharic", native: "አማርኛ" },
    sw: { name: "Swahili", native: "Kiswahili" },
    zu: { name: "Zulu", native: "isiZulu" },
    af: { name: "Afrikaans", native: "Afrikaans" },
    is: { name: "Icelandic", native: "Íslenska" },
    ga: { name: "Irish", native: "Gaeilge" },
    cy: { name: "Welsh", native: "Cymraeg" },
    gd: { name: "Scottish Gaelic", native: "Gàidhlig" },
    mt: { name: "Maltese", native: "Malti" },
    eu: { name: "Basque", native: "Euskara" },
    ca: { name: "Catalan", native: "Català" },
    gl: { name: "Galician", native: "Galego" },
    sq: { name: "Albanian", native: "Shqip" },
    mk: { name: "Macedonian", native: "Македонски" },
    bs: { name: "Bosnian", native: "Bosanski" },
    me: { name: "Montenegrin", native: "Crnogorski" },
    el: { name: "Greek", native: "Ελληνικά" }
};

// Default selected languages (most common)
const DEFAULT_SELECTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'pt', 'it', 'ru', 'ja', 'ko', 'zh'];

// Language configuration functions
function getSelectedLanguages() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['messagingConfig', 'selectedLanguages'], ({ messagingConfig, selectedLanguages }) => {
            // Try to get from selectedLanguages first, then from messagingConfig, then default
            const savedLanguages = selectedLanguages || messagingConfig?.selectedLanguages || DEFAULT_SELECTED_LANGUAGES;
            resolve(savedLanguages);
        });
    });
}

function getLanguageOptions(selectedLanguages) {
    return selectedLanguages.map(code => ({
        value: code,
        text: `${WORLDWIDE_LANGUAGES[code]?.name} (${WORLDWIDE_LANGUAGES[code]?.native})`
    }));
}

function getAllLanguageOptions() {
    return Object.entries(WORLDWIDE_LANGUAGES).map(([code, lang]) => ({
        value: code,
        text: `${lang.name} (${lang.native})`
    })).sort((a, b) => a.text.localeCompare(b.text));
}

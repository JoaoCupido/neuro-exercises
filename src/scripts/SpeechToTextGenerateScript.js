const form = document.getElementById('urlForm');
const generatedUrlEl = document.getElementById('generatedUrl');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');

form.addEventListener('input', generateURL);
form.addEventListener('change', generateURL);
document.addEventListener('DOMContentLoaded', generateURL);
copyBtn.addEventListener('click', copyToClipboard);

openBtn.addEventListener('click', () => {
    const url = generatedUrlEl.textContent.trim();
    if (url) window.open(url, '_blank');
});

function generateURL() {
    const params = new URLSearchParams();

    const lang = document.getElementById('speechLanguageSelect').value;
    if (lang !== 'en-US') params.append('speechLanguage', lang);

    const answers = document.getElementById('correctAnswersInput').value.trim();
    if (answers) {
        const list = answers.split(',').map(s => s.trim()).filter(Boolean);
        if (list.length > 0) params.append('correctAnswers', JSON.stringify(list));
    }

    const micPos = document.getElementById('micPositionSelect').value;
    if (micPos !== 'bottom-center') params.append('micButtonPosition', micPos);

    const clearPos = document.getElementById('clearPositionSelect').value;
    if (clearPos !== 'bottom-right') params.append('clearButtonPosition', clearPos);

    if (!document.getElementById('continuousCheck').checked) params.append('continuous', 'false');
    if (document.getElementById('autoStartCheck').checked) params.append('autoStart', 'true');
    if (document.getElementById('hideLiveTranscriptCheck').checked) params.append('hideLiveTranscript', 'true');
    if (document.getElementById('hideResultsPopupCheck').checked) params.append('hideResultsPopup', 'true');

    // Background params
    const bgColor = document.getElementById('bgColorInput')?.value;
    if (bgColor && bgColor !== '#ffffff') params.append('bgColor', encodeURIComponent(bgColor));

    const bgImage = document.getElementById('bgImageInput')?.value;
    if (bgImage) params.append('bgImage', bgImage);

    // Grid params
    if (document.getElementById('gridEnabledCheck')?.checked) {
        params.append('gridEnabled', 'true');
    }

    const baseUrl = window.location.origin + window.location.pathname.replace('/generate', '');
    generatedUrlEl.textContent = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(generatedUrlEl.textContent || '');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy URL', 2000);
    } catch (err) {
        console.error('Copy failed', err);
    }
}
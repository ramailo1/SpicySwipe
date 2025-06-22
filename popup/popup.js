// Minimal popup launcher for Tinder AI Extension

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('popup-content');
  // Check if current tab is Tinder.com
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || '';
    if (url.includes('tinder.com')) {
      content.innerHTML = `
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 18px; color: #a5b4fc;">The sidebar is available in your Tinder tab.</div>
        <div style="font-size: 14px; color: #e0e7ff; margin-bottom: 20px;">Click the arrow on the right edge of Tinder to open or hide the sidebar.</div>
      `;
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 18px;"><img src="../assets/tinder-icon.png" alt="Tinder" style="width:48px;height:48px;" /></div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #a5b4fc;">Open Tinder to use the AI sidebar</div>
        <button id="open-tinder-btn" style="background:#f87171;color:#fff;font-weight:600;padding:10px 24px;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-bottom: 16px;">Open Tinder.com</button>
      `;
      document.getElementById('open-tinder-btn').onclick = () => {
        chrome.tabs.create({ url: 'https://tinder.com' });
      };
    }
  });
}); 
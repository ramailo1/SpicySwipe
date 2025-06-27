// Minimal popup launcher for Tinder AI Extension

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('popup-content');
  // Check if current tab is Tinder.com
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || '';
    if (url.includes('tinder.com')) {
      content.innerHTML = `
       <div class="popup-title">The sidebar is available in your Tinder tab.</div>
<div class="popup-desc">Click the arrow on the right edge of Tinder to open or hide the sidebar.</div>
<div class="popup-divider">
<button id="donate-btn" class="popup-donate-btn">
<span class="popup-coffee-emoji">☕</span>
            <span>Support Development</span>
          </button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div><img src="../assets/tinder-icon.png" alt="Tinder" class="popup-img" /></div>
        <div class="popup-title">Open Tinder to use the AI sidebar</div>
        <button id="open-tinder-btn" class="popup-btn">Open Tinder.com</button>
       <div class="popup-divider">
         <button id="donate-btn" class="popup-donate-btn">
           <span class="popup-coffee-emoji">☕</span>
            <span>Support Development</span>
          </button>
        </div>
      `;
      document.getElementById('open-tinder-btn').onclick = () => {
        chrome.tabs.create({ url: 'https://tinder.com' });
      };
    }
    
    // Add click handler for donation button
    document.getElementById('donate-btn').onclick = () => {
      chrome.tabs.create({ url: 'https://coff.ee/soufienne' });
    };
    
    // Add elegant hover effects
    const donateBtn = document.getElementById('donate-btn');
    donateBtn.addEventListener('mouseenter', () => {
      donateBtn.classList.add('popup-btn-donate-hover');
    });
    donateBtn.addEventListener('mouseleave', () => {
      donateBtn.classList.remove('popup-btn-donate-hover');
    });
  });
}); 
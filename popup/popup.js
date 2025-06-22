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
        <div style="border-top: 1px solid #3e4c5a; padding-top: 16px; margin-top: 16px;">
          <button id="donate-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-weight: 500; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; width: 100%; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);">
            <span style="font-size: 14px;">☕</span>
            <span>Support Development</span>
          </button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 18px;"><img src="../assets/tinder-icon.png" alt="Tinder" style="width:48px;height:48px;" /></div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #a5b4fc;">Open Tinder to use the AI sidebar</div>
        <button id="open-tinder-btn" style="background:#f87171;color:#fff;font-weight:600;padding:10px 24px;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-bottom: 16px;">Open Tinder.com</button>
        <div style="border-top: 1px solid #3e4c5a; padding-top: 16px; margin-top: 16px;">
          <button id="donate-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-weight: 500; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; width: 100%; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);">
            <span style="font-size: 14px;">☕</span>
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
      chrome.tabs.create({ url: 'https://buymeacoffee.com/soufienne?status=1' });
    };
    
    // Add elegant hover effects
    const donateBtn = document.getElementById('donate-btn');
    donateBtn.addEventListener('mouseenter', () => {
      donateBtn.style.transform = 'translateY(-1px)';
      donateBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    });
    donateBtn.addEventListener('mouseleave', () => {
      donateBtn.style.transform = 'translateY(0)';
      donateBtn.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
    });
  });
}); 
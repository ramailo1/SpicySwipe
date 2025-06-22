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
          <button id="donate-btn" style="background: linear-gradient(135deg, #ff6b35, #f7931e); color:#fff; font-weight:600; padding:12px 20px; border:none; border-radius:12px; font-size:14px; cursor:pointer; width:100%; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3); display:flex; align-items:center; justify-content:center; gap:8px;">
            <span style="font-size: 16px;">☕</span>
            <span>Support the Developer</span>
          </button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 18px;"><img src="../assets/tinder-icon.png" alt="Tinder" style="width:48px;height:48px;" /></div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #a5b4fc;">Open Tinder to use the AI sidebar</div>
        <button id="open-tinder-btn" style="background:#f87171;color:#fff;font-weight:600;padding:10px 24px;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-bottom: 16px;">Open Tinder.com</button>
        <div style="border-top: 1px solid #3e4c5a; padding-top: 16px; margin-top: 16px;">
          <button id="donate-btn" style="background: linear-gradient(135deg, #ff6b35, #f7931e); color:#fff; font-weight:600; padding:12px 20px; border:none; border-radius:12px; font-size:14px; cursor:pointer; width:100%; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3); display:flex; align-items:center; justify-content:center; gap:8px;">
            <span style="font-size: 16px;">☕</span>
            <span>Support the Developer</span>
          </button>
        </div>
      `;
      document.getElementById('open-tinder-btn').onclick = () => {
        chrome.tabs.create({ url: 'https://tinder.com' });
      };
    }
    
    // Add click handler for donation button
    document.getElementById('donate-btn').onclick = () => {
      chrome.tabs.create({ url: 'https://coff.ee/Soufienne' });
    };
    
    // Add hover effects
    const donateBtn = document.getElementById('donate-btn');
    donateBtn.addEventListener('mouseenter', () => {
      donateBtn.style.transform = 'translateY(-2px)';
      donateBtn.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
    });
    donateBtn.addEventListener('mouseleave', () => {
      donateBtn.style.transform = 'translateY(0)';
      donateBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
    });
  });
}); 
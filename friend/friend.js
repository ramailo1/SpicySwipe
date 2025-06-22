document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Tab switching
  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      tabPanels[idx].classList.add('active');
    });
  });
  // Default to Swipe tab
  tabBtns[0].classList.add('active');
  tabPanels[0].classList.add('active');

  // --- Dummy Profile Generator ---
  function generateDummyProfile() {
    return {
      name: 'Alex',
      age: Math.floor(Math.random() * 15) + 20,
      bio: 'Adventurous, loves hiking and music',
      photos: ['dummy1.jpg', 'dummy2.jpg']
    };
  }

  // --- Simulated Chat ---
  function simulateChat() {
    // Placeholder: Simulate conversation with dummy responses
    return [
      { from: 'them', text: 'Hey there!' },
      { from: 'you', text: 'Hi! How are you?' }
    ];
  }

  // --- Prompt Testing ---
  function testPrompt() {
    // Placeholder: Test prompt and tone settings
    return 'Prompt test result (simulated)';
  }

  // Inject content into each tab
  function renderSwipeTab() {
    const profile = generateDummyProfile();
    document.getElementById('swipe-tab').innerHTML = `
      <div class="mb-2 font-bold">Dummy Profile</div>
      <div>Name: ${profile.name}, Age: ${profile.age}</div>
      <div>Bio: ${profile.bio}</div>
      <div class="flex gap-2 mt-2">
        <button class="px-2 py-1 bg-green-500 text-white rounded">Like</button>
        <button class="px-2 py-1 bg-red-500 text-white rounded">Nope</button>
        <button class="px-2 py-1 bg-gray-500 text-white rounded">Skip</button>
      </div>
    `;
  }
  function renderChatTab() {
    const chat = simulateChat();
    document.getElementById('chat-tab').innerHTML = `
      <div class="mb-2 font-bold">Simulated Chat</div>
      <div>${chat.map(m => `<b>${m.from}:</b> ${m.text}`).join('<br>')}</div>
    `;
  }
  function renderPromptTab() {
    document.getElementById('prompt-tab').innerHTML = `
      <div class="mb-2 font-bold">Prompt Test</div>
      <div>${testPrompt()}</div>
    `;
  }

  renderSwipeTab();
  renderChatTab();
  renderPromptTab();

  tabBtns[0].addEventListener('click', renderSwipeTab);
  tabBtns[1].addEventListener('click', renderChatTab);
  tabBtns[2].addEventListener('click', renderPromptTab);
}); 
// VoiceInput.js – Chrome extension content component
// Implements Voice-to-Text functionality using the Web Speech API.
// Injects a microphone button into the Tinder chat interface.

(function () {
    let recognition = null;
    let isListening = false;
    let activeMicBtn = null;

    // Initialize Web Speech API
    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('[Tinder AI] Web Speech API not supported in this browser.');
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SpeechRecognition();

        recog.continuous = false; // Stop after one sentence/phrase
        recog.interimResults = true; // Show results while speaking
        recog.lang = 'en-US'; // Default to English, can be updated dynamically

        recog.onstart = () => {
            isListening = true;
            updateMicVisuals(true);
            console.log('[Tinder AI] Voice recognition started');
        };

        recog.onend = () => {
            isListening = false;
            updateMicVisuals(false);
            console.log('[Tinder AI] Voice recognition ended');
        };

        recog.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript || interimTranscript) {
                insertTextIntoChat(finalTranscript || interimTranscript, !!finalTranscript);
            }
        };

        recog.onerror = (event) => {
            console.error('[Tinder AI] Voice recognition error:', event.error);
            isListening = false;
            updateMicVisuals(false);
        };

        return recog;
    }

    // Insert text into Tinder's chat input
    function insertTextIntoChat(text, isFinal) {
        const input = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');
        if (!input) return;

        // Visual feedback during interim results could be handled here
        // For now, we just update the value

        // Note: Direct value assignment might not trigger React/framework updates.
        // We might need to dispatch input events.

        // If we are just replacing context, we might want to append or replace.
        // Simple approach: Replace content if it's a fresh start, or append?
        // Let's assume user clicks mic to *dictate the message*.

        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // If final, maybe add a space at the end?
        if (isFinal) {
            input.value = text + ' ';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Update microphone button visuals
    function updateMicVisuals(listening) {
        if (!activeMicBtn) return;

        if (listening) {
            activeMicBtn.classList.add('listening');
            activeMicBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `; // Stop icon state
            activeMicBtn.style.background = '#ef4444'; // Red for recording
        } else {
            activeMicBtn.classList.remove('listening');
            activeMicBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `; // Mic icon state
            activeMicBtn.style.background = 'transparent';
        }
    }

    // Attach Mic Button to Chat Interface
    function attachVoiceInput() {
        // Find the input area wrapper. Note: Selectors might need adjustment based on Tinder's current DOM.
        // Usually near the textarea.
        const inputArea = document.querySelector('div[class*="inputArea"]');
        const textArea = document.querySelector('textarea[placeholder*="message"]');

        if (!textArea) return; // Chat not open

        // Find a good place to inject. Usually a sibling of the textarea or part of the input group.
        const parentContainer = textArea.parentElement;

        // Check if already injected
        if (parentContainer.querySelector('.tinder-ai-voice-btn')) return;

        const micBtn = document.createElement('button');
        micBtn.className = 'tinder-ai-voice-btn';
        micBtn.type = 'button';
        micBtn.title = 'Voice to Text';
        micBtn.style.cssText = `
            border: none;
            background: transparent;
            color: #9ca3af;
            cursor: pointer;
            padding: 8px;
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            border-radius: 50%;
        `;

        // Initial Icon
        micBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;

        micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleListening();
        });

        // Insert before the text area generally works well visually
        // Or if there's a button container, insert there.
        // Let's try inserting *before* the textarea for now.
        parentContainer.insertBefore(micBtn, textArea);

        activeMicBtn = micBtn;
    }

    function toggleListening() {
        if (!recognition) {
            recognition = initSpeechRecognition();
        }

        if (!recognition) return; // Not supported

        if (isListening) {
            recognition.stop();
        } else {
            // Update lang if possible from settings
            // recognition.lang = ...
            recognition.start();
        }
    }

    // Styles for pulse animation
    const styleId = 'voice-input-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .tinder-ai-voice-btn:hover { color: #f43f5e; background: rgba(244, 63, 94, 0.1) !important; }
            .tinder-ai-voice-btn.listening { color: white !important; }
        `;
        document.head.appendChild(style);
    }

    // Expose init/attach
    window.attachVoiceInput = attachVoiceInput;

    // Auto-init logic could go here, or be driven by the central observer
    console.log('[Tinder AI] VoiceInput component loaded');

})();

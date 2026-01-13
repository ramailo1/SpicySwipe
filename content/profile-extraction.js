// content/profile-extraction.js
// Profile Extraction Module for SpicySwipe
// Handles extracting profile information and chat history from Tinder pages

// Wait for contact tab to appear and extract detailed profile information
async function waitForContactTabAndExtractInfo(matchItem) {
    return new Promise((resolve) => {
        console.log('[Tinder AI] Starting waitForContactTabAndExtractInfo...');
        console.log('[Tinder AI] Match item:', matchItem);

        // Click the match item to open the contact tab
        console.log('[Tinder AI] Clicking match item to open chat...');
        matchItem.click();

        let attempts = 0;
        const maxAttempts = 30; // 15 seconds max wait

        const interval = setInterval(() => {
            attempts++;
            console.log(`[Tinder AI] Attempt ${attempts}/${maxAttempts}: Looking for message textarea...`);

            // A reliable indicator of a loaded chat is the message text area.
            const messageTextarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Type"]');

            if (messageTextarea) {
                clearInterval(interval);
                console.log('[Tinder AI] Chat window is open, extracting profile info...');
                console.log('[Tinder AI] Found message textarea:', messageTextarea);

                // The profile info is usually within the main content area when a chat is open.
                const chatContainer = document.querySelector('main[role="main"]');
                console.log('[Tinder AI] Chat container found:', chatContainer);

                const profileInfo = extractDetailedProfileInfo(chatContainer || document.body);
                console.log('[Tinder AI] Profile extraction complete, resolving with:', profileInfo);
                resolve(profileInfo);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error('[Tinder AI] Chat textarea not found after 15 seconds.');
                console.error('[Tinder AI] Current page elements:', document.querySelectorAll('textarea'));
                resolve(null);
            } else {
                console.log(`[Tinder AI] No textarea found yet, continuing... (attempt ${attempts})`);
            }
        }, 500);
    });
}

function findElementByText(tag, text) {
    return Array.from(document.querySelectorAll(tag)).find(el => el.textContent.trim() === text);
}

// Extract detailed profile information from the contact tab
function extractDetailedProfileInfo(container) {
    console.log('[Tinder AI] Starting detailed profile extraction from container:', container);
    const profileInfo = {
        name: '',
        age: '',
        bio: '',
        interests: [],
        prompts: [],
        job: '',
        education: '',
        location: '',
        essentials: {},
        lookingFor: ''
    };

    try {
        console.log('[Tinder AI] Step 1: Looking for name and age...');

        // 1. Extract Name and Age from H1 - using aria-label attribute which contains "Name Age years"
        let nameH1 = container.querySelector('h1[aria-label]');
        if (!nameH1) {
            // Fallback: try the class-based selector with properly escaped parentheses
            try {
                nameH1 = container.querySelector('h1.Fxs\\(1\\)');
            } catch (e) { }
        }
        if (!nameH1) {
            nameH1 = container.querySelector('h1');
        }

        if (nameH1) {
            console.log('[Tinder AI] Found name element:', nameH1.textContent);
            // Try to extract from aria-label first (e.g., "Missy 27 years")
            const ariaLabel = nameH1.getAttribute('aria-label');
            if (ariaLabel) {
                const match = ariaLabel.match(/^(.+?)\s+(\d+)\s+years?$/i);
                if (match) {
                    profileInfo.name = match[1].trim();
                    profileInfo.age = match[2];
                    console.log('[Tinder AI] Extracted from aria-label - Name:', profileInfo.name, 'Age:', profileInfo.age);
                }
            }

            // If aria-label didn't work, try spans
            if (!profileInfo.name) {
                // Name is in span.Pend(8px), age is in span.Typs(display-2-strong)
                let nameSpan = null;
                let ageSpan = null;
                try {
                    nameSpan = nameH1.querySelector('span.Pend\\(8px\\)');
                    ageSpan = nameH1.querySelector('span.Typs\\(display-2-strong\\)');
                } catch (e) {
                    // Fallback to simple span selectors
                    const spans = nameH1.querySelectorAll('span');
                    if (spans.length >= 2) {
                        nameSpan = spans[0];
                        ageSpan = spans[spans.length - 1];
                    } else if (spans.length === 1) {
                        nameSpan = spans[0];
                    }
                }
                if (nameSpan) profileInfo.name = nameSpan.textContent.trim();
                if (ageSpan && ageSpan !== nameSpan) profileInfo.age = ageSpan.textContent.trim();
            }
        } else {
            console.log('[Tinder AI] No name element found, trying alternative selectors...');
            // Try alternative: look for the match header which contains "You matched with Name"
            const matchHeader = container.querySelector('h1, h3');
            if (matchHeader) {
                const matchText = matchHeader.textContent;
                const matchResult = matchText.match(/matched with\s+(.+?)(?:\s+on|\s*,|\s*$)/i);
                if (matchResult) {
                    profileInfo.name = matchResult[1].trim();
                    console.log('[Tinder AI] Extracted name from match header:', profileInfo.name);
                }
            }
        }

        console.log('[Tinder AI] Step 2: Looking for bio...');

        const getSectionText = (headerText) => {
            const header = findElementByText('h2', headerText);
            if (header) {
                // Try to find the section container with properly escaped selector
                let section = null;
                try {
                    section = header.closest('div.P\\(24px\\)');
                } catch (e) { }

                if (!section) {
                    // Fallback to parent traversal
                    section = header.closest('div');
                }

                if (section) {
                    const content = section.cloneNode(true);
                    const headerElement = content.querySelector('h2');
                    if (headerElement) headerElement.remove();
                    // Also remove any icons
                    content.querySelectorAll('svg').forEach(svg => svg.remove());
                    return content.textContent.trim();
                }
            }
            return null;
        };

        // 3. Extract Bio ("About me") - try multiple approaches
        profileInfo.bio = getSectionText('About me') || '';

        if (!profileInfo.bio) {
            console.log('[Tinder AI] No bio found via section text, trying direct div selector...');
            // The bio is in a div with class Typs(body-1-regular) after "About me" h2
            const aboutHeader = findElementByText('h2', 'About me');
            if (aboutHeader) {
                const parentDiv = aboutHeader.closest('div');
                if (parentDiv) {
                    try {
                        const bioDiv = parentDiv.querySelector('div.Typs\\(body-1-regular\\)');
                        if (bioDiv) {
                            profileInfo.bio = bioDiv.textContent.trim();
                            console.log('[Tinder AI] Found bio via Typs selector:', profileInfo.bio.substring(0, 100) + '...');
                        }
                    } catch (e) {
                        // Fallback to any div after header
                        const divs = parentDiv.querySelectorAll('div');
                        for (const div of divs) {
                            const text = div.textContent.trim();
                            if (text && text.length > 10 && text.length < 500 && !text.includes('About me')) {
                                profileInfo.bio = text;
                                console.log('[Tinder AI] Found bio via fallback:', text.substring(0, 100) + '...');
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Extract "Looking for" section
        console.log('[Tinder AI] Step 2b: Looking for relationship goals...');
        const lookingForHeader = findElementByText('h2', 'Looking for');
        if (lookingForHeader) {
            const parentDiv = lookingForHeader.closest('div');
            if (parentDiv) {
                // Looking for is in a span with class Typs(display-3-strong)
                try {
                    const goalSpan = parentDiv.querySelector('span.Typs\\(display-3-strong\\)');
                    if (goalSpan) {
                        profileInfo.lookingFor = goalSpan.textContent.trim();
                        console.log('[Tinder AI] Found looking for:', profileInfo.lookingFor);
                    }
                } catch (e) {
                    const spans = parentDiv.querySelectorAll('span');
                    for (const span of spans) {
                        const text = span.textContent.trim();
                        if (text && text.length > 3 && text.length < 50) {
                            profileInfo.lookingFor = text;
                            break;
                        }
                    }
                }
            }
        }

        console.log('[Tinder AI] Step 3: Looking for interests...');

        // 4. Extract Interests
        const interestsHeader = findElementByText('h2', 'Interests');
        if (interestsHeader) {
            const interestsContainer = interestsHeader.closest('section');
            if (interestsContainer) {
                profileInfo.interests = Array.from(interestsContainer.querySelectorAll('li span')).map(el => el.textContent.trim());
            }
        }

        if (profileInfo.interests.length === 0) {
            console.log('[Tinder AI] No interests found via section text, trying alternative selectors...');
            // Try alternative interest selectors
            const interestElements = container.querySelectorAll('[class*="interest"], [class*="Interest"], [class*="tag"], [class*="Tag"]');
            for (const el of interestElements) {
                const text = el.textContent.trim();
                if (text && text.length < 50 && !profileInfo.interests.includes(text)) {
                    profileInfo.interests.push(text);
                }
            }
        }

        console.log('[Tinder AI] Step 4: Looking for prompts...');

        // 5. Extract Prompt/Response sections (like 'Going Out', 'My Weekends')
        const promptHeaders = container.querySelectorAll('h3.Typs\\(body-1-regular\\)');
        promptHeaders.forEach(header => {
            const promptText = header.textContent.trim();
            const answerContainer = header.nextElementSibling;
            if (answerContainer) {
                const answerText = answerContainer.textContent.trim();
                profileInfo.prompts.push({ question: promptText, answer: answerText });
            }
        });

        // If no prompts found, try alternative selectors
        if (profileInfo.prompts.length === 0) {
            console.log('[Tinder AI] No prompts found via section text, trying alternative selectors...');
            const allH3s = container.querySelectorAll('h3');
            for (const h3 of allH3s) {
                const question = h3.textContent.trim();
                const nextEl = h3.nextElementSibling;
                if (nextEl && nextEl.textContent.trim()) {
                    profileInfo.prompts.push({ question, answer: nextEl.textContent.trim() });
                }
            }
        }

        console.log('[Tinder AI] Step 5: Looking for job...');
        // --- Extract 'Essentials' section ---
        const essentialsHeader = findElementByText('h2', 'Essentials');
        if (essentialsHeader) {
            const essentialsList = essentialsHeader.parentElement.nextElementSibling;
            if (essentialsList && essentialsList.tagName === 'UL') {
                const essentials = {};
                essentialsList.querySelectorAll('li').forEach(li => {
                    // Use try-catch for selector fallback since Tinder uses obfuscated class names
                    let label = null;
                    let value = null;
                    try {
                        // Escape parentheses in class selectors
                        label = li.querySelector('div.D\\(f\\).Ai\\(c\\) svg + span, span.Typs\\(body-1-regular\\)');
                        value = li.querySelector('div.D\\(f\\).Ai\\(c\\) span:last-child');
                    } catch (e) {
                        // Fallback: Try simpler selectors
                        label = li.querySelector('span');
                        value = li.querySelector('span:last-child');
                    }
                    if (label && value) {
                        essentials[label.textContent.trim()] = value.textContent.trim();
                    } else if (li.textContent) {
                        // fallback: just use the text
                        essentials[li.textContent.trim().split(':')[0]] = li.textContent.trim().split(':').slice(1).join(':').trim();
                    }
                });
                profileInfo.essentials = essentials;
                // Try to extract job, education, location from essentials if present
                Object.keys(essentials).forEach(key => {
                    const lower = key.toLowerCase();
                    if (lower.includes('job') || lower.includes('work') || lower.includes('occupation')) profileInfo.job = essentials[key];
                    if (lower.includes('school') || lower.includes('education') || lower.includes('college') || lower.includes('university')) profileInfo.education = essentials[key];
                    if (lower.includes('location') || lower.includes('city') || lower.includes('lives')) profileInfo.location = essentials[key];
                });
            }
        }

        console.log('[Tinder AI] Final extracted profile info:', profileInfo);
        return profileInfo;

    } catch (error) {
        console.error('[Tinder AI] Error extracting detailed profile info:', error);
        return profileInfo;
    }
}

function extractChatHistory() {
    console.log('[Tinder AI] Starting chat history extraction...');
    const messages = [];

    try {
        // Strategy 1: Use the new robust selector for all chat bubbles
        const chatBubbles = document.querySelectorAll('.msg.BreakWord');
        if (chatBubbles.length > 0) {
            console.log(`[Tinder AI] Found ${chatBubbles.length} chat bubbles with primary selector`);
            chatBubbles.forEach(bubble => {
                let sender = 'them';
                if (bubble.classList.contains('C($c-ds-text-chat-bubble-send)')) sender = 'me';
                if (bubble.classList.contains('C($c-ds-text-chat-bubble-receive)')) sender = 'them';
                // Fallback: check for send/receive in className
                if (bubble.className.includes('chat-bubble-send')) sender = 'me';
                if (bubble.className.includes('chat-bubble-receive')) sender = 'them';
                const textNode = bubble.querySelector('span.text');
                const text = textNode ? textNode.textContent.trim() : bubble.textContent.trim();
                // Find timestamp from sibling <time> element
                let timestamp = '';
                const parent = bubble.parentElement;
                if (parent) {
                    const timeElem = parent.querySelector('time');
                    if (timeElem) timestamp = timeElem.getAttribute('datetime') || timeElem.textContent.trim();
                }
                if (text && text.length > 0 && text.length < 2000) {
                    messages.push({ sender, text, timestamp });
                }
            });
            if (messages.length > 0) {
                console.log(`[Tinder AI] Successfully extracted ${messages.length} messages with primary strategy`);
                return messages;
            }
        }

        // Strategy 2: Try data-testid selectors
        const testIdBubbles = document.querySelectorAll('[data-testid*="message"], [data-testid*="chat"]');
        if (testIdBubbles.length > 0) {
            console.log(`[Tinder AI] Found ${testIdBubbles.length} chat bubbles with data-testid selector`);
            testIdBubbles.forEach(bubble => {
                let sender = 'them';
                // Check for send/receive indicators
                if (bubble.getAttribute('data-testid')?.includes('send') ||
                    bubble.classList.contains('sent') ||
                    bubble.classList.contains('outgoing')) {
                    sender = 'me';
                }
                const text = bubble.textContent.trim();
                if (text && text.length > 0 && text.length < 2000) {
                    messages.push({ sender, text, timestamp: '' });
                }
            });
            if (messages.length > 0) {
                console.log(`[Tinder AI] Successfully extracted ${messages.length} messages with data-testid strategy`);
                return messages;
            }
        }

        // Strategy 3: Try generic message containers
        const messageContainers = document.querySelectorAll('.message, .chat-message, .msg, [class*="message"], [class*="chat"]');
        if (messageContainers.length > 0) {
            console.log(`[Tinder AI] Found ${messageContainers.length} message containers with generic selector`);
            messageContainers.forEach(container => {
                let sender = 'them';
                // Check for send/receive indicators
                if (container.classList.contains('sent') ||
                    container.classList.contains('outgoing') ||
                    container.classList.contains('me') ||
                    container.className.includes('send')) {
                    sender = 'me';
                }
                const text = container.textContent.trim();
                if (text && text.length > 0 && text.length < 2000) {
                    messages.push({ sender, text, timestamp: '' });
                }
            });
            if (messages.length > 0) {
                console.log(`[Tinder AI] Successfully extracted ${messages.length} messages with generic strategy`);
                return messages;
            }
        }

        // Strategy 4: Try to find any text content that looks like messages
        const allTextElements = document.querySelectorAll('span, div, p');
        if (allTextElements.length > 0) {
            console.log(`[Tinder AI] Trying to extract from ${allTextElements.length} text elements`);
            allTextElements.forEach(element => {
                const text = element.textContent.trim();
                // Only consider text that looks like a message (not too short, not too long, not empty)
                if (text && text.length > 3 && text.length < 500 &&
                    !text.includes('Type a message') &&
                    !text.includes('Send') &&
                    !text.includes('Like') &&
                    !text.includes('Nope')) {
                    // Try to determine sender based on element position or classes
                    let sender = 'them';
                    if (element.classList.contains('sent') ||
                        element.classList.contains('outgoing') ||
                        element.classList.contains('me') ||
                        element.className.includes('send')) {
                        sender = 'me';
                    }
                    messages.push({ sender, text, timestamp: '' });
                }
            });
            if (messages.length > 0) {
                console.log(`[Tinder AI] Successfully extracted ${messages.length} messages with text element strategy`);
                return messages;
            }
        }

        console.log('[Tinder AI] No messages found with any strategy');
        return [];

    } catch (error) {
        console.error('[Tinder AI] Error extracting chat history:', error);
        return [];
    }
}

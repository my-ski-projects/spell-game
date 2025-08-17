document.addEventListener("DOMContentLoaded", () => {
    // Default user to 'fox' and hide the input box
    const userIdInput = document.getElementById('user-id-input');
    window.currentUser = 'fox';
    if (userIdInput) {
        userIdInput.value = 'fox';
        userIdInput.style.display = 'none';
        if (typeof initSupabase === 'function') {
            initSupabase('fox');
        }
        // Listen for changes to userIdInput to update currentUser/initSupabase
        userIdInput.addEventListener('change', function(e) {
            const newUser = userIdInput.value.trim() || 'fox';
            window.currentUser = newUser;
            if (typeof initSupabase === 'function') {
                initSupabase(newUser);
            }
        });
    }

    // Show userId input on key '0' (zero) if not already visible, and prevent passing keystroke to input
    document.addEventListener('keydown', function(e) {
        if (e.key === '0' && userIdInput) {
            if (userIdInput.style.display === 'none') {
                userIdInput.style.display = '';
                userIdInput.focus();
                userIdInput.select();
            } else {
                userIdInput.style.display = 'none';
                userIdInput.blur();
            }
            e.preventDefault();
        }
    });
    // (Reverted: No default user, no auto-hide, no auto-init)
    // Robust event listeners for repeat buttons (moved from index.html)
    function getCurrentWord() {
        if (
            window.wordList &&
            typeof window.currentWordIndex === "number" &&
            window.currentWordIndex < window.wordList.length
        ) {
            return window.wordList[window.currentWordIndex].word;
        }
        // Fallback: try to get from quiz area
        const quizArea = document.getElementById("quiz-area");
        if (quizArea && !quizArea.classList.contains("hidden")) {
            const wordDisplay = document.getElementById("word-display");
            if (
                wordDisplay &&
                wordDisplay.textContent &&
                wordDisplay.textContent !== "..."
            ) {
                return wordDisplay.textContent.trim();
            }
        }
        return "";
    }
    function setupRepeatButtons() {
        const repeatDictApiBtn = document.getElementById("repeat-dictapi-button");
        const repeatTtsBtn = document.getElementById("repeat-tts-button");
        if (repeatDictApiBtn) {
            repeatDictApiBtn.onclick = function () {
                const word = getCurrentWord();
                console.log("[Repeat-DictApi] Clicked. Word:", word);
                if (!word) {
                    alert("No word to repeat!");
                    return;
                }
                if (typeof announceWordWithDictApi === "function")
                    announceWordWithDictApi(word);
            };
        }
        if (repeatTtsBtn) {
            repeatTtsBtn.onclick = function () {
                const word = getCurrentWord();
                console.log("[Repeat-TTS] Clicked. Word:", word);
                if (!word) {
                    alert("No word to repeat!");
                    return;
                }
                if (typeof announceWordWithTTS === "function")
                    announceWordWithTTS(word);
            };
        }
    }
    setupRepeatButtons();
    // In case quiz area is re-rendered, re-setup buttons
    const observer = new MutationObserver(setupRepeatButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    // Global variables to manage the state of the app
    let wordList = [];
    let currentWordIndex = 0;
    // Expose for repeat buttons in index.html
    window.wordList = wordList;
    window.currentWordIndex = currentWordIndex;
    let score = 0;
    let isQuizActive = false;
    let attemptedWords = 0; // Track total words attempted for the score

    // We'll use this object to store the word lists that have been successfully fetched.
    let availableWordLists = {};

    // Sound effects using Tone.js
    const correctSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.1, release: 0.1 },
    }).toDestination();
    const incorrectSynth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();

    // UI elements
    const statusMessage = document.getElementById("status-message");
    const wordListButtons = document.getElementById("word-list-buttons");
    const allWordsButton = document.getElementById("all-words-button");
    const quizArea = document.getElementById("quiz-area");
    const progressCounter = document.getElementById("progress-counter");
    const nextButton = document.getElementById("next-button");
    const endQuizButton = document.getElementById("end-quiz-button");
    const wordDisplay = document.getElementById("word-display");
    const feedback = document.getElementById("feedback");
    const spellingInput = document.getElementById("spelling-input");

    // New UI elements for custom input, random selection, and summary
    const customListInput = document.getElementById("custom-list-input");
    const loadCustomListButton = document.getElementById("load-custom-list-button");
    const randomLetterCountInput = document.getElementById("random-letter-count");
    const randomSelectButton = document.getElementById("random-select-button");
    const wordCountInput = document.getElementById("word-count-input");
    const summaryArea = document.getElementById("summary-area");
    const summaryList = document.getElementById("summary-list");
    const summaryScore = document.getElementById("summary-score");
    const summaryReward = document.getElementById("summary-reward");
    const playAgainButton = document.getElementById("play-again-button");

    // New elements for meaning display
    const meaningButton = document.getElementById("meaning-button");
    const wordMeaningDisplay = document.getElementById("wordMeaningDisplay");

    // This Set will track the letters selected by the user for the custom list
    let selectedLetters = new Set();

    // Speech Synthesis (Text-to-Speech)
    const synth = window.speechSynthesis;

    /**
     * Fetches a word list from a text file and returns it as an array.
     * @param {string} letter - The letter corresponding to the file (e.g., 'A' for A.txt).
     * @returns {Promise<Array<string>|null>} A promise that resolves to an array of words or null if the file is not found.
     */
    async function fetchWordList(letter) {
        try {
            const response = await fetch(`${letter}.txt`);
            if (!response.ok) {
                // If the file doesn't exist, response.ok will be false (e.g., 404 error)
                throw new Error(`File not found: ${letter}.txt`);
            }
            const text = await response.text();
            // Split the text into an array, filter out any empty lines, and trim whitespace
            return text
                .split("\n")
                .filter((word) => word.trim() !== "")
                .map((word) => word.trim());
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Initializes the alphabetical buttons by checking for the existence of each .txt file.
     */
    async function initializeButtons() {
        const alphabetContainer = document.querySelector("#word-list-buttons > div");
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

        // Use a promise to track when all checks are complete
        const fetchPromises = alphabet.map((letter) => {
            return fetchWordList(letter).then((words) => {
                if (words) {
                    availableWordLists[letter] = words;
                }
            });
        });

        // Wait for all fetch requests to complete before building the UI
        await Promise.allSettled(fetchPromises);

        alphabet.forEach((letter) => {
            const button = document.createElement("button");
            button.textContent = letter;

            // Add the base class for styling
            button.classList.add("letter-button");

            if (availableWordLists[letter]) {
                // Button is enabled if a word list exists
                button.classList.add("deselected-letter-btn");
                button.addEventListener("click", () => {
                    // Toggle the selected state
                    if (selectedLetters.has(letter)) {
                        selectedLetters.delete(letter);
                        button.classList.remove("selected-letter-btn");
                        button.classList.add("deselected-letter-btn");
                    } else {
                        selectedLetters.add(letter);
                        button.classList.add("selected-letter-btn");
                        button.classList.remove("deselected-letter-btn");
                    }
                    // Update the custom input box
                    const sortedLetters = Array.from(selectedLetters).sort();
                    customListInput.value = sortedLetters.join("");
                });
            } else {
                // Button is disabled with different styling
                button.classList.add("button-disabled");
                button.disabled = true;
            }
            alphabetContainer.appendChild(button);
        });
    }


    /**
     * Announces a word using only dictionaryapi.dev audio (no TTS fallback).
     * @param {string} word
     */
    async function announceWordWithDictApi(word) {
        if (!word) { console.log('[announceWordWithDictApi] No word provided'); return; }
        // Cancel any ongoing speech
        if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (response.ok) {
                const data = await response.json();
                let audioUrl = null;
                if (data && data[0] && data[0].phonetics) {
                    const phonetic = data[0].phonetics.find((p) => p.audio);
                    if (phonetic && phonetic.audio) {
                        audioUrl = phonetic.audio;
                    }
                }
                if (audioUrl) {
                    console.log('[announceWordWithDictApi] Playing audio:', audioUrl);
                    const audio = new Audio(audioUrl);
                    audio.play().catch(e => { console.log('Audio play error:', e); });
                    return;
                } else {
                    console.log('[announceWordWithDictApi] No audio found in API response for', word);
                }
            } else {
                console.log('[announceWordWithDictApi] API response not ok for', word);
            }
        } catch (e) {
            console.log('[announceWordWithDictApi] Fetch error:', e);
        }
        // If no audio found, do nothing (no TTS fallback)
    }

    /**
     * Announces a word using browser TTS only (no dictionaryapi audio).
     * @param {string} word
     */
    function announceWordWithTTS(word) {
        if (!word) { console.log('[announceWordWithTTS] No word provided'); return; }
        if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const friendlyVoice = voices.find((voice) => voice.name.includes("Google US English"));
        if (friendlyVoice) utterance.voice = friendlyVoice;
        utterance.onstart = () => { console.log('[announceWordWithTTS] Speaking:', word, 'Voice:', friendlyVoice ? friendlyVoice.name : 'default'); };
        utterance.onerror = (e) => { console.log('[announceWordWithTTS] Speech error:', e); };
        window.speechSynthesis.speak(utterance);
    }

    // Make these available globally for the inline script
    window.announceWordWithDictApi = announceWordWithDictApi;
    window.announceWordWithTTS = announceWordWithTTS;

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array} array - The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Initializes the quiz with a given set of words.
     * @param {Array<string>} words - The array of words to be used in the quiz.
     * @param {Array<string>} missing - An array of letters for which word lists were not found.
     */
    function loadAndStartQuiz(words, missing = []) {
    // Always use currentUser (default 'fox' or changed by user)
        if (!words || words.length === 0) {
            statusMessage.textContent = "No words found for this selection. 🙁";
            return;
        }

        // Check if the user has specified a word count
        let wordCount = parseInt(wordCountInput.value);
        let finalWordList = words;

        // If a valid number is entered, limit the word list
        if (!isNaN(wordCount) && wordCount > 0 && wordCount < words.length) {
            shuffleArray(words);
            finalWordList = words.slice(0, wordCount);
        }

        wordList = finalWordList.map((word) => ({
            word: word,
            correct: null,
            spelledWord: "",
        }));
        window.wordList = wordList;


        let initialMessage = `Successfully loaded ${wordList.length} words! Let's get spelling! ✨`;
        if (missing.length > 0) {
            initialMessage += ` (Could not find lists for: ${missing.join(", ")}.)`;
        }
        statusMessage.textContent = initialMessage;

        quizArea.classList.remove("hidden");
        wordListButtons.classList.add("hidden");

        currentWordIndex = 0;
        window.currentWordIndex = currentWordIndex;
        score = 0;
        attemptedWords = 0;
        shuffleArray(wordList);
        wordDisplay.textContent = "Ready to begin?";
        feedback.textContent = "";
        spellingInput.value = "";

        // Use the "X words left" theme
        progressCounter.textContent = `${wordList.length - currentWordIndex} words left!`;

        nextButton.textContent = "Let's Go! 👉"; // Reset button text for a new quiz
        spellingInput.focus();
    }

    /**
     * Handles the next word logic. Announces the next word.
     */
    function getNextWord() {
        // Only get the next word if the quiz isn't over.
        if (currentWordIndex < wordList.length) {
            window.currentWordIndex = currentWordIndex;
            const currentWord = wordList[currentWordIndex].word;
            wordDisplay.textContent = "...";
            feedback.textContent = "";
            spellingInput.value = ""; // Clear the input box for the next word

            // Use the "X words left" theme
            progressCounter.textContent = `${wordList.length - currentWordIndex} words left!`;

            // Hide the meaning display
            wordMeaningDisplay.style.display = "none";

            // Delay the announcement slightly for a better user experience
            setTimeout(() => {
                announceWordWithDictApi(currentWord);
                spellingInput.focus();
            }, 500);
        } else {
            showSummary();
        }
    }

    /**
     * Displays the quiz summary.
     */
    function showSummary() {
        isQuizActive = false; // Ensure quiz is marked as inactive
        quizArea.classList.add("hidden");
        summaryArea.classList.remove("hidden");
        summaryList.innerHTML = ""; // Clear previous summary
        summaryScore.innerHTML = "";
        summaryReward.innerHTML = "";

        // Hide the meaning display from the quiz screen
        wordMeaningDisplay.style.display = "none";

        // Filter for words that were actually attempted
        const attemptedItems = wordList.filter((item) => item.correct !== null);
        const attemptedCount = attemptedItems.length;
        const correctCount = attemptedItems.filter((item) => item.correct === true).length;

        if (attemptedCount > 0) {
            summaryScore.textContent = `${correctCount}/${attemptedCount} words attempted are correct!`;
            const percentage = (correctCount / attemptedCount) * 100;
            let rewardText = "";
            let rewardIcon = "";

            if (percentage === 100) {
                rewardIcon = "🏆";
                rewardText = "Perfect score! You earned a cup!";
            } else if (percentage >= 80) {
                rewardIcon = "🥇";
                rewardText = "Great job! You earned a medal!";
            } else if (percentage >= 70) {
                rewardIcon = "🏅";
                rewardText = "Nice try! You earned a badge!";
            }

            if (rewardIcon) {
                summaryReward.innerHTML = `<span class="reward-icon">${rewardIcon}</span><br><span class="text-lg font-bold">${rewardText}</span>`;
            } else {
                summaryReward.innerHTML = `<span class="text-sm text-gray-600">You need to score 70% or higher to earn a reward! Keep trying! </span>`;
            }
        } else {
            summaryScore.textContent = "No words were attempted. Try again! 🤔";
        }

        // Create a table for summary with alternating row colors
        let tableHtml = `<table style=\"width:100%;border-collapse:collapse;\">` +
            `<thead><tr><th style='border-bottom:2px solid #ccc;padding:6px 4px;text-align:left;'>Word</th><th style='border-bottom:2px solid #ccc;padding:6px 4px;text-align:left;'>Input</th></tr></thead><tbody>`;
        let rowIndex = 0;
        wordList.forEach((item) => {
            if (item.correct !== null) {
                const isCorrect = item.correct === true;
                const bgColor = rowIndex % 2 === 0 ? "#f8f8ff" : "#f0f4fa";
                const wordCell = `<td style='padding:6px 4px;${isCorrect ? "color:#10b981;" : "color:#ef4444;"}font-weight:bold;'>${item.word}</td>`;
                let inputCell = "<td style='padding:6px 4px;'>";
                if (isCorrect) {
                    inputCell += `<span style='color:#10b981;font-weight:bold;'>${item.word}</span>`;
                } else if (item.spelledWord) {
                    inputCell += `<span style='color:#ef4444;font-style:italic;'>${item.spelledWord}</span>`;
                } else {
                    inputCell += `<span style='color:#888;'>skipped</span>`;
                }
                inputCell += "</td>";
                tableHtml += `<tr style='background:${bgColor};'>${wordCell}${inputCell}</tr>`;
                rowIndex++;
            }
        });
        tableHtml += `</tbody></table>`;
        summaryList.innerHTML = tableHtml;
    }

    /**
     * Looks up the meaning of a word using a free dictionary API.
     * @param {string} word - The word to look up.
     */
    async function getWordMeaning(word) {
        wordMeaningDisplay.style.display = "block";
        wordMeaningDisplay.innerHTML = `<p class=\"font-bold text-center\">Loading meaning...</p>`;

        try {
            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
            );
            if (!response.ok) {
                throw new Error("Word not found or API error.");
            }
            const data = await response.json();
            if (
                data &&
                data.length > 0 &&
                data[0].meanings &&
                data[0].meanings.length > 0
            ) {
                const firstMeaning = data[0].meanings[0];
                const definition = firstMeaning.definitions[0].definition;
                const partOfSpeech = firstMeaning.partOfSpeech;
                wordMeaningDisplay.innerHTML = `
								<p><span class=\"font-bold\">${partOfSpeech}</span></p>
								<p class=\"mt-1\">${definition}</p>
						`;
            } else {
                throw new Error("Definition not available.");
            }
        } catch (error) {
            console.error("Error fetching definition:", error);
            wordMeaningDisplay.innerHTML = `<p class=\"text-red-500 text-center\">Could not find a definition. Please try another word.</p>`;
        }
        // Always refocus the spelling input after meaning lookup
        if (typeof spellingInput !== 'undefined' && spellingInput && typeof spellingInput.focus === 'function') {
            spellingInput.focus();
        }
    }

    /**
     * Resets the app state to start a new quiz.
     */
    function resetApp() {
        // Clear all state
        wordList = [];
        currentWordIndex = 0;
        window.wordList = wordList;
        window.currentWordIndex = currentWordIndex;
        score = 0;
        isQuizActive = false;
        attemptedWords = 0;
        selectedLetters.clear();

        // Reset UI visibility and button state
        summaryArea.classList.add("hidden");
        quizArea.classList.add("hidden");
        wordListButtons.classList.remove("hidden");
        statusMessage.textContent = "Select a letter to begin your adventure!";
        customListInput.value = "";
        wordCountInput.value = ""; // Clear the word count input
        // Re-render buttons to reset their state
        const alphabetContainer = document.querySelector("#word-list-buttons > div");
        alphabetContainer.innerHTML = "";
        initializeButtons();
    }

    /**
     * Checks the user's spoken word against the correct spelling.
     * @param {string} userSpelling - The word transcribed from the user's voice.
     */
    function checkSpelling(userSpelling) {
        if (currentWordIndex >= wordList.length) return;

        const currentWord = wordList[currentWordIndex].word.toLowerCase();

        if (wordList[currentWordIndex].correct === null) {
            attemptedWords++;
        }

        if (userSpelling === currentWord) {
            feedback.textContent = "Correct! ✅";
            feedback.className = "text-feedback correct";
            correctSynth.triggerAttackRelease("C4", "8n");

            wordList[currentWordIndex].correct = true;
            wordList[currentWordIndex].spelledWord = userSpelling;
            score++;

            if (currentWordIndex === wordList.length - 1) {
                setTimeout(() => showSummary(), 1500);
            } else {
                setTimeout(() => {
                    currentWordIndex++;
                    getNextWord();
                }, 1500);
            }
        } else {
            feedback.textContent = "Incorrect. ❌";
            feedback.className = "text-feedback incorrect";
            incorrectSynth.triggerAttackRelease("4n");
            wordList[currentWordIndex].correct = false;
            wordList[currentWordIndex].spelledWord = userSpelling;
            // No per-word Supabase update; batch at end of quiz
        }
    }
    // Batch save all misspelled words to Supabase at the end of the quiz
    function batchSaveMisspelledWords() {
        if (typeof saveMisspelledWordsBatch === 'function' && typeof currentUser !== 'undefined' && currentUser) {
            // Collect all incorrect words, their counts, and wrong spellings for this session
            const misspelledMap = {};
            wordList.forEach(item => {
                if (item.correct === false && item.word) {
                    if (!misspelledMap[item.word]) {
                        misspelledMap[item.word] = { count: 0, wrongSpellings: [] };
                    }
                    misspelledMap[item.word].count++;
                    if (item.spelledWord && item.spelledWord !== 'skipped') {
                        misspelledMap[item.word].wrongSpellings.push(item.spelledWord);
                    }
                }
            });
            const misspelledArray = Object.entries(misspelledMap).map(([word, obj]) => ({ word, count: obj.count, wrongSpellings: obj.wrongSpellings }));
            if (misspelledArray.length > 0) {
                saveMisspelledWordsBatch(misspelledArray);
            }
        }
    }

    // Event Listeners

    // Call the async function to initialize buttons on page load
    initializeButtons();

    // Event listener for the "All Words" button
    allWordsButton.addEventListener("click", () => {
        let allWords = [];
        for (const letter in availableWordLists) {
            allWords = allWords.concat(availableWordLists[letter]);
        }
        loadAndStartQuiz(allWords);
    });

    // Event listener for the custom list button
    loadCustomListButton.addEventListener("click", async () => {
        const inputString = customListInput.value.trim().toUpperCase();
        if (!inputString) {
            statusMessage.textContent = "Please enter one or more letters. 🤨";
            return;
        }

        let uniqueLetters = [
            ...new Set(
                inputString.split("").filter((char) => char >= "A" && char <= "Z")
            ),
        ];

        let combinedWords = [];
        let missing = [];

        // Check if word lists are already available from the initial fetch
        const loadPromises = uniqueLetters.map(async (letter) => {
            if (availableWordLists[letter]) {
                combinedWords = combinedWords.concat(availableWordLists[letter]);
            } else {
                // Try to fetch it on demand if it wasn't there initially
                const words = await fetchWordList(letter);
                if (words) {
                    combinedWords = combinedWords.concat(words);
                } else {
                    missing.push(letter);
                }
            }
        });

        await Promise.all(loadPromises);

        loadAndStartQuiz(combinedWords, missing);
    });

    // Event listener for the new random selection button
    randomSelectButton.addEventListener("click", () => {
        const count = parseInt(randomLetterCountInput.value);
        if (isNaN(count) || count < 1) {
            statusMessage.textContent = "Please enter a valid number of letters. 🔢";
            return;
        }

        const availableLetters = Object.keys(availableWordLists);
        if (availableLetters.length === 0) {
            statusMessage.textContent = "No word lists are available to select from. 🤷‍♀️";
            return;
        }

        shuffleArray(availableLetters);
        const selectedLettersArray = availableLetters.slice(0, Math.min(count, availableLetters.length));

        // Update the input and the Set
        customListInput.value = selectedLettersArray.sort().join("");
        selectedLetters = new Set(selectedLettersArray);

        // Update button visuals
        document.querySelectorAll(".letter-button").forEach((btn) => {
            const letter = btn.textContent;
            if (selectedLetters.has(letter)) {
                btn.classList.add("selected-letter-btn");
                btn.classList.remove("deselected-letter-btn");
            } else if (!btn.disabled) {
                btn.classList.remove("selected-letter-btn");
                btn.classList.add("deselected-letter-btn");
            }
        });

        statusMessage.textContent = `Randomly selected ${selectedLetters.size} letters. Click 'Load' to start the quiz! 🤩`;
    });

    spellingInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && isQuizActive) {
            const typedWord = spellingInput.value.trim().toLowerCase();
            if (typedWord) {
                checkSpelling(typedWord);
            }
        }
    });


    nextButton.addEventListener("click", () => {
        // If the quiz hasn't started, start it
        if (!isQuizActive) {
            isQuizActive = true;
            nextButton.textContent = "Next Word! ➡️";
            getNextWord();
            return;
        }
        window.currentWordIndex = currentWordIndex;

        // Mark the current word as incorrect before skipping
        if (currentWordIndex < wordList.length) {
            if (wordList[currentWordIndex].correct === null) {
                wordList[currentWordIndex].correct = false; // Mark unattempted words as incorrect on skip
                wordList[currentWordIndex].spelledWord = "skipped";
                attemptedWords++;
            }
            currentWordIndex++;
        }

        if (currentWordIndex >= wordList.length) {
            showSummary();
        } else {
            getNextWord();
            window.currentWordIndex = currentWordIndex;
        }
    });

    // New: Event listener for the meaning button on the quiz screen
    meaningButton.addEventListener("click", () => {
        if (isQuizActive && currentWordIndex < wordList.length) {
            const currentWord = wordList[currentWordIndex].word;
            getWordMeaning(currentWord);
        }
    });

    endQuizButton.addEventListener("click", () => {
        // Check if there's a word currently being processed. If so, mark it as incorrect.
        if (
            isQuizActive &&
            currentWordIndex < wordList.length &&
            wordList[currentWordIndex].correct === null
        ) {
            wordList[currentWordIndex].correct = false;
            wordList[currentWordIndex].spelledWord = "skipped";
            attemptedWords++;
        }
        showSummary();
        batchSaveMisspelledWords();
    });

    playAgainButton.addEventListener("click", resetApp);
});

// --- CONFIGURATION ---
const CSV_URL = "PASTE_YOUR_LIVE_DATA_CSV_LINK_HERE";

// --- STATE ---
let dictionaryDatabase = [];
let selectedCategories = new Set(); // Changed from single string to Set for multi-select
let isQuizMode = false;
let currentQuizWord = null;
let quizScore = 0;
let quizStreak = 0;

// --- DOM ELEMENTS ---
const searchBar = document.getElementById('searchBar');
const categoryContainer = document.getElementById('categoryContainer');
const resultsContainer = document.getElementById('resultsContainer');
const statusText = document.getElementById('statusText');
const toggleQuizBtn = document.getElementById('toggleQuizBtn');
const dictionarySection = document.getElementById('dictionarySection');
const quizSection = document.getElementById('quizSection');

// --- INITIALIZATION ---
Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        dictionaryDatabase = results.data.filter(row => row.Root_Kadazan && row.Clean_English);
        statusText.textContent = `${dictionaryDatabase.length} words loaded.`;
        buildCategories();
        executeSearch();
    }
});

// --- FEATURE 1: MULTI-SELECT THEMATIC CATEGORIES ---
function buildCategories() {
    const rawCategories = dictionaryDatabase.map(row => row.Category).filter(Boolean);
    const uniqueCategories = ['All', ...new Set(rawCategories)].sort();
    
    categoryContainer.innerHTML = uniqueCategories.map(cat => 
        `<button class="category-pill ${cat === 'All' ? 'active' : ''}" data-cat="${cat}" onclick="toggleCategory('${cat}')">${cat}</button>`
    ).join('');
}

window.toggleCategory = function(category) {
    if (category === 'All') {
        selectedCategories.clear(); // Clicking "All" resets everything
    } else {
        if (selectedCategories.has(category)) {
            selectedCategories.delete(category); // Unclick to deselect
        } else {
            selectedCategories.add(category); // Click to add
        }
    }
    
    // Update visual buttons
    document.querySelectorAll('.category-pill').forEach(btn => {
        const catName = btn.getAttribute('data-cat');
        if (catName === 'All') {
            btn.classList.toggle('active', selectedCategories.size === 0);
        } else {
            btn.classList.toggle('active', selectedCategories.has(catName));
        }
    });
    
    executeSearch();
};

function executeSearch() {
    const query = searchBar.value.toLowerCase().trim();
    let filteredData = dictionaryDatabase;
    
    // Filter by multiple categories if any are selected
    if (selectedCategories.size > 0) {
        filteredData = filteredData.filter(row => selectedCategories.has(row.Category));
    }
    
    if (query !== "") {
        filteredData = filteredData.filter(row => {
            return (row.Root_Kadazan || "").toLowerCase().includes(query) || 
                   (row.Clean_English || "").toLowerCase().includes(query) || 
                   (row.Malay_Translation || "").toLowerCase().includes(query);
        });
    }
    renderResults(filteredData);
}
searchBar.addEventListener('input', executeSearch);

// --- FEATURE 2 & 3: UI RENDERING & AUDIO ---
function renderResults(data) {
    resultsContainer.innerHTML = '';
    const displayData = data.slice(0, 100);

    if (displayData.length === 0) {
        resultsContainer.innerHTML = `<div class="status-text" style="text-align: center;">No matches found.</div>`;
        return;
    }

    displayData.forEach(row => {
        const card = document.createElement('article');
        card.className = 'word-card';

        const audioHTML = row.Audio_Link 
            ? `<button class="audio-btn" onclick="new Audio('${row.Audio_Link}').play()" aria-label="Play">🔊</button>` 
            : '';

        const variationsHTML = row.Variations_Kadazan ? `<div class="kadazan-variations">(${row.Variations_Kadazan})</div>` : '';
        const contextHTML = row.English_Context ? `<span class="context-tag">[${row.English_Context}]</span>` : '';
        
        const sentenceHTML = row.Kadazan_Sentence 
            ? `<div class="ai-sentence">
                 <strong>Pounayan (Example):</strong><br>
                 <em>${row.Kadazan_Sentence}</em><br>
                 <span style="font-size: 0.85rem; color: #6c757d;">${row.Sentence_Translation || ''}</span>
               </div>` 
            : '';

        card.innerHTML = `
            <div class="kadazan-root">${row.Root_Kadazan} ${audioHTML}</div>
            ${variationsHTML}
            <div class="translation-row">
                <span class="lang-badge badge-en">EN</span>
                <span class="translation-text">${row.Clean_English}</span> ${contextHTML}
            </div>
            <div class="translation-row">
                <span class="lang-badge badge-ms">MS</span>
                <span class="translation-text">${row.Malay_Translation}</span>
            </div>
            ${sentenceHTML}
        `;
        resultsContainer.appendChild(card);
    });
}

// --- FEATURE 4: GAMIFIED QUIZ ENGINE ---
toggleQuizBtn.addEventListener('click', () => {
    isQuizMode = !isQuizMode;
    if (isQuizMode) {
        dictionarySection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        toggleQuizBtn.innerText = "🔙 Back to Dictionary";
        
        // Reset scores when starting a new session
        quizScore = 0;
        quizStreak = 0;
        document.getElementById('quizScoreDisplay').innerText = `Score: ${quizScore}`;
        document.getElementById('quizStreakDisplay').innerText = `Streak: ${quizStreak} 🔥`;
        
        loadQuizQuestion();
    } else {
        dictionarySection.classList.remove('hidden');
        quizSection.classList.add('hidden');
        toggleQuizBtn.innerText = "Play Practice Quiz 🎮";
    }
});

function loadQuizQuestion() {
    currentQuizWord = dictionaryDatabase[Math.floor(Math.random() * dictionaryDatabase.length)];
    document.getElementById('quizTargetWord').innerText = currentQuizWord.Root_Kadazan;
    document.getElementById('quizFeedback').innerHTML = '';

    let options = [currentQuizWord.Clean_English];
    
    if (currentQuizWord.AI_Quiz_Distractor) {
        let distractors = currentQuizWord.AI_Quiz_Distractor.split(',').map(s => s.trim());
        options = options.concat(distractors);
    }
    
    while (options.length < 4) {
        let randomChoice = dictionaryDatabase[Math.floor(Math.random() * dictionaryDatabase.length)].Clean_English;
        if (!options.includes(randomChoice)) options.push(randomChoice);
    }

    options = options.slice(0, 4).sort(() => Math.random() - 0.5);

    const optionsContainer = document.getElementById('quizOptionsContainer');
    optionsContainer.innerHTML = options.map(opt => {
        const safeOpt = opt.replace(/'/g, "\\'");
        return `<button class="quiz-opt-btn" onclick="checkQuizAnswer('${safeOpt}')">${opt}</button>`;
    }).join('');
}

window.checkQuizAnswer = function(selectedOption) {
    const feedback = document.getElementById('quizFeedback');
    const scoreDisplay = document.getElementById('quizScoreDisplay');
    const streakDisplay = document.getElementById('quizStreakDisplay');

    if (selectedOption === currentQuizWord.Clean_English) {
        // Calculate points (10 base + 5 streak bonus)
        quizScore += 10;
        quizStreak += 1;
        const earnedPoints = quizStreak >= 3 ? 15 : 10;
        if (quizStreak >= 3) quizScore += 5;

        scoreDisplay.innerText = `Score: ${quizScore}`;
        streakDisplay.innerText = `Streak: ${quizStreak} 🔥`;
        
        // Corrected translation
        feedback.innerHTML = `<span class="feedback-correct">Otopot! +${earnedPoints}</span>`;
        
        setTimeout(loadQuizQuestion, 1200); // Loads slightly faster to keep the game moving
    } else {
        quizStreak = 0;
        streakDisplay.innerText = `Streak: ${quizStreak} 🔥`;
        
        // Provides a learning hint on a wrong answer
        feedback.innerHTML = `<span class="feedback-wrong">Try again! (Hint: MS - ${currentQuizWord.Malay_Translation})</span>`;
    }
};

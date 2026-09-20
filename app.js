// --- CONFIGURATION ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7UDuPwhE3OUKIJeACBvoUpFCMJX_hVBPcxAUxmIh_LS6awxSCGGz1K0rdZOIQRXuGcVnPBWdVpJwn/pub?gid=421571041&single=true&output=csv";

// --- STATE ---
let dictionaryDatabase = [];
let currentCategory = 'All';
let isQuizMode = false;
let currentQuizWord = null;

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

// --- FEATURE 1: THEMATIC CATEGORIES ---
function buildCategories() {
    // Extracts unique categories from your database
    const rawCategories = dictionaryDatabase.map(row => row.Category).filter(Boolean);
    const uniqueCategories = ['All', ...new Set(rawCategories)].sort();
    
    categoryContainer.innerHTML = uniqueCategories.map(cat => 
        `<button class="category-pill ${cat === 'All' ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</button>`
    ).join('');
}

window.setCategory = function(category) {
    currentCategory = category;
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === category);
    });
    executeSearch();
};

function executeSearch() {
    const query = searchBar.value.toLowerCase().trim();
    let filteredData = dictionaryDatabase;
    
    if (currentCategory !== 'All') {
        filteredData = filteredData.filter(row => row.Category === currentCategory);
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
    const displayData = data.slice(0, 100); // Prevents lag

    if (displayData.length === 0) {
        resultsContainer.innerHTML = `<div class="status-text" style="text-align: center;">No matches found.</div>`;
        return;
    }

    displayData.forEach(row => {
        const card = document.createElement('article');
        card.className = 'word-card';

        // FEATURE 3: Native Audio Playback
        const audioHTML = row.Audio_Link 
            ? `<button class="audio-btn" onclick="new Audio('${row.Audio_Link}').play()" aria-label="Play">🔊</button>` 
            : '';

        const variationsHTML = row.Variations_Kadazan ? `<div class="kadazan-variations">(${row.Variations_Kadazan})</div>` : '';
        const contextHTML = row.English_Context ? `<span class="context-tag">[${row.English_Context}]</span>` : '';
        
        // Formats your Kadazan example sentence correctly
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

// --- FEATURE 4: QUIZ ENGINE ---
toggleQuizBtn.addEventListener('click', () => {
    isQuizMode = !isQuizMode;
    if (isQuizMode) {
        dictionarySection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        toggleQuizBtn.innerText = "🔙 Back to Dictionary";
        loadQuizQuestion();
    } else {
        dictionarySection.classList.remove('hidden');
        quizSection.classList.add('hidden');
        toggleQuizBtn.innerText = "Play Practice Quiz 🎮";
    }
});

function loadQuizQuestion() {
    // Pick a random word from the database
    currentQuizWord = dictionaryDatabase[Math.floor(Math.random() * dictionaryDatabase.length)];
    document.getElementById('quizTargetWord').innerText = currentQuizWord.Root_Kadazan;
    document.getElementById('quizFeedback').innerHTML = '';

    // Build the multiple-choice options (1 correct, 3 distractors)
    let options = [currentQuizWord.Clean_English];
    
    // Pulls from your specific distractors if they exist
    if (currentQuizWord.AI_Quiz_Distractor) {
        let distractors = currentQuizWord.AI_Quiz_Distractor.split(',').map(s => s.trim());
        options = options.concat(distractors);
    }
    
    // Fills the rest with random English words to guarantee 4 choices
    while (options.length < 4) {
        let randomChoice = dictionaryDatabase[Math.floor(Math.random() * dictionaryDatabase.length)].Clean_English;
        if (!options.includes(randomChoice)) options.push(randomChoice);
    }

    // Shuffle options
    options = options.slice(0, 4).sort(() => Math.random() - 0.5);

    // Inject buttons
    const optionsContainer = document.getElementById('quizOptionsContainer');
    optionsContainer.innerHTML = options.map(opt => {
        // Escapes apostrophes safely so the code doesn't break
        const safeOpt = opt.replace(/'/g, "\\'");
        return `<button class="quiz-opt-btn" onclick="checkQuizAnswer('${safeOpt}')">${opt}</button>`;
    }).join('');
}

window.checkQuizAnswer = function(selectedOption) {
    const feedback = document.getElementById('quizFeedback');
    if (selectedOption === currentQuizWord.Clean_English) {
        feedback.innerHTML = `<span class="feedback-correct">Kotohuadan! (Correct!)</span>`;
        setTimeout(loadQuizQuestion, 1500); // Auto-loads next question after 1.5 seconds
    } else {
        feedback.innerHTML = `<span class="feedback-wrong">Try again!</span>`;
    }
};

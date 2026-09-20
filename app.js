// --- CONFIGURATION ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7UDuPwhE3OUKIJeACBvoUpFCMJX_hVBPcxAUxmIh_LS6awxSCGGz1K0rdZOIQRXuGcVnPBWdVpJwn/pub?gid=421571041&single=true&output=csv";

// --- STATE ---
let dictionaryDatabase = [];
const searchBar = document.getElementById('searchBar');
const resultsContainer = document.getElementById('resultsContainer');
const statusText = document.getElementById('statusText');

// --- INITIALIZATION ---
function init() {
    Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            // Filter out any accidental empty rows from the spreadsheet
            dictionaryDatabase = results.data.filter(row => row.Root_Kadazan && row.Clean_English);
            statusText.textContent = `${dictionaryDatabase.length} verified words loaded.`;
            renderResults(dictionaryDatabase);
        },
        error: function(err) {
            statusText.textContent = "Error loading database. Please check connection.";
            console.error("PapaParse Error:", err);
        }
    });
}

// --- SEARCH ENGINE ---
searchBar.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === "") {
        renderResults(dictionaryDatabase);
        return;
    }

    const filteredData = dictionaryDatabase.filter(row => {
        const root = (row.Root_Kadazan || "").toLowerCase();
        const eng = (row.Clean_English || "").toLowerCase();
        const mal = (row.Malay_Translation || "").toLowerCase();
        
        return root.includes(query) || eng.includes(query) || mal.includes(query);
    });

    renderResults(filteredData);
});

// --- UI RENDERER ---
function renderResults(data) {
    resultsContainer.innerHTML = '';
    
    // Performance cap: only render the first 100 results to keep the DOM blazing fast
    const displayData = data.slice(0, 100);

    if (displayData.length === 0) {
        resultsContainer.innerHTML = `<div class="status-text" style="text-align: center;">No exact matches found.</div>`;
        return;
    }

    displayData.forEach(row => {
        const card = document.createElement('article');
        card.className = 'word-card';

        // Conditional UI Elements (Only built if data exists in your sheet)
        const variationsHTML = row.Variations_Kadazan 
            ? `<div class="kadazan-variations">(${row.Variations_Kadazan})</div>` 
            : '';
            
        const contextHTML = row.English_Context 
            ? `<span class="context-tag">[${row.English_Context}]</span>` 
            : '';

        const aiSentenceHTML = row.AI_Sentence 
            ? `<div class="ai-sentence"><strong>Example:</strong> ${row.AI_Sentence}</div>` 
            : '';

        // Assemble the Card
        card.innerHTML = `
            <div class="kadazan-root">${row.Root_Kadazan}</div>
            ${variationsHTML}
            
            <div class="translation-row">
                <span class="lang-badge badge-en">EN</span>
                <span class="translation-text">${row.Clean_English}</span>
                ${contextHTML}
            </div>
            
            <div class="translation-row">
                <span class="lang-badge badge-ms">MS</span>
                <span class="translation-text">${row.Malay_Translation}</span>
            </div>
            
            ${aiSentenceHTML}
        `;
        
        resultsContainer.appendChild(card);
    });
}

// Start the app
init();
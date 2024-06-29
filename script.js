const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsList = document.getElementById('results-list');
const paperSummary = document.getElementById('paper-summary');
const sortBy = document.getElementById('sort-by');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const citationStyle = document.getElementById('citation-style');
const citationOutput = document.getElementById('citation-output');
const copyCitationButton = document.getElementById('copy-citation');
const previewButton = document.getElementById('preview-paper');
const previewSection = document.getElementById('preview-section');
const paperPreview = document.getElementById('paper-preview');
const fullPaperViewButton = document.getElementById('full-paper-view');

searchButton.addEventListener('click', searchPapers);
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPapers();
    }
});

sortBy.addEventListener('change', sortPapers);
citationStyle.addEventListener('change', () => {
    if (currentPaper) {
        updateCitation(currentPaper);
    }
});
copyCitationButton.addEventListener('click', copyCitation);
previewButton.addEventListener('click', openFullPaper);
fullPaperViewButton.addEventListener('click', openFullPaper);

let currentPapers = [];
let currentPaper = null;

async function searchPapers() {
    const keyword = searchInput.value;
    const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
    const toDate = dateTo.value ? new Date(dateTo.value) : null;

    try {
        const response = await fetch(`https://export.arxiv.org/api/query?search_query=all:${keyword}&start=0&max_results=100`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const entries = xmlDoc.getElementsByTagName('entry');
        currentPapers = Array.from(entries).map(entry => ({
            title: entry.getElementsByTagName('title')[0].textContent,
            authors: Array.from(entry.getElementsByTagName('author')).map(author => author.getElementsByTagName('name')[0].textContent),
            published: new Date(entry.getElementsByTagName('published')[0].textContent),
            summary: entry.getElementsByTagName('summary')[0].textContent,
            pdfUrl: entry.querySelector('link[title="pdf"]').getAttribute('href'),
            citations: Math.floor(Math.random() * 1000) // Simulated citation count
        })).filter(paper => {
            if (fromDate && paper.published < fromDate) return false;
            if (toDate && paper.published > toDate) return false;
            return true;
        });

        sortPapers();
    } catch (error) {
        console.error('Error fetching papers:', error);
        resultsList.innerHTML = '<li>Error fetching papers. Please try again.</li>';
    }
}

function sortPapers() {
    switch (sortBy.value) {
        case 'date':
            currentPapers.sort((a, b) => b.published - a.published);
            break;
        case 'relevance':
            currentPapers.sort((a, b) => b.citations - a.citations);
            break;
        case 'alphabetical':
            currentPapers.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            currentPapers.sort((a, b) => b.citations - a.citations);
            break;
    }

    displayPapers();
}

function displayPapers() {
    resultsList.innerHTML = '';
    currentPapers.forEach((paper, index) => {
        const li = document.createElement('li');
        li.textContent = paper.title;
        li.addEventListener('click', () => showPaperDetails(index));
        resultsList.appendChild(li);
    });
}

function showPaperDetails(index) {
    currentPaper = currentPapers[index];
    
    paperSummary.innerHTML = `
            <h3>${currentPaper.title}</h3>
            <p><strong>Authors:</strong> ${currentPaper.authors.join(', ')}</p>
            <p><strong>Published:</strong> ${currentPaper.published.toLocaleDateString()}</p>
            <p><strong>Citations:</strong> ${currentPaper.citations}</p>
            <h4>Abstract</h4>
            <p>${currentPaper.summary}</p>
        `;
    
    updateCitation(currentPaper);
    
    // Hide the preview section when showing new paper details
    previewSection.style.display = 'none';
}

function updateCitation(paper) {
    let citation = '';
    const year = paper.published.getFullYear();
    const url = paper.pdfUrl;

    switch (citationStyle.value) {
        case 'apa':
            citation = `${paper.authors.join(', ')}. (${year}). ${paper.title}. arXiv. ${url}`;
            break;
        case 'mla':
            citation = `${paper.authors.join(', ')}. "${paper.title}." arXiv, ${paper.published.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}, ${url}`;
            break;
        case 'chicago':
            citation = `${paper.authors.join(', ')}. "${paper.title}." arXiv (${year}). ${url}`;
            break;
        case 'harvard':
            citation = `${paper.authors.join(', ')}, ${year}. ${paper.title}. arXiv. Available at: ${url} [Accessed ${new Date().toLocaleDateString()}]`;
            break;
        case 'ieee':
            citation = `${paper.authors.join(', ')}, "${paper.title}," arXiv, ${year}. [Online]. Available: ${url}`;
            break;
        case 'vancouver':
            citation = `${paper.authors.join(', ')}. ${paper.title}. arXiv [Internet]. ${year} [cited ${new Date().toLocaleDateString()}]. Available from: ${url}`;
            break;
        case 'acm':
            citation = `${paper.authors.join(', ')}. ${year}. ${paper.title}. arXiv. DOI: ${url}`;
            break;
        case 'asa':
            citation = `${paper.authors.join(', ')}. ${year}. "${paper.title}." arXiv. Retrieved ${new Date().toLocaleDateString()} (${url})`;
            break;
        case 'cse':
            citation = `${paper.authors.join(', ')}. ${year}. ${paper.title}. arXiv [Internet]. Available from: ${url}`;
            break;
        case 'turabian':
            citation = `${paper.authors.join(', ')}. "${paper.title}." arXiv, ${year}. ${url}`;
            break;
        default:
            citation = 'Unknown citation style';
    }

    citationOutput.textContent = citation;
}

function copyCitation() {
    const citationText = citationOutput.textContent;
    navigator.clipboard.writeText(citationText).then(() => {
        alert('Citation copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy citation: ', err);
    });
}

// function previewPaper() {
//     if (currentPaper) {
//         previewSection.style.display = 'block';
//         paperPreview.innerHTML = `
//             <h3>${currentPaper.title}</h3>
//             <p><strong>Authors:</strong> ${currentPaper.authors.join(', ')}</p>
//             <p><strong>Published:</strong> ${currentPaper.published.toLocaleDateString()}</p>
//             <p><strong>Citations:</strong> ${currentPaper.citations}</p>
//             <h4>Abstract</h4>
//             <p>${currentPaper.summary}</p>
//         `;
//         // Scroll to the preview section
//         previewSection.scrollIntoView({ behavior: 'smooth' });
//     }
// }

function openFullPaper() {
    if (currentPaper) {
        window.open(currentPaper.pdfUrl, '_blank');
    }
}
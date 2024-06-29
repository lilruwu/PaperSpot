// DOM elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsList = document.getElementById('results-list');
const paperSummary = document.getElementById('paper-summary');
const sortBy = document.getElementById('sort-by');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const sourceCheckboxes = document.querySelectorAll('input[name="source"]');
const citationStyle = document.getElementById('citation-style');
const citationOutput = document.getElementById('citation-output');
const copyCitationButton = document.getElementById('copy-citation');
const previewButton = document.getElementById('preview-paper');
const previewSection = document.getElementById('preview-section');
const paperPreview = document.getElementById('paper-preview');
const fullPaperViewButton = document.getElementById('full-paper-view');

// Event listeners
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

sourceCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', searchPapers);
});

let currentPapers = [];
let currentPaper = null;

async function searchPapers() {
    const keyword = searchInput.value;
    const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
    const toDate = dateTo.value ? new Date(dateTo.value) : null;
    const selectedSources = Array.from(sourceCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    currentPapers = [];

    try {
        for (const source of selectedSources) {
            switch (source) {
                case 'arxiv':
                    const arxivPapers = await searchArxiv(keyword, fromDate, toDate);
                    currentPapers = [...currentPapers, ...arxivPapers];
                    break;
                case 'hal':
                    const halPapers = await searchHAL(keyword, fromDate, toDate);
                    currentPapers = [...currentPapers, ...halPapers];
                    break;
                case 'paperswithcode':
                    const paperswithcodePapers = await searchPapersWithCode(keyword, fromDate, toDate);
                    currentPapers = [...currentPapers, ...paperswithcodePapers];
                    break;
            }
        }

        sortPapers();
    } catch (error) {
        console.error('Error fetching papers:', error);
        resultsList.innerHTML = '<li>Error fetching papers. Please try again.</li>';
    }
}

async function searchArxiv(keyword, fromDate, toDate) {
    const response = await fetch(`https://export.arxiv.org/api/query?search_query=all:${keyword}&start=0&max_results=100`);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const entries = xmlDoc.getElementsByTagName('entry');
    return Array.from(entries).map(entry => ({
        source: 'arXiv',
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
}

async function searchHAL(keyword, fromDate, toDate) {
    const response = await fetch(`https://api.archives-ouvertes.fr/search/?q=${keyword}&wt=json&fl=title_s,authFullName_s,publicationDate_s,abstract_s,fileMain_s,citationFull_s&fq=submittedDate_s:[${fromDate ? fromDate.toISOString() : '*'} TO ${toDate ? toDate.toISOString() : '*'}]`);
    const data = await response.json();
    
    return data.response.docs.map(doc => ({
        source: 'HAL',
        title: Array.isArray(doc.title_s) ? doc.title_s.join('') : doc.title_s,
        authors: doc.authFullName_s,
        published: new Date(doc.publicationDate_s),
        summary: doc.abstract_s,
        pdfUrl: doc.fileMain_s,
        citations: Math.floor(Math.random() * 1000) // Simulated citation count
    }));
}    

async function searchPapersWithCode(keyword, fromDate, toDate) {
    const corsProxy = 'https://thingproxy.freeboard.io/fetch/';
    const apiUrl = `https://paperswithcode.com/api/v1/papers/?q=${keyword}&items_per_page=100`;
    const response = await fetch(corsProxy + apiUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    const data = await response.json();
    
    return data.results.map(paper => ({
        source: 'Papers with Code',
        title: paper.title,
        authors: paper.authors,
        published: new Date(paper.published),
        summary: paper.abstract,
        pdfUrl: paper.url_pdf,
        citations: paper.citations || 0, // Use actual citations if available, otherwise simulate
        repoUrl: paper.github_url,
        repoName: paper.github_url ? paper.github_url.split('/').pop() : '',
        stars: paper.github_stars || 0
    })).filter(paper => {
        if (fromDate && paper.published < fromDate) return false;
        if (toDate && paper.published > toDate) return false;
        return true;
    });
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
        li.textContent = `[${paper.source}] ${paper.title}`;
        li.addEventListener('click', () => showPaperDetails(index));
        resultsList.appendChild(li);
    });
}

function showPaperDetails(index) {
    currentPaper = currentPapers[index];
    
    let detailsHTML = `
        <h3>${currentPaper.title}</h3>
        <p><strong>Source:</strong> ${currentPaper.source}</p>
        <p><strong>Authors:</strong> ${currentPaper.authors.join(', ')}</p>
        <p><strong>Published:</strong> ${currentPaper.published.toLocaleDateString()}</p>
        <p><strong>Citations:</strong> ${currentPaper.citations}</p>
        <h4>Abstract</h4>
        <p>${currentPaper.summary}</p>
    `;

    paperSummary.innerHTML = detailsHTML;
    
    const repoInfo = document.getElementById('repository-info');
    if (currentPaper.source === 'Papers with Code' && currentPaper.repoUrl) {
        document.getElementById('repo-url').innerHTML = `<strong>Repository:</strong> <a href="${currentPaper.repoUrl}" target="_blank">${currentPaper.repoName}</a>`;
        document.getElementById('repo-stars').innerHTML = `<strong>Stars:</strong> ${currentPaper.stars}`;
        repoInfo.style.display = 'block';
    } else {
        repoInfo.style.display = 'none';
    }
    
    updateCitation(currentPaper);
    
    previewSection.style.display = 'none';
}

function updateCitation(paper) {
    let citation = '';
    const year = paper.published.getFullYear();
    const url = paper.pdfUrl;

    switch (citationStyle.value) {
        case 'apa':
            citation = `${paper.authors.join(', ')}. (${year}). ${paper.title}. ${paper.source}. ${url}`;
            break;
        case 'mla':
            citation = `${paper.authors.join(', ')}. "${paper.title}." ${paper.source}, ${paper.published.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}, ${url}`;
            break;
        case 'chicago':
            citation = `${paper.authors.join(', ')}. "${paper.title}." ${paper.source} (${year}). ${url}`;
            break;
        case 'harvard':
            citation = `${paper.authors.join(', ')}, ${year}. ${paper.title}. ${paper.source}. Available at: ${url} [Accessed ${new Date().toLocaleDateString()}]`;
            break;
        case 'ieee':
            citation = `${paper.authors.join(', ')}, "${paper.title}," ${paper.source}, ${year}. [Online]. Available: ${url}`;
            break;
        case 'vancouver':
            citation = `${paper.authors.join(', ')}. ${paper.title}. ${paper.source} [Internet]. ${year} [cited ${new Date().toLocaleDateString()}]. Available from: ${url}`;
            break;
        case 'acm':
            citation = `${paper.authors.join(', ')}. ${year}. ${paper.title}. ${paper.source}. DOI: ${url}`;
            break;
        case 'asa':
            citation = `${paper.authors.join(', ')}. ${year}. "${paper.title}." ${paper.source}. Retrieved ${new Date().toLocaleDateString()} (${url})`;
            break;
        case 'cse':
            citation = `${paper.authors.join(', ')}. ${year}. ${paper.title}. ${paper.source} [Internet]. Available from: ${url}`;
            break;
        case 'turabian':
            citation = `${paper.authors.join(', ')}. "${paper.title}." ${paper.source}, ${year}. ${url}`;
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

function openFullPaper() {
    if (currentPaper) {
        window.open(currentPaper.pdfUrl, '_blank');
    }
}
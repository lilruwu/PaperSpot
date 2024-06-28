const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsList = document.getElementById('results-list');
const paperSummary = document.getElementById('paper-summary');
const pdfViewer = document.getElementById('pdf-viewer');
const sourceFilters = document.querySelectorAll('input[name="source"]');

searchButton.addEventListener('click', searchPapers);
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPapers();
    }
});

sourceFilters.forEach(filter => {
    filter.addEventListener('change', searchPapers);
});

async function searchPapers() {
    const keyword = searchInput.value;
    const selectedSources = Array.from(sourceFilters)
        .filter(filter => filter.checked)
        .map(filter => filter.value);

    resultsList.innerHTML = '<li>Searching...</li>';
    
    try {
        const results = await Promise.all(selectedSources.map(source => searchSource(source, keyword)));
        const papers = results.flat();
        displayResults(papers);
    } catch (error) {
        console.error('Error fetching papers:', error);
        resultsList.innerHTML = '<li>Error fetching papers. Please try again.</li>';
    }
}

async function searchSource(source, keyword) {
    let url;
    switch (source) {
        case 'arxiv':
            url = `https://export.arxiv.org/api/query?search_query=all:${keyword}&start=0&max_results=10`;
            break;
        case 'plos':
            url = `https://api.plos.org/search?q=title:${keyword}&fl=id,title,author,abstract&wt=json`;
            break;
        case 'doaj':
            url = `https://doaj.org/api/v2/search/articles/${keyword}`;
            break;
    }

    const response = await fetch(url);
    const data = await (source === 'arxiv' ? response.text() : response.json());
    
    return parseResults(source, data);
}

function parseResults(source, data) {
    switch (source) {
        case 'arxiv':
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            const entries = xmlDoc.getElementsByTagName('entry');
            return Array.from(entries).map(entry => ({
                title: entry.getElementsByTagName('title')[0].textContent,
                summary: entry.getElementsByTagName('summary')[0].textContent,
                pdfUrl: entry.querySelector('link[title="pdf"]').getAttribute('href'),
                source: 'arXiv'
            }));
        case 'plos':
            return data.response.docs.map(paper => ({
                title: paper.title,
                summary: paper.abstract[0],
                pdfUrl: `https://journals.plos.org/plosone/article/file?id=${paper.id}&type=printable`,
                source: 'PLOS ONE'
            }));
        case 'doaj':
            return data.results.map(paper => ({
                title: paper.bibjson.title,
                summary: paper.bibjson.abstract,
                pdfUrl: paper.bibjson.link.find(link => link.type === 'fulltext').url,
                source: 'DOAJ'
            }));
    }
}

function displayResults(papers) {
    resultsList.innerHTML = '';
    papers.forEach((paper, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="paper-source">[${paper.source}]</span> ${paper.title}`;
        li.addEventListener('click', () => showPaperDetails(paper));
        resultsList.appendChild(li);
    });
}

function showPaperDetails(paper) {
    paperSummary.innerHTML = `
        <h3>${paper.title}</h3>
        <p><strong>Source:</strong> ${paper.source}</p>
        <p>${paper.summary}</p>
        <p><a href="${paper.pdfUrl}" target="_blank">Download PDF</a></p>
    `;
    
    loadPDF(paper.pdfUrl);
}

async function loadPDF(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        pdfViewer.innerHTML = '';
        
        for (let pageNum = 1; pageNum <= Math.min(5, pdf.numPages); pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext);
            pdfViewer.appendChild(canvas);
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
        pdfViewer.innerHTML = '<p>Error loading PDF. Please try downloading it directly.</p>';
    }
}
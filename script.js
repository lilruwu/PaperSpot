const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsList = document.getElementById('results-list');
const paperSummary = document.getElementById('paper-summary');
const pdfViewer = document.getElementById('pdf-viewer');

searchButton.addEventListener('click', searchPapers);
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPapers();
    }
});

async function searchPapers() {
    const keyword = searchInput.value;
    try {
        const response = await fetch(`https://export.arxiv.org/api/query?search_query=all:${keyword}&start=0&max_results=10`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const entries = xmlDoc.getElementsByTagName('entry');
        resultsList.innerHTML = '';
        
        for (let entry of entries) {
            const title = entry.getElementsByTagName('title')[0].textContent;
            const li = document.createElement('li');
            li.textContent = title;
            li.addEventListener('click', () => showPaperDetails(entry));
            resultsList.appendChild(li);
        }
    } catch (error) {
        console.error('Error fetching papers:', error);
        resultsList.innerHTML = '<li>Error fetching papers. Please try again.</li>';
    }
}

function showPaperDetails(entry) {
    const title = entry.getElementsByTagName('title')[0].textContent;
    const summary = entry.getElementsByTagName('summary')[0].textContent;
    const pdfUrl = entry.querySelector('link[title="pdf"]').getAttribute('href');
    
    paperSummary.innerHTML = `
        <h3>${title}</h3>
        <p>${summary}</p>
        <p><a href="${pdfUrl}" target="_blank">Download PDF</a></p>
    `;
    
    loadPDF(pdfUrl);
}

async function loadPDF(url) {
    try {
        const secureUrl = url.replace('http://', 'https://');
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
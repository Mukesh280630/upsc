let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    cleanDatabase(); 
    loadBooksFromStorage();
});

function getCleanUrl(input) {
    if (!input) return "";
    let match = input.match(/(https?:\/\/[^"'>\s]+)/);
    return match ? match[1] : "";
}

function cleanDatabase() {
    let books = JSON.parse(localStorage.getItem('upscBooks')) || [];
    let isChanged = false;
    books.forEach((book, idx) => {
        if(!book.id) { book.id = 'book_' + Date.now() + '_' + idx; isChanged = true; }
        if(book.price === undefined || book.price === null) { book.price = 0; isChanged = true; }
        let cleanImg = getCleanUrl(book.image);
        if (book.image !== cleanImg) { book.image = cleanImg; isChanged = true; }
    });
    if (isChanged) localStorage.setItem('upscBooks', JSON.stringify(books));
}

window.addEventListener('storage', (event) => {
    if (event.key === 'upscBooks' || event.key === 'upscAccessRequests' || event.key === 'upscPurchases') {
        cleanDatabase();
        loadBooksFromStorage();
    }
});

function loadBooksFromStorage() {
    let storedBooks = JSON.parse(localStorage.getItem('upscBooks')) || [];
    let container = document.getElementById('bookGrid');
    if (!container) return;

    container.innerHTML = ''; 
    if (currentCategory === 'pib') return; 

    if (storedBooks.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px; color: #94a3b8; font-weight:500;"><i class="fas fa-folder-open" style="font-size:2rem; margin-bottom:10px;"></i><br>No study materials have been uploaded yet.</div>';
        return;
    }

    let searchDate = document.getElementById('dateFilterInput') ? document.getElementById('dateFilterInput').value : '';
    let searchText = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toUpperCase() : '';

    let visibleBooks = storedBooks.filter(book => {
        let matchesCategory = (currentCategory === 'all' || book.category === currentCategory);
        let matchesDate = (searchDate === '' || book.dateAdded === searchDate);
        let matchesText = (searchText === '' || book.title.toUpperCase().includes(searchText) || book.author.toUpperCase().includes(searchText));
        return matchesCategory && matchesDate && matchesText;
    });

    if (visibleBooks.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        return;
    } else {
        document.getElementById('noResults').style.display = 'none';
    }

    let groupedBooks = {};
    visibleBooks.forEach(book => {
        let groupKey = "General";
        if (book.category === 'pib' && book.ministry) groupKey = book.ministry;
        else if (book.subject) groupKey = book.subject;
        
        if (!groupedBooks[groupKey]) groupedBooks[groupKey] = [];
        groupedBooks[groupKey].push(book);
    });

    let userStr = localStorage.getItem('loggedInUser');
    let userEmail = userStr ? JSON.parse(userStr).email : '';
    let purchases = JSON.parse(localStorage.getItem('upscPurchases')) || {};
    let userPurchases = purchases[userEmail] || [];
    let requests = JSON.parse(localStorage.getItem('upscAccessRequests')) || [];
    
    // To grab the studentId to send to the admin request
    let studentId = userStr && JSON.parse(userStr).studentId ? JSON.parse(userStr).studentId : 0;

    for (let group in groupedBooks) {
        let groupHTML = `<h3 class="list-group-header">${group}</h3>`;
        
        groupedBooks[group].forEach(book => {
            let safeImg = getCleanUrl(book.image);
            let visualHTML = safeImg !== "" 
                ? `<img src="${safeImg}" alt="Cover" onerror="this.src='logo.jpg'">` 
                : `<div class="icon-placeholder"><i class="fas fa-book"></i></div>`;

            let displayDate = book.dateAdded ? new Date(book.dateAdded).toLocaleDateString() : '';

            let actionButtonHTML = '';
            
            // Check if price is strictly 0 (Free)
            if (book.price === 0 || userPurchases.includes(book.id)) {
                actionButtonHTML = `<a href="${book.link}" class="btn-download-small" target="_blank"><i class="fas fa-download"></i> Download</a>`;
            } else {
                // Not free, and not purchased
                let isPending = requests.some(req => req.studentEmail === userEmail && req.bookId === book.id && req.status === 'pending');
                
                if(isPending) {
                    actionButtonHTML = `<button class="btn-download-small" style="background:#f59e0b; cursor:not-allowed; box-shadow:none;" disabled><i class="fas fa-clock"></i> Pending</button>`;
                } else {
                    actionButtonHTML = `<button onclick="requestPurchase('${book.id}', '${book.title.replace(/'/g, "\\'")}', ${book.price}, ${studentId})" class="btn-download-small" style="background:#ef4444;"><i class="fas fa-lock"></i> Buy (₹${book.price})</button>`;
                }
            }

            groupHTML += `
                <div class="list-item">
                    <div class="item-img-box">${visualHTML}</div>
                    <div class="item-details">
                        <h4>${book.title} ${book.isNew ? '<span class="badge-round" style="margin-left:8px; font-size:0.65rem; padding:2px 6px;">New</span>' : ''}</h4>
                        <p>${book.author} <span style="margin: 0 10px; color:#cbd5e1;">|</span> <i class="fas fa-calendar-alt" style="color:#94a3b8;"></i> ${displayDate}</p>
                    </div>
                    <div class="item-actions">
                        <span class="badge-pill">${book.category.replace('-', ' ')}</span>
                        ${actionButtonHTML}
                    </div>
                </div>
            `;
        });
        container.insertAdjacentHTML('beforeend', groupHTML);
    }
}

function filterBooks() { loadBooksFromStorage(); }

function filterCategory(category, isUserClick = true) {
    currentCategory = category; 
    
    if(isUserClick && event && event.currentTarget) {
        document.querySelectorAll('.side-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        let titleMap = {
            'all': 'Latest Materials', 'ncert': 'NCERT Books', 'standard-books': 'Standard Books',
            'current-affairs': 'Current Affairs', 'yojana': 'Yojana & Kurukshetra', 'pib': 'PIB Live Portal'
        };
        document.getElementById('currentCategoryTitle').innerText = titleMap[category] || 'Materials';

        if(document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
        if(document.getElementById('dateFilterInput')) document.getElementById('dateFilterInput').value = '';
    }

    let stdContent = document.getElementById('standardContentArea');
    let pibLaunchpad = document.getElementById('pibLaunchpadContainer');

    if (category === 'pib') {
        if(stdContent) stdContent.style.display = 'none';
        if(pibLaunchpad) pibLaunchpad.style.display = 'block';
    } else {
        if(stdContent) stdContent.style.display = 'block';
        if(pibLaunchpad) pibLaunchpad.style.display = 'none';
        loadBooksFromStorage();
    }
}
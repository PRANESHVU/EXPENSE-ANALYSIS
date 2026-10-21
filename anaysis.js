class ExpenseManager {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('ss_ex')) || [];
        this.budget = parseFloat(localStorage.getItem('ss_bg')) || 0;
    }
    add(name, amount, category, date) {
        this.expenses.push({ 
            id: 'id_' + Date.now(), 
            name: name.trim(), 
            amount: parseFloat(amount), 
            category: category, 
            date: date 
        });
        this.save();
    }
    delete(id) {
        this.expenses = this.expenses.filter(item => item.id !== id);
        this.save();
    }
    clear() { 
        this.expenses = []; 
        this.save(); 
    }
    save() { 
        localStorage.setItem('ss_ex', JSON.stringify(this.expenses));
        localStorage.setItem('ss_bg', this.budget);
    }
    getMetrics() {
        const now = new Date();
        const currentMonth = this.expenses.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const spent = currentMonth.reduce((sum, item) => sum + item.amount, 0);
        return { 
            spent: spent, 
            count: currentMonth.length, 
            remaining: this.budget - spent, 
            isOver: spent > this.budget && this.budget > 0 
        };
    }

    validate(data) {
        return Array.isArray(data);
    }
}

const mgr = new ExpenseManager();
const getEl = id => document.getElementById(id);
const escapeHTML = str => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

getEl('budgetInput').value = mgr.budget || '';
 updateUI();
function updateUI() {
    const stats = mgr.getMetrics();
    getEl('totalSpending').textContent = '₹' + stats.spent.toFixed(2);
    getEl('expenseCount').textContent = stats.count;
    getEl('remainingBudget').textContent = '₹' + stats.remaining.toFixed(2);

    const card = getEl('budgetCard');
    card.classList.toggle('exceeded-alert', stats.isOver);
    card.querySelector('h3').textContent = stats.isOver ? "Limit Exceeded!" : "Remaining Budget";
    renderTable();
}

function renderTable() {
    const query = getEl('searchBar').value.toLowerCase().trim();
    const cat = getEl('categoryFilter').value;
    const sortOrder = getEl('dateSort').value;

    let list = mgr.expenses.filter(e => e.name.toLowerCase().includes(query) && (cat === 'All' || e.category === cat));
    
    list.sort((a, b) => sortOrder === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));

    if (list.length > 0) {
        getEl('expenseTableBody').innerHTML = list.map(item => `
            <tr>
                <td><strong>${escapeHTML(item.name)}</strong></td>
                <td>₹${item.amount.toFixed(2)}</td>
                <td><span class="category-badge ${item.category.toLowerCase()}">${item.category}</span></td>
                <td>${item.date}</td>
                <td><button class="delete-btn" data-id="${item.id}">Delete</button></td>
            </tr>
        `).join('');
    } else {
        getEl('expenseTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#a0aec0;padding:20px;">No entries logged.</td></tr>`;
    }
}

getEl('expenseForm').addEventListener('submit', event => {
    event.preventDefault();
    
    const name = getEl('expName').value;
    const amt = getEl('expAmount').value;
    const cat = getEl('expCategory').value;
    const dt = getEl('expDate').value;
    
    if (!name.trim() || !amt || !cat || !dt || amt <= 0) {
        return alert('Please complete all form fields correctly.');
    }
    
    mgr.add(name, amt, cat, dt);
    getEl('expenseForm').reset();
    updateUI();
});

getEl('expenseTableBody').addEventListener('click', event => {
    if (event.target.dataset.id) { 
        mgr.delete(event.target.dataset.id); 
        updateUI(); 
    }
});

getEl('setBudgetBtn').addEventListener('click', () => {
    const val = parseFloat(getEl('budgetInput').value);
    mgr.budget = isNaN(val) || val < 0 ? 0 : val;
    mgr.save();
    updateUI();
});

['searchBar', 'categoryFilter', 'dateSort'].forEach(id => getEl(id).addEventListener('input', renderTable));

getEl('exportBtn').addEventListener('click', () => {
    const dl = document.createElement('a');
    dl.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mgr.expenses, null, 2));
    dl.download = 'SpendSmart_Export.json';
    dl.click();
});

getEl('fakeImportBtn').addEventListener('click', () => getEl('importFile').click());

getEl('importFile').addEventListener('change', event => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (mgr.validate(importedData) && confirm("Overwrite local entries?")) {
                mgr.expenses = importedData; 
                mgr.save(); 
                updateUI();
            } else {
                alert("Structural Error: Invalid file layout schema.");
            }
        } catch { 
            alert("Failed to parse JSON file."); 
        }
    };
    reader.readAsText(files[0]);
    event.target.value = '';
});

getEl('clearAllBtn').addEventListener('click', () => {
    if (confirm("Delete all transactions? Budget will be preserved.")) { 
        mgr.clear(); 
        updateUI(); 
    }
});

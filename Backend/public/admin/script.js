
const API_URL = '/api/admin';
const AUTH_URL = '/auth';

// State
let token = localStorage.getItem('admin_token');
let user = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const contentPages = document.querySelectorAll('.page');
const menuItems = document.querySelectorAll('.sidebar li');

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        verifyToken();
    } else {
        showLogin();
    }
});

// Auth Functions
async function login(email, password) {
    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            user = data.user;
            localStorage.setItem('admin_token', token);

            if (user.role !== 'admin') {
                throw new Error('Access denied: You are not an administrator.');
            }

            showDashboard();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        loginError.textContent = e.message;
        logout();
    }
}

async function verifyToken() {
    try {
        const res = await fetch(`${AUTH_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.user.role === 'admin') {
            user = data.user;
            showDashboard();
        } else {
            throw new Error('Session expired or unauthorized');
        }
    } catch (e) {
        logout();
    }
}

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('admin_token');
    showLogin();
}

// UI Functions
function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadPage('overview');
}

function showPage(pageId) {
    contentPages.forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    // Update menu
    menuItems.forEach(item => item.classList.remove('active'));
    // Find the li with onclick="showPage('pageId')"
    // Simple iteration or bind click properly

    loadPage(pageId);
}

// Data Loading
async function loadPage(pageId) {
    if (pageId === 'overview') await loadOverview();
    if (pageId === 'users') await loadUsers();
    if (pageId === 'logs') await loadLogs();
    if (pageId === 'usage') await loadUsage();
}

async function loadOverview() {
    const res = await fetch(`${API_URL}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    document.getElementById('stat-users').innerText = data.users;
    document.getElementById('stat-requests').innerText = data.totalRequests;
    document.getElementById('stat-errors').innerText = data.errors;

    // Render Chart
    // (Mock data for now or parse `recentActivity` if it was time-series)
    // We'll just list recent activity for now in the chart area as a list? 
    // Or render a simple chart if data available?
    // Let's make a dummy chart with real values if possible.
    renderChart();
}

async function loadUsers() {
    const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td>
                <select onchange="updateRole('${u.id}', this.value)">
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="general" ${u.role === 'general' ? 'selected' : ''}>General</option>
                </select>
            </td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>-</td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateRole = async (userId, newRole) => {
    try {
        const res = await fetch(`${API_URL}/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ roleName: newRole })
        });
        if (!res.ok) throw new Error('Failed to update role');
        alert('Role updated!');
    } catch (e) {
        alert(e.message);
    }
};

async function loadLogs() {
    const res = await fetch(`${API_URL}/logs/activity?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();

    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = logs.map(l => `
        <tr>
            <td>${new Date(l.created_at).toLocaleString()}</td>
            <td>${l.user_id || 'System'}</td>
            <td>${l.action}</td>
            <td>${JSON.stringify(l.details).substring(0, 50)}...</td>
            <td>${l.ip_address}</td>
        </tr>
    `).join('');
}

async function loadUsage() {
    const res = await fetch(`${API_URL}/logs/usage?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json(); // returns array

    const tbody = document.getElementById('usage-table-body');
    tbody.innerHTML = logs.map(l => `
        <tr>
            <td>${new Date(l.created_at).toLocaleString()}</td>
            <td>${l.endpoint}</td>
            <td>${l.method}</td>
            <td style="color: ${l.status_code >= 400 ? 'red' : 'green'}">${l.status_code}</td>
            <td>${l.response_time_ms}ms</td>
        </tr>
    `).join('');
}

// Chart.js
function renderChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    // Destroy previous if exists?
    // Start fresh.
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Requests',
                data: [12, 19, 3, 5, 2, 3, 15], // Mock data for now
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
            }
        }
    });
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});


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
const loginButton = document.getElementById('login-button');
const contentPages = document.querySelectorAll('.page');
const menuItems = document.querySelectorAll('.menu-item');
const logoutButton = document.getElementById('logout-button');
const dashboardTitle = document.getElementById('dashboard-title');

// Init
document.addEventListener('DOMContentLoaded', () => {
    bindSidebarEvents();

    if (token) {
        verifyToken();
    } else {
        showLogin();
    }
});

function setLoginError(message = '') {
    loginError.textContent = message;
}

function setLoginLoading(isLoading) {
    if (!loginButton) return;
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? 'Signing In...' : 'Sign In';
}

function normalizeRole(rawUser) {
    return rawUser?.role || rawUser?.role_name || 'general';
}

function bindSidebarEvents() {
    menuItems.forEach((item) => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}

// Auth Functions
async function login(email, password) {
    setLoginError('');

    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        if (data.requiresMfa) {
            throw new Error('MFA is enabled for this account. Please log in from the main app flow to complete verification.');
        }

        if (!data.token || !data.user) {
            throw new Error('Invalid login response from server.');
        }

        const role = normalizeRole(data.user);
        if (role !== 'admin') {
            throw new Error('Access denied: You are not an administrator.');
        }

        token = data.token;
        user = { ...data.user, role };
        localStorage.setItem('admin_token', token);
        showDashboard();
    } catch (e) {
        setLoginError(e.message || 'Unexpected login error');
        logout();
    }
}

async function verifyToken() {
    try {
        const res = await fetch(`${AUTH_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const role = normalizeRole(data?.user);
        if (res.ok && data?.user && role === 'admin') {
            user = { ...data.user, role };
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
    if (dashboardTitle && user?.email) {
        dashboardTitle.textContent = `Signed in as ${user.email}`;
    }
    loadPage('overview');
}

function showPage(pageId) {
    contentPages.forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    menuItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });

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
    if (!res.ok) throw new Error('Failed to load overview stats');
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
    if (!res.ok) throw new Error('Failed to load users');
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
    if (!res.ok) throw new Error('Failed to load activity logs');
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
    if (!res.ok) throw new Error('Failed to load usage logs');
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
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = [12, 19, 3, 5, 2, 3, 15];
    const maxVal = Math.max(...points, 1);

    const width = canvas.clientWidth || 640;
    const height = 260;
    const padding = 24;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(6, 17, 38, 0.72)';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(126, 164, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
        const y = padding + ((height - padding * 2) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Line path
    ctx.strokeStyle = '#00d4c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    points.forEach((value, index) => {
        const x = padding + ((width - padding * 2) * index) / (points.length - 1);
        const y = height - padding - (value / maxVal) * (height - padding * 2);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under line
    ctx.beginPath();
    points.forEach((value, index) => {
        const x = padding + ((width - padding * 2) * index) / (points.length - 1);
        const y = height - padding - (value / maxVal) * (height - padding * 2);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 212, 199, 0.14)';
    ctx.fill();

    // Points
    points.forEach((value, index) => {
        const x = padding + ((width - padding * 2) * index) / (points.length - 1);
        const y = height - padding - (value / maxVal) * (height - padding * 2);
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#33a1ff';
        ctx.fill();
    });
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    setLoginLoading(true);
    login(email, password).finally(() => setLoginLoading(false));
});

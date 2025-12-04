// dashboard.js
let refreshInterval = null;
let cameraIntervals = {};

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    initSettings();
    displayUserInfo();
    loadDashboard();
    startAutoRefresh();
    startClock();
});

function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        if (nameEl) nameEl.textContent = user.name || user.email;
        if (roleEl) roleEl.textContent = user.role.toUpperCase();
    }
}

async function loadDashboard() {
    const data = await apiCall('/api/dashboard/full');
    if (!data || !data.success) return;
    
    displayStats(data.stats);
    displayMqttStatus(data.mqtt);
    displaySlots(data.slots, data.data);
}

function displayStats(stats) {
    document.getElementById('stat-slots').textContent = stats.total_slots || 0;
    document.getElementById('stat-cameras').textContent = stats.total_cameras || 0;
    document.getElementById('stat-controls').textContent = stats.total_controls || 0;
    document.getElementById('stat-charts').textContent = stats.total_charts || 0;
}

function displayMqttStatus(mqtt) {
    const el = document.getElementById('mqtt-status');
    if (el) {
        el.innerHTML = mqtt.connected 
            ? `<span class="status-dot connected"></span> ${t('connected')}`
            : `<span class="status-dot disconnected"></span> ${t('disconnected')}`;
    }
}

function displaySlots(slots, data) {
    const container = document.getElementById('slots-container');
    if (!container) return;
    
    if (!slots || slots.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>📭 ${t('noDevice')}</p>
            ${isAdmin() ? `<a href="slots.html" class="btn btn-primary">${t('addDevice')}</a>` : ''}
        </div>`;
        return;
    }
    
    let html = '';
    
    // Value slots
    const valueSlots = slots.filter(s => s.type === 'value');
    if (valueSlots.length > 0) {
        html += `<div class="slots-section"><h3>📊 ${t('value')}</h3><div class="slots-grid">`;
        valueSlots.forEach(slot => {
            const d = data[slot.slot_number];
            html += `<div class="slot-card value-card">
                <div class="slot-icon">${slot.icon || '📟'}</div>
                <div class="slot-name">${slot.name}</div>
                <div class="slot-value">${d ? d.value : '--'}<span class="slot-unit">${slot.unit || ''}</span></div>
                <div class="slot-location">${slot.location || ''}</div>
                <div class="slot-time">${d ? formatTime(d.created_at) : ''}</div>
            </div>`;
        });
        html += '</div></div>';
    }
    
    // Status slots
    const statusSlots = slots.filter(s => s.type === 'status');
    if (statusSlots.length > 0) {
        html += `<div class="slots-section"><h3>🔔 ${t('status')}</h3><div class="slots-grid">`;
        statusSlots.forEach(slot => {
            const d = data[slot.slot_number];
            const isOn = d && (d.value === '1' || d.value === 1);
            html += `<div class="slot-card status-card ${isOn ? 'on' : 'off'}">
                <div class="slot-icon">${slot.icon || '🔔'}</div>
                <div class="slot-name">${slot.name}</div>
                <div class="status-indicator"><span class="dot ${isOn ? 'on' : 'off'}"></span> ${isOn ? t('on') : t('off')}</div>
                <div class="slot-location">${slot.location || ''}</div>
            </div>`;
        });
        html += '</div></div>';
    }
    
    // Control slots
    const controlSlots = slots.filter(s => s.type === 'control');
    if (controlSlots.length > 0) {
        html += `<div class="slots-section"><h3>💡 ${t('control')}</h3><div class="slots-grid">`;
        controlSlots.forEach(slot => {
            const d = data[slot.slot_number];
            const isOn = d && (d.value === '1' || d.value === 1);
            const canControl = isOperator();
            html += `<div class="slot-card control-card">
                <div class="slot-icon">${slot.icon || '💡'}</div>
                <div class="slot-name">${slot.name}</div>
                ${canControl ? `
                    <label class="toggle-switch">
                        <input type="checkbox" ${isOn ? 'checked' : ''} onchange="toggleControl(${slot.slot_number}, this.checked)">
                        <span class="slider"></span>
                    </label>
                ` : `<div class="status-indicator"><span class="dot ${isOn ? 'on' : 'off'}"></span> ${isOn ? t('on') : t('off')}</div>`}
                <div class="slot-location">${slot.location || ''}</div>
            </div>`;
        });
        html += '</div></div>';
    }
    
    // Camera slots
    const cameraSlots = slots.filter(s => s.type === 'camera');
    if (cameraSlots.length > 0) {
        html += `<div class="slots-section"><h3>📷 ${t('camera')}</h3><div class="slots-grid cameras-grid">`;
        cameraSlots.forEach(slot => {
            html += `<div class="slot-card camera-card">
                <div class="slot-name">${slot.name}</div>
                <div class="camera-container">
                    ${slot.stream_url 
                        ? `<img id="camera-${slot.slot_number}" src="${slot.stream_url}" class="camera-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22240%22><rect fill=%22%23333%22 width=%22100%%22 height=%22100%%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23666%22 text-anchor=%22middle%22>No Signal</text></svg>'">`
                        : `<img id="camera-${slot.slot_number}" src="" class="camera-image">`
                    }
                </div>
                <div class="slot-location">${slot.location || ''}</div>
            </div>`;
            if (!slot.stream_url) loadCameraImage(slot.slot_number);
        });
        html += '</div></div>';
    }
    
    // Chart slots
    const chartSlots = slots.filter(s => s.type === 'chart');
    if (chartSlots.length > 0) {
        html += `<div class="slots-section"><h3>📈 ${t('chart')}</h3><div class="charts-grid">`;
        chartSlots.forEach(slot => {
            html += `<div class="slot-card chart-card">
                <div class="slot-name">${slot.name}</div>
                <canvas id="chart-${slot.slot_number}"></canvas>
                <div class="slot-location">${slot.location || ''}</div>
            </div>`;
        });
        html += '</div></div>';
        setTimeout(() => chartSlots.forEach(s => loadChart(s)), 100);
    }
    
    container.innerHTML = html;
}

async function toggleControl(num, isOn) {
    const data = await apiCall(`/api/control/${num}`, 'POST', { command: isOn ? 1 : 0 });
    if (!data || !data.success) {
        showError('Không thể điều khiển!');
        loadDashboard();
    }
}

async function loadCameraImage(num) {
    const data = await apiCall(`/api/camera/${num}`);
    if (data && data.success && data.data && data.data.image_data) {
        const img = document.getElementById(`camera-${num}`);
        if (img) img.src = data.data.image_data;
    }
}

async function loadChart(slot) {
    const data = await apiCall(`/api/data/${slot.slot_number}/history?limit=20`);
    if (!data || !data.success || !data.data) return;
    
    const canvas = document.getElementById(`chart-${slot.slot_number}`);
    if (!canvas) return;
    
    const history = data.data.reverse();
    const labels = history.map(d => new Date(d.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}));
    const values = history.map(d => parseFloat(d.value) || 0);
    
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: slot.name,
                data: values,
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } }
            }
        }
    });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return t('justNow');
    if (diff < 3600) return Math.floor(diff / 60) + ' ' + t('minutesAgo');
    if (diff < 86400) return Math.floor(diff / 3600) + ' ' + t('hoursAgo');
    return date.toLocaleDateString('vi-VN');
}

function startAutoRefresh() {
    refreshInterval = setInterval(loadDashboard, REFRESH_INTERVAL);
}

function startClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleString('vi-VN', {
            weekday: 'long', year: 'numeric', month: '2-digit', 
            day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    updateClock();
    setInterval(updateClock, 1000);
}

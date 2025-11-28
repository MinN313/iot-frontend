// ============================================================
// 📄 frontend/js/dashboard.js
// XỬ LÝ DASHBOARD - HIỂN THỊ DỮ LIỆU VÀ ĐIỀU KHIỂN
// ============================================================

// ==================== KHỞI TẠO DASHBOARD ====================
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    if (!checkAuth()) {
        return;
    }
    
    // Hiển thị thông tin user
    displayUserInfo();
    
    // Tải dữ liệu dashboard
    loadDashboard();
    
    // Tự động refresh mỗi 10 giây
    setInterval(loadDashboard, 10000);
});

// ==================== HIỂN THỊ THÔNG TIN USER ====================
function displayUserInfo() {
    const user = getUser();
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    
    if (user) {
        if (userNameEl) userNameEl.textContent = user.name || user.email;
        if (userRoleEl) userRoleEl.textContent = user.role;
    }
}

// ==================== TẢI DASHBOARD ====================
async function loadDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadSensorData(),
            loadCameras(),
            loadDevices(),
            loadAlerts()
        ]);
    } catch (error) {
        console.error('Lỗi tải dashboard:', error);
    }
}

// ==================== TẢI THỐNG KÊ ====================
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            // Cập nhật các thẻ thống kê
            updateStat('total-devices', stats.total_devices);
            updateStat('online-devices', stats.online_devices);
            updateStat('total-cameras', stats.total_cameras);
            updateStat('unread-alerts', stats.unread_alerts);
        }
    } catch (error) {
        console.error('Lỗi tải stats:', error);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || 0;
}

// ==================== TẢI DỮ LIỆU SENSOR ====================
async function loadSensorData() {
    try {
        const response = await fetch(`${API_URL}/api/sensors`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
            const sensor = data.data;
            
            // Cập nhật hiển thị
            const tempEl = document.getElementById('temperature');
            const humidEl = document.getElementById('humidity');
            const motionEl = document.getElementById('motion');
            
            if (tempEl) tempEl.textContent = (sensor.temperature || 0).toFixed(1) + '°C';
            if (humidEl) humidEl.textContent = (sensor.humidity || 0).toFixed(0) + '%';
            if (motionEl) motionEl.textContent = sensor.motion ? 'Có' : 'Không';
        }
    } catch (error) {
        console.error('Lỗi tải sensor:', error);
    }
}

// ==================== TẢI DANH SÁCH CAMERA ====================
async function loadCameras() {
    try {
        const response = await fetch(`${API_URL}/api/cameras`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayCameras(data.data);
        }
    } catch (error) {
        console.error('Lỗi tải cameras:', error);
    }
}

function displayCameras(cameras) {
    const container = document.getElementById('camera-grid');
    if (!container) return;
    
    if (cameras.length === 0) {
        container.innerHTML = '<p style="color: #aaa;">Chưa có camera nào</p>';
        return;
    }
    
    container.innerHTML = cameras.map(cam => `
        <div class="camera-card">
            <div class="camera-preview">
                <span>📷</span>
            </div>
            <div class="camera-info">
                <h3>${cam.name}</h3>
                <p>📍 ${cam.location || 'Chưa đặt vị trí'}</p>
                <div class="camera-status">
                    <span class="status-dot ${cam.status === 'online' ? 'online' : 'offline'}"></span>
                    <span>${cam.status === 'online' ? 'Đang hoạt động' : 'Offline'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== TẢI DANH SÁCH THIẾT BỊ ====================
async function loadDevices() {
    try {
        const response = await fetch(`${API_URL}/api/devices`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayDevices(data.data);
        }
    } catch (error) {
        console.error('Lỗi tải devices:', error);
    }
}

function displayDevices(devices) {
    const container = document.getElementById('device-grid');
    if (!container) return;
    
    // Lọc chỉ lấy các thiết bị điều khiển được (led, relay)
    const controllableDevices = devices.filter(d => 
        d.type === 'led' || d.type === 'relay'
    );
    
    if (controllableDevices.length === 0) {
        container.innerHTML = '<p style="color: #aaa;">Chưa có thiết bị điều khiển nào</p>';
        return;
    }
    
    container.innerHTML = controllableDevices.map(device => `
        <div class="device-card">
            <div class="device-info">
                <i>${device.type === 'led' ? '💡' : '🔌'}</i>
                <div>
                    <h4>${device.name}</h4>
                    <p>${device.location || ''}</p>
                </div>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" 
                       id="device-${device.device_id}"
                       ${device.status === 'on' ? 'checked' : ''}
                       onchange="controlDevice('${device.device_id}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </div>
    `).join('');
}

// ==================== ĐIỀU KHIỂN THIẾT BỊ ====================
async function controlDevice(deviceId, isOn) {
    try {
        const response = await fetch(`${API_URL}/api/devices/${deviceId}/control`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                action: isOn ? 'on' : 'off'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${deviceId}: ${isOn ? 'BẬT' : 'TẮT'}`);
        } else {
            alert('Lỗi: ' + data.error);
            // Reset lại checkbox
            document.getElementById(`device-${deviceId}`).checked = !isOn;
        }
    } catch (error) {
        console.error('Lỗi điều khiển:', error);
        alert('Không thể kết nối đến server!');
    }
}

// ==================== TẢI CẢNH BÁO ====================
async function loadAlerts() {
    try {
        const response = await fetch(`${API_URL}/api/alerts`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAlerts(data.data);
        }
    } catch (error) {
        console.error('Lỗi tải alerts:', error);
    }
}

function displayAlerts(alerts) {
    const container = document.getElementById('alert-list');
    if (!container) return;
    
    if (alerts.length === 0) {
        container.innerHTML = '<p style="color: #aaa; text-align: center; padding: 20px;">Không có cảnh báo nào</p>';
        return;
    }
    
    // Chỉ hiển thị 10 cảnh báo mới nhất
    const recentAlerts = alerts.slice(0, 10);
    
    container.innerHTML = recentAlerts.map(alert => `
        <div class="alert-item ${alert.is_read ? '' : 'unread'}">
            <span class="alert-icon ${getAlertIconClass(alert.alert_type)}">
                ${getAlertIcon(alert.alert_type)}
            </span>
            <div class="alert-content">
                <h4>${alert.message}</h4>
                <p>Thiết bị: ${alert.device_id || 'N/A'}</p>
            </div>
            <span class="alert-time">${formatTime(alert.created_at)}</span>
        </div>
    `).join('');
}

function getAlertIcon(type) {
    const icons = {
        'temp_high': '🌡️',
        'temp_low': '❄️',
        'humidity_high': '💧',
        'humidity_low': '🏜️',
        'motion': '🚶',
        'default': '⚠️'
    };
    return icons[type] || icons['default'];
}

function getAlertIconClass(type) {
    if (type.includes('high') || type === 'motion') return 'danger';
    if (type.includes('low')) return 'warning';
    return 'info';
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN');
}
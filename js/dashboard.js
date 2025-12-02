// ============================================================
// dashboard.js - XỬ LÝ DASHBOARD
// ============================================================
// File này xử lý:
// - Hiển thị dữ liệu slots
// - Điều khiển thiết bị
// - Hiển thị camera
// - Cập nhật real-time
// ============================================================

// Biến global
let refreshTimer = null;
let cameraTimers = {};
let dashboardData = null;

// ==================== KHỞI TẠO ====================

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    if (!checkAuth()) return;
    
    // Hiển thị thông tin user
    displayUserInfo();
    
    // Load dữ liệu
    loadDashboard();
    
    // Tự động refresh
    startAutoRefresh();
});

function displayUserInfo() {
    /**
     * Hiển thị tên và role của user
     */
    const user = getCurrentUser();
    
    if (user) {
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        
        if (userNameEl) userNameEl.textContent = user.name || user.email;
        if (userRoleEl) userRoleEl.textContent = getRoleName(user.role);
        
        // Hiển thị menu Admin nếu là admin
        if (user.role === 'admin') {
            const adminMenu = document.getElementById('admin-menu');
            if (adminMenu) adminMenu.style.display = 'block';
        }
    }
}

function getRoleName(role) {
    /**
     * Chuyển role code thành tên tiếng Việt
     */
    const roles = {
        'admin': 'Quản trị viên',
        'operator': 'Vận hành',
        'user': 'Người dùng'
    };
    return roles[role] || role;
}


// ==================== LOAD DỮ LIỆU ====================

async function loadDashboard() {
    /**
     * Load toàn bộ dữ liệu dashboard
     */
    try {
        const data = await apiCall('/api/dashboard/full');
        
        if (data && data.success) {
            dashboardData = data;
            
            // Hiển thị thống kê
            displayStats(data.stats);
            
            // Hiển thị slots theo loại
            displaySlots(data.slots, data.data);
            
            // Hiển thị cảnh báo
            displayAlerts(data.alerts);
            
            // Hiển thị trạng thái MQTT
            displayMqttStatus(data.mqtt);
        } else {
            showError(data?.error || 'Không thể tải dữ liệu!');
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
        showError('Lỗi kết nối server!');
    }
}

function displayStats(stats) {
    /**
     * Hiển thị thống kê
     */
    if (!stats) return;
    
    setElementText('stat-total-slots', stats.total_slots);
    setElementText('stat-cameras', stats.total_cameras);
    setElementText('stat-controls', stats.total_controls);
    setElementText('stat-alerts', stats.unread_alerts);
}

function displayMqttStatus(mqtt) {
    /**
     * Hiển thị trạng thái kết nối MQTT
     */
    const statusEl = document.getElementById('mqtt-status');
    if (statusEl && mqtt) {
        if (mqtt.connected) {
            statusEl.innerHTML = '<span class="status-online">● MQTT Connected</span>';
        } else {
            statusEl.innerHTML = '<span class="status-offline">● MQTT Disconnected</span>';
        }
    }
}


// ==================== HIỂN THỊ SLOTS ====================

function displaySlots(slots, data) {
    /**
     * Hiển thị tất cả slots theo loại
     */
    if (!slots) return;
    
    // Phân loại slots
    const valueSlots = slots.filter(s => s.type === 'value');
    const statusSlots = slots.filter(s => s.type === 'status');
    const controlSlots = slots.filter(s => s.type === 'control');
    const cameraSlots = slots.filter(s => s.type === 'camera');
    
    // Hiển thị từng loại
    displayValueSlots(valueSlots, data);
    displayStatusSlots(statusSlots, data);
    displayControlSlots(controlSlots, data);
    displayCameraSlots(cameraSlots);
    
    // Hiển thị thông báo nếu chưa có slot nào
    if (slots.length === 0) {
        const container = document.getElementById('slots-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📭 Chưa có thiết bị nào được cấu hình</p>
                    ${isAdmin() ? '<p><a href="slots.html">Thêm thiết bị mới</a></p>' : ''}
                </div>
            `;
        }
    }
}

function displayValueSlots(slots, data) {
    /**
     * Hiển thị slots loại VALUE (nhiệt độ, độ ẩm...)
     */
    const container = document.getElementById('value-slots');
    if (!container || slots.length === 0) {
        if (container) container.parentElement.style.display = 'none';
        return;
    }
    
    container.parentElement.style.display = 'block';
    container.innerHTML = '';
    
    slots.forEach(slot => {
        const slotData = data[slot.slot_number];
        const value = slotData ? slotData.value : '--';
        const time = slotData ? formatTime(slotData.created_at) : '';
        
        const card = document.createElement('div');
        card.className = 'slot-card value-card';
        card.innerHTML = `
            <div class="slot-icon">${slot.icon || '📊'}</div>
            <div class="slot-name">${slot.name}</div>
            <div class="slot-value">${value}<span class="slot-unit">${slot.unit || ''}</span></div>
            <div class="slot-location">${slot.location || ''}</div>
            <div class="slot-time">${time}</div>
        `;
        container.appendChild(card);
    });
}

function displayStatusSlots(slots, data) {
    /**
     * Hiển thị slots loại STATUS (cảm biến chuyển động, cửa...)
     */
    const container = document.getElementById('status-slots');
    if (!container || slots.length === 0) {
        if (container) container.parentElement.style.display = 'none';
        return;
    }
    
    container.parentElement.style.display = 'block';
    container.innerHTML = '';
    
    slots.forEach(slot => {
        const slotData = data[slot.slot_number];
        const value = slotData ? parseInt(slotData.value) : 0;
        const isOn = value === 1;
        const time = slotData ? formatTime(slotData.created_at) : '';
        
        const card = document.createElement('div');
        card.className = `slot-card status-card ${isOn ? 'status-on' : 'status-off'}`;
        card.innerHTML = `
            <div class="slot-icon">${slot.icon || '📡'}</div>
            <div class="slot-name">${slot.name}</div>
            <div class="slot-status">
                <span class="status-indicator ${isOn ? 'on' : 'off'}">●</span>
                ${isOn ? 'BẬT' : 'TẮT'}
            </div>
            <div class="slot-location">${slot.location || ''}</div>
            <div class="slot-time">${time}</div>
        `;
        container.appendChild(card);
    });
}

function displayControlSlots(slots, data) {
    /**
     * Hiển thị slots loại CONTROL (đèn, quạt, relay...)
     */
    const container = document.getElementById('control-slots');
    if (!container || slots.length === 0) {
        if (container) container.parentElement.style.display = 'none';
        return;
    }
    
    container.parentElement.style.display = 'block';
    container.innerHTML = '';
    
    const canControl = isOperator(); // Admin và Operator mới điều khiển được
    
    slots.forEach(slot => {
        const slotData = data[slot.slot_number];
        const value = slotData ? parseInt(slotData.value) : 0;
        const isOn = value === 1;
        const time = slotData ? formatTime(slotData.created_at) : '';
        
        const card = document.createElement('div');
        card.className = `slot-card control-card ${isOn ? 'control-on' : 'control-off'}`;
        card.innerHTML = `
            <div class="slot-icon">${slot.icon || '💡'}</div>
            <div class="slot-name">${slot.name}</div>
            <div class="slot-control">
                ${canControl ? `
                    <label class="switch">
                        <input type="checkbox" ${isOn ? 'checked' : ''} 
                               onchange="toggleControl(${slot.slot_number}, this.checked)">
                        <span class="slider"></span>
                    </label>
                ` : `
                    <span class="status-text ${isOn ? 'on' : 'off'}">${isOn ? 'BẬT' : 'TẮT'}</span>
                `}
            </div>
            <div class="slot-location">${slot.location || ''}</div>
            <div class="slot-time">${time}</div>
        `;
        container.appendChild(card);
    });
}

function displayCameraSlots(slots) {
    /**
     * Hiển thị slots loại CAMERA
     */
    const container = document.getElementById('camera-slots');
    if (!container || slots.length === 0) {
        if (container) container.parentElement.style.display = 'none';
        return;
    }
    
    container.parentElement.style.display = 'block';
    container.innerHTML = '';
    
    slots.forEach(slot => {
        const card = document.createElement('div');
        card.className = 'slot-card camera-card';
        card.innerHTML = `
            <div class="camera-header">
                <span class="slot-icon">${slot.icon || '📷'}</span>
                <span class="slot-name">${slot.name}</span>
            </div>
            <div class="camera-container">
                <img id="camera-img-${slot.slot_number}" 
                     class="camera-image" 
                     src="" 
                     alt="Camera"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📷</text></svg>'">
                <div id="camera-status-${slot.slot_number}" class="camera-status">
                    Đang tải...
                </div>
            </div>
            <div class="camera-footer">
                <span class="slot-location">${slot.location || ''}</span>
                <span id="camera-time-${slot.slot_number}" class="slot-time"></span>
            </div>
        `;
        container.appendChild(card);
        
        // Load ảnh camera
        loadCameraImage(slot.slot_number);
        
        // Tự động refresh camera
        startCameraRefresh(slot.slot_number);
    });
}


// ==================== ĐIỀU KHIỂN ====================

async function toggleControl(slotNumber, isOn) {
    /**
     * Bật/tắt thiết bị điều khiển
     */
    const command = isOn ? 1 : 0;
    
    try {
        const data = await apiCall(`/api/control/${slotNumber}`, 'POST', { command });
        
        if (data && data.success) {
            showSuccess(data.message);
        } else {
            showError(data?.error || 'Không thể điều khiển thiết bị!');
            // Reload để reset trạng thái
            loadDashboard();
        }
    } catch (error) {
        console.error('Toggle control error:', error);
        showError('Lỗi kết nối!');
        loadDashboard();
    }
}


// ==================== CAMERA ====================

async function loadCameraImage(slotNumber) {
    /**
     * Load ảnh từ camera
     */
    try {
        const data = await apiCall(`/api/camera/${slotNumber}`);
        
        const imgEl = document.getElementById(`camera-img-${slotNumber}`);
        const statusEl = document.getElementById(`camera-status-${slotNumber}`);
        const timeEl = document.getElementById(`camera-time-${slotNumber}`);
        
        if (data && data.success && data.data) {
            if (data.data.image_data) {
                // Hiển thị ảnh từ cloud
                if (imgEl) imgEl.src = data.data.image_data;
                if (statusEl) statusEl.textContent = '● Cloud';
                if (timeEl) timeEl.textContent = formatTime(data.data.created_at);
            } else if (data.data.stream_url) {
                // Hiển thị stream local (nếu đang ở cùng mạng)
                if (imgEl) imgEl.src = data.data.stream_url;
                if (statusEl) statusEl.textContent = '● Local Stream';
            } else {
                if (statusEl) statusEl.textContent = 'Chưa có ảnh';
            }
        } else {
            if (statusEl) statusEl.textContent = 'Không thể tải ảnh';
        }
    } catch (error) {
        console.error('Load camera error:', error);
    }
}

function startCameraRefresh(slotNumber) {
    /**
     * Bắt đầu tự động refresh camera
     */
    // Dừng timer cũ nếu có
    if (cameraTimers[slotNumber]) {
        clearInterval(cameraTimers[slotNumber]);
    }
    
    // Tạo timer mới
    cameraTimers[slotNumber] = setInterval(() => {
        loadCameraImage(slotNumber);
    }, CAMERA_REFRESH_INTERVAL);
}

function stopAllCameraRefresh() {
    /**
     * Dừng tất cả camera refresh
     */
    Object.keys(cameraTimers).forEach(slot => {
        clearInterval(cameraTimers[slot]);
    });
    cameraTimers = {};
}


// ==================== ALERTS ====================

function displayAlerts(alerts) {
    /**
     * Hiển thị danh sách cảnh báo
     */
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<p class="no-alerts">Không có cảnh báo mới</p>';
        return;
    }
    
    container.innerHTML = '';
    
    alerts.slice(0, 5).forEach(alert => {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.is_read ? 'read' : 'unread'}`;
        div.innerHTML = `
            <div class="alert-message">${alert.message}</div>
            <div class="alert-time">${formatTime(alert.created_at)}</div>
        `;
        div.onclick = () => markAlertRead(alert.id);
        container.appendChild(div);
    });
}

async function markAlertRead(alertId) {
    /**
     * Đánh dấu cảnh báo đã đọc
     */
    await apiCall(`/api/alerts/${alertId}/read`, 'PUT');
    loadDashboard();
}


// ==================== AUTO REFRESH ====================

function startAutoRefresh() {
    /**
     * Bắt đầu tự động refresh dữ liệu
     */
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        loadDashboard();
    }, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    /**
     * Dừng tự động refresh
     */
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    stopAllCameraRefresh();
}


// ==================== HELPERS ====================

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatTime(dateStr) {
    /**
     * Format thời gian đẹp hơn
     */
    if (!dateStr) return '';
    
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now - date) / 1000; // Seconds
        
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        
        return date.toLocaleString('vi-VN');
    } catch {
        return dateStr;
    }
}

function showError(message) {
    /**
     * Hiển thị thông báo lỗi
     */
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        showToast(message, 'error');
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    /**
     * Hiển thị thông báo thành công
     */
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        showToast(message, 'success');
    }
}

function showToast(message, type = 'info') {
    /**
     * Hiển thị toast notification
     */
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Tự xóa sau 3 giây
    setTimeout(() => {
        toast.remove();
    }, 3000);
}


// ==================== CLEANUP ====================

window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

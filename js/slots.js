// ============================================================
// slots.js - QUẢN LÝ SLOTS
// ============================================================
// File này xử lý:
// - Hiển thị danh sách slots
// - Thêm/sửa/xóa slot
// - Form cấu hình slot
// ============================================================

// ==================== KHỞI TẠO ====================

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    // Kiểm tra quyền admin
    if (!isAdmin()) {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'dashboard.html';
        return;
    }
    
    displayUserInfo();
    loadSlots();
    loadAvailableSlots();
});

function displayUserInfo() {
    const user = getCurrentUser();
    if (user) {
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = user.name || user.email;
    }
}


// ==================== LOAD SLOTS ====================

async function loadSlots() {
    /**
     * Load danh sách tất cả slots
     */
    try {
        const data = await apiCall('/api/slots');
        
        if (data && data.success) {
            displaySlotsList(data.data);
        } else {
            showError(data?.error || 'Không thể tải danh sách slots!');
        }
    } catch (error) {
        console.error('Load slots error:', error);
        showError('Lỗi kết nối server!');
    }
}

async function loadAvailableSlots() {
    /**
     * Load danh sách số slot còn trống
     */
    try {
        const data = await apiCall('/api/slots/available');
        
        if (data && data.success) {
            updateSlotNumberSelect(data.data);
        }
    } catch (error) {
        console.error('Load available slots error:', error);
    }
}

function updateSlotNumberSelect(availableSlots) {
    /**
     * Cập nhật dropdown chọn số slot
     */
    const select = document.getElementById('slot-number');
    if (!select) return;
    
    // Giữ lại option đầu tiên
    select.innerHTML = '<option value="">-- Chọn số slot --</option>';
    
    availableSlots.forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `Slot ${num}`;
        select.appendChild(option);
    });
}


// ==================== HIỂN THỊ ====================

function displaySlotsList(slots) {
    /**
     * Hiển thị bảng danh sách slots
     */
    const tbody = document.getElementById('slots-tbody');
    if (!tbody) return;
    
    if (!slots || slots.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Chưa có slot nào được cấu hình</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    slots.forEach(slot => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${slot.slot_number}</strong></td>
            <td>${slot.icon} ${slot.name}</td>
            <td><span class="badge badge-${slot.type}">${getTypeName(slot.type)}</span></td>
            <td>${slot.unit || '-'}</td>
            <td>${slot.location || '-'}</td>
            <td>
                ${slot.threshold_min ? `Min: ${slot.threshold_min}` : ''}
                ${slot.threshold_max ? `Max: ${slot.threshold_max}` : ''}
                ${!slot.threshold_min && !slot.threshold_max ? '-' : ''}
            </td>
            <td>
                <button class="btn btn-sm btn-edit" onclick="editSlot(${slot.slot_number})">
                    ✏️ Sửa
                </button>
                <button class="btn btn-sm btn-delete" onclick="deleteSlot(${slot.slot_number})">
                    🗑️ Xóa
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getTypeName(type) {
    /**
     * Chuyển type code thành tên tiếng Việt
     */
    const types = {
        'value': 'Giá trị số',
        'status': 'Trạng thái',
        'control': 'Điều khiển',
        'camera': 'Camera'
    };
    return types[type] || type;
}


// ==================== FORM ====================

function showAddForm() {
    /**
     * Hiển thị form thêm slot mới
     */
    document.getElementById('form-title').textContent = 'Thêm Slot mới';
    document.getElementById('slot-form').reset();
    document.getElementById('slot-number').disabled = false;
    document.getElementById('editing-slot').value = '';
    
    // Load lại danh sách slot trống
    loadAvailableSlots();
    
    document.getElementById('slot-modal').style.display = 'flex';
}

async function editSlot(slotNumber) {
    /**
     * Hiển thị form sửa slot
     */
    try {
        const data = await apiCall(`/api/slots/${slotNumber}`);
        
        if (data && data.success) {
            const slot = data.data;
            
            document.getElementById('form-title').textContent = `Sửa Slot ${slotNumber}`;
            document.getElementById('editing-slot').value = slotNumber;
            
            // Điền dữ liệu vào form
            document.getElementById('slot-number').value = slot.slot_number;
            document.getElementById('slot-number').disabled = true;
            document.getElementById('slot-name').value = slot.name;
            document.getElementById('slot-type').value = slot.type;
            document.getElementById('slot-icon').value = slot.icon;
            document.getElementById('slot-unit').value = slot.unit || '';
            document.getElementById('slot-location').value = slot.location || '';
            document.getElementById('slot-threshold-min').value = slot.threshold_min || '';
            document.getElementById('slot-threshold-max').value = slot.threshold_max || '';
            document.getElementById('slot-stream-url').value = slot.stream_url || '';
            
            // Cập nhật hiển thị các trường theo type
            onTypeChange();
            
            document.getElementById('slot-modal').style.display = 'flex';
        } else {
            showError(data?.error || 'Không thể tải thông tin slot!');
        }
    } catch (error) {
        console.error('Edit slot error:', error);
        showError('Lỗi kết nối server!');
    }
}

function hideForm() {
    /**
     * Ẩn form
     */
    document.getElementById('slot-modal').style.display = 'none';
}

function onTypeChange() {
    /**
     * Xử lý khi thay đổi loại slot
     * Hiển thị/ẩn các trường phù hợp
     */
    const type = document.getElementById('slot-type').value;
    
    // Ẩn/hiện trường unit (chỉ cho value)
    const unitGroup = document.getElementById('unit-group');
    if (unitGroup) {
        unitGroup.style.display = (type === 'value') ? 'block' : 'none';
    }
    
    // Ẩn/hiện trường threshold (chỉ cho value)
    const thresholdGroup = document.getElementById('threshold-group');
    if (thresholdGroup) {
        thresholdGroup.style.display = (type === 'value') ? 'block' : 'none';
    }
    
    // Ẩn/hiện trường stream URL (chỉ cho camera)
    const streamGroup = document.getElementById('stream-group');
    if (streamGroup) {
        streamGroup.style.display = (type === 'camera') ? 'block' : 'none';
    }
}


// ==================== SUBMIT ====================

async function submitSlotForm(event) {
    /**
     * Submit form thêm/sửa slot
     */
    event.preventDefault();
    
    const editingSlot = document.getElementById('editing-slot').value;
    const isEdit = !!editingSlot;
    
    const formData = {
        slot_number: parseInt(document.getElementById('slot-number').value),
        name: document.getElementById('slot-name').value.trim(),
        type: document.getElementById('slot-type').value,
        icon: document.getElementById('slot-icon').value || '📟',
        unit: document.getElementById('slot-unit').value.trim(),
        location: document.getElementById('slot-location').value.trim(),
        threshold_min: parseFloat(document.getElementById('slot-threshold-min').value) || null,
        threshold_max: parseFloat(document.getElementById('slot-threshold-max').value) || null,
        stream_url: document.getElementById('slot-stream-url').value.trim()
    };
    
    // Validate
    if (!formData.slot_number || !formData.name || !formData.type) {
        showError('Vui lòng điền đầy đủ thông tin bắt buộc!');
        return;
    }
    
    try {
        let data;
        
        if (isEdit) {
            data = await apiCall(`/api/slots/${editingSlot}`, 'PUT', formData);
        } else {
            data = await apiCall('/api/slots', 'POST', formData);
        }
        
        if (data && data.success) {
            showSuccess(isEdit ? 'Đã cập nhật slot!' : 'Đã thêm slot mới!');
            hideForm();
            loadSlots();
            loadAvailableSlots();
        } else {
            showError(data?.error || 'Không thể lưu slot!');
        }
    } catch (error) {
        console.error('Submit slot error:', error);
        showError('Lỗi kết nối server!');
    }
}


// ==================== DELETE ====================

async function deleteSlot(slotNumber) {
    /**
     * Xóa slot
     */
    if (!confirm(`Bạn có chắc muốn xóa Slot ${slotNumber}?`)) {
        return;
    }
    
    try {
        const data = await apiCall(`/api/slots/${slotNumber}`, 'DELETE');
        
        if (data && data.success) {
            showSuccess('Đã xóa slot!');
            loadSlots();
            loadAvailableSlots();
        } else {
            showError(data?.error || 'Không thể xóa slot!');
        }
    } catch (error) {
        console.error('Delete slot error:', error);
        showError('Lỗi kết nối server!');
    }
}


// ==================== HELPERS ====================

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

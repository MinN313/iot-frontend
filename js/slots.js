// slots.js
let editingSlot = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    if (!isAdmin()) {
        window.location.href = 'dashboard.html';
        return;
    }
    initSettings();
    loadSlots();
    loadAvailableSlots();
});

async function loadSlots() {
    const data = await apiCall('/api/slots');
    if (data && data.success) displaySlotsList(data.data);
}

async function loadAvailableSlots() {
    const data = await apiCall('/api/slots/available');
    if (data && data.success) {
        const select = document.getElementById('slot-number');
        if (!select) return;
        select.innerHTML = data.data.map(n => `<option value="${n}">Slot ${n}</option>`).join('');
    }
}

function displaySlotsList(slots) {
    const tbody = document.getElementById('slots-tbody');
    if (!tbody) return;
    
    if (!slots || slots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có slot nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = slots.map(slot => `
        <tr>
            <td><span class="badge badge-slot">${slot.slot_number}</span></td>
            <td>${slot.icon || '📟'} ${slot.name}</td>
            <td><span class="badge badge-${slot.type}">${getTypeName(slot.type)}</span></td>
            <td>${slot.unit || '-'}</td>
            <td>${slot.location || '-'}</td>
            <td>
                <button class="btn btn-sm btn-edit" onclick="editSlot(${slot.slot_number})">✏️</button>
                <button class="btn btn-sm btn-delete" onclick="deleteSlot(${slot.slot_number})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function getTypeName(type) {
    const names = { value: 'Giá trị', status: 'Trạng thái', control: 'Điều khiển', camera: 'Camera', chart: 'Biểu đồ' };
    return names[type] || type;
}

function showAddForm() {
    editingSlot = null;
    document.getElementById('form-title').textContent = 'Thêm Slot';
    document.getElementById('slot-form').reset();
    document.getElementById('slot-number').disabled = false;
    loadAvailableSlots();
    onTypeChange();
    document.getElementById('slot-modal').style.display = 'flex';
}

async function editSlot(num) {
    const data = await apiCall(`/api/slots/${num}`);
    if (!data || !data.success) return;
    
    const slot = data.data;
    editingSlot = num;
    
    document.getElementById('form-title').textContent = `Sửa Slot ${num}`;
    document.getElementById('slot-number').innerHTML = `<option value="${num}">Slot ${num}</option>`;
    document.getElementById('slot-number').value = num;
    document.getElementById('slot-number').disabled = true;
    document.getElementById('slot-name').value = slot.name || '';
    document.getElementById('slot-type').value = slot.type || 'value';
    document.getElementById('slot-icon').value = slot.icon || '';
    document.getElementById('slot-unit').value = slot.unit || '';
    document.getElementById('slot-location').value = slot.location || '';
    document.getElementById('slot-stream-url').value = slot.stream_url || '';
    
    onTypeChange();
    document.getElementById('slot-modal').style.display = 'flex';
}

function onTypeChange() {
    const type = document.getElementById('slot-type').value;
    document.getElementById('unit-group').style.display = type === 'value' || type === 'chart' ? 'block' : 'none';
    document.getElementById('stream-group').style.display = type === 'camera' ? 'block' : 'none';
}

function hideModal() {
    document.getElementById('slot-modal').style.display = 'none';
}

async function submitSlotForm(e) {
    e.preventDefault();
    
    const data = {
        slot_number: parseInt(document.getElementById('slot-number').value),
        name: document.getElementById('slot-name').value.trim(),
        type: document.getElementById('slot-type').value,
        icon: document.getElementById('slot-icon').value.trim() || '📟',
        unit: document.getElementById('slot-unit').value.trim(),
        location: document.getElementById('slot-location').value.trim(),
        stream_url: document.getElementById('slot-stream-url').value.trim()
    };
    
    if (!data.name) {
        showError('Nhập tên slot!');
        return;
    }
    
    let res;
    if (editingSlot) {
        res = await apiCall(`/api/slots/${editingSlot}`, 'PUT', data);
    } else {
        res = await apiCall('/api/slots', 'POST', data);
    }
    
    if (res && res.success) {
        showSuccess(editingSlot ? 'Đã cập nhật!' : 'Đã tạo slot!');
        hideModal();
        loadSlots();
        loadAvailableSlots();
    } else {
        showError(res?.error || 'Có lỗi xảy ra!');
    }
}

async function deleteSlot(num) {
    if (!confirm(`Xóa Slot ${num}?`)) return;
    const res = await apiCall(`/api/slots/${num}`, 'DELETE');
    if (res && res.success) {
        showSuccess('Đã xóa!');
        loadSlots();
        loadAvailableSlots();
    }
}

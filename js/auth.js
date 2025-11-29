// ============================================================
// frontend/js/auth.js
// XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ
// ============================================================

// ==================== ĐĂNG KÝ ====================
async function register(event) {
    event.preventDefault();
    hideMessages();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    if (password !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    if (password.length < 6) {
        showError('Mật khẩu phải ít nhất 6 ký tự!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.error || 'Đăng ký thất bại!');
        }
    } catch (error) {
        console.error('Register error:', error);
        showError('Không thể kết nối đến server!');
    }
}

// ==================== ĐĂNG NHẬP ====================
async function login(event) {
    event.preventDefault();
    hideMessages();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Vui lòng nhập email và mật khẩu!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        console.log('Login response:', data); // Debug
        
        if (data.success) {
            // Lưu token và user vào localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Đăng nhập thành công!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(data.error || 'Đăng nhập thất bại!');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Không thể kết nối đến server!');
    }
}

// ==================== ĐĂNG XUẤT ====================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ==================== KIỂM TRA ĐĂNG NHẬP ====================
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==================== LẤY THÔNG TIN USER ====================
function getUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function getToken() {
    return localStorage.getItem('token');
}

// ==================== HIỂN THỊ THÔNG BÁO ====================
function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    
    const successEl = document.getElementById('success-message');
    if (successEl) {
        successEl.style.display = 'none';
    }
}

function showSuccess(message) {
    const successEl = document.getElementById('success-message');
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
    }
    
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function hideMessages() {
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
}

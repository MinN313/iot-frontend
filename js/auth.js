// ============================================================
// auth.js - XỬ LÝ AUTHENTICATION
// ============================================================
// File này xử lý:
// - Đăng nhập / Đăng xuất
// - Đăng ký
// - Quên mật khẩu
// - Kiểm tra token
// ============================================================

// ==================== KIỂM TRA ĐĂNG NHẬP ====================

function checkAuth() {
    /**
     * Kiểm tra user đã đăng nhập chưa
     * Nếu chưa, chuyển về trang login
     */
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function checkNotAuth() {
    /**
     * Kiểm tra user chưa đăng nhập
     * Nếu đã đăng nhập, chuyển về dashboard
     * Dùng cho trang login, register
     */
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

function getCurrentUser() {
    /**
     * Lấy thông tin user hiện tại từ localStorage
     */
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
}

function getToken() {
    /**
     * Lấy token từ localStorage
     */
    return localStorage.getItem('token');
}

function isAdmin() {
    /**
     * Kiểm tra user có phải admin không
     */
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function isOperator() {
    /**
     * Kiểm tra user có phải operator không
     */
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'operator');
}


// ==================== ĐĂNG NHẬP ====================

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Vui lòng nhập email và mật khẩu!');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Lưu token và user vào localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Đăng nhập thành công!');
            
            // Chuyển đến dashboard sau 1 giây
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
    
    showLoading(false);
}


// ==================== ĐĂNG KÝ ====================

async function register(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validate
    if (!name || !email || !password) {
        showError('Vui lòng điền đầy đủ thông tin!');
        return;
    }
    
    if (password.length < 6) {
        showError('Mật khẩu phải ít nhất 6 ký tự!');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
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
    
    showLoading(false);
}


// ==================== ĐĂNG XUẤT ====================

function logout() {
    /**
     * Đăng xuất - Xóa token và user từ localStorage
     */
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}


// ==================== QUÊN MẬT KHẨU ====================

let resetEmail = ''; // Lưu email để dùng ở bước 2

async function requestResetCode(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showError('Vui lòng nhập email!');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resetEmail = email;
            
            // Hiển thị mã (chế độ test)
            showSuccess(`Mã reset: ${data.code}`);
            
            // Hiển thị form nhập mã
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
        } else {
            showError(data.error || 'Không thể gửi mã!');
        }
    } catch (error) {
        console.error('Request reset error:', error);
        showError('Không thể kết nối đến server!');
    }
    
    showLoading(false);
}

async function resetPassword(event) {
    event.preventDefault();
    
    const code = document.getElementById('code').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!code || !newPassword) {
        showError('Vui lòng điền đầy đủ thông tin!');
        return;
    }
    
    if (newPassword.length < 6) {
        showError('Mật khẩu phải ít nhất 6 ký tự!');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: resetEmail,
                code: code,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Đổi mật khẩu thành công! Đang chuyển đến trang đăng nhập...');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.error || 'Đổi mật khẩu thất bại!');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showError('Không thể kết nối đến server!');
    }
    
    showLoading(false);
}


// ==================== API HELPER ====================

async function apiCall(endpoint, method = 'GET', body = null) {
    /**
     * Helper function để gọi API với token
     * Tự động thêm Authorization header
     */
    const token = getToken();
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        
        // Nếu 401 Unauthorized, đăng xuất
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        return { success: false, error: 'Không thể kết nối đến server!' };
    }
}


// ==================== UI HELPERS ====================

function showError(message) {
    /**
     * Hiển thị thông báo lỗi
     */
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    
    if (successDiv) successDiv.style.display = 'none';
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Tự ẩn sau 5 giây
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    /**
     * Hiển thị thông báo thành công
     */
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        // Tự ẩn sau 5 giây
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showLoading(show) {
    /**
     * Hiển thị/ẩn loading indicator
     */
    const loadingDiv = document.getElementById('loading');
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
    }
}

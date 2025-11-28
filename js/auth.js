// ============================================================
// 📄 frontend/js/auth.js
// XỬ LÝ ĐĂNG NHẬP & ĐĂNG KÝ
// ============================================================

// ==================== ĐĂNG KÝ ====================
async function register(event) {
    event.preventDefault(); // Ngăn form reload trang
    
    // Lấy dữ liệu từ form
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Ẩn thông báo cũ
    hideMessages();
    
    // Kiểm tra password khớp nhau
    if (password !== confirmPassword) {
        showError('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    // Kiểm tra độ dài password
    if (password.length < 6) {
        showError('Mật khẩu phải có ít nhất 6 ký tự!');
        return;
    }
    
    try {
        // Gọi API đăng ký
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: 'user' // Mặc định là user
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            // Chuyển đến trang login sau 2 giây
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.error || 'Đăng ký thất bại!');
        }
        
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể kết nối đến server!');
    }
}

// ==================== ĐĂNG NHẬP ====================
async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    hideMessages();
    
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
        
        if (data.success) {
            // Lưu token và thông tin user vào localStorage
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            showSuccess('Đăng nhập thành công!');
            
            // Chuyển đến dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(data.error || 'Đăng nhập thất bại!');
        }
        
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể kết nối đến server!');
    }
}

// ==================== ĐĂNG XUẤT ====================
function logout() {
    // Xóa token và user khỏi localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Chuyển về trang login
    window.location.href = 'login.html';
}

// ==================== KIỂM TRA ĐÃ ĐĂNG NHẬP ====================
function checkAuth() {
    const token = localStorage.getItem('token');
    
    // Nếu chưa đăng nhập và không phải trang login/register
    if (!token) {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html') && !currentPage.includes('register.html')) {
            window.location.href = 'login.html';
        }
    }
    
    return token;
}

// ==================== LẤY THÔNG TIN USER ====================
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// ==================== LẤY TOKEN ====================
function getToken() {
    return localStorage.getItem('token');
}

// ==================== HIỂN THỊ THÔNG BÁO ====================
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function hideMessages() {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}
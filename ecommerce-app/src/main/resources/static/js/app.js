const API = '/api';

// Login details are kept in the browser so a page refresh does not log you out
let token = localStorage.getItem('token');
let role = localStorage.getItem('role');
let email = localStorage.getItem('email');
let products = [];

// ---------- helpers ----------
function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(value) {
    return '₹' + Number(value).toLocaleString('en-IN');
}

function notify(text, isError) {
    const box = document.getElementById('msg');
    box.textContent = text;
    box.className = 'msg' + (isError ? ' error' : '');
    box.hidden = false;
    setTimeout(() => box.hidden = true, 3500);
}

// One function for every API call. It adds the JWT token automatically.
async function api(path, method = 'GET', body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API + path, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (res.status === 401 && token) {
        logout();
        throw new Error('Session expired. Please login again.');
    }
    if (!res.ok) {
        throw new Error(errorText(data));
    }
    return data;
}

function errorText(data) {
    if (data && typeof data.message === 'object') return Object.values(data.message).join(', ');
    if (data && data.message) return data.message;
    if (data && data.error) return data.error;
    return 'Something went wrong';
}

// ---------- screens ----------
function show(view) {
    ['auth', 'products', 'cart', 'orders'].forEach(v => {
        document.getElementById(v + '-view').hidden = (v !== view);
    });
    if (view === 'auth') showAuthForm('login');
    renderNav();
    if (view === 'products') loadProducts();
    if (view === 'cart') loadCart();
    if (view === 'orders') loadOrders();
}

function renderNav() {
    const nav = document.getElementById('nav');
    if (!token) { nav.innerHTML = ''; return; }

    let html = `<button onclick="show('products')">Products</button>`;
    if (role === 'USER') {
        html += `<button onclick="show('cart')">Cart</button>`;
        html += `<button onclick="show('orders')">My Orders</button>`;
    }
    html += `<span class="who">${esc(email)} (${role})</span>`;
    html += `<button class="danger" onclick="logout()">Logout</button>`;
    nav.innerHTML = html;
}

// ---------- auth ----------
function showAuthForm(which) {
    document.getElementById('loginForm').hidden = (which !== 'login');
    document.getElementById('registerForm').hidden = (which !== 'register');
}

async function login(e) {
    e.preventDefault();
    try {
        const data = await api('/auth/login', 'POST', {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        });
        token = data.token;
        role = data.role;
        email = data.email;
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('email', email);
        notify('Login successful');
        show('products');
    } catch (err) {
        notify(err.message, true);
    }
}

async function register(e) {
    e.preventDefault();
    try {
        await api('/auth/register', 'POST', {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value
        });
        notify('Registered successfully. Please login.');
        e.target.reset();
        showAuthForm('login');
    } catch (err) {
        notify(err.message, true);
    }
}

function logout() {
    token = role = email = null;
    localStorage.clear();
    show('auth');
}

// ---------- products ----------
async function loadProducts() {
    document.getElementById('adminForm').hidden = (role !== 'ADMIN');
    try {
        // Admin sees all products (active and disabled), users see only active ones
        products = await api(role === 'ADMIN' ? '/products/all' : '/products');
        renderProducts();
    } catch (err) {
        notify(err.message, true);
    }
}

function renderProducts() {
    const box = document.getElementById('productList');
    if (products.length === 0) {
        box.innerHTML = '<p class="empty">No products available.</p>';
        return;
    }
    box.innerHTML = products.map(p => {
        let actions;
        if (role === 'USER') {
            actions = `<div class="row">
                <input type="number" id="qty${p.id}" value="1" min="1">
                <button onclick="addToCart(${p.id})">Add to Cart</button></div>`;
        } else if (p.active) {
            actions = `<div class="row">
                <button onclick="editProduct(${p.id})">Edit</button>
                <button class="danger" onclick="disableProduct(${p.id})">Disable</button></div>`;
        } else {
            actions = `<div class="row">
                <button class="green" onclick="enableProduct(${p.id})">Enable</button></div>`;
        }
        return `<div class="card${p.active ? '' : ' disabled'}"><h3>${esc(p.name)}</h3>
            <p class="price">${money(p.price)}</p>
            <p>Stock: ${p.quantity}${p.active ? '' : ' (Disabled)'}</p>${actions}</div>`;
    }).join('');
}

// admin: add or update product
async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const body = {
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        quantity: parseInt(document.getElementById('pQty').value)
    };
    try {
        if (id) await api('/products/' + id, 'PUT', body);
        else await api('/products', 'POST', body);
        notify(id ? 'Product updated' : 'Product added');
        resetProductForm();
        loadProducts();
    } catch (err) {
        notify(err.message, true);
    }
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pQty').value = p.quantity;
    document.getElementById('formTitle').textContent = 'Update Product #' + p.id;
    window.scrollTo(0, 0);
}

function resetProductForm() {
    document.getElementById('adminForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'Add Product (Admin)';
}

async function disableProduct(id) {
    if (!confirm('Disable this product?')) return;
    try {
        await api('/products/' + id + '/disable', 'PATCH');
        notify('Product disabled');
        loadProducts();
    } catch (err) {
        notify(err.message, true);
    }
}

async function enableProduct(id) {
    try {
        await api('/products/' + id + '/enable', 'PATCH');
        notify('Product enabled');
        loadProducts();
    } catch (err) {
        notify(err.message, true);
    }
}

// ---------- cart ----------
async function addToCart(productId) {
    const quantity = parseInt(document.getElementById('qty' + productId).value);
    try {
        await api('/cart', 'POST', { productId: productId, quantity: quantity });
        notify('Added to cart');
    } catch (err) {
        notify(err.message, true);
    }
}

async function loadCart() {
    const box = document.getElementById('cartBox');
    try {
        const items = await api('/cart');
        if (items.length === 0) {
            box.innerHTML = '<p class="empty">Your cart is empty.</p>';
            return;
        }
        let total = 0;
        const rows = items.map(i => {
            const sub = i.price * i.quantity;
            total += sub;
            return `<tr>
                <td>${esc(i.productName)}</td>
                <td>${money(i.price)}</td>
                <td><input type="number" id="cq${i.cartItemId}" value="${i.quantity}" min="1"></td>
                <td>${money(sub)}</td>
                <td><button onclick="updateCart(${i.cartItemId})">Update</button>
                    <button class="danger" onclick="removeCart(${i.cartItemId})">Remove</button></td>
            </tr>`;
        }).join('');
        box.innerHTML = `<table>
            <tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>${rows}</table>
            <div class="total">Total: <b>${money(total)}</b></div>
            <button onclick="placeOrder()">Place Order</button>`;
    } catch (err) {
        notify(err.message, true);
    }
}

async function updateCart(id) {
    const quantity = parseInt(document.getElementById('cq' + id).value);
    try {
        await api('/cart/' + id, 'PUT', { quantity: quantity });
        notify('Cart updated');
        loadCart();
    } catch (err) {
        notify(err.message, true);
    }
}

async function removeCart(id) {
    try {
        await api('/cart/' + id, 'DELETE');
        notify('Item removed');
        loadCart();
    } catch (err) {
        notify(err.message, true);
    }
}

// ---------- orders ----------
async function placeOrder() {
    try {
        await api('/orders', 'POST');
        notify('Order placed successfully');
        show('orders');
    } catch (err) {
        notify(err.message, true);   // e.g. "Insufficient stock for product ..."
    }
}

async function loadOrders() {
    const box = document.getElementById('orderList');
    try {
        const orders = await api('/orders');
        if (orders.length === 0) {
            box.innerHTML = '<p class="empty">You have no orders yet.</p>';
            return;
        }
        box.innerHTML = orders.map(o => {
            const items = o.items.map(i =>
                `<tr><td>${esc(i.productName)}</td><td>${i.quantity}</td><td>${money(i.price)}</td></tr>`).join('');
            return `<div class="order">
                <h3>Order #${o.orderId} - ${money(o.totalAmount)}</h3>
                <small>${new Date(o.orderDate).toLocaleString()}</small>
                <table><tr><th>Product</th><th>Qty</th><th>Price</th></tr>${items}</table>
            </div>`;
        }).join('');
    } catch (err) {
        notify(err.message, true);
    }
}

// ---------- start ----------
show(token ? 'products' : 'auth');
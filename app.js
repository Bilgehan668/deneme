const DB_KEY = 'risusmc_db_v1';

const defaultDB = {
  users: [
    {
      username: 'admin',
      email: 'admin@risusmc.com',
      password: 'admin123',
      coins: 1200,
      purchases: [],
      tickets: []
    }
  ],
  session: null,
  market: [
    { id: 1, name: 'VIP Rütbe', price: 500 },
    { id: 2, name: 'Spawner Paketi', price: 350 },
    { id: 3, name: 'Kasa Anahtarı x10', price: 200 }
  ],
  wiki: [
    { title: 'Sunucu Kuralları', content: 'Küfür, hile ve toxic davranış yasaktır.' },
    { title: 'SkyBlock Başlangıç', content: 'Ada oluştur, cobblestone jeneratörü kur ve görevleri tamamla.' },
    { title: 'Coin Kazanma', content: 'Günlük görev, etkinlik ve market satışlarından coin kazanabilirsin.' }
  ]
};

let db = loadDB();
let cart = [];

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultDB);
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function currentUser() {
  return db.users.find((u) => u.username === db.session) || null;
}

function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}

function renderAuthState() {
  const user = currentUser();
  document.querySelectorAll('.guest-only').forEach((el) => el.classList.toggle('hidden', !!user));
  document.querySelectorAll('.user-only').forEach((el) => el.classList.toggle('hidden', !user));
  document.querySelectorAll('.guest-only-page').forEach((el) => el.classList.toggle('hidden', !!user));
  document.querySelectorAll('.user-only-page').forEach((el) => el.classList.toggle('hidden', !user));

  if (user) {
    document.getElementById('accountUsername').textContent = user.username;
    document.getElementById('accountEmail').textContent = user.email;
    document.getElementById('accountCoins').textContent = user.coins;
    renderPurchaseHistory();
  }

  renderMarket();
  renderTickets();
}

function renderMarket() {
  const wrapper = document.getElementById('marketItems');
  const user = currentUser();
  document.getElementById('coinBalance').textContent = user ? user.coins : 0;
  wrapper.innerHTML = '';

  db.market.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>Fiyat: ${item.price} coin</p>
      <button class="primary" ${user ? '' : 'disabled'} data-add="${item.id}">Sepete Ekle</button>
    `;
    wrapper.appendChild(card);
  });

  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  list.innerHTML = '';
  if (cart.length === 0) {
    list.innerHTML = '<li>Sepet boş.</li>';
    return;
  }
  cart.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - ${item.price} coin`;
    list.appendChild(li);
  });
}

function renderWiki(filter = '') {
  const list = document.getElementById('wikiList');
  const query = filter.trim().toLowerCase();
  const items = db.wiki.filter((w) =>
    w.title.toLowerCase().includes(query) || w.content.toLowerCase().includes(query)
  );

  list.innerHTML = items
    .map((w) => `<article class="card"><h3>${w.title}</h3><p>${w.content}</p></article>`)
    .join('');
}

function renderPurchaseHistory() {
  const ul = document.getElementById('purchaseHistory');
  const user = currentUser();
  ul.innerHTML = '';
  if (!user?.purchases.length) {
    ul.innerHTML = '<li>Henüz satın alma yok.</li>';
    return;
  }
  user.purchases.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.item} - ${p.price} coin (${p.date})`;
    ul.appendChild(li);
  });
}

function renderTickets() {
  const list = document.getElementById('tickets');
  const user = currentUser();
  list.innerHTML = '';
  if (!user) {
    list.innerHTML = '<li>Destek taleplerini görmek için giriş yap.</li>';
    return;
  }

  if (!user.tickets.length) {
    list.innerHTML = '<li>Henüz destek talebi yok.</li>';
    return;
  }

  user.tickets.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = `[${t.status}] ${t.title}: ${t.message}`;
    list.appendChild(li);
  });
}

// Navigation
for (const btn of document.querySelectorAll('.nav-link[data-target]')) {
  btn.addEventListener('click', () => showPage(btn.dataset.target));
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  db.session = null;
  cart = [];
  saveDB();
  renderAuthState();
  showPage('home');
});

// Market actions
document.getElementById('marketItems').addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.add;
  if (!id) return;
  const item = db.market.find((i) => i.id === Number(id));
  if (!item) return;
  cart.push(item);
  renderCart();
});

document.getElementById('buyBtn').addEventListener('click', () => {
  const msg = document.getElementById('marketMessage');
  const user = currentUser();
  if (!user) {
    msg.textContent = 'Satın alma için giriş yapmalısın.';
    return;
  }
  if (cart.length === 0) {
    msg.textContent = 'Sepetin boş.';
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  if (user.coins < total) {
    msg.textContent = `Yetersiz coin. Gerekli: ${total}, mevcut: ${user.coins}`;
    return;
  }

  user.coins -= total;
  const date = new Date().toLocaleString('tr-TR');
  cart.forEach((item) => user.purchases.push({ item: item.name, price: item.price, date }));
  cart = [];
  msg.textContent = `Satın alma başarılı! ${total} coin harcandı.`;
  saveDB();
  renderAuthState();
});

// Forms
document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const username = String(data.get('username')).trim();
  const email = String(data.get('email')).trim();
  const password = String(data.get('password')).trim();
  const msg = document.getElementById('registerMessage');

  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    msg.textContent = 'Bu kullanıcı adı zaten alınmış.';
    return;
  }

  db.users.push({ username, email, password, coins: 500, purchases: [], tickets: [] });
  db.session = username;
  saveDB();
  msg.textContent = 'Kayıt başarılı, giriş yapıldı.';
  renderAuthState();
  showPage('account');
  form.reset();
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const username = String(data.get('username')).trim();
  const password = String(data.get('password')).trim();
  const msg = document.getElementById('loginMessage');

  const user = db.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    msg.textContent = 'Kullanıcı adı veya şifre hatalı.';
    return;
  }

  db.session = user.username;
  saveDB();
  msg.textContent = 'Giriş başarılı.';
  renderAuthState();
  showPage('account');
  form.reset();
});

document.getElementById('supportForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = currentUser();
  if (!user) {
    alert('Destek talebi için giriş yapmalısın.');
    showPage('login');
    return;
  }

  const data = new FormData(e.currentTarget);
  user.tickets.push({
    title: String(data.get('title')).trim(),
    message: String(data.get('message')).trim(),
    status: 'Açık'
  });
  saveDB();
  renderTickets();
  e.currentTarget.reset();
});

document.getElementById('wikiSearch').addEventListener('input', (e) => {
  renderWiki(e.target.value);
});

renderAuthState();
renderWiki();
showPage('home');

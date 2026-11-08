// LOGIN DEMO. Ganti isi fungsi login() dengan panggilan ke API backend (UC-13).
// Backend yang memeriksa peran. Pengecekan di sini hanya untuk tampilan.
var USERS = [
  { hp: '081111', pw: 'demo123', nama: 'Admin LAHAP', role: 'admin' },
  { hp: '082222', pw: 'demo123', nama: 'Budi Santoso', role: 'pelanggan' },
  { hp: '083333', pw: 'demo123', nama: 'Siti (Dapur)', role: 'dapur' },
  { hp: '084444', pw: 'demo123', nama: 'Ahmad (Kurir)', role: 'kurir' }
];
var HOME = { pelanggan: 'index.html', admin: 'admin.html', dapur: 'dapur.html', kurir: 'kurir.html' };
var MENU = {
  tamu: [['Paket', 'index.html']],
  pelanggan: [['Paket', 'index.html'], ['Langganan Saya', 'langganan.html']],
  admin: [['Dashboard', 'admin.html']],
  dapur: [['To-do Dapur', 'dapur.html']],
  kurir: [['To-do Kurir', 'kurir.html']]
};

function currentUser() {
  try { return JSON.parse(localStorage.getItem('lahap_user')); } catch (e) { return null; }
}
function login(id, pw) {
  for (var i = 0; i < USERS.length; i++) {
    if (USERS[i].hp === id && USERS[i].pw === pw) {
      localStorage.setItem('lahap_user', JSON.stringify(USERS[i]));
      return USERS[i];
    }
  }
  return null;
}
function logout() { localStorage.removeItem('lahap_user'); location.href = 'login.html'; }

(function () {
  var user = currentUser();
  var roles = document.body.getAttribute('data-roles');
  if (roles) {
    if (!user) { location.href = 'login.html'; return; }
    if (roles.split(',').indexOf(user.role) < 0) { location.href = HOME[user.role]; return; }
  }
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var page = location.pathname.split('/').pop().toLowerCase();
  var items = MENU[user ? user.role : 'tamu'];
  var html = items.map(function (m) {
    return '<a href="' + m[1] + '"' + (m[1] === page ? ' aria-current="page"' : '') + '>' + m[0] + '</a>';
  }).join('');
  html += user ? '<a href="#" id="keluar">Keluar</a>' : '<a href="login.html">Masuk</a>';
  nav.innerHTML = html;
  var k = document.getElementById('keluar');
  if (k) k.addEventListener('click', function (e) { e.preventDefault(); logout(); });
})();

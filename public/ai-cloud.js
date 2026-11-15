// Kesit — Kesit AI Bulut Hesabı, Kredi Sayacı ve Ödeme Entegrasyonu

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export async function fetchUserSession() {
  try {
    const res = await fetch('/api/auth/get-session');
    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        currentUser = data.user;
        renderUserUI(currentUser);
        return currentUser;
      }
    }
  } catch (err) {
    console.warn('Oturum kontrolü yapılamadı:', err);
  }
  currentUser = null;
  renderUserUI(null);
  return null;
}

export function renderUserUI(user) {
  const creditEl = document.getElementById('creditCount');
  const meName = document.getElementById('meName');
  const meAvatar = document.getElementById('meAvatar');
  const creditPill = document.getElementById('creditPill');

  if (user) {
    const balance = user.credit_balance ?? 0;
    if (creditEl) creditEl.textContent = balance;
    if (creditPill) creditPill.title = `Kalan: ${balance} Kredi`;

    if (meName) {
      meName.innerHTML = `<span>${user.name || user.email.split('@')[0]}</span>`;
      const sub = meName.parentElement?.querySelector('small');
      if (sub) sub.textContent = `${balance} Kredi • Paket Al`;
    }

    if (meAvatar && user.image) {
      meAvatar.style.backgroundImage = `url("${user.image}")`;
      meAvatar.style.backgroundSize = 'cover';
      meAvatar.style.backgroundPosition = 'center';
    }
  } else {
    if (creditEl) creditEl.textContent = '5';
    if (creditPill) creditPill.title = 'Kayıt olarak 5 ücretsiz kredi kazanın';

    if (meName) {
      meName.textContent = 'Giriş Yap';
      const sub = meName.parentElement?.querySelector('small');
      if (sub) sub.textContent = '5 Ücretsiz Kredi';
    }
  }
}

export async function signInWithGoogle() {
  try {
    const res = await fetch('/api/auth/sign-in/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: window.location.origin + '/app',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Giriş başlatılamadı. Lütfen tekrar deneyin.');
      return;
    }

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    alert('Bağlantı hatası: ' + err.message);
  }
}

export async function buyPackage(packageId) {
  if (!currentUser) {
    document.getElementById('topupModal')?.close();
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Ödeme oturumu oluşturulamadı.');
      return;
    }

    const data = await res.json();
    if (data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  } catch (err) {
    alert('Ödeme hatası: ' + err.message);
  }
}

export function initAiCloud() {
  // Kredi Satın Al Modalı
  const btnBuy = document.getElementById('btnBuyCredits');
  const topupModal = document.getElementById('topupModal');
  btnBuy?.addEventListener('click', () => {
    if (!currentUser) {
      window.location.href = '/login';
    } else {
      topupModal?.showModal();
    }
  });

  // Paket butonları
  document.querySelectorAll('[data-package]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pkg = btn.getAttribute('data-package');
      if (pkg) buyPackage(pkg);
    });
  });

  // Profil tıklaması (Giriş yapmamışsa /login'e yönlendir)
  document.getElementById('btnProfile')?.addEventListener('click', (e) => {
    if (!currentUser) {
      e.stopPropagation();
      window.location.href = '/login';
    }
  });

  // Oturum durumunu yükle
  fetchUserSession();

  // URL'de payment=success kontrolü
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    setTimeout(() => {
      alert('Ödemeniz onaylandı! Kredileriniz hesabınıza tanımlandı.');
      fetchUserSession();
    }, 600);
  }
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiCloud);
} else {
  initAiCloud();
}

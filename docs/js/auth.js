export function getCurrentUserOnce() {
  return new Promise((resolve, reject) => {
    const unsubscribe = firebase.auth().onAuthStateChanged(
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (err) => {
        unsubscribe();
        reject(err);
      }
    );
  });
}

export async function requireAuth({ mustBeVerified = false } = {}) {
  const user = await getCurrentUserOnce();
  const loadingEl = document.getElementById('auth-loading');
  const contentEl = document.getElementById('protected-content');
  if (!user || (mustBeVerified && !user.emailVerified)) {
    if (loadingEl) loadingEl.classList.add('hidden');
    window.location.replace('/login/');
    throw new Error('auth/required');
  }
  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');
  return user;
}

function updateAuthButton(user) {
  const btn = document.getElementById('authButton');
  if (!btn) return;
  btn.onclick = null;
  if (user) {
    btn.textContent = 'Logout';
    btn.href = '#';
    btn.addEventListener(
      'click',
      async (e) => {
        e.preventDefault();
        await firebase.auth().signOut();
        window.location.href = '/';
      },
      { once: true }
    );
  } else {
    btn.textContent = 'Login';
    btn.href = '/login/';
  }
}

document.addEventListener('header-loaded', () => {
  updateAuthButton(firebase.auth().currentUser);
});

document.addEventListener('DOMContentLoaded', () => {
  updateAuthButton(firebase.auth().currentUser);
  firebase.auth().onAuthStateChanged(updateAuthButton);
});

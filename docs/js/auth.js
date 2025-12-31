import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

// --- Helper: compute safe post-login route ---
function getPostLoginRoute() {
  try {
    const params = new URLSearchParams(window.location.search);
    const cont = params.get('continue');
    if (cont && typeof cont === 'string' && cont.startsWith('/')) {
      const allowed = [
        '/', '/pricing/', '/prompt-history/',
        '/ai-assistant-aws/', '/ai-assistant-azure/', '/ai-assistant-gcp/',
        '/ai-assistant-terraform/', '/ai-assistant-helm/',
        '/ai-assistant-k8s/', '/ai-assistant-ansible/',
        '/ai-assistant-yaml/', '/ai-assistant-docker/',
        '/profile/'
      ];
      if (allowed.includes(cont)) return cont;
    }
  } catch (e) {
    console.warn('continue param parse failed', e);
  }
  return '/ai-assistant-aws/';
}

// --- Email verification gate ---
async function requireVerifiedEmail(user) {
  if (!user) return false;
  await user.reload();
  if (!user.emailVerified) {
    alert('Please verify your email address before continuing.');
    try {
      await user.sendEmailVerification();
      alert('Verification email sent. Check your inbox.');
    } catch (e) {
      console.error('Failed to send verification email', e);
    }
    await signOut(auth);
    return false;
  }
  return true;
}

// --- Post-login redirect ---
async function redirectAfterLogin(user) {
  const ok = await requireVerifiedEmail(user);
  if (!ok) return;
  window.location.replace(getPostLoginRoute());
}

// --- Auth button helper ---
function updateAuthButton(user) {
  const btn = document.getElementById('authButton');
  if (!btn) return;
  btn.onclick = null;
  if (user) {
    btn.textContent = 'Logout';
    btn.href = '#';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = '/';
    }, { once: true });
  } else {
    btn.textContent = 'Login';
    btn.href = '/login/';
  }
}

// --- Update Start Building CTAs ---
function updateStartBuildingLinks(user) {
  const dest = user ? '/ai-assistant-aws/' : '/login/?continue=%2Fai-assistant-aws%2F';
  document.querySelectorAll('#start-building-cta, .start-button, .banner-cta').forEach((el) => {
    if (el.tagName === 'A') {
      el.setAttribute('href', dest);
    } else {
      el.onclick = (e) => {
        e.preventDefault();
        window.location.href = dest;
      };
    }
  });
}

document.addEventListener('header-loaded', () => {
  const u = auth.currentUser;
  updateAuthButton(u);
  updateStartBuildingLinks(u);
});

document.addEventListener('DOMContentLoaded', () => {
  const u = auth.currentUser;
  updateAuthButton(u);
  updateStartBuildingLinks(u);
});

onAuthStateChanged(auth, async (user) => {
  updateAuthButton(user);
  updateStartBuildingLinks(user);
  const path = window.location.pathname;
  const isLoginPage = path === '/login/' || path === '/login/index.html';
  const requiresAuth = /^\/(ai-assistant|ai-assistant-)/i.test(path) ||
                       path === '/prompt-history/' ||
                       path === '/profile/';

  if (!user) {
    if (window.__autoLogout) return;
    if (requiresAuth) {
      const cont = encodeURIComponent(path + window.location.search);
      window.location.replace(`/login/?continue=${cont}`);
    }
    return;
  }

  if (isLoginPage) {
    await redirectAfterLogin(user);
    return;
  }

  if (requiresAuth) {
    await requireVerifiedEmail(user);
  }
});

export { redirectAfterLogin };


import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

async function initSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;
  try {
    const res = await fetch('/components/sidebar.html');
    if (!res.ok) throw new Error('Failed to load sidebar');
    container.innerHTML = await res.text();
    setupAuth();
    highlightLink();
    setupLogout();
  } catch (err) {
    console.error('Sidebar load error', err);
  }
}

function setupAuth() {
  const userDiv = document.getElementById('sidebar-user');
  const historyLink = document.getElementById('prompt-history-link');
  if (!userDiv) return;
  onAuthStateChanged(auth, (user) => {
    userDiv.textContent = '';
    if (historyLink) {
      historyLink.classList.toggle('hidden', !user);
    }
    if (!user) return;
    if (user.photoURL) {
      const img = document.createElement('img');
      img.src = user.photoURL;
      img.alt = 'User Avatar';
      img.referrerPolicy = 'no-referrer';
      img.className = 'w-8 h-8 rounded-full';
      userDiv.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = user.email || '';
    userDiv.appendChild(span);
  });
}

function highlightLink() {
  const path = window.location.pathname;
  document.querySelectorAll('#sidebar-container a').forEach((link) => {
    if (link.getAttribute('href') === path) {
      link.classList.add('bg-gray-200', 'font-semibold');
    }
  });
}

function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = '/';
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', initSidebar);

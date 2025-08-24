import { auth } from './firebase.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, fetchSignInMethodsForEmail } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { redirectAfterLogin } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  const googleBtn = document.getElementById('google-login');
  const resendBtn = document.getElementById('resend-verification');
  const resendModal = document.getElementById('resend-modal');
  const resendForm = document.getElementById('resend-form');
  const resendEmailInput = document.getElementById('resend-email');
  const resendFeedback = document.getElementById('resend-feedback');
  const resendCancel = document.getElementById('resend-cancel');

  const showError = (msg) => {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    } else {
      alert(msg);
    }
  };

  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      loginBtn.disabled = true;
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      loginBtn.appendChild(spinner);
      try {
        const userCred = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        await redirectAfterLogin(userCred.user);
      } catch (err) {
        console.error('Login failed', err);
        showError('Login failed. Please check your credentials.');
      }
      loginBtn.disabled = false;
      spinner.remove();
    });
  }

  if (googleBtn) {
    const provider = new GoogleAuthProvider();
    googleBtn.addEventListener('click', async () => {
      try {
        const { user } = await signInWithPopup(auth, provider);
        await redirectAfterLogin(user);
      } catch (err) {
        console.error('Login failed', err);
        showError('Login failed. Please check your credentials.');
      }
    });
  }

  const openResendModal = () => {
    if (resendFeedback) {
      resendFeedback.textContent = '';
      resendFeedback.className = 'text-sm text-gray-600';
    }
    if (resendModal) {
      resendModal.classList.remove('hidden');
    }
    if (resendEmailInput) {
      resendEmailInput.focus();
    }
  };

  const closeResendModal = () => {
    if (resendModal) {
      resendModal.classList.add('hidden');
    }
  };

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      if (emailInput && resendEmailInput) {
        resendEmailInput.value = emailInput.value || '';
      }
      openResendModal();
    });
  }

  if (resendCancel) {
    resendCancel.addEventListener('click', closeResendModal);
  }

  if (resendModal) {
    resendModal.addEventListener('click', (e) => {
      if (e.target === resendModal) {
        closeResendModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resendModal && !resendModal.classList.contains('hidden')) {
      closeResendModal();
    }
  });

  if (resendForm) {
    resendForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = resendEmailInput.value.trim();
      if (!email) {
        resendFeedback.textContent = 'Please enter an email address.';
        resendFeedback.className = 'text-sm text-red-600';
        return;
      }
      const user = auth.currentUser;
      try {
        if (user && user.email === email) {
          await sendEmailVerification(user);
          resendFeedback.textContent = 'Verification email sent.';
          resendFeedback.className = 'text-sm text-green-600';
        } else if (!user) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.length > 0) {
            resendFeedback.textContent = 'Please log in with this email first, then click Resend verification again.';
            resendFeedback.className = 'text-sm text-gray-600';
          } else {
            resendFeedback.textContent = 'No account found for this email.';
            resendFeedback.className = 'text-sm text-red-600';
          }
        } else {
          resendFeedback.textContent = 'Please log in with this email first, then click Resend verification again.';
          resendFeedback.className = 'text-sm text-gray-600';
        }
      } catch (err) {
        console.error('Resend verification failed', err);
        resendFeedback.textContent = 'Failed to send verification email. Please try again later.';
        resendFeedback.className = 'text-sm text-red-600';
      }
    });
  }
});

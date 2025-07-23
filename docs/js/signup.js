import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { auth, db } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get('plan');
  const planSelect = document.getElementById('plan');
  if (planParam && planSelect && Array.from(planSelect.options).some(o => o.value === planParam)) {
    planSelect.value = planParam;
  }

  const locale = navigator.language || '';
  const match = locale.match(/-([A-Z]{2})$/i);
  const countrySelect = document.getElementById('country');
  if (match && countrySelect) {
    const code = match[1].toUpperCase();
    if (Array.from(countrySelect.options).some(o => o.value === code)) {
      countrySelect.value = code;
    }
  }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.querySelector('#signupForm button[type="submit"]');
  submitBtn.disabled = true;
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  submitBtn.appendChild(spinner);
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const plan = document.getElementById('plan').value || 'free';
  const companyName = document.getElementById('companyName').value;
  const teamSize = document.getElementById('teamSize').value;
  const country = document.getElementById('country').value;
  const role = document.getElementById('role').value;
  const useCases = Array.from(document.getElementById('useCase').selectedOptions).map(o => o.value);
  const preferredModel = document.getElementById('preferredModel').value;
  const agreeTerms = document.getElementById('agreeTerms').checked;
  const newsletter = document.getElementById('newsletter').checked;
  const errorEl = document.getElementById('signupError');

  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    spinner.remove();
    return;
  }

  if (!agreeTerms) {
    errorEl.textContent = 'You must agree to the terms.';
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    spinner.remove();
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName: fullName });
    await sendEmailVerification(userCred.user);
    await setDoc(doc(db, 'users', userCred.user.uid), {
      name: fullName,
      email: email,
      plan,
      company: companyName || null,
      teamSize: teamSize ? Number(teamSize) : null,
      country: country || null,
      role: role || null,
      useCases: useCases.length ? useCases : null,
      preferredModel: preferredModel || null,
      newsletterOptIn: newsletter,
      agreedToTerms: agreeTerms,
      createdAt: serverTimestamp(),
      promptQuota: 10,
      usedPrompts: 0
    });
    await signOut(auth);
    alert("🎉 You've signed up! Please check your inbox and verify your email before logging in.");
    window.location.href = '/login/';
  } catch (err) {
    alert(err.message);
    submitBtn.disabled = false;
    spinner.remove();
    return;
  }
  submitBtn.disabled = false;
  spinner.remove();
});

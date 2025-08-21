(function() {
  const config = {
    apiKey: "AIzaSyA0bTCMkxBeZ9RQsqWSBI92-M6fcnwGbOU",
    authDomain: "devopsia-39ea5.firebaseapp.com",
    projectId: "devopsia-39ea5",
    storageBucket: "devopsia-39ea5.firebasestorage.app",
    messagingSenderId: "789816052410",
    appId: "1:789816052410:web:241ea4bd6a5b60ba855083"
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.11.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js');
    }
    if (window.firebase && firebase.apps && !firebase.apps.length) {
      firebase.initializeApp(config);
    }
  }

  init().catch(err => console.error('Firebase init failed', err));
})();

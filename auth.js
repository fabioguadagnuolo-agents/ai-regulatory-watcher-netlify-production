(function () {
  const loading = document.getElementById('auth-loading');
  const signedOut = document.getElementById('signed-out-view');
  const signedIn = document.getElementById('signed-in-view');

  let signInMounted = false;
  let wasSignedIn = false;

  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');

  function mountSignInOnce() {
    if (signInMounted) return;
    const signIn = document.getElementById('clerk-sign-in');
    signIn.innerHTML = '';
    Clerk.mountSignIn(signIn);
    signInMounted = true;
  }

  async function enterSignedInState() {
    wasSignedIn = true;
    hide(loading);
    hide(signedOut);
    show(signedIn);

    const userButton = document.getElementById('clerk-user-button');
    userButton.innerHTML = '';
    Clerk.mountUserButton(userButton);

    if (typeof window.initRegulatoryWatcher === 'function' && !window.__airwInitialized) {
      window.__airwInitialized = true;
      await window.initRegulatoryWatcher();
    }
  }

  function enterSignedOutState({ remount = false } = {}) {
    hide(loading);
    hide(signedIn);
    show(signedOut);

    if (remount) {
      signInMounted = false;
      const signIn = document.getElementById('clerk-sign-in');
      signIn.innerHTML = '';
    }
    mountSignInOnce();
  }

  async function renderAuthState() {
    if (!window.Clerk) {
      loading.querySelector('h2').textContent = 'Access service unavailable';
      loading.querySelector('p').textContent = 'Clerk could not be loaded. Please refresh the page.';
      return;
    }

    await Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
    });

    if (Clerk.isSignedIn) {
      await enterSignedInState();
    } else {
      enterSignedOutState();
    }
  }

  window.addEventListener('load', async () => {
    try {
      await renderAuthState();

      Clerk.addListener(async ({ user }) => {
        if (user) {
          await enterSignedInState();
          return;
        }

        /*
          IMPORTANT:
          During Clerk's email-code flow, the active user may still be null
          while the mounted SignIn component advances to the verification step.
          Re-mounting SignIn at that moment destroys the factor-one form.
          Therefore we only remount after a real sign-out from an established
          signed-in session.
        */
        if (wasSignedIn) {
          wasSignedIn = false;
          window.__airwInitialized = false;
          enterSignedOutState({ remount: true });
        }
      });
    } catch (err) {
      loading.querySelector('h2').textContent = 'Unable to initialize access';
      loading.querySelector('p').textContent =
        err && err.message ? err.message : 'Authentication initialization failed.';
    }
  });
})();

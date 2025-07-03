// Optimo_Prompt.Ai - Universal Loader
(function() {
  // Configuration
  const WORKER_URL = window.env?.WORKER_URL || "https://your-worker-name.your-subdomain.workers.dev";
  const OPTIMIZE_ENDPOINT = `${WORKER_URL}/optimize`;
  const QUOTA_ENDPOINT = `${WORKER_URL}/quota`;
  const UPGRADE_URL = "/pages/checkout.html";
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  const LOCAL_CACHE = new Map();
  
  // Device detection
  const deviceConfig = (() => {
    const ua = navigator.userAgent;
    return {
      isMobile: /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /iPad|Tablet|PlayBook|KFAPWI/i.test(ua),
      isBrave: navigator.brave && navigator.brave.isBrave
    };
  })();
  
  // Button styles
  const BUTTON_STYLES = {
    mobile: `
      position: absolute;
      right: 8px;
      bottom: 8px;
      z-index: 99999;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      border: none;
      padding: ${deviceConfig.isBrave ? '14px 20px' : '12px 18px'};
      border-radius: 50px;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    `,
    tablet: `
      position: absolute;
      right: 10px;
      bottom: 10px;
      z-index: 99999;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: bold;
      box-shadow: 0 3px 10px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
    `,
    desktop: `
      position: absolute;
      right: 8px;
      bottom: 8px;
      z-index: 99999;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
    `
  };
  
  // Get button style based on device
  const getButtonStyle = () => {
    if (deviceConfig.isMobile) return BUTTON_STYLES.mobile;
    if (deviceConfig.isTablet) return BUTTON_STYLES.tablet;
    return BUTTON_STYLES.desktop;
  };
  
  // User management
  const getUserId = () => {
    const storageKey = 'op_user_id';
    let userId = localStorage.getItem(storageKey);
    
    if (!userId) {
      userId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      localStorage.setItem(storageKey, userId);
    }
    return userId;
  };
  
  // Check quota status
  let remaining = 15; // Default free tier
  let userPlan = 'free';
  
  const checkQuota = async () => {
    try {
      const response = await fetch(QUOTA_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Signature': await generateSignature({ action: 'check_quota' })
        },
        body: JSON.stringify({ 
          action: 'check_quota',
          userId: getUserId()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        remaining = data.remaining;
        userPlan = data.plan;
        return data;
      }
    } catch (e) {
      console.error('Quota check failed:', e);
    }
    return { plan: 'free', remaining: 15 };
  };
  
  // HMAC signature generation
  const generateSignature = async (data) => {
    const encoder = new TextEncoder();
    const secret = 'public_known_secret'; // Matches worker's public secret
    
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(JSON.stringify(data))
      );
      
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Signature generation failed:', error);
      return '';
    }
  };
  
  // Main optimization handler
  const optimizeHandler = async (inputElement, btn) => {
    const userId = getUserId();
    const prompt = inputElement.value || inputElement.textContent;
    
    // Check local cache first
    if (LOCAL_CACHE.has(prompt)) {
      const cached = LOCAL_CACHE.get(prompt);
      if (cached.expiry > Date.now()) {
        updateField(inputElement, cached.value);
        btn.innerHTML = '✅';
        setTimeout(() => updateButtonText(btn), 1000);
        return;
      }
    }
    
    // Check quota
    if (remaining <= 0 && userPlan !== 'unlimited') {
      showQuotaExhausted(btn);
      return;
    }
    
    try {
      btn.innerHTML = '⏳';
      btn.disabled = true;
      
      const response = await fetch(OPTIMIZE_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Signature': await generateSignature({ prompt, userId })
        },
        body: JSON.stringify({ 
          prompt,
          userId
        })
      });
      
      // Handle quota errors
      if (response.status === 402) {
        showQuotaExhausted(btn);
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      
      const result = await response.json();
      updateField(inputElement, result.optimized);
      
      // Update cache
      LOCAL_CACHE.set(prompt, {
        value: result.optimized,
        expiry: Date.now() + CACHE_TTL
      });
      
      // Update usage
      if (remaining !== Infinity) {
        remaining--;
      }
      
      btn.innerHTML = '✅';
      btn.style.background = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
    } catch (error) {
      console.error('Optimization failed:', error);
      btn.innerHTML = '⚠️';
    } finally {
      setTimeout(() => {
        updateButtonText(btn);
        btn.disabled = false;
        btn.style.background = 'linear-gradient(135deg, #6e8efb, #a777e3)';
      }, 2000);
    }
  };
  
  // Helper functions
  const updateField = (element, value) => {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = value;
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);
    } else {
      element.textContent = value;
    }
  };
  
  const updateButtonText = (btn) => {
    btn.innerHTML = userPlan === 'unlimited' 
      ? '⚡ ∞' 
      : `⚡ ${remaining}`;
  };
  
  const showQuotaExhausted = (btn) => {
    btn.innerHTML = '⚠️ Upgrade';
    setTimeout(() => updateButtonText(btn), 2000);
    
    if (confirm('You used all optimizations! Upgrade now?')) {
      window.open(UPGRADE_URL, '_blank');
    }
  };
  
  // Create and attach button
  const createButton = (inputElement) => {
    const btn = document.createElement('button');
    btn.className = 'optimo-prompt-btn';
    btn.style.cssText = getButtonStyle();
    updateButtonText(btn);
    
    // Event listener with device-specific events
    const eventType = 'ontouchstart' in window ? 'touchstart' : 'click';
    btn.addEventListener(eventType, () => optimizeHandler(inputElement, btn));
    
    return btn;
  };
  
  // Main injection function
  const injectButtons = async () => {
    await checkQuota();
    
    const targets = document.querySelectorAll(`
      textarea,
      input[type="text"],
      input[type="search"],
      input[type="email"],
      input[type="url"],
      input[type="password"],
      [contenteditable="true"]
    `);
    
    targets.forEach(input => {
      if (input.dataset.opInjected) return;
      
      const container = input.parentElement;
      if (!container || container.querySelector('.optimo-prompt-btn')) return;
      
      // Make container relative
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      
      const btn = createButton(input);
      container.appendChild(btn);
      input.dataset.opInjected = 'true';
    });
  };
  
  // Initialize with debounced observer
  let observerTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(injectButtons, 300);
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable']
  });
  
  // Initial injection
  setTimeout(injectButtons, 1000);
  
  // SPA support
  const spaEvents = ['popstate', 'pushState', 'replaceState'];
  spaEvents.forEach(event => {
    window.addEventListener(event, injectButtons);
  });
  
  // Safari fix
  if (/Safari/i.test(navigator.userAgent)) {
    document.addEventListener('focus', (e) => {
      if (e.target.matches('textarea, input, [contenteditable]')) {
        injectButtons();
      }
    }, true);
  }
  
  console.log('Optimo_Prompt.Ai loaded!');
})();
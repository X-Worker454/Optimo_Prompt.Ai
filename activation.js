// Optimo_Prompt.Ai - Activation Manager
document.addEventListener('DOMContentLoaded', () => {
  // Activate button
  const activateBtn = document.getElementById('activateOptimo');
  if (activateBtn) {
    activateBtn.addEventListener('click', activateOptimo);
  }
  
  // Bookmarklet helper
  const bookmarkletLink = document.querySelector('.bookmarklet-link');
  if (bookmarkletLink) {
    bookmarkletLink.addEventListener('click', (e) => {
      e.preventDefault();
      activateOptimo();
    });
  }
  
  // Demo optimization
  const demoBtn = document.getElementById('optimizeDemo');
  if (demoBtn) {
    demoBtn.addEventListener('click', runDemo);
  }
  
  // Notification close
  const closeNotice = document.getElementById('closeNotice');
  if (closeNotice) {
    closeNotice.addEventListener('click', () => {
      document.getElementById('activationNotice').classList.remove('show');
    });
  }
  
  // Initialize service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  }
});

function activateOptimo() {
  const activateBtn = document.getElementById('activateOptimo');
  
  // Create and load the loader script
  const script = document.createElement('script');
  script.src = '/js/loader.js?' + Date.now();
  document.body.appendChild(script);
  
  // Visual feedback
  if (activateBtn) {
    activateBtn.innerHTML = '<i class="fas fa-check"></i> Activated!';
    activateBtn.disabled = true;
  }
  
  // Show notification
  const notice = document.getElementById('activationNotice');
  if (notice) {
    notice.classList.add('show');
    
    // Auto-hide after 5s
    setTimeout(() => {
      notice.classList.remove('show');
    }, 5000);
  }
  
  // Track activation
  if (window.gtag) {
    gtag('event', 'activation', {
      event_category: 'engagement'
    });
  }
}

function runDemo() {
  const demoBtn = document.getElementById('optimizeDemo');
  const input = document.getElementById('demoInput');
  const output = document.getElementById('demoOutput');
  
  if (!input || !output) return;
  
  const prompt = input.value.trim();
  if (!prompt) {
    alert('Please enter a prompt to optimize');
    return;
  }
  
  // Show loading state
  demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing...';
  demoBtn.disabled = true;
  
  // Simulate API call
  setTimeout(() => {
    // Demo optimization logic
    const optimized = `Develop a comprehensive marketing strategy for an eco-friendly reusable water bottle targeting environmentally-conscious young professionals (ages 25-40). Include:
    
1. Brand positioning emphasizing sustainability and style
2. Digital marketing channels (social media, influencer partnerships)
3. Eco-friendly packaging and distribution plan
4. Launch timeline with key milestones
5. Performance metrics for campaign success`;
    
    output.textContent = optimized;
    
    // Reset button
    demoBtn.innerHTML = '<i class="fas fa-magic"></i> Optimize Prompt';
    demoBtn.disabled = false;
  }, 1500);
}
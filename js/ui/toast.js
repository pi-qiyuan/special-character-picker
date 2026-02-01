/**
 * Toast Notification Service
 * Displays temporary floating messages to the user
 */
export const Toast = {
  /**
   * Show a toast message
   * @param {string} message - The message to display
   * @param {string} type - 'success' or 'error' (affects styling)
   * @param {number} duration - How long to show the toast (ms)
   */
  show(message, type = 'success', duration = 2000) {
    // Ensure container exists
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to container
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      
      // Wait for transition to finish before removing from DOM
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) {
          toast.remove();
        }
        // Remove container if empty to keep DOM clean
        if (container.children.length === 0) {
          container.remove();
        }
      });
    }, duration);
  }
};

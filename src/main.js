import './style.css';
import './scene.js';
import './cinematic-images.js';

const progressBar = document.querySelector('.page-progress-bar');
const scrollIndicator = document.querySelector('.scroll-indicator');

function updateScrollUI() {
  const scrollableHeight =
    document.documentElement.scrollHeight - window.innerHeight;

  const progress = scrollableHeight > 0
    ? (window.scrollY / scrollableHeight) * 100
    : 0;

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  if (scrollIndicator) {
    scrollIndicator.style.opacity =
      window.scrollY > window.innerHeight * 0.3 ? '0' : '1';
  }
}

window.addEventListener('scroll', updateScrollUI, { passive: true });
window.addEventListener('resize', updateScrollUI);
updateScrollUI();
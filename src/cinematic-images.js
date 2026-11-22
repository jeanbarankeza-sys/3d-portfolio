
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* =========================================================
   BJD CINEMATIC IMAGE EXPERIENCE
   Seven images • Scroll-driven transitions • Movie movement
========================================================= */

const IMAGE_FILES = [
  '../assets/images/image1.jpg',
  '../assets/images/image2.jpg',
  '../assets/images/image3.jpg',
  '../assets/images/image4.jpg',
  '../assets/images/image5.jpg',
  '../assets/images/image6.jpg',
  '../assets/images/image7.jpg',
];

const CONFIG = {
  scrub: 1.4,
  zoomStart: 1.16,
  zoomEnd: 1.02,
  fadeDuration: 0.9,
  overlayOpacity: 0.64,
  mobileOverlayOpacity: 0.72,
  enableParallax: true,
  enableGrain: true,
};

const experience = document.querySelector('#experience');

if (!experience) {
  console.warn(
    '[BJD Cinematic Images] #experience was not found.'
  );
} else {
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ---------------------------------------------------------
     CREATE CINEMATIC STAGE
  --------------------------------------------------------- */

  const stage = document.createElement('div');
  stage.className = 'bjd-cinematic-stage';
  stage.setAttribute('aria-hidden', 'true');

  const imageContainer = document.createElement('div');
  imageContainer.className = 'bjd-cinematic-images';

  const imageLayers = [];

  IMAGE_FILES.forEach((file, index) => {
    const layer = document.createElement('div');
    layer.className = 'bjd-cinematic-layer';

    const image = document.createElement('img');

    image.src = new URL(file, import.meta.url).href;
    image.alt = '';
    image.draggable = false;
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';

    const shade = document.createElement('div');
    shade.className = 'bjd-image-shade';

    const number = document.createElement('span');
    number.className = 'bjd-image-number';
    number.textContent = `0${index + 1}`;

    layer.append(image, shade, number);
    imageContainer.appendChild(layer);

    imageLayers.push({
      layer,
      image,
      index,
    });
  });

  /* Cinematic overlays */

  const gradient = document.createElement('div');
  gradient.className = 'bjd-cinematic-gradient';

  const vignette = document.createElement('div');
  vignette.className = 'bjd-cinematic-vignette';

  const grain = document.createElement('div');
  grain.className = 'bjd-cinematic-grain';

  const scanline = document.createElement('div');
  scanline.className = 'bjd-cinematic-scanline';

  const progress = document.createElement('div');
  progress.className = 'bjd-cinematic-progress';

  const progressBar = document.createElement('div');
  progressBar.className = 'bjd-cinematic-progress-bar';

  progress.appendChild(progressBar);

  stage.append(
    imageContainer,
    gradient,
    vignette,
    grain,
    scanline,
    progress
  );

  document.body.appendChild(stage);

  /* ---------------------------------------------------------
     INJECT CINEMATIC STYLES
  --------------------------------------------------------- */

  const style = document.createElement('style');

  style.textContent = `
    .bjd-cinematic-stage {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background: #030306;
}

    .bjd-cinematic-images,
    .bjd-cinematic-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .bjd-cinematic-layer {
      opacity: 0;
      overflow: hidden;
      will-change: opacity, transform;
      transform: translateZ(0);
    }

    .bjd-cinematic-layer:first-child {
      opacity: 1;
    }

    .bjd-cinematic-layer img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transform: scale(1.16);
      filter: saturate(0.82) contrast(1.08);
      will-change: transform, filter;
      user-select: none;
    }

    .bjd-image-shade {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(
          90deg,
          rgba(3, 3, 8, 0.65) 0%,
          rgba(3, 3, 8, 0.20) 50%,
          rgba(3, 3, 8, 0.48) 100%
        ),
        linear-gradient(
          0deg,
          rgba(3, 3, 8, 0.55),
          transparent 55%
        );
    }

    .bjd-image-number {
      position: absolute;
      right: 7%;
      bottom: 9%;
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(4rem, 11vw, 11rem);
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.09em;
      color: rgba(255, 255, 255, 0.12);
      user-select: none;
    }

    .bjd-cinematic-gradient {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(
          180deg,
          rgba(4, 4, 8, 0.38) 0%,
          transparent 25%,
          transparent 65%,
          rgba(4, 4, 8, 0.55) 100%
        );
      opacity: ${CONFIG.overlayOpacity};
    }

    .bjd-cinematic-vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse at center,
        transparent 35%,
        rgba(0, 0, 0, 0.52) 100%
      );
    }

    .bjd-cinematic-grain {
      position: absolute;
      inset: -50%;
      width: 200%;
      height: 200%;
      opacity: ${CONFIG.enableGrain ? '0.10' : '0'};
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    .bjd-cinematic-scanline {
      position: absolute;
      inset: 0;
      opacity: 0.12;
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 3px,
        rgba(255,255,255,0.025) 4px
      );
    }

    .bjd-cinematic-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,0.08);
    }

    .bjd-cinematic-progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(
        90deg,
        #8b5cf6,
        #38bdf8,
        #ec4899
      );
      box-shadow: 0 0 15px rgba(139,92,246,0.8);
    }

    /* Keep existing portfolio content above the images */

    #experience,
    #experience > section {
      position: relative;
      z-index: 2;
    }

    header,
    nav,
    .site-header,
    .navbar {
      position: relative;
      z-index: 10;
    }

    @media (max-width: 768px) {
      .bjd-cinematic-gradient {
        opacity: ${CONFIG.mobileOverlayOpacity};
      }

      .bjd-cinematic-layer img {
        object-position: center;
      }

      .bjd-image-number {
        right: 5%;
        bottom: 6%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bjd-cinematic-grain {
        display: none;
      }
    }

     #app {
  position: relative;
  isolation: auto;
}

#webgl {
  z-index: 0;
}

#experience {
  position: relative;
  z-index: 2;
}

#experience .scene-section {
  position: relative;
  z-index: 2;
}

#experience .hero-content,
#experience .section-content,
#experience .hero-side-label,
#experience .hero-location,
#experience .section-number,
#experience .site-footer {
  position: relative;
  z-index: 3;
}

.site-header {
  z-index: 20;
}
  `;

  document.head.appendChild(style);

  /* ---------------------------------------------------------
     INITIAL IMAGE STATE
  --------------------------------------------------------- */

  imageLayers.forEach(({ layer, image }, index) => {
    gsap.set(layer, {
      opacity: index === 0 ? 1 : 0,
    });

    gsap.set(image, {
      scale: CONFIG.zoomStart,
    });
  });

  /* ---------------------------------------------------------
     CINEMATIC SCROLL TIMELINE
  --------------------------------------------------------- */

  if (!reducedMotion) {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: experience,
        start: 'top top',
        end: 'bottom bottom',
        scrub: CONFIG.scrub,
        invalidateOnRefresh: true,
      },
    });

    imageLayers.forEach(({ layer, image }, index) => {
      const position = index;

      timeline.to(
        layer,
        {
          opacity: 1,
          duration: CONFIG.fadeDuration,
          ease: 'power2.inOut',
        },
        position
      );

      timeline.to(
        image,
        {
          scale: CONFIG.zoomEnd,
          duration: 1,
          ease: 'none',
        },
        position
      );

      timeline.to(
        image,
        {
          scale: 1.10,
          duration: 0.85,
          ease: 'none',
        },
        position + 0.15
      );

      if (index < imageLayers.length - 1) {
        timeline.to(
          layer,
          {
            opacity: 0,
            duration: CONFIG.fadeDuration,
            ease: 'power2.inOut',
          },
          position + 0.85
        );
      }
    });

    /* Scroll progress indicator */

    gsap.to(progressBar, {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: experience,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
      },
    });
  } else {
    gsap.set(imageLayers[0].layer, {
      opacity: 1,
    });
  }

  /* ---------------------------------------------------------
     CURSOR PARALLAX
  --------------------------------------------------------- */

  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  function handlePointerMove(event) {
    if (!CONFIG.enableParallax || reducedMotion) return;

    targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  window.addEventListener('pointermove', handlePointerMove, {
    passive: true,
  });

  let animationFrame;

  function animateParallax() {
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;

    imageLayers.forEach(({ image }) => {
      gsap.set(image, {
        x: pointerX * -10,
        y: pointerY * -8,
      });
    });

    animationFrame = requestAnimationFrame(animateParallax);
  }

  if (CONFIG.enableParallax && !reducedMotion) {
    animateParallax();
  }

  /* ---------------------------------------------------------
     IMAGE LOAD ERROR HANDLING
  --------------------------------------------------------- */

  imageLayers.forEach(({ image, index }) => {
    image.addEventListener('error', () => {
      console.error(
        `[BJD Cinematic Images] Could not load image${index + 1}.jpg`
      );
    });

    image.addEventListener('load', () => {
      console.log(
        `[BJD Cinematic Images] Image ${index + 1} loaded.`
      );
    });
  });

  /* ---------------------------------------------------------
     RESPONSIVE REFRESH
  --------------------------------------------------------- */

  let resizeTimeout;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);
  });

  /* ---------------------------------------------------------
     PUBLIC CONTROL API
  --------------------------------------------------------- */

  window.BJDCinematicImages = {
    stage,
    imageLayers,

    refresh() {
      ScrollTrigger.refresh();
    },

    destroy() {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === experience) {
          trigger.kill();
        }
      });

      gsap.killTweensOf(progressBar);
      stage.remove();
      style.remove();

      delete window.BJDCinematicImages;
    },
  };

  console.log(
    'BJD Cinematic Image Experience — Initialized'
  );
}

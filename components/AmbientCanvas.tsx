'use client';

import { useEffect, useRef } from 'react';

export default function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    if (reduced || mobile) return;

    let cleanup = () => {};
    let disposed = false;
    (async () => {
      try {
        const THREE = await import('three');
        if (disposed || !canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
        camera.position.z = 7;

        const geometry = new THREE.BufferGeometry();
        const count = 54;
        const points = new Float32Array(count * 3);
        const speed = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          points[i * 3] = (Math.random() - .5) * 7;
          points[i * 3 + 1] = (Math.random() - .5) * 4.2;
          points[i * 3 + 2] = (Math.random() - .5) * 2;
          speed[i] = .002 + Math.random() * .004;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
        const material = new THREE.PointsMaterial({ color: 0xd78996, size: .055, transparent: true, opacity: .42, depthWrite: false });
        const petals = new THREE.Points(geometry, material);
        scene.add(petals);

        let raf = 0;
        let running = true;
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const w = Math.max(1, Math.floor(rect.width));
          const h = Math.max(1, Math.floor(rect.height));
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
        const animate = () => {
          if (!running) return;
          const pos = geometry.getAttribute('position') as any;
          for (let i = 0; i < count; i++) {
            pos.array[i * 3 + 1] -= speed[i];
            pos.array[i * 3] += Math.sin(performance.now() * .0005 + i) * .00055;
            if (pos.array[i * 3 + 1] < -2.3) pos.array[i * 3 + 1] = 2.3;
          }
          pos.needsUpdate = true;
          petals.rotation.z += .00035;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(animate);
        };
        const visibility = () => { running = !document.hidden; if (running) animate(); else cancelAnimationFrame(raf); };
        document.addEventListener('visibilitychange', visibility);
        animate();
        cleanup = () => {
          running = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', visibility);
          geometry.dispose(); material.dispose(); renderer.dispose();
        };
      } catch {
        // SVG artwork remains the premium fallback.
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" aria-hidden="true" />;
}

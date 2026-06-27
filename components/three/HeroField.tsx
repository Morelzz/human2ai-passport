"use client";

import { useEffect, useRef } from "react";

// ──────────────────────────────────────────────────────────────────────────
// HERO FIELD — campo di particelle WebGL (Three.js) per l'hero della home.
// Un orizzonte di punti color Lumen che respira su obsidian: profondita',
// non decorazione. E' la versione "digitale momentanea" che sostituisce il
// vecchio video di brand. Stessa filosofia/budget del VoidField della CTA, ma
// piu' ampio e basso (riempie l'hero come un orizzonte cinematografico).
//
// Budget: ~7.7k punti desktop / ~2.6k mobile, pixel ratio <=1.6, low-power,
// import dinamico di three (chunk separato), animazione SOLO in viewport,
// niente canvas con prefers-reduced-motion (resta l'obsidian + il bagliore CSS).
// ──────────────────────────────────────────────────────────────────────────

export default function HeroField({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      const w = host.clientWidth || 1200;
      const h = host.clientHeight || 700;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(w, h);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 80);
      // Camera bassa e leggermente dall'alto: l'orizzonte di punti riempie il
      // basso dell'hero e sfuma in lontananza.
      camera.position.set(0, 3.0, 8.6);
      camera.lookAt(0, -0.6, -2);

      // Griglia ampia e bassa, vista di taglio = orizzonte digitale.
      const isSmall = w < 768;
      const COLS = isSmall ? 76 : 150;
      const ROWS = isSmall ? 34 : 52;
      const N = COLS * ROWS;
      const base = new Float32Array(N * 3);
      let k = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          base[k++] = (c / (COLS - 1) - 0.5) * 34; // x: ampio
          base[k++] = 0;                            // y: animata
          base[k++] = (r / (ROWS - 1) - 0.5) * 20;  // z: profondo
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
      const mat = new THREE.PointsMaterial({
        color: 0xf2e9d8, // Lumen: luce, non colore
        size: 0.045,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      const arr = (geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>).array as Float32Array;
      let t = 0;
      let raf = 0;
      let running = true;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!running) return;
        t += 0.009;
        for (let i = 0; i < N; i++) {
          const x = base[i * 3];
          const z = base[i * 3 + 2];
          // Tre onde incrociate, lente: il "respiro" dell'orizzonte.
          arr[i * 3 + 1] =
            Math.sin(x * 0.42 + t) * 0.42 +
            Math.cos(z * 0.7 + t * 0.75) * 0.34 +
            Math.sin((x + z) * 0.24 + t * 0.45) * 0.2;
        }
        (geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>).needsUpdate = true;
        points.rotation.y = Math.sin(t * 0.04) * 0.05;
        renderer.render(scene, camera);
      };
      tick();

      // Si anima solo quando l'hero e' in vista (risparmio batteria/CPU).
      const io = new IntersectionObserver(([e]) => {
        running = !!e?.isIntersecting;
      });
      io.observe(host);

      const onResize = () => {
        const w2 = host.clientWidth || w;
        const h2 = host.clientHeight || h;
        renderer.setSize(w2, h2);
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener("resize", onResize);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className={className} style={{ pointerEvents: "none" }} />;
}

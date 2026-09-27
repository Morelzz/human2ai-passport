"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ScattoVetrina } from "@/lib/vetrina";

// ──────────────────────────────────────────────────────────────────────────
// LA LENTE CHE LEGGE IL CERTIFICATO (27/9/2026, proposta A approvata da
// Morelz al posto del volto di punti). La filigrana visibile non c'e' piu':
// dentro ogni scatto resta il certificato, invisibile. Una lente di vetro
// scorre sulla foto e lo rende leggibile: dentro la lente la foto va in due
// toni e affiora il testo del certificato, accanto compare la lettura.
//
// WebGL scritto a mano (nessuna libreria): rifrazione come una goccia di vetro,
// bordo con aberrazione cromatica, anello ambra. Col mouse la guidi tu; senza
// mano (e sul telefono) gira da sola sul volto seguendo lo scorrimento, e col
// dito la trascini. La scena non si blocca: niente sticky, niente scossoni.
// Senza WebGL o con "riduci animazioni" resta la foto con la lettura ferma.
// Disegna solo quando e' sullo schermo.
// ──────────────────────────────────────────────────────────────────────────

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes, uImgRes, uFuoco, uLente;
uniform sampler2D uImg, uCert;
uniform float uR, uT, uOn;
// "cover" come in CSS, tenendo il volto in quadro anche in verticale
vec2 cover(vec2 uv){
  float ra = uRes.x/uRes.y, ri = uImgRes.x/uImgRes.y;
  if (ra > ri) { float s = ri/ra; float c = clamp(uFuoco.y, s*.5, 1.-s*.5); uv.y = c + (uv.y-.5)*s; }
  else { float s = ra/ri; float c = clamp(uFuoco.x, s*.5, 1.-s*.5); uv.x = c + (uv.x-.5)*s; }
  return uv;
}
void main(){
  vec2 p = vUv*uRes; vec2 d = p - uLente; float dist = length(d); float r = max(uR*uOn, 1.);
  float dentro = 1. - smoothstep(r-1.5, r+1.5, dist);
  float k = clamp(dist/r, 0., 1.); vec2 dir = d/max(dist, 1.);
  float curva = 1. - sqrt(max(0., 1.-k*k));
  vec2 pl = p - dir*curva*r*.42*dentro;
  vec2 uvl = cover(pl/uRes);
  float ca = dentro*pow(k, 3.)*.010;
  vec3 lente = vec3(texture2D(uImg, uvl+dir*ca).r, texture2D(uImg, uvl).g, texture2D(uImg, uvl-dir*ca).b);
  vec3 base = texture2D(uImg, cover(vUv)).rgb;
  float lum = dot(lente, vec3(.299,.587,.114));
  vec3 duo = mix(vec3(.035,.03,.025), vec3(1.,.74,.36), smoothstep(.05,.95,lum));
  // il testo scala con la lente, uguale su ogni schermo
  float glifo = texture2D(uCert, (pl + vec2(uT*18., 0.)) / (max(uR, 1.) * vec2(2., 1.))).a;
  float maglia = smoothstep(.93, 1., max(abs(sin(pl.x*.09)), abs(sin(pl.y*.09)))) * .12;
  vec3 rivela = duo*1.05 + glifo*vec3(.35,1.,.62)*(.12+lum*.8) + maglia*vec3(1.,.74,.36);
  rivela *= .9 + .1*sin(pl.y*1.3 - uT*7.);
  vec3 col = mix(base*(1.-.18*uOn), rivela, dentro);
  col = mix(col, lente, dentro*smoothstep(.72, 1., k)*.55);
  float anello = exp(-pow((dist-r)/2.2, 2.)) + .35*exp(-pow((dist-r)/10., 2.));
  col += anello*vec3(1.,.72,.3)*uOn;
  gl_FragColor = vec4(col, 1.);
}`;

// Il volto nello scatto (frazioni della foto intera, dall'alto).
const FUOCO = { x: 0.455, y: 0.3 };

function dataItaliana(iso: string | null): string | null {
  if (!iso) return null;
  const [a, m, g] = iso.split("-");
  return a && m && g ? `${g}.${m}.${a}` : null;
}

export function LenteCertificato({
  vetrina,
  foto,
}: {
  vetrina: ScattoVetrina;
  foto: { src760: string; src1200: string; src1536: string };
}) {
  const scena = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const lettura = useRef<HTMLDivElement>(null);

  const cert = vetrina.certificato.slice(0, 12);
  const giorno = dataItaliana(vetrina.consensoDal);
  const euro = (vetrina.allaPersonaCent / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nome = vetrina.nome;

  useEffect(() => {
    const el = scena.current, cv = tela.current, box = lettura.current;
    if (!el || !cv || !box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const telefono = window.matchMedia("(max-width: 767px)").matches;
    const dprMax = telefono ? 2 : 1.5;
    let vivo = true, raf = 0, pronta = false, visibile = false;
    let w = 0, h = 0, dpr = 1;
    const s = { x: 0, y: 0, tx: 0, ty: 0, on: 0, mano: -1e9, t0: performance.now() };

    // ── programma ──
    const sh = (t: number, src: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(pr, n);
    const u = { res: U("uRes"), img: U("uImgRes"), fuoco: U("uFuoco"), lente: U("uLente"), r: U("uR"), t: U("uT"), on: U("uOn") };

    function texture(unita: number, nome: string, src: TexImageSource, ripeti: boolean) {
      const t = gl!.createTexture();
      gl!.activeTexture(gl!.TEXTURE0 + unita);
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, src);
      const wr = ripeti ? gl!.REPEAT : gl!.CLAMP_TO_EDGE;
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wr);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wr);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.uniform1i(U(nome), unita);
    }

    // Il certificato come trama: righe di testo ripetute (512x256, si ripete).
    function trama() {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const x = c.getContext("2d")!;
      x.font = `500 15px ${getComputedStyle(box!).fontFamily}`;
      x.fillStyle = "#fff";
      const N = nome.toUpperCase();
      const righe = [`${N}  CONSENSO ATTIVO  `, `CERT ${cert}  `, `${giorno ? `SI ${giorno}  ` : ""}USO COMMERCIALE  `, `${euro} EUR A ${N}  `, "SEMBLIC  REGISTRO  "];
      for (let y = 0, i = 0; y < 256; y += 21, i++) x.fillText(righe[i % righe.length].repeat(5), -((i * 67) % 180), y + 16);
      return c;
    }

    function misura() {
      const r = cv!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      w = r.width; h = r.height;
      cv!.width = Math.round(w * dpr); cv!.height = Math.round(h * dpr);
      gl!.viewport(0, 0, cv!.width, cv!.height);
      if (!s.x) { s.x = s.tx = w * 0.47; s.y = s.ty = h * 0.36; }
    }

    function progresso() {
      const r = el!.getBoundingClientRect();
      return Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
    }

    function giro(now: number) {
      raf = 0;
      if (!vivo || !visibile || !pronta) return;
      const t = (now - s.t0) / 1000;
      const R = telefono ? Math.min(w * 0.26, h * 0.12) : Math.min(w, h) * 0.17;
      const bw = box!.offsetWidth, bh = box!.offsetHeight;
      // Sul telefono la lettura sta sopra la lente e sotto la barra in alto (96px).
      const sopra = 96 + bh + 12 + R;
      // Senza mano: gira da sola sul volto (sul telefono la guida lo scorrimento).
      if (now - s.mano > 2200) {
        const q = telefono ? progresso() : t * 0.18;
        const fx = w * (telefono ? 0.5 : 0.47), fy = telefono ? Math.max(h * 0.36, sopra) : h * 0.34;
        s.tx = fx + Math.cos(q * 6.283 * (telefono ? 1.4 : 1)) * w * (telefono ? 0.22 : 0.12);
        s.ty = fy + Math.sin(q * 6.283 * (telefono ? 2.1 : 1.6)) * h * 0.1;
      }
      s.x += (s.tx - s.x) * 0.12;
      s.y += (s.ty - s.y) * 0.12;
      s.on += (1 - s.on) * 0.05;
      gl!.uniform2f(u.res, w * dpr, h * dpr);
      gl!.uniform2f(u.lente, s.x * dpr, (h - s.y) * dpr);
      gl!.uniform1f(u.r, R * dpr);
      gl!.uniform1f(u.t, t);
      gl!.uniform1f(u.on, s.on);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      // La lettura accanto alla lente, dal lato dove c'e' spazio (sul telefono sopra).
      let lx: number, ly: number;
      if (telefono) {
        lx = Math.max(12, Math.min(w - bw - 12, s.x - bw / 2));
        ly = Math.max(96, s.y - R - bh - 12); // sopra la lente: sotto c'e' il titolo
      } else {
        lx = s.x < w * 0.6 ? s.x + R + 14 : s.x - R - 14 - bw;
        lx = Math.max(12, Math.min(w - bw - 12, lx));
        ly = Math.max(12, Math.min(h - bh - 12, s.y - bh / 2));
      }
      box!.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(giro);
    }
    const avvia = () => { if (!raf && visibile && pronta) raf = requestAnimationFrame(giro); };

    // La foto si carica solo quando la scena si avvicina.
    let caricata = false;
    function carica() {
      if (caricata) return;
      caricata = true;
      const img = new Image();
      img.decoding = "async";
      img.src = telefono ? foto.src1200 : foto.src1536;
      Promise.all([img.decode(), document.fonts?.ready ?? Promise.resolve()])
        .then(() => {
          if (!vivo) return;
          texture(0, "uImg", img, false);
          texture(1, "uCert", trama(), true);
          gl!.uniform2f(u.img, img.naturalWidth, img.naturalHeight);
          gl!.uniform2f(u.fuoco, FUOCO.x, 1 - FUOCO.y);
          misura();
          pronta = true;
          el!.dataset.lente = "viva"; // CSS: tela visibile, lettura mobile
          avvia();
        })
        .catch(() => {});
    }

    const vicino = new IntersectionObserver(([e]) => { if (e.isIntersecting) carica(); }, { rootMargin: "600px 0px" });
    vicino.observe(el);
    const io = new IntersectionObserver(([e]) => { visibile = e.isIntersecting; avvia(); });
    io.observe(el);
    const ro = new ResizeObserver(() => { if (pronta) misura(); });
    ro.observe(el);

    const punta = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      s.tx = e.clientX - r.left; s.ty = e.clientY - r.top; s.mano = performance.now();
    };
    const lascia = () => { s.mano = -1e9; };
    el.addEventListener("pointermove", punta);
    el.addEventListener("pointerdown", punta);
    el.addEventListener("pointerleave", lascia);
    const persa = (e: Event) => { e.preventDefault(); pronta = false; delete el.dataset.lente; };
    cv.addEventListener("webglcontextlost", persa);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      vicino.disconnect(); io.disconnect(); ro.disconnect();
      el.removeEventListener("pointermove", punta);
      el.removeEventListener("pointerdown", punta);
      el.removeEventListener("pointerleave", lascia);
      cv.removeEventListener("webglcontextlost", persa);
      delete el.dataset.lente;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [foto.src1200, foto.src1536, nome, cert, giorno, euro]);

  return (
    <section aria-labelledby="titolo-lente" className="px-3 py-3 sm:px-4">
      <div
        ref={scena}
        className="lente-scena relative h-[100svh] min-h-[560px] overflow-hidden rounded-[28px] bg-[#0E0C09] text-[#F4EEE3] touch-pan-y max-sm:rounded-[22px]"
      >
        <picture>
          <source type="image/webp" srcSet={`${foto.src760} 760w, ${foto.src1200} 1200w, ${foto.src1536} 1536w`} sizes="100vw" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.src1200}
            alt={`${nome} al caffe', uno scatto certificato su Semblic`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `${FUOCO.x * 100}% ${FUOCO.y * 100}%` }}
          />
        </picture>
        <canvas ref={tela} aria-hidden className="lente-tela absolute inset-0 h-full w-full" />

        <p aria-hidden className="absolute bottom-14 right-12 z-[1] hidden rounded-full border border-white/20 px-3 py-1.5 font-mono text-[0.75rem] text-white/60 lg:[@media(pointer:fine)]:block">
          passaci sopra
        </p>

        <div
          ref={lettura}
          aria-hidden
          className="lente-lettura absolute left-0 top-0 rounded-[14px] border border-[#E29A2E]/45 bg-[#0E0C09]/60 px-3.5 py-2.5 font-mono text-[11px] leading-[1.6] backdrop-blur-md sm:text-[12.5px]"
        >
          <p className="text-[#E29A2E]">filigrana invisibile, letta</p>
          <p className="flex items-center gap-2 whitespace-nowrap">
            <i className="h-[7px] w-[7px] flex-none rounded-full bg-[#3DDC97] shadow-[0_0_10px_#3DDC97]" />
            {nome}, consenso attivo
          </p>
          <p className="whitespace-nowrap">certificato {cert}</p>
          {giorno && <p className="whitespace-nowrap">sì dato il {giorno}</p>}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0E0C09]/95 via-[#0E0C09]/55 to-transparent px-5 pb-8 pt-32 max-sm:[@media(max-height:700px)]:pb-5 sm:px-12 sm:pb-14 lg:px-[4.5rem]">
          <h2 id="titolo-lente" className="max-w-[14ch] text-[2.2rem] font-bold max-sm:[@media(max-height:700px)]:text-[1.85rem] leading-[0.98] tracking-[-0.045em] sm:text-[3.4rem] lg:text-[4.6rem]">
            Non si vede. Si legge.
          </h2>
          <p className="mt-3.5 max-w-[44ch] text-[1rem] leading-[1.45] text-white/78 sm:text-[1.2rem] max-sm:[@media(max-height:700px)]:mt-2 max-sm:[@media(max-height:700px)]:text-[0.92rem]">
            Ogni scatto porta dentro il suo certificato, invisibile.{" "}
            <span className="max-sm:[@media(max-height:700px)]:hidden">Chi lo legge trova chi c&apos;è nella foto e quando ha detto sì.</span>
          </p>
          <Link
            href={`/verify?token=${encodeURIComponent(vetrina.certificato)}`}
            className="pointer-events-auto mt-5 inline-flex min-h-[44px] items-center rounded-full border border-white/25 px-5 text-[0.95rem] font-semibold text-[#F4EEE3] transition-colors hover:border-[#E29A2E] hover:text-[#E29A2E]"
          >
            Leggi questo certificato
          </Link>
          <p className="sr-only">
            Certificato {cert}: {nome}, consenso attivo{giorno ? `, sì dato il ${giorno}` : ""}. A {nome} sono andati {euro} euro per questo scatto.
          </p>
        </div>
      </div>
    </section>
  );
}

(function () {
"use strict";

/* ════════════════════════════════════════════════════════════════
   0. BOOT SAFETY — runs before anything can go wrong
   ════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const startHooks = [];
let entered = false;

function fail(msg){
  const gate = $("gate");
  if (!gate){ alert(msg); return; }
  const p = gate.querySelector("p");
  if (p){ p.innerHTML = msg; p.style.color = "#ffa2a2"; p.style.letterSpacing = ".06em"; p.style.maxWidth = "46ch"; }
  const b = $("enter");
  if (b){ b.textContent = "Can't open the sky"; b.style.borderColor = "rgba(255,162,162,.5)"; }
}

window.addEventListener("error", function (e) {
  fail("The galaxy failed to build.<br><br>" +
       (e.message || "Unknown error") +
       "<br>" + ((e.filename || "").split("/").pop() || "") + (e.lineno ? ":" + e.lineno : ""));
});

/* the button is wired up first, so it always responds */
function enterSky(){
  if (entered) return;
  entered = true;
  const gate = $("gate");
  if (gate){
    gate.classList.add("gone");
    setTimeout(function(){ if (gate.parentNode) gate.remove(); }, 1600);
  }
  startHooks.forEach(function (fn) { try { fn(); } catch (err) { console.error(err); } });
}
if ($("enter")) $("enter").addEventListener("click", enterSky);

if (typeof THREE === "undefined"){
  fail("Three.js didn\u2019t load.<br><br>Check your internet connection, or download <b>three.min.js</b> (r128) into this same folder and reload.");
  return;
}


/* ════════════════════════════════════════════════════════════════
   1. YOUR MEMORIES
   Each entry becomes one orbiting photo in the galaxy.
   photo / song: leave "" to use the built-in placeholder + generated
   music, or set a file path like "photos/first-date.jpg" and
   "songs/our-song.mp3" once you host this page.
   ════════════════════════════════════════════════════════════════ */
const firstMeetImg = new Image();
firstMeetImg.src = new URL("./first meet.jpg", window.location.href).href;

const MEMORIES = [
  { title:"we first talked",  date:"3 January",  note:"nung time na papansin pako sainyo.", photo:"first meet.jpg", song:"", track:"Track one", hue:"#ff86ab", radius:15, angle:0.35, height: 1.1 },
  { title:"BABY PICS",date:"10 April",     note:"CUTE.",  photo:"baby pic.jpg", song:"", track:"Track two", hue:"#8f7dff", radius:21, angle:1.35, height:-1.6 },
  { title:"IMISSYOUSOMUCH",   date:"6 June",      note:"IMISSYOUSOMUCH.", photo:"cute mo.jpg", song:"", track:"Track three",hue:"#ffb257", radius:27, angle:2.45, height: 2.0 },
  { title:"LET'S FIX THIS JEONA",   date:"3 August",    note:"ITS ALL MY FAULT.", photo:"HAYS IMISSYOU.jpg", song:"", track:"Track four", hue:"#6fe3d0", radius:33, angle:3.55, height:-0.9 },
  { title:"I LOVE YOU SO MUCH",    date:"UNTIL NOW",   note:"IKAW PARIN TALAGA.",   photo:"MYBABY.jpg", song:"", track:"Track five", hue:"#ffd39a", radius:39, angle:4.60, height: 1.8 },
  { title:"Still here",       date:"Today",        note:"andito pa rin ako.", photo:"bebe.jpg", song:"", track:"Track six", hue:"#ff6f91", radius:45, angle:5.62, height:-2.2 }
];

/* ════════════════════════════════════════════════════════════════
   2. SCENE
   ════════════════════════════════════════════════════════════════ */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04050d, 0.0032);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 4000);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:"high-performance" });
} catch (err) {
  fail("Your browser couldn\u2019t start WebGL, so the 3D galaxy can\u2019t run here.<br><br>Try Chrome, Edge or Firefox with hardware acceleration switched on.");
  throw err;
}
if (!renderer || !renderer.getContext()){
  fail("WebGL isn\u2019t available in this browser.");
  throw new Error("no webgl context");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x04050d, 1);
document.body.appendChild(renderer.domElement);

const galaxy = new THREE.Group();   // everything that spins together
scene.add(galaxy);

const MOBILE = innerWidth < 760;

/* ---- soft round sprite used by stars, glows, nebulae ---- */
function radialTexture(stops) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(s => grad.addColorStop(s[0], s[1]));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
const glowTex = radialTexture([[0,"rgba(255,255,255,1)"],[0.18,"rgba(255,255,255,.75)"],[0.45,"rgba(255,255,255,.17)"],[1,"rgba(255,255,255,0)"]]);

const solarGroup = new THREE.Group();
solarGroup.position.set(0, 14, -190);
scene.add(solarGroup);

const solarBodies = [];
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(15, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc772 })
);
solarGroup.add(sun);

const sunGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffbf5e,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
sunGlow.scale.set(28, 28, 1);
solarGroup.add(sunGlow);

const planetPalette = [
  { name: "Mercury", color: 0xb6a790, radius: 4.4, orbit: 30, speed: 0.7, tilt: 0.18 },
  { name: "Venus", color: 0xd8b77a, radius: 5.2, orbit: 40, speed: 0.56, tilt: 0.22 },
  { name: "Earth", color: 0x5ea4ff, radius: 5.8, orbit: 51, speed: 0.46, tilt: 0.3 },
  { name: "Mars", color: 0xd76f4b, radius: 4.8, orbit: 64, speed: 0.38, tilt: 0.4 },
  { name: "Jupiter", color: 0xd7a17b, radius: 8.8, orbit: 82, speed: 0.24, tilt: 0.38 },
  { name: "Saturn", color: 0xe2c584, radius: 8, orbit: 100, speed: 0.2, tilt: 0.42 },
  { name: "Uranus", color: 0x8ed9e8, radius: 6.4, orbit: 120, speed: 0.15, tilt: 0.46 },
  { name: "Neptune", color: 0x4a74ff, radius: 6.1, orbit: 138, speed: 0.12, tilt: 0.48 },
  { name: "Pluto", color: 0xbcae9a, radius: 3.8, orbit: 156, speed: 0.09, tilt: 0.52 }
];

planetPalette.forEach((planet, index) => {
  const orbitGroup = new THREE.Group();
  orbitGroup.rotation.x = planet.tilt;
  orbitGroup.rotation.z = index * 0.35;
  solarGroup.add(orbitGroup);

  const planetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(planet.radius, 24, 24),
    new THREE.MeshBasicMaterial({ color: planet.color })
  );
  planetMesh.userData.index = index;
  planetMesh.position.x = planet.orbit;
  orbitGroup.add(planetMesh);

  const planetGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    color: planet.color,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  planetGlow.scale.set(planet.radius * 4.5, planet.radius * 4.5, 1);
  planetMesh.add(planetGlow);

  if (planet.name === "Saturn") {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(planet.radius * 1.8, planet.radius * 3.3, 48),
      new THREE.MeshBasicMaterial({ color: 0xd8c8a0, side: THREE.DoubleSide, transparent: true, opacity: 0.38 })
    );
    ring.rotation.x = Math.PI / 2.4;
    planetMesh.add(ring);
  }

  solarBodies.push({
    mesh: planetMesh,
    orbit: orbitGroup,
    radius: planet.orbit,
    speed: planet.speed,
    angle: index * 1.5,
    drift: (index % 2 === 0 ? 1 : -1) * 1.5
  });
});

/* ════════════════════════════════════════════════════════════════
   3. SPIRAL GALAXY (shader points)
   ════════════════════════════════════════════════════════════════ */
const STAR_COUNT = MOBILE ? 24000 : 60000;
const ARMS = 4, GAL_RADIUS = 92, SPIN = 1.05;

const gPos = new Float32Array(STAR_COUNT * 3);
const gCol = new Float32Array(STAR_COUNT * 3);
const gScl = new Float32Array(STAR_COUNT);
const gSeed = new Float32Array(STAR_COUNT);

const core = new THREE.Color("#ffd9a0");
const mid  = new THREE.Color("#ff9ec4");
const edge = new THREE.Color("#6a7bff");

for (let i = 0; i < STAR_COUNT; i++) {
  const i3 = i * 3;
  const r = Math.pow(Math.random(), 0.55) * GAL_RADIUS;
  const arm = (i % ARMS) / ARMS * Math.PI * 2;
  const spin = r * SPIN * 0.055;
  const spread = 0.42 + r * 0.011;
  const rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * r * 0.13;
  const ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (0.9 + 2.4 / (1 + r * 0.14));
  const rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * r * 0.13;
  const a = arm + spin;

  gPos[i3]     = Math.cos(a) * r + rx;
  gPos[i3 + 1] = ry;
  gPos[i3 + 2] = Math.sin(a) * r + rz;

  const t = r / GAL_RADIUS;
  const c = t < 0.42
    ? core.clone().lerp(mid, t / 0.42)
    : mid.clone().lerp(edge, (t - 0.42) / 0.58);
  c.multiplyScalar(0.72 + Math.random() * 0.5);
  gCol[i3] = c.r; gCol[i3 + 1] = c.g; gCol[i3 + 2] = c.b;

  gScl[i]  = 0.35 + Math.pow(Math.random(), 3.2) * 2.6;
  gSeed[i] = Math.random() * 100;
}

const galGeo = new THREE.BufferGeometry();
galGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
galGeo.setAttribute("color",    new THREE.BufferAttribute(gCol, 3));
galGeo.setAttribute("aScale",   new THREE.BufferAttribute(gScl, 1));
galGeo.setAttribute("aSeed",    new THREE.BufferAttribute(gSeed, 1));

const starMat = new THREE.ShaderMaterial({
  depthWrite:false, transparent:true, blending:THREE.AdditiveBlending, vertexColors:true,
  uniforms:{ uTime:{value:0}, uSize:{value:26.0}, uDpr:{value:Math.min(devicePixelRatio,2)} },
  vertexShader:`
    attribute float aScale; attribute float aSeed;
    uniform float uTime, uSize, uDpr;
    varying vec3 vColor; varying float vTw;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      float wave = sin(uTime * 0.8 + aSeed * 6.2831 + position.y * 0.45);
      float tw = 0.8 + 0.2 * wave;
      vTw = tw;
      gl_PointSize = uSize * aScale * uDpr * tw * (1.0/-mv.z) * 7.5;
      gl_PointSize = clamp(gl_PointSize, 0.6, 18.0*uDpr);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader:`
    varying vec3 vColor; varying float vTw;
    void main(){
      float d = distance(gl_PointCoord, vec2(0.5));
      float core = pow(max(0.0, 1.0 - d*2.0), 2.4);
      float halo = pow(max(0.0, 1.0 - d*2.0), 0.7)*0.16;
      float a = core + halo;
      if(a < 0.01) discard;
      gl_FragColor = vec4(vColor*(0.85+vTw*0.5), a);
    }`
});
galaxy.add(new THREE.Points(galGeo, starMat));

/* ---- nebula haze ---- */
const nebTex = radialTexture([[0,"rgba(255,255,255,.55)"],[0.35,"rgba(255,255,255,.2)"],[1,"rgba(255,255,255,0)"]]);
const nebColors = ["#4b3a9e","#8c3a6d","#2b5f7a","#6d3f8f","#9a5b34"];
for (let i = 0; i < (MOBILE ? 12 : 20); i++) {
  const r = 8 + Math.random() * GAL_RADIUS;
  const a = Math.random() * Math.PI * 2 + r * SPIN * 0.055;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map:nebTex, color:new THREE.Color(nebColors[i % nebColors.length]),
    transparent:true, opacity:0.10 + Math.random() * 0.12,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  s.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 5, Math.sin(a) * r);
  const sc = 22 + Math.random() * 40;
  s.scale.set(sc, sc * (0.5 + Math.random() * 0.4), 1);
  galaxy.add(s);
}

/* ---- distant field, does not spin with the galaxy ---- */
const backdrop = {};
(function buildBackdrop(){
  const n = MOBILE ? 1800 : 3600, p = new Float32Array(n*3), c = new Float32Array(n*3), sc = new Float32Array(n), sd = new Float32Array(n);
  for (let i=0;i<n;i++){
    const i3=i*3, R=420+Math.random()*900;
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
    p[i3]=R*Math.sin(ph)*Math.cos(th); p[i3+1]=R*Math.cos(ph)*0.75; p[i3+2]=R*Math.sin(ph)*Math.sin(th);
    const col=new THREE.Color().setHSL(0.55+Math.random()*0.18, 0.5, 0.62+Math.random()*0.3);
    c[i3]=col.r;c[i3+1]=col.g;c[i3+2]=col.b; sc[i]=0.6+Math.random()*2.6; sd[i]=Math.random()*100;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(p,3));
  g.setAttribute("color",new THREE.BufferAttribute(c,3));
  g.setAttribute("aScale",new THREE.BufferAttribute(sc,1));
  g.setAttribute("aSeed",new THREE.BufferAttribute(sd,1));
  const m = starMat.clone(); m.uniforms = THREE.UniformsUtils.clone(starMat.uniforms); m.uniforms.uSize.value = 180.0;
  const pts = new THREE.Points(g,m); scene.add(pts);
  backdrop.mat = m; backdrop.pts = pts;
})();

/* ════════════════════════════════════════════════════════════════
   4. BLACK HOLE
   ════════════════════════════════════════════════════════════════ */
const hole = new THREE.Group();
galaxy.add(hole);

const EH = 4.8; // event horizon radius
hole.add(new THREE.Mesh(
  new THREE.SphereGeometry(EH, 72, 72),
  new THREE.MeshBasicMaterial({ color:0x000000 })
));

/* photon ring — gentle warmth without being bright */
const photon = new THREE.Mesh(
  new THREE.TorusGeometry(EH * 1.18, 0.04, 12, 220),
  new THREE.MeshBasicMaterial({ color:0xa9764f, transparent:true, opacity:0.12, blending:THREE.AdditiveBlending, depthWrite:false })
);
photon.rotation.x = Math.PI / 2;
photon.rotation.z = Math.PI / 2;
hole.add(photon);

/* accretion disk: radial texture on a flat circle (correct ring gradient) */
function diskTexture(){
  const S = 1024, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d"), h = S / 2;
  const grad = g.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0.00,"rgba(0,0,0,0)");
  grad.addColorStop(0.255,"rgba(0,0,0,0)");
  grad.addColorStop(0.275,"rgba(145,108,82,0.7)");
  grad.addColorStop(0.33,"rgba(180,127,85,0.62)");
  grad.addColorStop(0.44,"rgba(176,125,75,0.3)");
  grad.addColorStop(0.62,"rgba(120,74,48,0.16)");
  grad.addColorStop(0.82,"rgba(80,46,28,0.08)");
  grad.addColorStop(1.00,"rgba(30,20,15,0)");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);

  /* orbital streaks */
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 900; i++){
    const r = h * (0.27 + Math.pow(Math.random(), 0.7) * 0.7);
    const a0 = Math.random() * Math.PI * 2;
    const a1 = a0 + (0.05 + Math.random() * 0.5) * (1.2 - r / h);
    g.beginPath();
    g.arc(h, h, r, a0, a1);
    g.strokeStyle = `rgba(255,${190 + (Math.random()*65|0)},${130 + (Math.random()*90|0)},${0.03 + Math.random() * 0.12})`;
    g.lineWidth = 0.7 + Math.random() * 2.6;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
const diskTex = diskTexture();
const disk = new THREE.Mesh(
  new THREE.CircleGeometry(EH * 10.5, 160),
  new THREE.MeshBasicMaterial({ map:diskTex, side:THREE.DoubleSide, transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false })
);
disk.rotation.x = -Math.PI / 2 + 0.17;
disk.rotation.z = Math.PI / 2;
hole.add(disk);

/* a second, thinner layer at a slight tilt gives the disk depth */
const disk2 = new THREE.Mesh(disk.geometry, disk.material.clone());
disk2.material.opacity = 0.18;
disk2.rotation.x = -Math.PI / 2 + 0.235;
disk2.rotation.z = Math.PI / 2;
disk2.scale.setScalar(0.82);
hole.add(disk2);

/* lensed light bent up and over the horizon */
const arcs = [];
[[1.32, 0.05, 0.28], [1.62, 0.03, 0.15], [1.15, 0.06, 0.2]].forEach(([r, tube, op], k) => {
  const a = new THREE.Mesh(
    new THREE.TorusGeometry(EH * r, EH * tube, 10, 140),
    new THREE.MeshBasicMaterial({ color:k === 1 ? 0xe0a56d : 0xbb865f, transparent:true, opacity:op, blending:THREE.AdditiveBlending, depthWrite:false })
  );
  a.rotation.y = Math.PI / 2;
  a.rotation.x = 0.12 * k;
  a.rotation.z = Math.PI / 2;
  hole.add(a); arcs.push(a);
});

/* glow bloom */
const bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xb57b52, transparent:true, opacity:0.085, blending:THREE.AdditiveBlending, depthWrite:false }));
bloom.scale.set(EH*7, EH*7, 1); hole.add(bloom);

/* ---- swirling infall particles ---- */
const infall = {};
(function buildInfall(){
  const n = MOBILE ? 1400 : 3200;
  const p = new Float32Array(n*3), c = new Float32Array(n*3), s = new Float32Array(n), sd = new Float32Array(n);
  const data = [];
  const hot = new THREE.Color("#fff3d6"), cool = new THREE.Color("#ff6a2a");
  for (let i=0;i<n;i++){
    const r = EH*1.3 + Math.pow(Math.random(),1.7)*EH*3.8;
    const a = Math.random()*Math.PI*2;
    data.push({ r, a, sp:(1.2/Math.pow(r,1.12))*1.8, y:(Math.random()-0.5)*(0.5+ (r-EH)*0.08) });
    const col = hot.clone().lerp(cool, (r-EH*1.3)/(EH*3.8));
    c[i*3]=col.r;c[i*3+1]=col.g;c[i*3+2]=col.b;
    s[i]=0.45+Math.random()*1.4; sd[i]=Math.random()*100;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(p,3));
  g.setAttribute("color",new THREE.BufferAttribute(c,3));
  g.setAttribute("aScale",new THREE.BufferAttribute(s,1));
  g.setAttribute("aSeed",new THREE.BufferAttribute(sd,1));
  const m = starMat.clone(); m.uniforms = THREE.UniformsUtils.clone(starMat.uniforms); m.uniforms.uSize.value = 26.0;
  const pts = new THREE.Points(g,m);
  hole.add(pts);
  infall.update = function(dt, t){
    const arr = g.attributes.position.array;
    for (let i=0;i<n;i++){
      const d = data[i];
      d.a += d.sp * dt * 0.9;
      d.r = Math.max(EH * 1.2, d.r - dt * (0.18 + (d.r / (EH * 5.2)) * 0.26));
      const inward = 1.0 - (d.r - EH * 1.2) / (EH * 4.8);
      const sway = Math.sin(t * 0.7 + i) * 0.5;
      arr[i*3]   = Math.cos(d.a) * d.r + Math.cos(d.a * 2.6 + i) * (0.3 + inward * 0.7) + sway * 0.18;
      arr[i*3+1] = d.y + Math.sin(d.a * 2.1 + i) * 0.18 + Math.sin(t * 0.9 + i) * 0.25;
      arr[i*3+2] = Math.sin(d.a) * d.r + Math.sin(d.a * 2.8 + i) * (0.2 + inward * 0.8) + sway * 0.12;
    }
    g.attributes.position.needsUpdate = true;
    m.uniforms.uTime.value = t;
  };
})();

/* ════════════════════════════════════════════════════════════════
   5. HEART OF STARS above the black hole
   ════════════════════════════════════════════════════════════════ */
const heartGroup = new THREE.Group();
heartGroup.position.set(0, EH * 4.6, 0);
galaxy.add(heartGroup);

const HEART_N = MOBILE ? 1600 : 3200;
const hFrom = new Float32Array(HEART_N * 3);
const hTo   = new Float32Array(HEART_N * 3);
const hPos  = new Float32Array(HEART_N * 3);
const hCol  = new Float32Array(HEART_N * 3);
const hScl  = new Float32Array(HEART_N);
const hSeed = new Float32Array(HEART_N);
const hRose = new THREE.Color("#ff6f9c"), hWarm = new THREE.Color("#ffd9e6");

for (let i = 0; i < HEART_N; i++) {
  const i3 = i * 3;
  const t = Math.random() * Math.PI * 2;
  const shell = Math.random() < 0.55 ? 1 : Math.pow(Math.random(), 0.45); // outline-heavy
  const S = 0.26;
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  hTo[i3]     = hx * S * shell + (Math.random()-0.5) * 0.30;
  hTo[i3 + 1] = hy * S * shell + (Math.random()-0.5) * 0.30;
  hTo[i3 + 2] = (Math.random()-0.5) * 0.95 * (0.4 + shell);

  const R = 26 + Math.random() * 60, th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
  hFrom[i3] = R*Math.sin(ph)*Math.cos(th); hFrom[i3+1] = R*Math.cos(ph); hFrom[i3+2] = R*Math.sin(ph)*Math.sin(th);
  hPos[i3] = hFrom[i3]; hPos[i3+1] = hFrom[i3+1]; hPos[i3+2] = hFrom[i3+2];

  const c = hRose.clone().lerp(hWarm, Math.random()*0.85);
  hCol[i3]=c.r;hCol[i3+1]=c.g;hCol[i3+2]=c.b;
  hScl[i] = 0.55 + Math.pow(Math.random(),2)*2.1;
  hSeed[i] = Math.random()*100;
}
const heartGeo = new THREE.BufferGeometry();
heartGeo.setAttribute("position", new THREE.BufferAttribute(hPos, 3));
heartGeo.setAttribute("color",    new THREE.BufferAttribute(hCol, 3));
heartGeo.setAttribute("aScale",   new THREE.BufferAttribute(hScl, 1));
heartGeo.setAttribute("aSeed",    new THREE.BufferAttribute(hSeed, 1));
const heartMat = starMat.clone();
heartMat.uniforms = THREE.UniformsUtils.clone(starMat.uniforms);
heartMat.uniforms.uSize.value = 30.0;
heartGroup.add(new THREE.Points(heartGeo, heartMat));

const heartGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xff7fa8, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false }));
heartGlow.scale.set(22, 22, 1);
heartGroup.add(heartGlow);

let heartT = 0, heartForming = false;
const ease = x => 1 - Math.pow(1 - x, 3);

/* ════════════════════════════════════════════════════════════════
   6. MEMORY PHOTOS — the "planets"
   ════════════════════════════════════════════════════════════════ */
const CARD_W = 5.2, CARD_H = 6.3;
const memories = [];
const picker = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

function placeholderCanvas(m, i){
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0,0,512,512);
  const col = new THREE.Color(m.hue);
  grd.addColorStop(0, `#${col.clone().offsetHSL(0,0,-0.28).getHexString()}`);
  grd.addColorStop(1, "#0d0c1a");
  g.fillStyle = grd; g.fillRect(0,0,512,512);
  for (let s=0;s<260;s++){
    g.fillStyle = `rgba(255,255,255,${Math.random()*0.65})`;
    const r = Math.random()*1.7;
    g.beginPath(); g.arc(Math.random()*512, Math.random()*512, r, 0, 6.3); g.fill();
  }
  g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.2;
  const pts = [[120,190],[210,150],[300,220],[370,180],[300,300],[190,330]];
  g.beginPath(); pts.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke();
  pts.forEach(p=>{ g.fillStyle="#fff"; g.beginPath(); g.arc(p[0],p[1],3.2,0,6.3); g.fill(); });
  g.fillStyle = "rgba(255,255,255,.82)";
  g.font = "300 26px Jost, Helvetica, sans-serif";
  g.textAlign = "center";
  g.fillText("add a photo", 256, 430);
  return c;
}

function cardCanvas(m, i, img){
  const W = 512, H = 620, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fffaf1";
  const r = 10;
  g.beginPath();
  g.moveTo(r,0); g.arcTo(W,0,W,H,r); g.arcTo(W,H,0,H,r); g.arcTo(0,H,0,0,r); g.arcTo(0,0,W,0,r); g.closePath(); g.fill();

  const px = 26, py = 26, pw = W - 52, ph = 404;
  g.save(); g.beginPath(); g.rect(px,py,pw,ph); g.clip();
  const src = img || placeholderCanvas(m, i);
  const sw = src.width, sh = src.height;
  const scale = Math.max(pw/sw, ph/sh);
  g.drawImage(src, px + (pw - sw*scale)/2, py + (ph - sh*scale)/2, sw*scale, sh*scale);
  g.restore();
  g.strokeStyle = "rgba(0,0,0,.09)"; g.lineWidth = 1; g.strokeRect(px+.5,py+.5,pw-1,ph-1);

  g.fillStyle = "#1d1b22";
  g.font = "400 34px 'Cormorant Garamond', Georgia, serif";
  g.textAlign = "left";
  g.fillText(clip(g, m.title || "Untitled", pw), px, py + ph + 56);
  g.fillStyle = "#6a6675";
  g.font = "300 17px Jost, Helvetica, sans-serif";
  g.fillText((m.date || "").toUpperCase(), px, py + ph + 88);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.needsUpdate = true;
  return t;
}
function clip(ctx, text, max){
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 3 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

function refreshMemoryTexture(memoryEntry, imgSource){
  if (!memoryEntry || !memoryEntry.card || !memoryEntry.card.material) return;
  const nextTex = cardCanvas(memoryEntry.data, memories.indexOf(memoryEntry), imgSource || memoryEntry.img || null);
  if (memoryEntry.tex && memoryEntry.tex.dispose) memoryEntry.tex.dispose();
  memoryEntry.tex = nextTex;
  memoryEntry.card.material.map = nextTex;
  memoryEntry.card.material.needsUpdate = true;
}

MEMORIES.forEach((m, i) => {
  const group = new THREE.Group();
  const a = m.angle + m.radius * SPIN * 0.055;
  group.position.set(Math.cos(a) * m.radius, m.height, Math.sin(a) * m.radius);
  galaxy.add(group);

  const tex = cardCanvas(m, i, i === 0 ? firstMeetImg : null);
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H),
    new THREE.MeshBasicMaterial({ map:tex, transparent:false, opacity:1, side:THREE.DoubleSide })
  );
  card.userData.index = i;
  group.add(card);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:new THREE.Color(m.hue), transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false }));
  halo.scale.set(CARD_W*6.3, CARD_W*6.3, 1);
  halo.position.z = -0.45;
  group.add(halo);

  const memoryEntry = {
    data:m,
    group,
    card,
    halo,
    tex,
    img:null,
    imgURL:null,
    audio:null,
    base:{ x:group.position.x, y:group.position.y, z:group.position.z }
  };

  if (i === 0 && firstMeetImg && firstMeetImg.complete) {
    memoryEntry.img = firstMeetImg;
    memoryEntry.imgURL = firstMeetImg.src;
    refreshMemoryTexture(memoryEntry, firstMeetImg);
  }

  const currentIndex = memories.length;

  if (m.photo) {
    const img = new Image();
    img.onload = function () {
      memoryEntry.img = img;
      memoryEntry.imgURL = img.src;
      refreshMemoryTexture(memoryEntry, img);
      if (typeof refreshCard === "function") refreshCard(currentIndex);
    };
    img.src = new URL("./" + m.photo, window.location.href).href;
    memoryEntry.img = img;
    memoryEntry.imgURL = img.src;
  }

  /* faint orbit trace */
  const pts = [];
  for (let k = 0; k <= 180; k++){
    const th = k/180*Math.PI*2;
    pts.push(new THREE.Vector3(Math.cos(th)*m.radius, m.height*0.35, Math.sin(th)*m.radius));
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color:new THREE.Color(m.hue), transparent:true, opacity:0.075, blending:THREE.AdditiveBlending, depthWrite:false })
  );
  galaxy.add(line);

  memories.push(memoryEntry);
  if (memoryEntry.img && memoryEntry.img.complete) {
    refreshCard(currentIndex);
  }
});

/* ════════════════════════════════════════════════════════════════
   7. CAMERA — hand-rolled orbit controls
   ════════════════════════════════════════════════════════════════ */
const cam = {
  theta: 0.8, phi: 1.02, radius: 138,
  tTheta: 0.8, tPhi: 1.02, tRadius: 118,
  target: new THREE.Vector3(0, 0, 0),
  tTarget: new THREE.Vector3(0, 0, 0)
};
const MINR = 7, MAXR = 320;
let dragging = false, lastX = 0, lastY = 0, dragDist = 0, pinch = 0;
let focusIndex = -1;

function onDown(e){
  dragging = true; dragDist = 0;
  const p = e.touches ? e.touches[0] : e;
  lastX = p.clientX; lastY = p.clientY;
}
function onMove(e){
  if (e.touches && e.touches.length === 2){
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) cam.tRadius = clamp(cam.tRadius * (pinch / d), MINR, MAXR);
    pinch = d; dragDist += 12; maybeRelease();
    return;
  }
  if (!dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const dx = p.clientX - lastX, dy = p.clientY - lastY;
  lastX = p.clientX; lastY = p.clientY;
  dragDist += Math.hypot(dx, dy);
  cam.tTheta -= dx * 0.0042;
  cam.tPhi = clamp(cam.tPhi - dy * 0.0036, 0.12, Math.PI - 0.12);
  maybeRelease();
}
function onUp(e){
  if (dragging && dragDist < 7) pick(e);
  dragging = false; pinch = 0;
}
function maybeRelease(){
  if (focusIndex >= 0 && dragDist > 46) releaseFocus();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

renderer.domElement.addEventListener("pointerdown", onDown);
addEventListener("pointermove", onMove);
addEventListener("pointerup", onUp);
renderer.domElement.addEventListener("touchstart", onDown, { passive:true });
renderer.domElement.addEventListener("touchmove", onMove, { passive:true });
renderer.domElement.addEventListener("touchend", onUp);
renderer.domElement.addEventListener("wheel", e => {
  e.preventDefault();
  cam.tRadius = clamp(cam.tRadius * Math.exp(e.deltaY * 0.0011), MINR, MAXR);
}, { passive:false });

function pick(e){
  const p = e.changedTouches ? e.changedTouches[0] : e;
  if (!p) return;
  pointerNDC.x = (p.clientX / innerWidth) * 2 - 1;
  pointerNDC.y = -(p.clientY / innerHeight) * 2 + 1;
  picker.setFromCamera(pointerNDC, camera);
  const hits = picker.intersectObjects(memories.map(m => m.card));
  if (hits.length) focusOn(hits[0].object.userData.index);
  else if (focusIndex >= 0) releaseFocus();
}

function focusOn(i){
  if (focusIndex === i) return;
  if (focusIndex >= 0) stopAudio(focusIndex, 0.6);
  focusIndex = i;
  const m = memories[i];
  const w = m.group.getWorldPosition(new THREE.Vector3());
  cam.tTarget.copy(w);
  cam.tTheta = Math.atan2(w.z, w.x) + 0.34;
  cam.tPhi = 1.36;
  cam.tRadius = 11.5;
  document.body.classList.add("focused");
  showPaper(i);
  playAudio(i);
}
function releaseFocus(){
  if (focusIndex < 0) return;
  stopAudio(focusIndex, 1.5);
  focusIndex = -1;
  cam.tTarget.set(0, 0, 0);
  cam.tRadius = clamp(cam.radius * 3.4, 60, 170);
  document.body.classList.remove("focused", "paper-out");
}

/* ════════════════════════════════════════════════════════════════
   8. SOUND — uploaded track if present, otherwise a generated one
   ════════════════════════════════════════════════════════════════ */
let actx = null, masterGain = null, muted = false;

function audioReady(){

  if (actx) return actx;

  const AC = window.AudioContext || window.webkitAudioContext;

  if (!AC) return null;

  actx = new AC();

  masterGain = actx.createGain();

  masterGain.gain.value = 0.9;

  masterGain.connect(actx.destination);

  return actx;

}

const SCALES = [

  [0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 2, 3, 7, 8],

  [0, 4, 5, 7, 11], [0, 2, 5, 7, 10], [0, 3, 5, 8, 10]

];

class Generated {

  constructor(i){

    this.i = i;

    const ctx = audioReady();

    this.ctx = ctx;

    this.root = 174.61 * Math.pow(2, (i % 3) / 12) * (i > 2 ? 0.75 : 1); // F3-ish, varied

    this.scale = SCALES[i % SCALES.length];

    this.gain = ctx.createGain(); this.gain.gain.value = 0;

    this.filter = ctx.createBiquadFilter();

    this.filter.type = "lowpass"; this.filter.frequency.value = 1500; this.filter.Q.value = 0.4;

    this.delay = ctx.createDelay(1.2); this.delay.delayTime.value = 0.42;

    this.fb = ctx.createGain(); this.fb.gain.value = 0.34;

    this.delay.connect(this.fb); this.fb.connect(this.delay);

    this.wet = ctx.createGain(); this.wet.gain.value = 0.5;

    this.filter.connect(this.gain);

    this.filter.connect(this.delay); this.delay.connect(this.wet); this.wet.connect(this.gain);

    this.gain.connect(masterGain);

    this.pads = [];

    this.timer = null;

    this.step = 0;

  }

  note(freq, t, dur, type, vol){

    const o = this.ctx.createOscillator(), g = this.ctx.createGain();

    o.type = type; o.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(0, t);

    g.gain.linearRampToValueAtTime(vol, t + 0.05);

    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    o.connect(g); g.connect(this.filter);

    o.start(t); o.stop(t + dur + 0.1);

  }

  start(){

    const ctx = this.ctx;

    [0, 7, 12].forEach((s, k) => {

      const o = ctx.createOscillator(), g = ctx.createGain();

      o.type = k === 2 ? "sine" : "triangle";

      o.frequency.value = this.root * Math.pow(2, s / 12) * (k === 2 ? 0.5 : 1);

      o.detune.value = (k - 1) * 6;

      g.gain.value = 0.05;

      o.connect(g); g.connect(this.filter);

      o.start();

      this.pads.push({ o, g });

    });

    const tick = () => {

      const t = ctx.currentTime + 0.06;

      const s = this.scale;

      const deg = s[(this.step * 3 + (this.step % 2 ? 2 : 0)) % s.length];

      const oct = this.step % 8 === 0 ? 2 : (this.step % 3 === 0 ? 1 : 0);

      this.note(this.root * Math.pow(2, (deg + 12 * (1 + oct)) / 12), t, 2.2, "sine", 0.1);

      if (this.step % 4 === 2)

        this.note(this.root * Math.pow(2, (s[(this.step) % s.length] + 24) / 12), t + 0.24, 1.6, "triangle", 0.045);

      this.step++;

    };

    tick();

    this.timer = setInterval(tick, 900);

    this.fade(0.5, 2.2);

  }

  fade(v, sec){

    if (!this.gain) return;

    const t = this.ctx.currentTime;

    this.gain.gain.cancelScheduledValues(t);

    this.gain.gain.setValueAtTime(Math.max(this.gain.gain.value, 0.0001), t);

    this.gain.gain.linearRampToValueAtTime(v, t + sec);

  }

  stop(sec){

    this.fade(0, sec);

    setTimeout(() => {

      clearInterval(this.timer);

      this.pads.forEach(p => { try { p.o.stop(); } catch (e) {} });

      this.pads = [];

      try { this.gain.disconnect(); } catch (e) {}

    }, sec * 1000 + 120);

  }

}

function fadeEl(el, to, ms){

  const from = el.volume, t0 = performance.now();

  clearInterval(el._fade);

  el._fade = setInterval(() => {

    const k = Math.min(1, (performance.now() - t0) / ms);

    el.volume = clamp(from + (to - from) * k, 0, 1);

    if (k === 1){ clearInterval(el._fade); if (to === 0) el.pause(); }

  }, 40);

}

function playAudio(i){

  if (muted) return;

  const m = memories[i];

  if (m.data.song || m.audio){

    if (!m.audio){ m.audio = new Audio(m.data.song); m.audio.loop = true; }

    m.audio.volume = 0;

    const p = m.audio.play();

    if (p && p.catch) p.catch(() => {});

    fadeEl(m.audio, 0.85, 1600);

  } else {

    if (!audioReady()) return;

    if (actx.state === "suspended") actx.resume();

    m.gen = new Generated(i);

    m.gen.start();

  }

}

function stopAudio(i, sec){

  const m = memories[i];

  if (m.audio) fadeEl(m.audio, 0, sec * 1000);

  if (m.gen){ m.gen.stop(sec); m.gen = null; }

}


// ============================================================
// 🎵 PICTURE 1 — ALWAYS START AT 2:44
// ============================================================

const PICTURE_1_SONG = "music/all i need to hear.mp3";
const PICTURE_1_START_TIME = 164; // 2:44

function setupPicture1Song() {

  if (typeof memories === "undefined" || !memories[0]) {
    setTimeout(setupPicture1Song, 100);
    return;
  }

  if (!memories[0].data) {
    memories[0].data = {};
  }

  memories[0].data.song = PICTURE_1_SONG;

  // Override only the song behavior for Picture 1
  const originalPlayAudio = playAudio;

  playAudio = function(i) {

    if (i === 0 && !muted) {

      const m = memories[0];

      // Always create a fresh audio instance
      if (m.audio) {
        try {
          m.audio.pause();
          m.audio.currentTime = 0;
        } catch (e) {}
      }

      m.audio = new Audio(PICTURE_1_SONG);
      m.audio.loop = true;

      // START DIRECTLY AT 2:44
      m.audio.currentTime = PICTURE_1_START_TIME;

      m.audio.volume = 0;

      const p = m.audio.play();
      if (p && p.catch) p.catch(() => {});

      fadeEl(m.audio, 0.85, 1600);

    } else {
      originalPlayAudio(i);
    }

  };
}

setupPicture1Song();

// ============================================================
// 🎵 PICTURE 2 — ROBBERS
// 🎵 PICTURE 3 — ABOUT YOU START AT 3:03
// ============================================================

const PICTURE_2_SONG = "music/robbers.mp3";
const PICTURE_3_SONG = "music/about you.mp3";
const PICTURE_3_START_TIME = 183; // 3:03

function setupPicture2And3Songs() {

  if (typeof memories === "undefined" || !memories[1] || !memories[2]) {
    setTimeout(setupPicture2And3Songs, 100);
    return;
  }

  // ------------------------------------------------------------
  // Picture 2 — Robbers (starts at 0:00)
  // ------------------------------------------------------------

  if (!memories[1].data) {
    memories[1].data = {};
  }

  memories[1].data.song = PICTURE_2_SONG;


  // ------------------------------------------------------------
  // Picture 3 — About You (starts at 3:03)
  // ------------------------------------------------------------

  if (!memories[2].data) {
    memories[2].data = {};
  }

  memories[2].data.song = PICTURE_3_SONG;

  // Only change Picture 3's playback position
  const originalPlayAudio23 = playAudio;

  playAudio = function(i) {

    if (i === 2 && !muted) {

      const m = memories[2];

      if (m.audio) {
        try {
          m.audio.pause();
          m.audio.currentTime = 0;
        } catch (e) {}
      }

      m.audio = new Audio(PICTURE_3_SONG);
      m.audio.loop = true;

      // START DIRECTLY AT 3:03
      m.audio.currentTime = PICTURE_3_START_TIME;

      m.audio.volume = 0;

      const p = m.audio.play();
      if (p && p.catch) p.catch(() => {});

      fadeEl(m.audio, 0.85, 1600);

    } else {
      originalPlayAudio23(i);
    }

  };

}

setupPicture2And3Songs();

// ============================================================
// 🎵 PICTURE 4 — PHOTOGRAPH START AT 2:07
// ============================================================

const PICTURE_4_SONG = "music/photograph.mp3";
const PICTURE_4_START_TIME = 127; // 2:07

function setupPicture4Song() {

  if (typeof memories === "undefined" || !memories[3]) {
    setTimeout(setupPicture4Song, 100);
    return;
  }

  if (!memories[3].data) {
    memories[3].data = {};
  }

  memories[3].data.song = PICTURE_4_SONG;

  const originalPlayAudio4 = playAudio;

  playAudio = function(i) {

    if (i === 3 && !muted) {

      const m = memories[3];

      if (m.audio) {
        try {
          m.audio.pause();
          m.audio.currentTime = 0;
        } catch (e) {}
      }

      m.audio = new Audio(PICTURE_4_SONG);
      m.audio.loop = true;

      // START DIRECTLY AT 2:07
      m.audio.currentTime = PICTURE_4_START_TIME;

      m.audio.volume = 0;

      const p = m.audio.play();
      if (p && p.catch) p.catch(() => {});

      fadeEl(m.audio, 0.85, 1600);

    } else {
      originalPlayAudio4(i);
    }

  };

}

setupPicture4Song();

// ============================================================
// 🎵 PICTURE 5 — LEGO HOUSE START AT 0:40
// ============================================================

const PICTURE_5_SONG = "music/lego house.mp3";
const PICTURE_5_START_TIME = 40; // 0:40

function setupPicture5Song() {

  if (typeof memories === "undefined" || !memories[4]) {
    setTimeout(setupPicture5Song, 100);
    return;
  }

  if (!memories[4].data) {
    memories[4].data = {};
  }

  memories[4].data.song = PICTURE_5_SONG;

  const originalPlayAudio5 = playAudio;

  playAudio = function(i) {

    if (i === 4 && !muted) {

      const m = memories[4];

      if (m.audio) {
        try {
          m.audio.pause();
          m.audio.currentTime = 0;
        } catch (e) {}
      }

      m.audio = new Audio(PICTURE_5_SONG);
      m.audio.loop = true;

      // START DIRECTLY AT 0:40
      m.audio.currentTime = PICTURE_5_START_TIME;

      m.audio.volume = 0;

      const p = m.audio.play();
      if (p && p.catch) p.catch(() => {});

      fadeEl(m.audio, 0.85, 1600);

    } else {
      originalPlayAudio5(i);
    }

  };

}

setupPicture5Song();

// ============================================================
// 🎵 PICTURE 6 — LIBU LIBUNG BUWAN START AT 1:22
// ============================================================

const PICTURE_6_SONG = "music/libu libung buwan.mp3";
const PICTURE_6_START_TIME = 82; // 1:22

function setupPicture6Song() {

  if (typeof memories === "undefined" || !memories[5]) {
    setTimeout(setupPicture6Song, 100);
    return;
  }

  if (!memories[5].data) {
    memories[5].data = {};
  }

  memories[5].data.song = PICTURE_6_SONG;

  const originalPlayAudio6 = playAudio;

  playAudio = function(i) {

    if (i === 5 && !muted) {

      const m = memories[5];

      if (m.audio) {
        try {
          m.audio.pause();
          m.audio.currentTime = 0;
        } catch (e) {}
      }

      m.audio = new Audio(PICTURE_6_SONG);
      m.audio.loop = true;

      // START DIRECTLY AT 1:22
      m.audio.currentTime = PICTURE_6_START_TIME;

      m.audio.volume = 0;

      const p = m.audio.play();
      if (p && p.catch) p.catch(() => {});

      fadeEl(m.audio, 0.85, 1600);

    } else {
      originalPlayAudio6(i);
    }

  };

}

setupPicture6Song();
/* ════════════════════════════════════════════════════════════════
   9. THE PHOTO PAPER (DOM)
   ════════════════════════════════════════════════════════════════ */
function showPaper(i){
  const m = memories[i], d = m.data;
  $("paperShot").src = m.imgURL || (m.placeholderURL || (m.placeholderURL = placeholderCanvas(d, i).toDataURL()));
  $("paperShot").alt = d.title;
  $("paperTitle").textContent = d.title;
  $("paperDate").textContent = d.date;
  $("paperNote").textContent = d.note;
  $("paperTrack").textContent = (d.songName || d.track || "A song for this one");
  requestAnimationFrame(() => document.body.classList.add("paper-out"));
}
$("closePaper").addEventListener("click", releaseFocus);


/* ════════════════════════════════════════════════════════════════
   11. LOOP
   ════════════════════════════════════════════════════════════════ */
const tmp = new THREE.Vector3();
let last = performance.now();

function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  /* camera easing */
  cam.theta  += (cam.tTheta  - cam.theta)  * Math.min(1, dt * 4.2);
  cam.phi    += (cam.tPhi    - cam.phi)    * Math.min(1, dt * 4.2);
  cam.radius += (cam.tRadius - cam.radius) * Math.min(1, dt * 2.6);
  cam.target.lerp(cam.tTarget, Math.min(1, dt * 2.4));
  const sp = Math.sin(cam.phi);
  camera.position.set(
    cam.target.x + cam.radius * sp * Math.cos(cam.theta),
    cam.target.y + cam.radius * Math.cos(cam.phi),
    cam.target.z + cam.radius * sp * Math.sin(cam.theta)
  );
  camera.lookAt(cam.target);

  /* galaxy spin — the arms trail differently than the core */
  galaxy.rotation.y += dt * 0.018;
  galaxy.rotation.x = Math.sin(t * 0.18) * 0.08;
  galaxy.rotation.z = Math.cos(t * 0.14) * 0.06;
  galaxy.position.y = Math.sin(t * 0.35) * 0.8;

  solarGroup.rotation.y += dt * 0.04;
  sunGlow.material.opacity = 0.62 + Math.sin(t * 1.3) * 0.08;
  solarBodies.forEach((planet, index) => {
    planet.angle += dt * planet.speed;
    const x = Math.cos(planet.angle) * planet.radius;
    const z = Math.sin(planet.angle) * planet.radius;
    const y = Math.sin(planet.angle * 2.1 + index) * planet.drift;
    planet.mesh.position.set(x, y, z);
    planet.orbit.rotation.y += dt * 0.02;
    planet.mesh.scale.setScalar(1);
    planet.mesh.children[0].scale.set(planet.radius * 7, planet.radius * 7, 1);
  });

  starMat.uniforms.uTime.value = t;
  if (backdrop.mat) backdrop.mat.uniforms.uTime.value = t;
  if (backdrop.pts) backdrop.pts.rotation.y -= dt * 0.003;

  /* black hole */
  disk.rotation.z -= dt * 0.5;
  disk2.rotation.z += dt * 0.31;
  arcs.forEach((a, k) => { a.rotation.z += dt * (0.22 + k * 0.07) * (k === 1 ? -1 : 1); });
  photon.rotation.z += dt * 0.2;
  bloom.material.opacity = 0.08 + Math.sin(t * 0.9) * 0.02;
  if (infall.update) infall.update(dt, t);

  /* heart */
  if (heartForming && heartT < 1){
    heartT = Math.min(1, heartT + dt / 3.4);
    const k = ease(heartT);
    const arr = heartGeo.attributes.position.array;
    for (let i = 0; i < HEART_N * 3; i++) arr[i] = hFrom[i] + (hTo[i] - hFrom[i]) * k;
    heartGeo.attributes.position.needsUpdate = true;
    heartGlow.material.opacity = k * 0.4;
  }
  const beat = 1 + Math.sin(t * 1.8) * 0.022 + Math.sin(t * 3.6) * 0.008;
  heartGroup.scale.setScalar(beat * (0.6 + heartT * 0.4));
  heartGroup.lookAt(camera.position);
  heartMat.uniforms.uTime.value = t;
  heartGlow.scale.set(24 * beat, 24 * beat, 1);

  /* memory cards: billboard, bob, breathe */
  memories.forEach((m, i) => {
    m.group.position.y = m.base.y + Math.sin(t * 0.55 + i * 1.7) * 0.55;
    m.group.lookAt(camera.getWorldPosition(tmp));
    const near = focusIndex === i;
    const s = m.group.scale.x + ((near ? 1.16 : 1) - m.group.scale.x) * Math.min(1, dt * 3.4);
    m.group.scale.setScalar(s);
    m.halo.material.opacity += (((near ? 0.85 : 0.42) + Math.sin(t * 1.1 + i) * 0.05) - m.halo.material.opacity) * Math.min(1, dt * 3);
  });

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  starMat.uniforms.uDpr.value = Math.min(devicePixelRatio, 2);
});
})();
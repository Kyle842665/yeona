const canvas = document.getElementById("driftCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

const memeEmojis = ["😂", "💀", "🔥", "💅", "🤓", "😎", "😭", "👀", "🗿"];

class MemeParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = random(0, canvas.width);
    this.y = random(0, canvas.height);
    this.size = random(20, 45);
    this.speedX = random(-0.7, 0.7);
    this.speedY = random(-0.7, 0.7);
    this.emoji = memeEmojis[Math.floor(Math.random() * memeEmojis.length)];
    this.opacity = random(0.6, 1);
    this.rotation = random(0, Math.PI * 2);
    this.rotationSpeed = random(-0.01, 0.01);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    ctx.font = `${this.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;

    // Wrap around edges
    if (this.x < -50) this.x = canvas.width + 50;
    if (this.x > canvas.width + 50) this.x = -50;
    if (this.y < -50) this.y = canvas.height + 50;
    if (this.y > canvas.height + 50) this.y = -50;
  }
}

const particles = Array.from({ length: 40 }, () => new MemeParticle());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

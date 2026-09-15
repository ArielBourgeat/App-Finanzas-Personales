function sizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

export function drawDonut(canvas, segments, centerLabel, centerSub) {
  const { ctx, width, height } = sizeCanvas(canvas);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;
  const thickness = Math.max(14, radius * 0.38);
  const total = segments.reduce((sum, item) => sum + item.value, 0);

  ctx.lineCap = "round";

  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = thickness;
    ctx.stroke();
  } else {
    let angle = -Math.PI / 2;
    segments.forEach((item) => {
      const slice = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle + 0.02, angle + slice - 0.02);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = thickness;
      ctx.stroke();
      angle += slice;
    });
  }

  ctx.fillStyle = "#f4efe6";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(centerLabel || "$ 0", cx, cy - 8);
  ctx.fillStyle = "#8d8d8d";
  ctx.font = "500 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText(centerSub || "gastos", cx, cy + 12);
}

export function drawBars(canvas, items) {
  const { ctx, width, height } = sizeCanvas(canvas);
  const max = Math.max(1, ...items.map((item) => item.value));
  const padX = 8;
  const padTop = 22;
  const padBottom = 22;
  const gap = 8;
  const barW = items.length ? (width - padX * 2 - gap * (items.length - 1)) / items.length : 0;
  const chartH = height - padTop - padBottom;

  items.forEach((item, index) => {
    const x = padX + index * (barW + gap);
    const h = (item.value / max) * chartH;
    const y = padTop + (chartH - h);
    const radius = Math.min(6, barW / 2);
    ctx.fillStyle = item.highlight ? "#e85c2a" : "#3a3a3a";
    roundRect(ctx, x, y, barW, Math.max(h, 4), radius);
    ctx.fill();
    ctx.fillStyle = item.highlight ? "#f4efe6" : "#8d8d8d";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.label, x + barW / 2, height - 8);
  });

  if (items.length) {
    const last = items[items.length - 1];
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(last.topLabel || "", width - 4, 12);
  }
}

export function drawWeekBars(canvas, items) {
  const { ctx, width, height } = sizeCanvas(canvas);
  const max = Math.max(1, ...items.map((item) => item.value));
  const padX = 6;
  const padTop = 16;
  const padBottom = 24;
  const gap = 6;
  const barW = items.length ? (width - padX * 2 - gap * (items.length - 1)) / items.length : 0;
  const chartH = height - padTop - padBottom;

  items.forEach((item, index) => {
    const x = padX + index * (barW + gap);
    const h = (item.value / max) * chartH;
    const y = padTop + (chartH - h);
    ctx.fillStyle = item.highlight ? "#e85c2a" : "#2f2f2f";
    roundRect(ctx, x, y, barW, Math.max(h, 3), 5);
    ctx.fill();
    ctx.fillStyle = item.highlight ? "#f4efe6" : "#8d8d8d";
    ctx.font = "500 10px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.label, x + barW / 2, height - 8);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

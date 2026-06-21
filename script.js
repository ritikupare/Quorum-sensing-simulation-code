const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const gridSize = 80;
const grid = new Float32Array(gridSize * gridSize);
const gridTemp = new Float32Array(gridSize * gridSize);
const bacteria = [];
let paused = false;
let lastTime = 0;
let speed = 1.0;
let temperature = 30;
let threshold = 0.35;
let productionRate = 0.16;
let diffusionRate = 0.20;
let temperatureEffect = 0.40;
const cellWidth = width / gridSize;
const cellHeight = height / gridSize;
const bacteriaCount = 220;

const elements = {
  resetBtn: document.getElementById('resetBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  speedSlider: document.getElementById('speedSlider'),
  tempSlider: document.getElementById('tempSlider'),
  thresholdSlider: document.getElementById('thresholdSlider'),
  productionSlider: document.getElementById('productionSlider'),
  diffusionSlider: document.getElementById('diffusionSlider'),
  tempEffectSlider: document.getElementById('tempEffectSlider'),
  speedValue: document.getElementById('speedValue'),
  tempValue: document.getElementById('tempValue'),
  thresholdValue: document.getElementById('thresholdValue'),
  productionValue: document.getElementById('productionValue'),
  diffusionValue: document.getElementById('diffusionValue'),
  tempEffectValue: document.getElementById('tempEffectValue'),
  onCount: document.getElementById('onCount'),
  offCount: document.getElementById('offCount'),
  avgAI: document.getElementById('avgAI'),
};

function resetSimulation() {
  grid.fill(0);
  bacteria.length = 0;

  for (let i = 0; i < bacteriaCount; i += 1) {
    bacteria.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      stateOn: false,
      production: productionRate * (0.85 + Math.random() * 0.3),
    });
  }
}

function updateParameters() {
  speed = Number(elements.speedSlider.value);
  temperature = Number(elements.tempSlider.value);
  threshold = Number(elements.thresholdSlider.value);
  productionRate = Number(elements.productionSlider.value);
  diffusionRate = Number(elements.diffusionSlider.value);
  temperatureEffect = Number(elements.tempEffectSlider.value);

  elements.speedValue.textContent = `${speed.toFixed(1)}×`;
  elements.tempValue.textContent = temperature.toFixed(0);
  elements.thresholdValue.textContent = threshold.toFixed(2);
  elements.productionValue.textContent = productionRate.toFixed(2);
  elements.diffusionValue.textContent = diffusionRate.toFixed(2);
  elements.tempEffectValue.textContent = temperatureEffect.toFixed(2);

  bacteria.forEach((cell) => {
    cell.production = productionRate * (0.9 + Math.random() * 0.2);
  });
}

function index(x, y) {
  return y * gridSize + x;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function diffuseAI(dt) {
  const alpha = diffusionRate * dt * 0.35;
  const decay = 0.995;

  for (let y = 1; y < gridSize - 1; y += 1) {
    for (let x = 1; x < gridSize - 1; x += 1) {
      const idx = index(x, y);
      const current = grid[idx];
      const total = grid[idx - 1] + grid[idx + 1] + grid[idx - gridSize] + grid[idx + gridSize];
      gridTemp[idx] = current + alpha * (total - 4 * current);
    }
  }

  for (let i = 0; i < grid.length; i += 1) {
    grid[i] = gridTemp[i] * decay;
  }
}

function updateBacteria(dt) {
  let onCount = 0;
  let offCount = 0;
  let totalAI = 0;

  for (const cell of bacteria) {
    cell.x += cell.vx * dt * 18 * speed;
    cell.y += cell.vy * dt * 18 * speed;

    if (cell.x < 0 || cell.x > width) {
      cell.vx *= -1;
      cell.x = clamp(cell.x, 0, width);
    }
    if (cell.y < 0 || cell.y > height) {
      cell.vy *= -1;
      cell.y = clamp(cell.y, 0, height);
    }

    const gx = clamp(Math.floor(cell.x / cellWidth), 0, gridSize - 1);
    const gy = clamp(Math.floor(cell.y / cellHeight), 0, gridSize - 1);
    const cellIdx = index(gx, gy);
    const localAI = grid[cellIdx];
    totalAI += localAI;

    const tempModifier = 1 - temperatureEffect * ((temperature - 30) / 30);
    const effectiveThreshold = clamp(threshold * tempModifier, 0.08, 1.4);
    const effectiveProduction = cell.production * (1 + temperatureEffect * ((temperature - 30) / 40));

    cell.stateOn = localAI >= effectiveThreshold;
    cell.stateOn ||= localAI > effectiveThreshold * 1.25 && temperature > 35;
    const produced = effectiveProduction * (cell.stateOn ? 1.0 : 0.7) * dt;
    grid[cellIdx] += produced;

    cell.vx += (Math.random() - 0.5) * 0.015 * dt;
    cell.vy += (Math.random() - 0.5) * 0.015 * dt;
    const speedLimit = 0.9;
    cell.vx = clamp(cell.vx, -speedLimit, speedLimit);
    cell.vy = clamp(cell.vy, -speedLimit, speedLimit);

    if (cell.stateOn) {
      onCount += 1;
    } else {
      offCount += 1;
    }
  }

  elements.onCount.textContent = onCount;
  elements.offCount.textContent = offCount;
  elements.avgAI.textContent = (totalAI / bacteria.length).toFixed(3);
}

function render() {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const aiValue = clamp(grid[index(x, y)], 0, 1.5);
      const brightness = Math.pow(aiValue / 1.4, 0.65);
      const effect = Math.round(brightness * 255);
      const px = x * cellWidth;
      const py = y * cellHeight;
      const color = [20 + effect, 15 + effect * 0.2, 120 + effect * 0.7];

      for (let dy = 0; dy < cellHeight; dy += 1) {
        const row = Math.floor(py + dy);
        if (row >= height) continue;
        for (let dx = 0; dx < cellWidth; dx += 1) {
          const col = Math.floor(px + dx);
          if (col >= width) continue;
          const idx = (row * width + col) * 4;
          data[idx] = color[0];
          data[idx + 1] = color[1];
          data[idx + 2] = color[2];
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  for (const cell of bacteria) {
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = cell.stateOn ? 'rgba(237, 85, 59, 0.92)' : 'rgba(38, 146, 255, 0.92)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = cell.stateOn ? 'rgba(255, 190, 180, 0.95)' : 'rgba(170, 218, 255, 0.95)';
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillText(`Temperature: ${temperature.toFixed(0)}°C`, 14, 24);
  ctx.fillText(`Threshold: ${threshold.toFixed(2)}`, 14, 44);
}

function animate(time) {
  if (!lastTime) lastTime = time;
  const dt = ((time - lastTime) / 1000) * speed;
  lastTime = time;

  if (!paused) {
    diffuseAI(dt);
    updateBacteria(dt);
  }

  render();
  requestAnimationFrame(animate);
}

elements.resetBtn.addEventListener('click', () => {
  resetSimulation();
});

elements.pauseBtn.addEventListener('click', () => {
  paused = !paused;
  elements.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

[ elements.speedSlider,
  elements.tempSlider,
  elements.thresholdSlider,
  elements.productionSlider,
  elements.diffusionSlider,
  elements.tempEffectSlider,
].forEach((slider) => {
  slider.addEventListener('input', () => {
    updateParameters();
  });
});

resetSimulation();
updateParameters();
requestAnimationFrame(animate);

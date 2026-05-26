(function () {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const canvas = document.getElementById("systemCanvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");

  const nodes = [
    { label: "Vision", x: 0.72, y: 0.24, color: "#116a63" },
    { label: "Policy", x: 0.56, y: 0.47, color: "#c84f3a" },
    { label: "Control", x: 0.78, y: 0.68, color: "#c99621" },
    { label: "Robot", x: 0.38, y: 0.64, color: "#6a7b46" },
    { label: "Sim", x: 0.27, y: 0.32, color: "#171b1f" }
  ];

  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
    [0, 3]
  ];

  let width = 0;
  let height = 0;
  let ratio = 1;
  let animationFrame = 0;

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawNode(node, time) {
    const x = node.x * width;
    const y = node.y * height;
    const pulse = media.matches ? 0 : Math.sin(time / 700 + x) * 3;

    context.beginPath();
    context.arc(x, y, 28 + pulse, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 253, 248, 0.78)";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = node.color;
    context.stroke();

    context.font = "700 13px Inter, system-ui, sans-serif";
    context.fillStyle = "#171b1f";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(node.label, x, y);
  }

  function drawPacket(start, end, time, offset) {
    if (media.matches) {
      return;
    }

    const progress = ((time / 2200 + offset) % 1);
    const sx = start.x * width;
    const sy = start.y * height;
    const ex = end.x * width;
    const ey = end.y * height;
    const x = sx + (ex - sx) * progress;
    const y = sy + (ey - sy) * progress;

    context.beginPath();
    context.arc(x, y, 4.5, 0, Math.PI * 2);
    context.fillStyle = "#c84f3a";
    context.fill();
  }

  function drawGrid() {
    const spacing = 36;
    context.lineWidth = 1;
    context.strokeStyle = "rgba(23, 27, 31, 0.05)";

    for (let x = 0; x <= width; x += spacing) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y <= height; y += spacing) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  function render(time) {
    context.clearRect(0, 0, width, height);
    drawGrid();

    links.forEach(([a, b], index) => {
      const start = nodes[a];
      const end = nodes[b];
      const sx = start.x * width;
      const sy = start.y * height;
      const ex = end.x * width;
      const ey = end.y * height;

      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(ex, ey);
      context.lineWidth = 1.6;
      context.strokeStyle = "rgba(23, 27, 31, 0.18)";
      context.stroke();
      drawPacket(start, end, time, index * 0.17);
    });

    nodes.forEach((node) => drawNode(node, time));

    if (!media.matches) {
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function start() {
    window.cancelAnimationFrame(animationFrame);
    resize();
    render(0);
  }

  window.addEventListener("resize", start);
  media.addEventListener("change", start);
  start();
})();

(function () {
  const copyStatus = document.getElementById("copyStatus");
  const commandButtons = document.querySelectorAll("[data-command]");

  commandButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const command = button.getAttribute("data-command") || "";

      try {
        await navigator.clipboard.writeText(command);
        if (copyStatus) {
          copyStatus.textContent = "Copied: " + command;
        }
      } catch (error) {
        if (copyStatus) {
          copyStatus.textContent = command;
        }
      }
    });
  });

  const grid = document.getElementById("aiGrid");
  const rerun = document.getElementById("rerunGridDemo");

  if (!grid) {
    return;
  }

  const size = 8;
  const start = 0;
  const goal = 63;
  const walls = new Set([10, 11, 12, 18, 28, 29, 33, 34, 42, 44, 45, 52]);
  const path = [0, 1, 2, 3, 4, 5, 13, 21, 22, 23, 31, 39, 47, 55, 63];
  let step = 0;
  let timer = 0;

  function renderGrid() {
    grid.innerHTML = "";

    for (let index = 0; index < size * size; index += 1) {
      const cell = document.createElement("span");
      cell.className = "ai-cell";

      if (walls.has(index)) {
        cell.classList.add("wall");
      }

      if (path.indexOf(index) >= 0 && path.indexOf(index) <= step) {
        cell.classList.add("path");
      }

      if (index === start) {
        cell.classList.add("start");
      }

      if (index === goal) {
        cell.classList.add("goal");
      }

      if (index === path[step]) {
        cell.classList.add("agent");
      }

      grid.appendChild(cell);
    }
  }

  function advance() {
    step = (step + 1) % path.length;
    renderGrid();
    timer = window.setTimeout(advance, 420);
  }

  function restart() {
    window.clearTimeout(timer);
    step = 0;
    renderGrid();
    timer = window.setTimeout(advance, 620);
  }

  if (rerun) {
    rerun.addEventListener("click", restart);
  }

  restart();
})();

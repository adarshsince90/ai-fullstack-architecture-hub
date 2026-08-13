/**
 * Sci-Fi Cyberpunk Mind Map Graph Engine (HTML5 Canvas 2D + Physics Engine)
 * Features:
 * - Pre-warmed Physics Simulation for zero initial arrangement waiting time
 * - Matte Sci-Fi Glass Orbs (No harsh glossy plastic glare/shine)
 * - Smooth Camera Pan-to-Center Tracking without node position jumping
 * - 2-Step Focus Interaction: 1st click glides node to center + reveals links; 2nd click opens definition modal
 * - Muted low-opacity text labels by default, lighting up on focus or hover
 * - Sticky Floating Control Toolbar
 */

class MindMapGraphEngine {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element #${containerId} not found`);
    }

    this.options = Object.assign({
      onNodeClick: null,
      onNodeHover: null,
      initialViewAxis: 'techDomain' // Default to Tech Stack View
    }, options);

    this.activeViewAxis = this.options.initialViewAxis;
    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();
    this.hoveredNode = null;
    this.draggedNode = null;
    this.focusedNode = null;
    this.targetCamera = null;
    this.mouseDownPos = null;
    this.isDraggingNode = false;

    // Camera transform
    this.camera = { x: 0, y: 0, zoom: 0.70 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.className = 'graph-canvas';
    this.container.appendChild(this.canvas);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.initEventListeners();
    this.animFrameId = null;
    this.time = 0;
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || window.innerWidth;
    this.height = Math.max(1400, rect.height || 1400);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    if (this.camera.x === 0 && this.camera.y === 0) {
      this.camera.x = this.width / 2;
      this.camera.y = this.height / 2;
    }
  }

  // Sci-Fi Cyberpunk Neon Palette Generator
  getNodeColor(node) {
    if (node.id === 'root-web-app-dev') {
      return { main: 'rgba(99, 102, 241, 0.45)', core: '#ffffff', glow: '#6366f1', border: '#a5b4fc' }; // Neon Indigo
    }

    const domain = node.clusterId || '';
    if (domain === 'dotnet-backend' || node.taxonomies?.techDomain === 'Backend') {
      return { main: 'rgba(16, 185, 129, 0.35)', core: '#a7f3d0', glow: '#10b981', border: '#34d399' }; // Emerald Laser
    }
    if (domain === 'distributed-systems' || node.taxonomies?.techDomain === 'System Design') {
      return { main: 'rgba(0, 243, 255, 0.35)', core: '#e0f7fa', glow: '#00f3ff', border: '#22d3ee' }; // Sci-Fi Cyan
    }
    if (domain === 'cloud-devops' || node.taxonomies?.techDomain === 'Cloud/DevOps') {
      return { main: 'rgba(56, 189, 248, 0.35)', core: '#e0f2fe', glow: '#38bdf8', border: '#7dd3fc' }; // Sky Laser
    }
    if (domain === 'security-data' || node.taxonomies?.techDomain === 'Security/Data') {
      return { main: 'rgba(245, 158, 11, 0.35)', core: '#fef3c7', glow: '#f59e0b', border: '#fbbf24' }; // Amber Gold
    }
    if (domain === 'frontend-engineering' || node.taxonomies?.techDomain === 'Frontend') {
      return { main: 'rgba(255, 0, 127, 0.35)', core: '#fce7f3', glow: '#ff007f', border: '#f472b6' }; // Cyber Magenta
    }
    if (domain === 'ai-engineering' || node.taxonomies?.techDomain === 'AI') {
      return { main: 'rgba(168, 85, 247, 0.35)', core: '#f3e8ff', glow: '#a855f7', border: '#c084fc' }; // Neon Violet
    }

    return { main: 'rgba(100, 116, 139, 0.35)', core: '#f1f5f9', glow: '#64748b', border: '#94a3b8' }; // Slate
  }

  loadData(topologyData) {
    this.nodes = topologyData.nodes.map(n => Object.assign({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      vx: 0,
      vy: 0,
      radius: n.id === 'root-web-app-dev' ? 32 : (n.level === 'Domain Pillar' ? 22 : (n.level === 'Simulator' ? 17 : 13)),
      floatOffset: Math.random() * Math.PI * 2
    }, n));

    this.nodeMap.clear();
    this.nodes.forEach(n => this.nodeMap.set(n.id, n));

    this.links = topologyData.links.map(l => {
      return {
        source: typeof l.source === 'object' ? l.source : this.nodeMap.get(l.source),
        target: typeof l.target === 'object' ? l.target : this.nodeMap.get(l.target),
        type: l.type,
        label: l.label
      };
    }).filter(l => l.source && l.target);

    this.calculateClusterCentroids();
    
    // Fast-Forward Pre-warm Physics simulation so nodes start already arranged!
    this.prewarmPhysics(95);

    this.startAnimation();
  }

  calculateClusterCentroids() {
    const categories = new Set();
    this.nodes.forEach(n => {
      const val = n.taxonomies[this.activeViewAxis] || 'General';
      categories.add(val);
    });

    const catArray = Array.from(categories);
    const count = catArray.length;
    const radius = Math.min(this.width, this.height) * 0.40;

    this.centroids = new Map();
    catArray.forEach((cat, index) => {
      const angle = (index / count) * Math.PI * 2;
      this.centroids.set(cat, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    });
  }

  setViewAxis(axisKey) {
    this.activeViewAxis = axisKey;
    this.calculateClusterCentroids();
    
    // Fast-Forward Pre-warm Physics simulation on taxonomy view switch!
    this.nodes.forEach(n => {
      n.vx += (Math.random() - 0.5) * 8;
      n.vy += (Math.random() - 0.5) * 8;
    });
    this.prewarmPhysics(80);
  }

  prewarmPhysics(iterations = 90) {
    for (let i = 0; i < iterations; i++) {
      this.stepPhysics();
    }
  }

  // Physics Step with Velocity Damping & Freeze Cutoff
  stepPhysics() {
    const damping = 0.65;
    const minVelocityThreshold = 0.015;

    // 1. Cluster Centroid Attractor
    this.nodes.forEach(n => {
      const cat = n.taxonomies[this.activeViewAxis] || 'General';
      const centroid = this.centroids.get(cat) || { x: 0, y: 0 };

      if (n.id === 'root-web-app-dev') {
        n.vx += (0 - n.x) * 0.04;
        n.vy += (0 - n.y) * 0.04;
      } else {
        n.vx += (centroid.x - n.x) * 0.004;
        n.vy += (centroid.y - n.y) * 0.004;
      }
    });

    // 2. Link Spring Force
    this.links.forEach(l => {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const isRootLink = (l.source.id === 'root-web-app-dev' || l.target.id === 'root-web-app-dev');
      const targetDist = isRootLink ? 180 : (l.type === 'structural' ? 240 : 420);
      const force = (dist - targetDist) * (isRootLink ? 0.015 : (l.type === 'structural' ? 0.008 : 0.0015));

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (l.source.id !== 'root-web-app-dev') {
        l.source.vx += fx;
        l.source.vy += fy;
      }
      l.target.vx -= fx;
      l.target.vy -= fy;
    });

    // 3. Repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const minDist = n1.radius + n2.radius + 50;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const force = (minDist - dist) / dist * 0.3;
          const fx = dx * force;
          const fy = dy * force;

          if (n1.id !== 'root-web-app-dev') {
            n1.x -= fx * 0.5;
            n1.y -= fy * 0.5;
          }
          if (n2.id !== 'root-web-app-dev') {
            n2.x += fx * 0.5;
            n2.y += fy * 0.5;
          }
        }
      }
    }

    // Freeze motion once settled
    this.nodes.forEach(n => {
      if (n !== this.draggedNode) {
        n.vx *= damping;
        n.vy *= damping;

        if (Math.abs(n.vx) < minVelocityThreshold) n.vx = 0;
        if (Math.abs(n.vy) < minVelocityThreshold) n.vy = 0;

        n.x += n.vx;
        n.y += n.vy;
      }
    });
  }

  // Smooth Camera Focus Interpolation
  focusOnNode(node) {
    this.focusedNode = node;
    const targetZoom = Math.max(this.camera.zoom, 1.35);
    this.targetCamera = {
      x: this.width / 2 - node.x * targetZoom,
      y: this.height / 2 - node.y * targetZoom,
      zoom: targetZoom
    };
  }

  renderSciFiGrid() {
    const gridSize = 60;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;

    const startX = -2000;
    const endX = 2000;
    const startY = -2000;
    const endY = 2000;

    this.ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
    }
    this.ctx.stroke();
  }

  render() {
    this.time += 0.015;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Continuous Dynamic Camera Tracking towards focused node
    if (this.targetCamera && this.focusedNode) {
      const currentTargetZoom = this.targetCamera.zoom;
      const targetX = this.width / 2 - this.focusedNode.x * currentTargetZoom;
      const targetY = this.height / 2 - this.focusedNode.y * currentTargetZoom;

      this.camera.x += (targetX - this.camera.x) * 0.08;
      this.camera.y += (targetY - this.camera.y) * 0.08;
      this.camera.zoom += (currentTargetZoom - this.camera.zoom) * 0.08;

      if (Math.abs(this.camera.zoom - currentTargetZoom) < 0.005 && Math.abs(this.camera.x - targetX) < 1.0) {
        this.camera.x = targetX;
        this.camera.y = targetY;
        this.camera.zoom = currentTargetZoom;
        this.targetCamera = null;
      }
    }

    this.ctx.save();
    // Apply Camera Transform
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw Sci-Fi Grid Background
    this.renderSciFiGrid();

    // Active Highlight Node: Hovered or Focused Node
    const activeHighlight = this.hoveredNode || this.focusedNode;

    const connectedNodeIds = new Set();
    if (activeHighlight) {
      connectedNodeIds.add(activeHighlight.id);
      this.links.forEach(l => {
        if (l.source.id === activeHighlight.id) connectedNodeIds.add(l.target.id);
        if (l.target.id === activeHighlight.id) connectedNodeIds.add(l.source.id);
      });
    }

    // Draw Laser Edges
    this.links.forEach(l => {
      const isCross = l.type === 'cross_link';
      const isHighlighted = activeHighlight && (l.source.id === activeHighlight.id || l.target.id === activeHighlight.id);

      this.ctx.beginPath();
      this.ctx.moveTo(l.source.x, l.source.y);

      if (isCross) {
        const midX = (l.source.x + l.target.x) / 2 + 30;
        const midY = (l.source.y + l.target.y) / 2 - 30;
        this.ctx.quadraticCurveTo(midX, midY, l.target.x, l.target.y);
        this.ctx.strokeStyle = isHighlighted ? '#ff007f' : 'rgba(255, 0, 127, 0.35)';
        this.ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        this.ctx.setLineDash([6, 6]);
      } else {
        this.ctx.lineTo(l.target.x, l.target.y);
        this.ctx.strokeStyle = isHighlighted ? '#00f3ff' : (activeHighlight ? 'rgba(0, 243, 255, 0.04)' : 'rgba(0, 243, 255, 0.18)');
        this.ctx.lineWidth = isHighlighted ? 2.2 : 1.2;
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });

    // Draw Matte Sci-Fi Glass Orbs (No harsh plastic glossy shine)
    this.nodes.forEach(n => {
      const floatY = Math.sin(this.time + n.floatOffset) * 2;
      const renderX = n.x;
      const renderY = n.y + floatY;

      const isHovered = (this.hoveredNode === n);
      const isFocused = (this.focusedNode === n);
      const isConnected = connectedNodeIds.has(n.id);
      const isRoot = (n.id === 'root-web-app-dev');

      const colors = this.getNodeColor(n);

      // Matte Concentric Glass Orb Radial Gradient (Soft core, no harsh white offset spot)
      this.ctx.beginPath();
      this.ctx.arc(renderX, renderY, n.radius, 0, Math.PI * 2);

      const grad = this.ctx.createRadialGradient(
        renderX,
        renderY,
        0,
        renderX,
        renderY,
        n.radius
      );

      grad.addColorStop(0, colors.core);
      grad.addColorStop(0.5, colors.main);
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.90)');

      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Laser Aura Outer Ring
      this.ctx.lineWidth = (isHovered || isFocused) ? 3.5 : (isRoot ? 3 : (isConnected ? 2.2 : 1.4));
      this.ctx.strokeStyle = (isHovered || isFocused) ? '#ffffff' : (isRoot ? colors.glow : (isConnected ? colors.border : colors.glow));
      this.ctx.stroke();

      // Center Sci-Fi Glowing Core Point
      this.ctx.beginPath();
      this.ctx.arc(renderX, renderY, Math.max(2, n.radius * 0.22), 0, Math.PI * 2);
      this.ctx.fillStyle = (isHovered || isFocused) ? '#ffffff' : colors.core;
      this.ctx.fill();

      // Subtle Text Label Filter
      const isHighlightedNode = isHovered || isFocused || isConnected;
      const isDomainOrRoot = isRoot || n.level === 'Domain Pillar';

      if (isHighlightedNode || isDomainOrRoot || this.camera.zoom > 1.3) {
        let text = n.name;
        const isMuted = !isHighlightedNode && !isDomainOrRoot;

        if (isMuted && text.length > 26) {
          text = text.substring(0, 24) + '...';
        }

        this.ctx.font = isRoot ? 'bold 13px Inter, sans-serif' : (n.level === 'Domain Pillar' ? '600 11px Inter, sans-serif' : '500 10px Inter, sans-serif');

        const textMetrics = this.ctx.measureText(text);
        const padX = 6;
        const padY = 3;
        const labelY = renderY + n.radius + 14;

        if (isHighlightedNode || isRoot) {
          // Opaque glowing text background pill on hover/focus/root
          this.ctx.fillStyle = (isHovered || isFocused) ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.82)';
          this.ctx.beginPath();
          this.ctx.roundRect(
            renderX - textMetrics.width / 2 - padX,
            labelY - 10 - padY,
            textMetrics.width + padX * 2,
            14 + padY * 2,
            4
          );
          this.ctx.fill();
          this.ctx.strokeStyle = (isHovered || isFocused) ? '#00f3ff' : colors.border;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          this.ctx.fillStyle = (isHovered || isFocused) ? '#ffffff' : '#f8fafc';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(text, renderX, labelY);
        } else {
          // Subtle muted low-opacity label by default
          this.ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(text, renderX, labelY);
        }
      }

      // Draw Floating Action Badge on Focused Node
      if (isFocused) {
        const badgeText = '📖 Read Definition';
        this.ctx.font = 'bold 10px Inter, sans-serif';
        const badgeMetrics = this.ctx.measureText(badgeText);
        const badgeY = renderY - n.radius - 16;
        const bPadX = 8;
        const bPadY = 4;

        this.ctx.fillStyle = '#6366f1';
        this.ctx.beginPath();
        this.ctx.roundRect(
          renderX - badgeMetrics.width / 2 - bPadX,
          badgeY - 10 - bPadY,
          badgeMetrics.width + bPadX * 2,
          14 + bPadY * 2,
          12
        );
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(badgeText, renderX, badgeY);
      }
    });

    this.ctx.restore();
  }

  startAnimation() {
    const loop = () => {
      this.stepPhysics();
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    loop();
  }

  // Camera Zoom API
  zoomBy(factor) {
    const newZoom = Math.max(0.25, Math.min(3.0, this.camera.zoom * factor));
    this.camera.zoom = newZoom;
  }

  zoomIn() {
    this.zoomBy(1.25);
  }

  zoomOut() {
    this.zoomBy(0.8);
  }

  resetCamera() {
    this.focusedNode = null;
    this.targetCamera = null;
    this.camera = { x: this.width / 2, y: this.height / 2, zoom: 0.70 };
  }

  // Pointer & Camera Interaction
  initEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
  }

  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.camera.x) / this.camera.zoom;
    const y = (screenY - rect.top - this.camera.y) / this.camera.zoom;
    return { x, y };
  }

  findNodeAt(worldX, worldY) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      if (dx * dx + dy * dy <= n.radius * n.radius * 1.6) {
        return n;
      }
    }
    return null;
  }

  onMouseDown(e) {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const hitNode = this.findNodeAt(world.x, world.y);

    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.isDraggingNode = false;

    if (hitNode) {
      this.draggedNode = hitNode;
    } else {
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
    }
  }

  onMouseMove(e) {
    const world = this.screenToWorld(e.clientX, e.clientY);

    if (this.draggedNode) {
      const dx = e.clientX - (this.mouseDownPos?.x || 0);
      const dy = e.clientY - (this.mouseDownPos?.y || 0);
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.isDraggingNode = true;
        this.draggedNode.x = world.x;
        this.draggedNode.y = world.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      }
    } else if (this.isPanning) {
      this.camera.x = e.clientX - this.panStart.x;
      this.camera.y = e.clientY - this.panStart.y;
    } else {
      const hit = this.findNodeAt(world.x, world.y);
      if (hit !== this.hoveredNode) {
        this.hoveredNode = hit;
        this.canvas.style.cursor = hit ? 'pointer' : 'default';
        if (this.options.onNodeHover) this.options.onNodeHover(hit);
      }
    }
  }

  onMouseUp(e) {
    if (this.draggedNode) {
      if (!this.isDraggingNode) {
        const isAlreadyFocused = (this.focusedNode === this.draggedNode);
        if (!isAlreadyFocused) {
          // Step 1: Smoothly glide camera to center on clicked node
          this.focusOnNode(this.draggedNode);
        } else if (this.options.onNodeClick) {
          // Step 2: Open full definition modal on 2nd click or badge click!
          this.options.onNodeClick(this.draggedNode);
        }
      }
    }
    this.draggedNode = null;
    this.isDraggingNode = false;
    this.isPanning = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    this.zoomBy(zoomFactor);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindMapGraphEngine;
}

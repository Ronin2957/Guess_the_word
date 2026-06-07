// Logical/virtual dimensions for coordination resolution across different screen resolutions
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 600;

export class GameCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    
    // Core drawing state
    this.color = '#ffffff'; // Default drawing color for dark theme
    this.brushSize = 5;
    this.isEraser = false;
    this.isDrawing = false;
    this.isFillMode = false;
    
    // Navigation / relative position variables
    this.lastLogicalX = 0;
    this.lastLogicalY = 0;
    
    // Stroke tracking
    this.currentStrokeId = 0;
    this.history = []; // Array of segments or fill records
    
    // Socket & role callback
    this.socket = null;
    this.roleCallback = null; // Should return 'drawer' or 'guesser'
    
    this.resizeObserver = null;
    
    this.init();
  }

  init() {
    // Canvas styling setup
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Bind touch/mouse events
    this.bindEvents();
    
    // Handle resizing dynamically to maintain correct display scale
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.canvas.parentElement);
    
    // Trigger initial resize
    setTimeout(() => this.resizeCanvas(), 50);
  }

  setSocket(socket, roleCallback) {
    this.socket = socket;
    this.roleCallback = roleCallback;
  }

  isWritable() {
    if (!this.roleCallback) return false;
    return this.roleCallback() === 'drawer';
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    
    // Calculate 5:3 aspect ratio size that fits parent boundary
    let width = rect.width;
    let height = width * (LOGICAL_HEIGHT / LOGICAL_WIDTH);

    if (height > rect.height) {
      height = rect.height;
      width = height * (LOGICAL_WIDTH / LOGICAL_HEIGHT);
    }

    // Set physical resolution
    this.canvas.width = width;
    this.canvas.height = height;

    // Redraw all strokes in history after resize
    this.redrawAll();
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onStart(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.onEnd());
    this.canvas.addEventListener('mouseleave', () => this.onEnd());

    // Touch events for mobile/tablet
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Prevent scrolling when drawing on touch screens
        e.preventDefault();
        this.onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        this.onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onEnd();
    });
  }

  getLogicalCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Physical coordinate relative to canvas
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Map to 1000x600 logical coord system
    const logicalX = Math.round((x / rect.width) * LOGICAL_WIDTH);
    const logicalY = Math.round((y / rect.height) * LOGICAL_HEIGHT);
    
    return { x: logicalX, y: logicalY };
  }

  onStart(clientX, clientY) {
    if (!this.isWritable()) return;
    
    const coords = this.getLogicalCoords(clientX, clientY);
    
    // If fill mode is active, perform a flood fill instead of drawing
    if (this.isFillMode) {
      this.performFill(coords.x, coords.y);
      return;
    }
    
    this.isDrawing = true;
    this.lastLogicalX = coords.x;
    this.lastLogicalY = coords.y;
    
    // Generate new unique stroke ID
    this.currentStrokeId = Date.now() + Math.random().toString(36).substr(2, 4);
    
    // Draw initial dot
    this.drawAndEmitSegment(coords.x, coords.y, coords.x, coords.y);
  }

  onMove(clientX, clientY) {
    if (!this.isDrawing || !this.isWritable()) return;
    
    const coords = this.getLogicalCoords(clientX, clientY);
    this.drawAndEmitSegment(this.lastLogicalX, this.lastLogicalY, coords.x, coords.y);
    
    this.lastLogicalX = coords.x;
    this.lastLogicalY = coords.y;
  }

  onEnd() {
    this.isDrawing = false;
  }

  drawAndEmitSegment(x0, y0, x1, y1) {
    const segment = {
      strokeId: this.currentStrokeId,
      x0, y0, x1, y1,
      color: this.color,
      size: this.brushSize,
      isEraser: this.isEraser
    };

    // Store in local history
    this.history.push(segment);

    // Draw on local canvas
    this.drawSegment(segment);

    // Emit to server
    if (this.socket) {
      this.socket.emit('draw_stroke', segment);
    }
  }

  drawSegment(seg) {
    const scaleX = this.canvas.width / LOGICAL_WIDTH;
    const scaleY = this.canvas.height / LOGICAL_HEIGHT;

    this.ctx.beginPath();
    
    if (seg.isEraser) {
      // Set to erase drawing
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = seg.color;
    }

    // Apply scale adjustments
    this.ctx.lineWidth = seg.size * Math.max(scaleX, scaleY);
    
    // Start drawing
    this.ctx.moveTo(seg.x0 * scaleX, seg.y0 * scaleY);
    this.ctx.lineTo(seg.x1 * scaleX, seg.y1 * scaleY);
    this.ctx.stroke();

    // Reset standard drawing composition mode
    this.ctx.globalCompositeOperation = 'source-over';
  }

  // ============ FILL / BUCKET TOOL ============
  /**
   * Performs a scanline flood fill at the given logical coordinates
   * @param {number} logicalX 
   * @param {number} logicalY 
   */
  performFill(logicalX, logicalY) {
    const scaleX = this.canvas.width / LOGICAL_WIDTH;
    const scaleY = this.canvas.height / LOGICAL_HEIGHT;
    
    // Convert logical coords to pixel coords on the actual canvas
    const startX = Math.round(logicalX * scaleX);
    const startY = Math.round(logicalY * scaleY);
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
    
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    // Get the color at the clicked pixel
    const targetIdx = (startY * w + startX) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];
    
    // Parse the fill color
    const fillColor = this.hexToRgba(this.color);
    
    // Don't fill if the target color is the same as the fill color
    if (targetR === fillColor.r && targetG === fillColor.g && 
        targetB === fillColor.b && targetA === fillColor.a) {
      return;
    }
    
    const tolerance = 32; // Color matching tolerance
    
    const matchesTarget = (idx) => {
      return Math.abs(data[idx] - targetR) <= tolerance &&
             Math.abs(data[idx + 1] - targetG) <= tolerance &&
             Math.abs(data[idx + 2] - targetB) <= tolerance &&
             Math.abs(data[idx + 3] - targetA) <= tolerance;
    };
    
    const setPixel = (idx) => {
      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = fillColor.a;
    };
    
    // Scanline flood fill using a stack
    const stack = [[startX, startY]];
    const visited = new Uint8Array(w * h);
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      
      const pixelPos = y * w + x;
      if (visited[pixelPos]) continue;
      
      const idx = pixelPos * 4;
      if (!matchesTarget(idx)) continue;
      
      visited[pixelPos] = 1;
      setPixel(idx);
      
      // Push neighboring pixels
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    
    // Create a fill record for history & socket sync
    const fillRecord = {
      type: 'fill',
      strokeId: Date.now() + Math.random().toString(36).substr(2, 4),
      x: logicalX,
      y: logicalY,
      color: this.color
    };
    
    this.history.push(fillRecord);
    
    // Emit to server
    if (this.socket) {
      this.socket.emit('draw_fill', fillRecord);
    }
  }
  
  /**
   * Replays a fill operation received from the server
   * @param {object} fillData 
   */
  addRemoteFill(fillData) {
    this.history.push(fillData);
    this.replayFill(fillData);
  }
  
  /**
   * Replays a fill operation on the local canvas
   * @param {object} fillData
   */
  replayFill(fillData) {
    const scaleX = this.canvas.width / LOGICAL_WIDTH;
    const scaleY = this.canvas.height / LOGICAL_HEIGHT;
    
    const startX = Math.round(fillData.x * scaleX);
    const startY = Math.round(fillData.y * scaleY);
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
    
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    const targetIdx = (startY * w + startX) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];
    
    const fillColor = this.hexToRgba(fillData.color);
    
    if (targetR === fillColor.r && targetG === fillColor.g && 
        targetB === fillColor.b && targetA === fillColor.a) {
      return;
    }
    
    const tolerance = 32;
    
    const matchesTarget = (idx) => {
      return Math.abs(data[idx] - targetR) <= tolerance &&
             Math.abs(data[idx + 1] - targetG) <= tolerance &&
             Math.abs(data[idx + 2] - targetB) <= tolerance &&
             Math.abs(data[idx + 3] - targetA) <= tolerance;
    };
    
    const setPixel = (idx) => {
      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = fillColor.a;
    };
    
    const stack = [[startX, startY]];
    const visited = new Uint8Array(w * h);
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const pixelPos = y * w + x;
      if (visited[pixelPos]) continue;
      const idx = pixelPos * 4;
      if (!matchesTarget(idx)) continue;
      visited[pixelPos] = 1;
      setPixel(idx);
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Converts a hex color string to RGBA components
   * @param {string} hex 
   * @returns {{r: number, g: number, b: number, a: number}}
   */
  hexToRgba(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      a: 255
    };
  }

  // Draw a received stroke from the socket
  addRemoteStroke(seg) {
    this.history.push(seg);
    this.drawSegment(seg);
  }

  // Triggers redraw of complete screen history
  redrawAll() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const item of this.history) {
      if (item.type === 'fill') {
        this.replayFill(item);
      } else {
        this.drawSegment(item);
      }
    }
  }

  // Actions triggered from UI / Sockets
  clear() {
    this.history = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  undo() {
    if (this.history.length === 0) return;
    
    // Find the stroke ID of the last segment in history
    const lastStrokeId = this.history[this.history.length - 1].strokeId;
    
    // Filter out all segments matching this stroke ID
    this.history = this.history.filter(seg => seg.strokeId !== lastStrokeId);
    
    this.redrawAll();
  }

  // Palette setters
  setColor(colorHex) {
    this.color = colorHex;
    this.isEraser = false;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  setEraserMode(enabled) {
    this.isEraser = enabled;
    if (enabled) this.isFillMode = false;
  }

  setFillMode(enabled) {
    this.isFillMode = enabled;
    if (enabled) this.isEraser = false;
  }

  syncHistory(serverHistory) {
    this.history = serverHistory || [];
    this.redrawAll();
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

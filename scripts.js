// Initialize variables
let canvas = document.getElementById('whiteboard');
let ctx = canvas.getContext('2d');
let stickerCounter = 0;
let selectedSticker = null;
let isDragging = false;
let isResizing = false;
let isRotating = false;
let currentRotateZone = null;
let currentResizeHandle = null;

// Prevent context menu on whiteboard
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Prevent zoom on canvas
canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// Prevent deselection when clicking on the floating toolbar
document.querySelector('.floating-toolbar').addEventListener('mousedown', (e) => {
    e.stopPropagation();
});

// Set canvas size with 32px margin
function resizeCanvas() {
    canvas.width = window.innerWidth - 64;
    canvas.height = window.innerHeight - 64;
    drawGrid();
}

// Draw grid on canvas
function drawGrid() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create pattern from grid image
    let gridImg = new Image();
    gridImg.src = 'images/Grid.svg';
    gridImg.onload = function() {
        let pattern = ctx.createPattern(gridImg, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
}

// Initialize canvas
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Handle sticker buttons
document.querySelectorAll('.sticker-img').forEach(button => {
    button.addEventListener('click', () => {
        const stickerId = button.id.replace('add-', '');
        addSticker(stickerId);
    });
});

// Add a sticker to the whiteboard
function addSticker(stickerId) {
    // Create sticker container
    const stickerContainer = document.createElement('div');
    stickerContainer.className = 'sticker';
    stickerContainer.id = `sticker-${stickerCounter}`;
    stickerCounter++;
    
    // Create sticker image
    const stickerImg = document.createElement('img');
    stickerImg.src = `stickerssvg/${stickerId}.svg`;
    stickerImg.draggable = false;
    
    // Create resize handles for each corner
    const positions = ['tl', 'tr', 'bl', 'br'];
    
    for (let position of positions) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = `resize-handle ${position}`;
        resizeHandle.dataset.position = position;
        stickerContainer.appendChild(resizeHandle);
    }
    
    // Create rotate zones (corners)
    const rotatePositions = [
        { class: 'top-left', position: 'top-left' },
        { class: 'top-right', position: 'top-right' },
        { class: 'bottom-left', position: 'bottom-left' },
        { class: 'bottom-right', position: 'bottom-right' }
    ];
    
    for (let pos of rotatePositions) {
        const rotateZone = document.createElement('div');
        rotateZone.className = `rotate-zone ${pos.class}`;
        rotateZone.dataset.position = pos.position;
        stickerContainer.appendChild(rotateZone);
    }
    
    // Add sticker image to container
    stickerContainer.appendChild(stickerImg);
    
    // Position sticker in center of visible canvas
    const containerRect = document.querySelector('.whiteboard-container').getBoundingClientRect();
    const stickerLeft = containerRect.width / 2 - 75;
    const stickerTop = containerRect.height / 2 - 75;
    
    stickerContainer.style.left = `${stickerLeft}px`;
    stickerContainer.style.top = `${stickerTop}px`;
    stickerContainer.style.width = '150px';
    stickerContainer.style.height = '150px';
    stickerContainer.style.transform = 'rotate(0deg)';
    stickerContainer.dataset.angle = '0';
    
    // Add sticker to container
    document.getElementById('sticker-container').appendChild(stickerContainer);
    
    // Add event listeners
    setupStickerEvents(stickerContainer);
    
    // Select the new sticker
    selectSticker(stickerContainer);
}

// Setup event listeners for a sticker
function setupStickerEvents(sticker) {
    // Select sticker on click
    sticker.addEventListener('mousedown', (e) => {
        // Check if we clicked on a rotate zone
        if (e.target.classList.contains('rotate-zone')) {
            handleRotateStart(e, sticker);
            return;
        }
        
        // Check if resize handle clicked
        if (e.target.classList.contains('resize-handle')) {
            handleResizeStart(e, sticker);
            return;
        }
        
        // Otherwise handle move
        handleMoveStart(e, sticker);
        
        // Prevent default to stop text selection
        e.preventDefault();
    });
}

// Select a sticker
function selectSticker(sticker) {
    // Deselect previous sticker
    if (selectedSticker) {
        selectedSticker.classList.remove('selected');
    }
    
    // Select new sticker
    selectedSticker = sticker;
    if (selectedSticker) {
        selectedSticker.classList.add('selected');
    }
}

// Handle starting sticker movement
function handleMoveStart(e, sticker) {
    // Only handle left click
    if (e.button !== 0) return;
    
    // Select sticker and start dragging
    selectSticker(sticker);
    isDragging = true;
    
    // Save the sticker being moved
    const moveSticker = sticker;
    
    // Get starting position
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Get original position
    const originalLeft = parseInt(moveSticker.style.left);
    const originalTop = parseInt(moveSticker.style.top);
    
    // Handle movement
    function handleMove(e) {
        if (!isDragging) return;
        
        // Calculate new position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Update sticker position
        moveSticker.style.left = `${originalLeft + deltaX}px`;
        moveSticker.style.top = `${originalTop + deltaY}px`;
    }
    
    // Handle end of movement
    function handleMoveEnd() {
        isDragging = false;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleMoveEnd);
    }
    
    // Add window event listeners
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleMoveEnd);
}

// Handle starting sticker resize
function handleResizeStart(e, sticker) {
    // Only handle left click
    if (e.button !== 0) return;
    
    // Select sticker and start resizing
    selectSticker(sticker);
    currentResizeHandle = e.target;
    isResizing = true;
    
    // Save the sticker being resized
    const resizeSticker = sticker;
    
    // Get starting position
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Get original dimensions and position
    const originalWidth = parseInt(resizeSticker.style.width);
    const originalHeight = parseInt(resizeSticker.style.height);
    const originalLeft = parseInt(resizeSticker.style.left);
    const originalTop = parseInt(resizeSticker.style.top);
    const originalAngle = parseFloat(resizeSticker.dataset.angle || 0);
    
    // Handle resize
    function handleResize(e) {
        if (!isResizing) return;
        
        // Calculate delta from start position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Get handle position
        const position = currentResizeHandle.dataset.position;
        
        // Variables for the new dimensions and position
        let newWidth, newHeight, newLeft, newTop;
        
        // Apply different logic based on which handle was grabbed
        if (position === 'br') {
            // Bottom-right: increase width and height
            newWidth = Math.max(30, originalWidth + deltaX);
            newHeight = Math.max(30, originalHeight + deltaY);
            newLeft = originalLeft;
            newTop = originalTop;
        } 
        else if (position === 'bl') {
            // Bottom-left: decrease width, increase height, adjust left
            newWidth = Math.max(30, originalWidth - deltaX);
            newHeight = Math.max(30, originalHeight + deltaY);
            newLeft = originalLeft + deltaX;
            newTop = originalTop;
        }
        else if (position === 'tr') {
            // Top-right: increase width, decrease height, adjust top
            newWidth = Math.max(30, originalWidth + deltaX);
            newHeight = Math.max(30, originalHeight - deltaY);
            newLeft = originalLeft;
            newTop = originalTop + deltaY;
        }
        else if (position === 'tl') {
            // Top-left: decrease width and height, adjust left and top
            newWidth = Math.max(30, originalWidth - deltaX);
            newHeight = Math.max(30, originalHeight - deltaY);
            newLeft = originalLeft + deltaX;
            newTop = originalTop + deltaY;
        }
        
        // Update the sticker's dimensions and position
        resizeSticker.style.width = `${newWidth}px`;
        resizeSticker.style.height = `${newHeight}px`;
        resizeSticker.style.left = `${newLeft}px`;
        resizeSticker.style.top = `${newTop}px`;
    }
    
    // Handle end of resize
    function handleResizeEnd() {
        isResizing = false;
        currentResizeHandle = null;
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
    }
    
    // Add window event listeners
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', handleResizeEnd);
    
    // Prevent default to stop text selection
    e.preventDefault();
}

// Handle start of sticker rotation
function handleRotateStart(e, sticker) {
    // Only handle left click
    if (e.button !== 0) return;
    
    // Select sticker and start rotating
    selectSticker(sticker);
    currentRotateZone = e.target;
    isRotating = true;
    
    // Save the sticker being rotated
    const rotateSticker = sticker;
    
    // Get the sticker's center point
    const rect = rotateSticker.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Get starting cursor position
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Calculate starting angle from center to cursor
    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    
    // Get current rotation
    const currentAngleDeg = parseFloat(rotateSticker.dataset.angle || 0);
    
    // Handle rotation movement
    function handleRotateMove(e) {
        if (!isRotating) return;
        
        // Calculate current angle from center to cursor
        const currentRect = rotateSticker.getBoundingClientRect();
        const newCenterX = currentRect.left + currentRect.width / 2;
        const newCenterY = currentRect.top + currentRect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - newCenterY, e.clientX - newCenterX);
        
        // Calculate rotation delta in degrees
        let angleDelta = (currentAngle - startAngle) * (180 / Math.PI);
        
        // Calculate new rotation
        let newAngleDeg = currentAngleDeg + angleDelta;
        
        // Apply snapping if shift key is held
        if (e.shiftKey) {
            newAngleDeg = Math.round(newAngleDeg / 15) * 15;
        }
        
        // Update sticker rotation
        rotateSticker.style.transform = `rotate(${newAngleDeg}deg)`;
        rotateSticker.dataset.angle = newAngleDeg;
    }
    
    // Handle end of rotation
    function handleRotateEnd() {
        isRotating = false;
        currentRotateZone = null;
        window.removeEventListener('mousemove', handleRotateMove);
        window.removeEventListener('mouseup', handleRotateEnd);
    }
    
    // Add window event listeners
    window.addEventListener('mousemove', handleRotateMove);
    window.addEventListener('mouseup', handleRotateEnd);
    
    // Prevent default to stop text selection
    e.preventDefault();
}

// Deselect sticker when clicking on the whiteboard
canvas.addEventListener('mousedown', (e) => {
    // Only deselect if clicking directly on the canvas
    if (e.target === canvas) {
        selectSticker(null);
    }
});

// Handle keyboard events
document.addEventListener('keydown', (e) => {
    // Delete selected sticker with Delete or Backspace key
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSticker) {
        selectedSticker.remove();
        selectedSticker = null;
    }
}); 
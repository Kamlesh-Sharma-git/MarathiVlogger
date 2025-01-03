document.addEventListener('DOMContentLoaded', function() {
    const videoContainer = document.getElementById('videoContainer');
    const blogText = document.querySelector('.blog-text');
    
    // Make mini video draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    videoContainer.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (videoContainer.classList.contains('mini')) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging && videoContainer.classList.contains('mini')) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, videoContainer);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
});

// Add toggleSidebar function at the global scope
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;
    sidebar.classList.toggle('show');
    body.classList.toggle('sidebar-open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('show') && 
        !sidebar.contains(event.target) && 
        !toggleButton.contains(event.target)) {
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
    }
}); 
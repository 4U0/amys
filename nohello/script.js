document.addEventListener('DOMContentLoaded', function() {
    // Add animation class to elements as they enter the viewport
    const animateElements = document.querySelectorAll('.animate-in');
    
    // Initial check for elements already in viewport
    checkVisibility();
    
    // Check when scrolling
    window.addEventListener('scroll', checkVisibility);
    
    function checkVisibility() {
        animateElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.animationPlayState = 'running';
            }
        });
    }
    
    // Add some interaction to the chat examples
    const badChat = document.querySelector('.bad .chat-window');
    const goodChat = document.querySelector('.good .chat-window');
    
    badChat.addEventListener('click', function() {
        resetAnimation(badChat);
    });
    
    goodChat.addEventListener('click', function() {
        resetAnimation(goodChat);
    });
    
    function resetAnimation(element) {
        // Reset animation by cloning and replacing the element
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
        
        // Re-add event listener to the new element
        clone.addEventListener('click', function() {
            resetAnimation(clone);
        });
    }
});
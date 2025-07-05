// Debug script to identify external scripts causing React errors
(function() {
    'use strict';
    
    console.log('🔍 Debug: Monitoring external scripts...');
    
    // Store original script loading methods
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    
    // Track external scripts
    const externalScripts = new Set();
    
    // Override createElement to track script creation
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            // Monitor script attributes
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && value) {
                    externalScripts.add(value);
                    console.log('🔍 Debug: External script detected:', value);
                    
                    // Check if it's a React-related script
                    if (value.includes('react') || value.includes('inspector') || value.includes('ads')) {
                        console.warn('⚠️ Debug: Potentially problematic script:', value);
                    }
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        return element;
    };
    
    // Override appendChild to track script insertion
    Node.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src) {
            externalScripts.add(child.src);
            console.log('🔍 Debug: Script appended:', child.src);
        }
        return originalAppendChild.call(this, child);
    };
    
    // Override insertBefore to track script insertion
    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode.tagName === 'SCRIPT' && newNode.src) {
            externalScripts.add(newNode.src);
            console.log('🔍 Debug: Script inserted:', newNode.src);
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    }
    
    // Monitor for dynamic script loading
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.tagName === 'SCRIPT' && node.src) {
                    externalScripts.add(node.src);
                    console.log('🔍 Debug: Dynamic script added:', node.src);
                }
            });
        });
    });
    
    // Start observing
    observer.observe(document, {
        childList: true,
        subtree: true
    });
    
    // Global error handler
    window.addEventListener('error', function(e) {
        console.log('🔍 Debug: Error caught:', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            error: e.error
        });
        
        // Check if it's from an external script
        if (e.filename && !e.filename.includes(window.location.origin)) {
            console.warn('⚠️ Debug: External script error:', e.filename);
        }
    });
    
    // Report findings after page load
    window.addEventListener('load', function() {
        console.log('🔍 Debug: Page loaded. External scripts found:', Array.from(externalScripts));
        
        // Check for React-related errors
        if (window.React) {
            console.log('🔍 Debug: React detected in global scope');
        }
        
        // Check for any remaining errors
        setTimeout(function() {
            console.log('🔍 Debug: Final check complete');
        }, 2000);
    });
    
    // Export for manual inspection
    window.debugExternalScripts = {
        getScripts: () => Array.from(externalScripts),
        clearScripts: () => externalScripts.clear()
    };
    
})(); 
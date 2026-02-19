// ==UserScript==
// @name         Fab.com - Smart Filter for Owned Items
// @namespace    adguard-scripts
// @version      2.0
// @description  Hides "Saved in My Library" items by detecting the product card automatically
// @author       AdGuard User
// @match        https://www.fab.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_TEXT = "Saved in My Library";
    const LOG_PREFIX = "[Fab Filter]:";

    // This function finds the specific card container for a text node
    function findCardContainer(textNode) {
        let currentElement = textNode.parentElement;
        
        // Traverse up the DOM tree
        while (currentElement && currentElement.parentElement) {
            const parent = currentElement.parentElement;
            
            // Stop safety check: Don't go higher than the body
            if (parent.tagName === 'BODY' || parent.tagName === 'HTML') return null;

            // GET COMPUTED STYLE
            // We look for the "Grid" or "Flex" container that holds all the products.
            // The card is the direct CHILD of that container.
            const style = window.getComputedStyle(parent);
            
            // Fab.com typically uses a Grid layout or a Flex-Wrap layout for results
            if (style.display === 'grid' || (style.display === 'flex' && style.flexWrap === 'wrap')) {
                // We found the grid container!
                // 'currentElement' is the card (the item inside the grid)
                return currentElement;
            }

            // Move up one level
            currentElement = parent;
        }
        return null;
    }

    function scanAndHide() {
        // Find all elements containing the specific text
        // We use XPath for precise text matching
        const xpath = `//*[contains(text(), '${TARGET_TEXT}')]`;
        const snapshot = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < snapshot.snapshotLength; i++) {
            const textNode = snapshot.snapshotItem(i);
            
            // Find the card wrapper using the smart logic
            const card = findCardContainer(textNode);

            if (card) {
                if (card.style.display !== 'none') {
                    card.style.display = 'none';
                    // Optional: Log to console for debugging
                    // console.log(LOG_PREFIX, "Hidden an owned item.");
                }
            } else {
                // Fallback: If smart detection fails (rare), try a safe close parent
                // usually the card is an anchor or contains one.
                const fallbackCard = textNode.closest('a') ? textNode.closest('a').parentElement : null;
                if (fallbackCard && fallbackCard.style.display !== 'none') {
                     // We verify this isn't the body before hiding
                     if(fallbackCard.tagName !== 'BODY' && fallbackCard.parentElement.tagName !== 'BODY') {
                        fallbackCard.style.display = 'none';
                     }
                }
            }
        }
    }

    // 1. Run initially
    setTimeout(scanAndHide, 500);
    setTimeout(scanAndHide, 1500); // Run again for late rendering

    // 2. Set up the Observer for infinite scroll and late text injection
    const observer = new MutationObserver((mutations) => {
        // We debounce slightly to avoid running on every single pixel render
        // But for simplicity in AdGuard, we can just run the scan if nodes are added.
        let shouldScan = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                shouldScan = true;
                break;
            }
        }
        
        if (shouldScan) {
            scanAndHide();
        }
    });

    // Observe the entire body for changes (new items, text updates)
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true // Watch for text changes inside existing elements
    });

})();

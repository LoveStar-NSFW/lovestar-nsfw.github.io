// --------------------------------------------------------
// Simple comic-style image viewer for custom Tumblr pages
// License: PUBLIC DOMAIN
//
//
// By LoveStar (lovestar.nsfw@gmail.com)
// http://lovestar-nsfw.tumblr.com
//
//
// Changelog:
//      0.4.0:
//          - Added fullscreen mode.
//          - Simplified keyboard input and image handling.
//
//      0.3.1:
//          - Fixed mobile quirks.
//
//      0.3.0:
//          - Improved image loading.
//          - Added busy widget for slow images.
//
//      0.2.0:
//          - Added relative width setting.
//          - Minor fixes.
//
//      0.1.0:
//          - Initial release (2018).
// --------------------------------------------------------


// Comic viewer logic.
jQuery(window).on('load', function() {
    'use strict';

    var $ = jQuery;

    var VERSION = '0.4.0';

    var COMIC_NAME = document.title;
    var ALL_PAGES = window.ALL_PAGES;
    var TOTAL_PAGES = Object.keys(ALL_PAGES).length;
    var LAST_PAGE = getLastPage();

    var PAGE_WRAPPER = $('#page_wrapper');

    // Width of browser window at startup.
    var CONTAINER_WIDTH = 0;
    
    // Current page index as an integer (starts as null so the right page can be loaded).
    var currentPage = null;

    // Epoch time in milliseconds, used to prevent changing pages too quickly.
    var isCooldownActive = false;
    
    var isSmallScreen = false;
    var isFullscreen = false;
    
    // Used to detect size changes in finishImage().
    var lastNaturalHeight = 0;
    var smallestHeight = 1e32;
 
    // Keyboard constants humbly "borrowed" from e-hentai.org.
    var KeyEvent = {
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        DOM_VK_NUMPAD5: 101,
        DOM_VK_NPAD5KEY: 12,
        DOM_VK_ESCAPE: 27
    };

    init();


    function init() {
        $(window).on('hashchange', onHashChange);
        $(document).on('keydown', onKeydown);
        $('#page_wrapper').on('click', 'img', onNextPage);
        $('#button_help').on('click', onHelp);
        $('#button_first').on('click', onFirstPage);
        $('#button_previous').on('click', onPreviousPage);
        $('#button_next').on('click', onNextPage);
        $('#button_last').on('click', onLastPage);
        $('#button_fullscreen').on('click', onToggleFullscreen);          
        
        // When on a large screen, fit the viewer horizontally into the browser window with RELATIVE_WIDTH.
        var queryMax1200 = window.matchMedia("(max-width: 1200px)");
        var queryMax600 = window.matchMedia("(max-width: 600px)");
        if (!queryMax1200.matches && !queryMax600.matches) {
            CONTAINER_WIDTH = Math.floor($(window).width() * window.RELATIVE_WIDTH);
            $('#container').css('width', CONTAINER_WIDTH);
            isSmallScreen = false;
        } else {
            isSmallScreen = true;
        }

        $('#button_last').attr('href', '#' + LAST_PAGE.toString());

        onHashChange();

        $(document).focus();
    }


    function onHashChange() {
        setPage(getHashPage(LAST_PAGE));
    }


    function onNextPage() {
        if (!isCooldownActive && currentPage < LAST_PAGE)
            window.location.hash = '#' + (currentPage + 1).toString(); // Causes a 'hashchange' event.
        return false;
    }


    function onPreviousPage() {
        if (!isCooldownActive && currentPage > 1)
            window.location.hash = '#' + (currentPage - 1).toString();
        return false;
    }


    function onFirstPage() {
        if (!isCooldownActive)
            window.location.hash = '#1';
        return false;
    }


    function onLastPage() {
        if (!isCooldownActive)
            window.location.hash = '#' + LAST_PAGE.toString();
        return false;
    }


    function onHelp() {
        alert([
            'LoveStar Comic Viewer – v' + VERSION,
            '',
            'Navigation:',
            '- Arrow keys | Numpad keys',
            '',
            'Zoom:',
            '- Ctrl + Plus | Ctrl + Minus | Ctrl + Scroll Wheel',
            '- Ctrl + 0 (zero) resets zoom',
        ].join('\n'));
        return false;
    }
    
    
    function onToggleFullscreen() {
        isFullscreen = !isFullscreen;
        if (isFullscreen) {
            $('body, #container').addClass('fullscreen');        
            $('#button_fullscreen i').html('&#xE5D1;');
        } else {
            $('body, #container').removeClass('fullscreen');
            $('#button_fullscreen i').html('&#xE5D0;');            
        }
    }


    // Keyboard input code humbly "borrowed" from e-hentai.org.
    function onKeydown(e) {
        if (e.altKey || e.metaKey) {
            return;
        }
        switch ((window.event) ? e.keyCode : e.which) {
            case KeyEvent.DOM_VK_RIGHT:
            case KeyEvent.DOM_VK_D:
            case KeyEvent.DOM_VK_NUMPAD6:
                if (e.shiftKey)
                    onLastPage();
                else
                    onNextPage();
                return false;
                break;
            case KeyEvent.DOM_VK_LEFT:
            case KeyEvent.DOM_VK_A:
            case KeyEvent.DOM_VK_NUMPAD4:
                if (e.shiftKey)
                    onFirstPage();
                else
                    onPreviousPage();
                return false;
                break;
            case KeyEvent.DOM_VK_R:
            case KeyEvent.DOM_VK_NUMPAD5:
            case KeyEvent.DOM_VK_NPAD5KEY:
                window.location.reload();
                return false;
                break;
            case KeyEvent.DOM_VK_ESCAPE:
                if (isFullscreen) {
                    onToggleFullscreen();
                    return false;
                }
                return;
                break;
        }
    }


    function setPage(newPage) {
        if (currentPage == newPage || !ALL_PAGES[newPage])
            return;

        currentPage = newPage;
        
        PAGE_WRAPPER.find('img').css('opacity', 0.01);
        window.scroll(0, 0);

        // Update the document title.
        var pageLabel = 'Page ' + currentPage.toString();
        document.title = pageLabel + ' \u2013 ' + COMIC_NAME;
        
        // Prepare a new page image.
        PAGE_WRAPPER.html('<img src="'+ALL_PAGES[currentPage]+'" alt="'+pageLabel+'" style="opacity: 0.01;">');
        var img = PAGE_WRAPPER.find('img').get(0);
        if (!img.complete) {
            // Enforce a cooldown period.
            isCooldownActive = true;
            setTimeout(function () {
                isCooldownActive = false;
            }, 1000);

            if (img.naturalHeight)
                finishImage(img);
            else
                pollImageHeight(img, finishImage);
        } else {
            isCooldownActive = false;
            finishImage(img);
        }
        updateNavigation();
    }


    function finishImage(img) {
        if (img.naturalHeight < smallestHeight) {
            smallestHeight = img.naturalHeight;
            updateWrapperHeight(img);            
        }
        
        // Force a scroll when going between pages of different heights because
        // in these cases the scroll at the beginning of setPage() might fail.
        if (lastNaturalHeight != img.naturalHeight) {
            lastNaturalHeight = img.naturalHeight;
            window.scroll(0, 1);
            window.scroll(0, 0);            
        }
        
        // Fade the new image in.
        $(img).animate({
            opacity: 1.0, 
            duration: 500
        });
    }
    
    
    function updateWrapperHeight(img) {
        // Set a minimum height for the page wrapper so it doesn't collapse when the page changes.
        var ratio = (isSmallScreen ? $(window).width() : CONTAINER_WIDTH) / img.naturalWidth;
        PAGE_WRAPPER.css('min-height', img.naturalHeight * ratio);
    }


    function updateNavigation() {
        // The "(current page) / (total pages)" counter on the menu bar.
        $('#page_counter').html(currentPage.toString() + ' / ' + TOTAL_PAGES.toString());

        // Change the destination links of the menu bar buttons and the clickable page.

        if (currentPage > 1) {
            $('#button_previous').attr('href', '#' + (currentPage - 1).toString());
            $('#button_previous, #button_first').removeClass('hidden');
        } else {
            $('#button_previous, #button_first').addClass('hidden');
        }

        if (ALL_PAGES[currentPage + 1]) {
            $('#button_next').attr('href', '#' + (currentPage + 1).toString());
            $('#button_next, #button_last').removeClass('hidden');
        } else {
            PAGE_WRAPPER.find('img').css('cursor', 'auto');
            $('#button_next, #button_last').addClass('hidden');
        }
    }


    // Reads the hash in the page address and returns an integer page index.
    // Defaults to page 1 if there's no hash or if it's not a number.
    function getHashPage(lastPage) {
        var hashPage = window.location.hash.replace('#', '');
        hashPage = hashPage ? parseInt(hashPage) : 1; // Could be 'NaN'.
        return Math.max(Math.min(hashPage || 1, lastPage), 1);
    }


    function getLastPage() {
        return Object.keys(window.ALL_PAGES).reduce(
            function(a, b) {
                a = parseInt(a);
                b = parseInt(b);
                return a > b ? a : b;
            }
        );
    }


    // Poll the new image until the browser knows a valid height for it.
    // Polling is limited to 5 seconds max, in case the image failed loading.
    function pollImageHeight(img, imgCallback) {
        var progressWidget = $('#progress_widget');
        var widgetTimeout = setTimeout(function () {
            progressWidget.addClass('progress');
        }, 1000);

        var count = 50;
        var poll = setInterval(function() {
            count--;
            if (img.naturalHeight || count < 0)
                clearInterval(poll);
                clearTimeout(widgetTimeout);
                progressWidget.removeClass('progress');
                imgCallback(img);
        }, 100);
    }
});
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

// 1) Document-ready handler.
jQuery(function() {
    'use strict';

    var $ = jQuery;

    // Fit the viewer horizontally into the browser window once right now.
    var queryMax1200 = window.matchMedia("(max-width: 1200px)");
    var queryMax600 = window.matchMedia("(max-width: 600px)");
    if (queryMax1200.matches || queryMax600.matches) {
        $(document.body).addClass('fullscreen');
    } else {
        $('#container').css('width', Math.floor($(window).width() * window.RELATIVE_WIDTH));
    }
});


// 2) Window-load handler. Includes the comic viewer logic.
jQuery(window).on('load', function() {
    'use strict';

    var $ = jQuery;

    var VERSION = '0.3.1';

    var COMIC_NAME = document.title;
    var ALL_PAGES = window.ALL_PAGES;
    var TOTAL_PAGES = Object.keys(ALL_PAGES).length;
    var LAST_PAGE = getLastPage();

    var PAGE_WRAPPER = $('#page_wrapper');
    var PAGE_LINK = $('#page_link');
    var HAS_SMOOTH_SCROLL = document.documentElement ? 'scrollBehavior' in document.documentElement.style : false;
    var CONTAINER_WIDTH = Math.floor($(window).width() * window.RELATIVE_WIDTH); // Recalculate because of IE behavior.
    var IS_FULLSCREEN = $(document.body).hasClass('fullscreen');

    // Current page index as an integer (starts as null so the right page can be loaded).
    var currentPage = null;

    // Epoch time in milliseconds, used to prevent changing pages too quickly.
    var isCooldownActive = false;

    // Used to update the height of the page_wrapper div, but only if necessary.
    var lastNaturalHeight = 0;

    // Keyboard constants humbly "borrowed" from e-hentai.org.
    var KeyEvent = {
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        DOM_VK_A: 65,
        DOM_VK_D: 68,
        DOM_VK_R: 82,
        DOM_VK_S: 83,
        DOM_VK_W: 87,
        DOM_VK_NUMPAD2: 98,
        DOM_VK_NUMPAD4: 100,
        DOM_VK_NUMPAD5: 101,
        DOM_VK_NUMPAD6: 102,
        DOM_VK_NUMPAD8: 104,
        DOM_VK_NPAD5KEY: 12
    };

    init();


    function init() {
        $(window).on('hashchange', onHashChange);
        $(document).on('keydown', onKeydown);
        PAGE_LINK.on('click', onNextPage);
        $('#button_help').on('click', onHelp);
        $('#button_first').on('click', onFirstPage);
        $('#button_previous').on('click', onPreviousPage);
        $('#button_next').on('click', onNextPage);
        $('#button_last').on('click', onLastPage);

        if (IS_FULLSCREEN)
            $(window).on('resize', updateWrapperHeight);

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
            'Arrow keys | Numpad keys | A,W,S,D',
            '(Hold Shift or Ctrl for fine scrolling)',
            '',
            'Zoom:',
            'Ctrl + Plus | Ctrl + Minus | Ctrl + Scroll Wheel',
            '(Ctrl + 0 (zero) resets zoom)'
        ].join('\n'));
        return false;
    }


    // Keyboard input code humbly "borrowed" from e-hentai.org.
    function onKeydown(e) {
        if (e.altKey || e.metaKey) {
            return;
        }
        var height, offset, scale;
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
            case KeyEvent.DOM_VK_UP:
            case KeyEvent.DOM_VK_W:
            case KeyEvent.DOM_VK_NUMPAD8:
                height = Math.max($(document).height(), $(window).height());
                scale = (e.shiftKey || e.ctrlKey) ? 0.05 : 0.2;
                offset = Math.round(height * scale);
                crossBrowserSmoothScroll(-offset);
                return false;
                break;
            case KeyEvent.DOM_VK_DOWN:
            case KeyEvent.DOM_VK_S:
            case KeyEvent.DOM_VK_NUMPAD2:
                height = Math.max($(document).height(), $(window).height());
                scale = (e.shiftKey || e.ctrlKey) ? 0.05 : 0.2;
                offset = Math.round(height * scale);
                crossBrowserSmoothScroll(offset);
                return false;
                break;
            case KeyEvent.DOM_VK_R:
            case KeyEvent.DOM_VK_NUMPAD5:
            case KeyEvent.DOM_VK_NPAD5KEY:
                window.location.reload();
                return false;
                break;
        }
    }


    function setPage(newPage) {
        if (currentPage == newPage || !ALL_PAGES[newPage])
            return;

        currentPage = newPage;

        PAGE_LINK.children().first().css('opacity', 0.01);
        window.scroll(0, 0);
        updateNavigation();

        // Update the document title.
        var pageLabel = 'Page ' + currentPage.toString();
        document.title = pageLabel + ' \u2013 ' + COMIC_NAME;

        // Prepare a new page image.
        PAGE_LINK.html('<img src="'+ALL_PAGES[currentPage]+'" alt="'+pageLabel+'" style="opacity:0.01">');

        var img = PAGE_LINK.children().get(0);
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
    }


    function finishImage(img) {
        updateWrapperHeight();

        // Force a scroll when going between pages of different sizes, or sometimes it fails.
        if (lastNaturalHeight != img.naturalHeight) {
            lastNaturalHeight = img.naturalHeight;
            window.scroll(0, 1);
            window.scroll(0, 0);
        }

        // Fade the image in.
        $(img).animate({
            opacity: 1.0,
            duration: 300
        });
    }


    function updateWrapperHeight() {
        // Set a fixed height on the wrapper so it doesn't collapse when the page image changes.
        var img = PAGE_LINK.children().get(0);
        if (img) {
            var ratio = IS_FULLSCREEN ? $(window).width() / img.naturalWidth : CONTAINER_WIDTH / img.naturalWidth;
            PAGE_WRAPPER.css('height', Math.floor(img.naturalHeight * ratio));
        }
    }


    function updateNavigation() {
        // The "(current page) / (total pages)" counter on the menu bar.
        $('#page_counter').html(currentPage.toString() + ' / ' + TOTAL_PAGES.toString());

        // Change the destination links of the menu bar buttons and the clickable page.

        if (currentPage > 1) {
            $('#button_previous').attr('href', '#' + (currentPage - 1).toString());
            $('#button_previous, #button_first').removeClass('hidden');
        } else {
            $('#button_previous').attr('href', '#1');
            $('#button_previous, #button_first').addClass('hidden');
        }

        if (ALL_PAGES[currentPage + 1]) {
            var nextPageLink = '#' + (currentPage + 1).toString();
            $('#page_link').attr('href', nextPageLink);
            $('#button_next').attr('href', nextPageLink);
            $('#button_next, #button_last').removeClass('hidden');
        } else {
            $('#page_link').attr('href', '#' + currentPage.toString());
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
    // Polling is limited to 5 seconds max, in case the image failed loading or timed-out.
    function pollImageHeight(img, imgCallback) {
        var progressWidget = $('#progress_widget');

        var widgetTimeout = setTimeout(function () {
            progressWidget.addClass('progress');
        }, 1000);

        var count = 50; // 100ms * 50 iterations = 5000ms limit.
        var poll = setInterval(function() {
            count--;
            if (img.naturalHeight || count < 0)
                clearInterval(poll);
                clearTimeout(widgetTimeout);
                progressWidget.removeClass('progress');
                imgCallback(img);
        }, 100);
    }


    function crossBrowserSmoothScroll(offset) {
        // Taken from https://hospodarets.com/native_smooth_scrolling
        if (HAS_SMOOTH_SCROLL) {
            window.scrollBy({
                top: offset,
                behavior: 'smooth'
            });
        } else {
            $('html, body').stop();
            $('html, body').animate({scrollTop: '+=' + offset.toString()}, 200);
        }
    }
});
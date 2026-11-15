(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function $$(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    /* ---------- Toast ---------- */
    var toastTimer = null;
    function showToast(message) {
        var toast = $("[data-toast]");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            toast.classList.remove("is-visible");
        }, 2200);
    }

    /* ---------- Theme ---------- */
    function initTheme() {
        $$("[data-theme-toggle]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
                root.setAttribute("data-theme", next);
                try {
                    window.localStorage.setItem("theme", next);
                } catch (e) { /* storage unavailable (private mode) */ }
            });
        });
    }

    /* ---------- Mobile navigation ---------- */
    function initNav() {
        var toggle = $("#menu-toggle");
        var nav = $("#site-nav");
        if (!toggle || !nav) return;

        function setOpen(open) {
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
            nav.classList.toggle("is-open", open);
            document.body.classList.toggle("nav-open", open);
            if (open) {
                var first = $("a", nav);
                if (first) first.focus();
            }
        }

        toggle.addEventListener("click", function () {
            setOpen(toggle.getAttribute("aria-expanded") !== "true");
        });

        $$("a", nav).forEach(function (link) {
            link.addEventListener("click", function () {
                setOpen(false);
            });
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && nav.classList.contains("is-open")) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener("pointerdown", function (event) {
            if (!nav.classList.contains("is-open")) return;
            if (nav.contains(event.target) || toggle.contains(event.target)) return;
            setOpen(false);
        });

        window.matchMedia("(min-width: 861px)").addEventListener("change", function (event) {
            if (event.matches) setOpen(false);
        });
    }

    /* ---------- Horizontal project rails (smooth wheel + edge lock) ---------- */
    function initProjectRails() {
        var EDGE_LOCK = 140;
        var EASE = reduceMotion ? 1 : 0.22;

        $$(".projects-rail").forEach(function (rail) {
            var target = rail.scrollLeft;
            var edgeDebt = 0;
            var edgeDir = 0;
            var raf = 0;
            var dragging = false;

            function maxScroll() {
                return Math.max(0, rail.scrollWidth - rail.clientWidth);
            }

            function clamp(value) {
                return Math.max(0, Math.min(maxScroll(), value));
            }

            function animate() {
                raf = 0;
                var current = rail.scrollLeft;
                var next = current + (target - current) * EASE;
                if (Math.abs(target - next) < 0.4) {
                    rail.scrollLeft = target;
                    return;
                }
                rail.scrollLeft = next;
                raf = window.requestAnimationFrame(animate);
            }

            function goTo(value) {
                target = clamp(value);
                if (!raf) raf = window.requestAnimationFrame(animate);
            }

            function normalizeDelta(event) {
                var dx = event.deltaX;
                var dy = event.deltaY;
                if (event.deltaMode === 1) {
                    dx *= 16;
                    dy *= 16;
                } else if (event.deltaMode === 2) {
                    dx *= rail.clientWidth;
                    dy *= rail.clientHeight;
                }
                return Math.abs(dx) > Math.abs(dy) ? dx : dy;
            }

            rail.addEventListener("wheel", function (event) {
                if (rail.scrollWidth <= rail.clientWidth + 1) return;

                var delta = normalizeDelta(event);
                if (!delta) return;

                var max = maxScroll();
                if (!raf && !dragging) target = rail.scrollLeft;

                var goingRight = delta > 0;
                var atStart = target <= 0.5 && rail.scrollLeft <= 0.5;
                var atEnd = target >= max - 0.5 && rail.scrollLeft >= max - 0.5;
                var blocked = (goingRight && atEnd) || (!goingRight && atStart);

                if (!blocked) {
                    edgeDebt = 0;
                    edgeDir = 0;
                    event.preventDefault();
                    goTo(target + delta);
                    return;
                }

                var dir = goingRight ? 1 : -1;
                if (edgeDir !== dir) {
                    edgeDebt = 0;
                    edgeDir = dir;
                }
                edgeDebt += Math.abs(delta);

                /* Absorb overflow until the safe area is spent, then release to page. */
                if (edgeDebt < EDGE_LOCK) {
                    event.preventDefault();
                    target = goingRight ? max : 0;
                    rail.scrollLeft = target;
                }
            }, { passive: false });

            rail.addEventListener("pointerleave", function () {
                edgeDebt = 0;
                edgeDir = 0;
            });

            rail.addEventListener("pointerdown", function () {
                dragging = true;
                if (raf) {
                    window.cancelAnimationFrame(raf);
                    raf = 0;
                }
                target = rail.scrollLeft;
            });

            function endDrag() {
                dragging = false;
                target = rail.scrollLeft;
            }

            rail.addEventListener("pointerup", endDrag);
            rail.addEventListener("pointercancel", endDrag);

            rail.addEventListener("scroll", function () {
                if (!raf && !dragging) target = rail.scrollLeft;
            }, { passive: true });
        });
    }

    /* ---------- Header state + back to top ---------- */
    function initScrollUi() {
        var header = $("#site-header");
        var backToTop = $("[data-back-to-top]");
        var ticking = false;

        function update() {
            var y = window.scrollY;
            if (header) header.classList.toggle("is-scrolled", y > 8);
            if (backToTop) backToTop.hidden = y < 600;
            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        update();

        if (backToTop) {
            backToTop.addEventListener("click", function () {
                window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                var target = $("#main");
                if (target) {
                    target.setAttribute("tabindex", "-1");
                    target.focus({ preventScroll: true });
                }
            });
        }
    }

    /* ---------- Active section highlighting ---------- */
    function initActiveLinks() {
        if (!("IntersectionObserver" in window)) return;
        var links = $$('.nav-links a[href^="#"]');
        if (!links.length) return;

        var map = {};
        links.forEach(function (link) {
            var section = document.getElementById(link.getAttribute("href").slice(1));
            if (section) map[section.id] = link;
        });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (l) { l.removeAttribute("aria-current"); });
                var active = map[entry.target.id];
                if (active) active.setAttribute("aria-current", "true");
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        Object.keys(map).forEach(function (id) {
            observer.observe(document.getElementById(id));
        });
    }

    /* ---------- Reveal on scroll ---------- */
    function initReveal() {
        var items = $$(".reveal");

        if (reduceMotion || !("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

        items.forEach(function (el) { observer.observe(el); });
    }

    /* ---------- Contact details (anti-scraping) ---------- */
    function reverse(str) {
        return String(str || "").split("").reverse().join("");
    }

    function initContacts() {
        var email = $('[data-contact="email"]');
        if (email) {
            var user = reverse(email.getAttribute("data-u"));
            var domain = reverse(email.getAttribute("data-d"));
            var address = user + "@" + domain;
            email.textContent = user + "@";
            email.appendChild(document.createElement("wbr"));
            email.appendChild(document.createTextNode(domain));
            email.setAttribute("href", "mailto:" + address);
            email.setAttribute("aria-label", "Email " + address);
            email.removeAttribute("data-u");
            email.removeAttribute("data-d");

            var copyBtn = $('[data-copy="email"]');
            if (copyBtn && navigator.clipboard && window.isSecureContext) {
                copyBtn.hidden = false;
                copyBtn.setAttribute("aria-label", "Copy email address");
                copyBtn.addEventListener("click", function () {
                    navigator.clipboard.writeText(address).then(function () {
                        showToast("Email copied to clipboard");
                    }, function () {
                        showToast("Couldn't copy that. Please copy it manually.");
                    });
                });
            }
        }

        var phone = $('[data-contact="phone"]');
        if (phone) {
            var digits = reverse(phone.getAttribute("data-p")).replace(/\D/g, "");
            var pretty = digits.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
            phone.textContent = pretty;
            phone.setAttribute("href", "tel:+63" + digits.replace(/^0/, ""));
            phone.removeAttribute("data-p");
        }
    }

    /* ---------- Certification filters ---------- */
    function initCertFilters() {
        var bar = $("[data-filter-bar]");
        var grid = $("[data-cert-grid]");
        if (!bar || !grid) return;

        var buttons = $$("[data-filter]", bar);
        var cards = $$(".cert-card", grid);
        var status = $("[data-filter-status]");
        var empty = $("[data-empty-state]");

        function apply(filter) {
            var shown = 0;
            cards.forEach(function (card) {
                var match = filter === "all" || card.getAttribute("data-category") === filter;
                card.hidden = !match;
                if (match) {
                    shown += 1;
                    card.classList.add("is-visible");
                }
            });
            buttons.forEach(function (btn) {
                btn.setAttribute("aria-pressed", String(btn.getAttribute("data-filter") === filter));
            });
            if (empty) empty.hidden = shown !== 0;
            if (status) status.textContent = "Showing " + shown + " certification" + (shown === 1 ? "" : "s");
        }

        buttons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                apply(btn.getAttribute("data-filter"));
            });
        });

        apply("all");
    }

    /* ---------- Certificate preview lightbox ---------- */
    function initCertLightbox() {
        var dialog = $("[data-cert-lightbox]");
        var img = $("[data-cert-lightbox-img]");
        if (!dialog || !img || typeof dialog.showModal !== "function") return;

        $$("[data-cert-open]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var preview = $("img", btn);
                if (!preview) return;
                img.src = preview.currentSrc || preview.src;
                img.alt = preview.alt || "Certificate preview";
                dialog.showModal();
            });
        });

        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });

        dialog.addEventListener("close", function () {
            img.removeAttribute("src");
            img.alt = "";
        });
    }

    /* ---------- Project previews + viewer ---------- */
    function initProjects() {
        var cards = $$("[data-project]");
        var viewer = $("[data-project-viewer]");
        if (!cards.length || !viewer) return;

        var PREVIEW_WIDTH = 1280;
        var siteTitle = document.title;
        var activeSlug = null;
        var viewerTitle = $("[data-viewer-title]", viewer);
        var viewerExternal = $("[data-viewer-external]", viewer);
        var viewerClose = $("[data-viewer-close]", viewer);
        var viewerFrame = $("[data-viewer-frame]", viewer);
        var knownSlugs = {};

        cards.forEach(function (card) {
            var slug = card.getAttribute("data-slug");
            if (slug) knownSlugs[slug] = true;
        });

        function scalePreview(preview) {
            var frame = $("[data-project-frame]", preview);
            if (!frame) return;
            var width = preview.getBoundingClientRect().width;
            if (width > 0) frame.style.transform = "scale(" + (width / PREVIEW_WIDTH) + ")";
        }

        function loadPreviewFrame(frame) {
            var src = frame.getAttribute("data-src");
            if (!src || frame.getAttribute("src")) return;
            frame.setAttribute("src", src);
        }

        function initLazyPreviews() {
            var frames = $$("[data-project-frame][data-src]");
            if (!frames.length) return;

            if (!("IntersectionObserver" in window)) {
                frames.forEach(loadPreviewFrame);
                return;
            }

            var io = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    loadPreviewFrame(entry.target);
                    obs.unobserve(entry.target);
                });
            }, { rootMargin: "200px 0px" });

            frames.forEach(function (frame) { io.observe(frame); });
        }

        if ("ResizeObserver" in window) {
            var previewObserver = new ResizeObserver(function (entries) {
                entries.forEach(function (entry) {
                    scalePreview(entry.target);
                });
            });
            cards.forEach(function (card) {
                var preview = $("[data-project-preview]", card);
                if (preview) {
                    scalePreview(preview);
                    previewObserver.observe(preview);
                }
            });
        } else {
            cards.forEach(function (card) {
                var preview = $("[data-project-preview]", card);
                if (preview) scalePreview(preview);
            });
            window.addEventListener("resize", function () {
                cards.forEach(function (card) {
                    var preview = $("[data-project-preview]", card);
                    if (preview) scalePreview(preview);
                });
            });
        }

        initLazyPreviews();

        function findCard(slug) {
            return cards.filter(function (card) {
                return card.getAttribute("data-slug") === slug;
            })[0] || null;
        }

        function replaceViewerFrame(src, title) {
            var frame = viewerFrame.cloneNode(false);
            frame.removeAttribute("src");
            if (src) {
                frame.src = src;
                frame.title = title || "Project";
            }
            viewerFrame.replaceWith(frame);
            viewerFrame = frame;
        }

        function openViewer(card) {
            var slug = card.getAttribute("data-slug");
            var src = card.getAttribute("data-src");
            var external = card.getAttribute("data-external-href") || src;
            var title = ($("[data-project-link]", card) || {}).textContent || "Project";
            if (!slug || !src) return;
            if (slug === activeSlug) return;

            activeSlug = slug;
            replaceViewerFrame(src, title);
            viewerTitle.textContent = title;
            viewerExternal.href = external;
            viewerExternal.hidden = !external;
            document.title = title + " | " + siteTitle;
            viewer.hidden = false;
            document.body.classList.add("viewer-open");
            viewerClose.focus();
        }

        function closeViewer() {
            if (!activeSlug) return;
            var previous = activeSlug;
            activeSlug = null;
            replaceViewerFrame(null);
            document.title = siteTitle;
            viewer.hidden = true;
            document.body.classList.remove("viewer-open");
            var card = findCard(previous);
            var link = card ? $("[data-project-link]", card) : null;
            if (link) link.focus();
        }

        function route() {
            var raw = window.location.hash.replace(/^#\/?/, "");
            if (!raw || !knownSlugs[raw]) {
                closeViewer();
                return;
            }
            var card = findCard(raw);
            if (card) openViewer(card);
            else closeViewer();
        }

        viewerClose.addEventListener("click", function () {
            history.replaceState(null, "", window.location.pathname + window.location.search);
            closeViewer();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && activeSlug) {
                history.replaceState(null, "", window.location.pathname + window.location.search);
                closeViewer();
            }
        });

        window.addEventListener("hashchange", route);
        route();
    }

    /* ---------- Misc ---------- */
    function initYear() {
        var year = String(new Date().getFullYear());
        $$("[data-year]").forEach(function (el) { el.textContent = year; });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        initNav();
        initScrollUi();
        initActiveLinks();
        initReveal();
        initContacts();
        initCertFilters();
        initCertLightbox();
        initProjects();
        initProjectRails();
        initYear();
    });
})();

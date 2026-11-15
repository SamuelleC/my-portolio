/*
 * Runs synchronously in <head> before first paint:
 *  - breaks out of hostile iframes (clickjacking fallback for hosts without headers)
 *  - flags JS support for progressive enhancement
 *  - applies the saved / preferred colour theme without a flash
 */
(function () {
    "use strict";

    var root = document.documentElement;

    if (window.top !== window.self) {
        try {
            window.top.location.replace(window.self.location.href);
        } catch (e) {
            root.style.display = "none";
        }
    }

    root.classList.remove("no-js");
    root.classList.add("js");

    var stored = null;
    try {
        stored = window.localStorage.getItem("theme");
    } catch (e) {
        stored = null;
    }

    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", theme);
})();

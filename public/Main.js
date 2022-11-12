// Show loading screen, taken from https://stackoverflow.com/questions/25253391/javascript-loading-screen-while-page-loads
document.body.style.overflow = "hidden";

const wait = (delay = 0) =>
    new Promise((resolve) => setTimeout(resolve, delay));

const setVisible = (elementOrSelector, visible) =>
    ((typeof elementOrSelector === "string" ?
        document.querySelector(elementOrSelector) :
        elementOrSelector
    ).style.display = visible ? "block" : "none");

setVisible(".page", false);
setVisible("#loading", true);

document.addEventListener("DOMContentLoaded", () =>
    wait(1000).then(() => {
        setVisible(".page", true);
        setVisible("#loading", false);
        document.querySelector(".page").remove();
        document.querySelector("#loading").remove();
        document.body.removeAttribute("style");
    })
);

// Add trailing slash, without redirecting, to fix fetch request
if (!window.location.search) {
    let pathname = window.location.pathname;
    let url = (pathname += pathname.endsWith("/") ? "" : "/");
    if (!pathname.includes("/post/")) {
        // Prevent posts from breaking
        url = url.toLowerCase();
    }
    window.history.pushState(`${pathname}`, `${document.title}`, `${url}`);
}
"use strict";

import ky from "https://cdn.jsdelivr.net/npm/ky@0.30.0/distribution/index.min.js";
import { BootStrapIcons } from "./BootStrapIcons.js";
import { getSimplifiedDate } from "./timeFunctions.js";

const element = document.querySelector(".posts");
const spinner = document.createElement("span");
spinner.className = "lds-spinner";
spinner.innerHTML = `<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>`;
element.appendChild(spinner);

function loadPosts(post) {
    const a = document.createElement("a");
    const li = document.createElement("li");
    const time = post.taken_at_timestamp * 1000;
    const img = new Image();
    img.setAttribute("data-src", `/post/${post.shortcode}/thumb`);
    // img.src = `/post/${post.shortcode}/thumb`;
    img.className = "lazyload post";
    img.setAttribute("loading", "lazy");
    img.height = 230;
    img.width = 230;
    img.draggable = false;
    img.alt = `Photo by ${username} on ${getSimplifiedDate(time)}`;
    a.href = `/post/${post.shortcode}/`;
    a.setAttribute("role", "link");
    a.tabIndex = 0;
    li.appendChild(a);
    a.appendChild(img);
    if (post.is_video) {
        const i = document.createElement("i");
        i.className = `type_post ${BootStrapIcons.play_fill}`;
        a.appendChild(i);
    }
    if (post.type === "GraphSidecar") {
        const i = document.createElement("i");
        i.className = `type_post type_collection ${BootStrapIcons.collection_fill}`;
        a.appendChild(i);
    }
    return li;
}

(async() => {
    const json = await ky("./posts.json", {
            credentials: "include",
            mode: "no-cors",
            cache: "force-cache",
            timeout: 15000, // 15 seconds
            hooks: {
                beforeRequest: [
                    (request) => {
                        request.headers.set("Accept", "*/*");
                    },
                ],
                afterResponse: [
                    async(_request, _options, response) => {
                        // Catch invalid response codes
                        spinner.remove();
                        let a = await response.json();

                        a.find((element) => {
                            if (element.error) {
                                console.warn(element.error);
                            }
                        });

                        if (response.status == 404) {
                            const is_private = document.querySelector("#private");
                            const div = document.createElement("div");
                            const p = document.createElement("p");
                            const i = document.createElement("i");
                            p.id = "error";
                            if (!is_private) {
                                i.className = `${BootStrapIcons.camera}`;
                                p.textContent = "No Posts Yet";
                                element.appendChild(div);
                                div.appendChild(i);
                                div.appendChild(p);
                            }
                            return;
                        }
                        if (!response.ok) {
                            const is_private = document.querySelector("#private");
                            const div = document.createElement("div");
                            const p = document.createElement("p");
                            const i = document.createElement("i");
                            p.id = "error";
                            if (!is_private) {
                                i.className = `${BootStrapIcons.exclamation_circle}`;
                                p.textContent = "An Unknown Error has Occurred!";
                                element.appendChild(div);
                                div.appendChild(i);
                                div.appendChild(p);
                            }
                            return;
                        }
                    },
                ],
            },
        })
        .json()
        .catch((e) => {
            // Timeout catch
            spinner.remove();
            if ("response" in e && e.response.status == 404) {
                return;
            }
            console.error(e);
            const is_private = document.querySelector("#private");
            const div = document.createElement("div");
            const p = document.createElement("p");
            const i = document.createElement("i");
            p.id = "error";
            if (!is_private) {
                i.className = `${BootStrapIcons.exclamation_circle}`;
                p.textContent = "An Unknown Error has Occurred!";
                element.appendChild(div);
                div.appendChild(i);
                div.appendChild(p);
            }
        });

    if (json) {
        let end_cursor = null,
            has_next_page = true;
        try {
            end_cursor = json[0].end_cursor;
            has_next_page = json[0].has_next_page;
            for (const post of json[0].edges) {
                element.appendChild(loadPosts(post));
            }
            if (has_next_page && end_cursor) {
                let infScroll = new InfiniteScroll(element, {
                    path: function() {
                        return `posts?end_cursor=${end_cursor}`;
                    },
                    // load response as JSON
                    responseBody: "json",
                    status: ".page-load-status",
                    history: false,
                    fetchOptions: {
                        mode: "cors",
                        cache: "force-cache",
                        credentials: "same-origin",
                    },
                });

                infScroll.on("load", function(body) {
                    // compile body data
                    end_cursor = body[0].end_cursor;
                    has_next_page = body[0].has_next_page;
                    for (const post of body[0].edges) {
                        element.appendChild(loadPosts(post));
                    }
                });

                // load initial page
                infScroll.loadNextPage();
            }
        } catch (e) {
            console.error(e);
            const is_private = document.querySelector("#private");
            const div = document.createElement("div");
            const p = document.createElement("p");
            const i = document.createElement("i");
            p.id = "error";
            if (!is_private) {
                i.className = `${BootStrapIcons.exclamation_circle}`;
                p.textContent = "An Unknown Error has Occurred!";
                element.appendChild(div);
                div.appendChild(i);
                div.appendChild(p);
            }
        } finally {
            spinner.remove();
        }
    }
})();
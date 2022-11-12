"use strict";

import ky from "https://cdn.jsdelivr.net/npm/ky@0.30.0/distribution/index.min.js";
import { BootStrapIcons } from "./BootStrapIcons.js";
import {
    getCurrentTime,
    getISOString,
    getSimplifiedDate,
    DatesDifference,
} from "./timeFunctions.js";
import { clickableMentions, clickableHashtags } from "./elementFunctions.js";

const time = parseInt(taken_at) * 1000;

function displayComments(comment) {
    const username = comment.node.owner.username;
    const img = new Image();
    const time = document.createElement("time");
    const created_at = comment.node.created_at * 1000;
    time.setAttribute("datetime", getISOString(created_at));
    time.className = "date";
    time.title = getSimplifiedDate(created_at);
    time.textContent = DatesDifference(created_at, getCurrentTime, {
        short_mode: true,
        weeks: true,
    });
    img.setAttribute("data-src", `/user/${username}/thumb_pfp`);
    // img.src = `/user/${username}/thumb_pfp`;
    img.id = "post_pfp";
    img.className = "lazyload";
    img.onmouseover = function() {
        this.src = `/user/${username}/pfp`;
    };
    img.onmouseout = function() {
        this.src = `/user/${username}/thumb_pfp`;
    };
    img.width = 32;
    img.height = 32;
    img.setAttribute("loading", "lazy");
    img.alt = `${username}'s Profile Picture`;
    const a = document.createElement("a");
    a.className = "post_meta";
    const div = document.createElement("div");
    div.className = "post_comment";
    const username_elm = document.createElement("span");
    username_elm.className = "username_caption";
    const username_text = document.createTextNode(username);
    a.href = `/user/${username}/`;
    a.appendChild(img);
    a.appendChild(username_text);
    username_elm.appendChild(a);
    const comment_elm = document.createElement("div");
    comment_elm.className = "comment_element";
    const comment_text = document.createTextNode(comment.node.text);
    comment_elm.appendChild(comment_text);
    clickableMentions(comment_elm);
    clickableHashtags(comment_elm);
    div.appendChild(username_elm);
    div.appendChild(comment_elm);
    div.appendChild(time);
    return div;
}

// Load basic metadata
{
    // Add comments count to post
    let comment_element = document.querySelector(".comment");
    if (comment_count > 0) {
        comment_element.textContent = `${comment_count.toLocaleString(
      navigator.languages[0]
    )} comments `;
        if (comment_count === 1) {
            comment_element.textContent = `${comment_count.toLocaleString(
        navigator.languages[0]
      )} comment `;
        }
    }
    if (comment_count === 0) {
        document.querySelector(".comment").remove();
    }

    // Add like count to post
    let like_element = document.querySelector("p.likes");
    const like_number = parseInt(like_count);
    if (like_number > 0) {
        like_element.textContent = `${like_number.toLocaleString(
      navigator.languages[0]
    )} likes `;
        if (like_number === 1) {
            like_element.textContent = `${like_number.toLocaleString(
        navigator.languages[0]
      )} like `;
        }
    }
    if (like_number === 0) {
        document.querySelector("a.likes").remove();
    }

    // Add time to post
    const time_elm = document.querySelector("time.date");
    time_elm.setAttribute("datetime", getISOString(time));
    time_elm.textContent = DatesDifference(time);
    time_elm.title = getSimplifiedDate(time);

    // Add mentions and hashtags to posts
    const caption = document.querySelector("#caption");
    clickableMentions(caption);
    clickableHashtags(caption);
}

// Load actual content
(async() => {
    // Load collections
    try {
        const splide__list = document.querySelector(".splide__list");
        carousel_media_count = parseInt(carousel_media_count);
        if (Number.isInteger(carousel_media_count)) {
            let len = carousel_media_count - 1;
            for (var i = 0; i <= len; i++) {
                const img = new Image();
                const splide__slide = document.createElement("div");
                splide__slide.className = "splide__slide";
                const a = document.createElement("a");
                img.src = `./content?index=${i}`;
                // img.className = "splide";
                img.width = 512;
                img.height = 512;
                img.setAttribute("loading", "lazy");
                img.alt = `Photo by ${username} on ${getSimplifiedDate(time)}`;
                img.onerror = async function() {
                    const mime = await fetch(img.src, { method: "HEAD" }).then((res) =>
                        res.headers.get("Content-type")
                    );
                    const img_src = new URL(img.src);
                    const img_index = img_src.searchParams.get("index");
                    if (is_video || mime == "video/mp4") {
                        const video = document.createElement("video");
                        const source = document.createElement("source");
                        const splide__slide = document.createElement("div");
                        splide__slide.className = "splide__slide";
                        video.controls = true;
                        video.autoplay = true;
                        video.width = 512;
                        video.height = 512;
                        video.title = `Video by ${username} on ${getSimplifiedDate(time)}`;
                        source.src = `./content?index=${img_index}`;
                        source.type = "video/mp4";
                        video.appendChild(source);
                        img.outerHTML = video.outerHTML;
                    }
                };
                a.href = `./content?index=${i}`;
                a.setAttribute("role", "link");
                a.tabIndex = 0;
                a.appendChild(img);
                splide__slide.appendChild(a);
                splide__list.appendChild(splide__slide);
            }
        }

        // Single post loading
        if (!Number.isInteger(carousel_media_count)) {
            if (!is_video) {
                const img = new Image();
                const splide__slide = document.createElement("div");
                splide__slide.className = "splide__slide";
                const a = document.createElement("a");
                img.src = "./content";
                // img.className = "splide";
                img.width = 512;
                img.height = 512;
                img.setAttribute("loading", "lazy");
                img.alt = `Photo by ${username} on ${getSimplifiedDate(time)}`;
                a.href = `./content`;
                a.setAttribute("role", "link");
                a.tabIndex = 0;
                a.appendChild(img);
                splide__slide.appendChild(a);
                splide__list.appendChild(splide__slide);
            }
            if (is_video) {
                const video = document.createElement("video");
                const source = document.createElement("source");
                const splide__slide = document.createElement("div");
                splide__slide.className = "splide__slide";
                const a = document.createElement("a");
                video.controls = true;
                video.autoplay = true;
                video.width = 512;
                video.height = 512;
                video.title = `Video by ${username} on ${getSimplifiedDate(time)}`;
                source.src = "./content";
                source.type = "video/mp4";
                a.href = `./content`;
                a.setAttribute("role", "link");
                a.tabIndex = 0;
                video.appendChild(source);
                a.appendChild(video);
                splide__slide.appendChild(a);
                splide__list.appendChild(splide__slide);
            }
        }
    } finally {
        const splide = new Splide(".splide", {
            // autoWidth: true,
            // autoHeight: true,
            cover: true,
            heightRatio: 0.5,
            paginationDirection: "ltr",
            waitForTransition: true,
            wheel: true,
            height: "25rem",
        });

        splide.mount();
    }

    // Load comments
    {
        const container = document.querySelector(".container");
        const json = await ky("./comments", {
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
                            let a = await response.json();

                            a.find((element) => {
                                if (element.error) {
                                    console.warn(element.error);
                                }
                            });

                            if (!response.ok) {
                                console.error(response.status);
                                return;
                            }
                        },
                    ],
                },
            })
            .json()
            .catch((e) => {
                console.error(e);
                const div = document.createElement("div");
                const p = document.createElement("p");
                const i = document.createElement("i");
                p.id = "error";
                i.className = `${BootStrapIcons.exclamation_circle}`;
                p.textContent = "An Unknown Error has Occurred!";
                container.appendChild(div);
                div.appendChild(i);
                div.appendChild(p);
            });

        if (json) {
            const spinner = document.querySelector(".first-load");

            let end_cursor = null,
                has_next_page = true;
            try {
                end_cursor = json[0].end_cursor;
                has_next_page = json[0].has_next_page;
                for (const comment of json[0].edges) {
                    container.appendChild(displayComments(comment));
                }
            } catch (error) {
                console.error(error);
            } finally {
                spinner.remove();
            }
            // Infinite scroll the comments section
            const details = document.querySelector("#details");
            details.addEventListener("toggle", (event) => {
                if (details.open) {
                    if (has_next_page && end_cursor) {
                        let infScroll = new InfiniteScroll(container, {
                            path: function() {
                                return `comments?end_cursor=${end_cursor}`;
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
                            for (const comment of body[0].edges) {
                                container.appendChild(displayComments(comment));
                            }
                        });

                        // load initial page
                        infScroll.loadNextPage();
                    }
                }
            });
        }
    }
})();
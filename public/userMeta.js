"use strict";

import { clickableMentions, clickableHashtags } from "./elementFunctions.js";

const bio = document.querySelector("#bio");
clickableMentions(bio);
clickableHashtags(bio);

// Modify Profile Picture Image Dragging to High-res
document.querySelector("#pfp").addEventListener(
    "dragstart",
    function(e) {
        let img = document.createElement("img");
        img.style.height = "4em";
        img.src = `/user/#{username}/pfp`;
        let div = document.createElement("div");
        div.appendChild(img);
        div.id = "hover";
        document.querySelector("body").appendChild(div);
        e.dataTransfer.setDragImage(div, 0, 0);
    },
    false
);

// Remove error message from first load
let ul = document.querySelector(".posts");
ul.removeChild(ul.firstChild);

// Remove elements if required information is not present
let verified = document.querySelector("#verified");
let bio_url = document.querySelector("#url");
let is_private = document.querySelector("#private");
if (is_private) document.querySelector(".page-load-status").remove();
if (!is_private.textContent) is_private.remove();
if (!bio_url.textContent) bio_url.remove();
if (!verified.firstChild.className) verified.remove();
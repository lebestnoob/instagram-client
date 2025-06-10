import express from "express";
import { fetchBuilder, FileSystemCache } from "node-fetch-cache";
import { Headers } from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();
import compression from "compression";
import apicache from "apicache";
import path from "path";
import { abbreviateNumber } from "js-abbreviation-number";
import { toShortcode, fromShortcode } from "./postID.js";

const __dirname = path.resolve();
const fetch = fetchBuilder.withCache(
    new FileSystemCache({
        cacheDirectory: "", // Specify where to keep the cache. If undefined, '.cache' is used by default. If this directory does not exist, it will be created.
        ttl: 10800000, // 3 hours. Time to live. How long (in ms) responses remain cached before being automatically ejected. If undefined, responses are never automatically ejected from the cache.
    })
);

/*
USAGE:
http://localhost:3000/user/USERNAME/posts?all=true --- Return all posts

http://localhost:3000/user/USERNAME/thumb_pfp --- Low Resolution Preview
http://localhost:3000/user/USERNAME/pfp --- High Resolution 


http://localhost:3000/post/SHORTCODE/content --- Return SINGLE post high resolution image
http://localhost:3000/post/SHORTCODE/content?index=[i] --- Return high image/video from carousel
http://localhost:3000/post/SHORTCODE/thumb --- Return post/carousel thumbnail preview


http://localhost:3000/user/USERNAME/followers?all=true --- Return all followers
http://localhost:3000/user/USERNAME/followings?all=true --- Return all followings
*/

const app = express();
const cache = apicache.middleware;
app.use(cache("3 hour"));
app.use(compression());
app.set("case sensitive routing", true);
const port = process.env.PORT || 3000;
const service_name = process.env.SERVICE_NAME || "Photogram";


app.set("view engine", "pug");
app.set("json spaces", 2);

app.use("/assets", express.static(path.join(__dirname, "public")));


async function isRateLimited() {
    let status = false;
    await fetch(`https://i.instagram.com/api/v1/`, { headers: headers })
        .then((res) => res.json())
        .then((res) => {
            if ("message" in res && "status" in res) {
                status = true;
            } else {
                status = false;
            }
        })
        .catch(() => {
            status = false;
        });
    return status;
}

if (await isRateLimited()) {
    app.use(async(req, res, next) => {
        return res.status(429).sendFile(`${__dirname}/public/429.html`);
    });
}


const deletePropFromObj = (obj, deleteThisKey) => {
    if (Array.isArray(obj)) {
        obj.forEach((element) => deletePropFromObj(element, deleteThisKey));
    } else if (typeof obj === "object") {
        for (const key in obj) {
            const value = obj[key];
            if (key === deleteThisKey) delete obj[key];
            else deletePropFromObj(value, deleteThisKey);
        }
    }
};


const server = app.listen(port, () =>
    console.log(`Listening on port ${port}!`)
);
server.setTimeout(15000);
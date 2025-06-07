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

app.get("/post/:id/meta", async(req, res, next) => {
    let shortcode = req.params.id;
    let post_meta = [];
    let id = 0;
    id = fromShortcode(shortcode);

    try {
        await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                headers: headers,
            })
            .then((res) => res.json())
            .then((res) => {
                const items = res.items[0];
                // deletePropFromObj(items, "client_cache_key");
                // deletePropFromObj(items, "should_request_ads");
                // deletePropFromObj(items, "can_viewer_reshare");
                // deletePropFromObj(items, "has_liked");
                // deletePropFromObj(items, "top_likers");
                // deletePropFromObj(items, "photo_of_you");
                // deletePropFromObj(items, "video_dash_manifest");
                // deletePropFromObj(items, "organic_tracking_token");
                // deletePropFromObj(items, "can_viewer_save");
                // deletePropFromObj(items, "is_in_profile_grid");
                // deletePropFromObj(items, "profile_grid_control_enabled");
                // deletePropFromObj(items, "integrity_review_decision");
                // deletePropFromObj(items, "dash_manifest");
                // deletePropFromObj(items, "profile_pic_url");
                // deletePropFromObj(items, "did_report_as_spam");
                // deletePropFromObj(items, "friendship_status");

                // console.log(items.usertags.in);
                post_meta = [{
                    taken_at: items.taken_at,
                    like_and_view_counts_disabled: items.like_and_view_counts_disabled,
                    shortcode: items.code,
                    caption_is_edited: items.caption_is_edited,
                    id: items.id,
                    carousel_media_count: items.carousel_media_count,
                    // location: {
                    //     short_name: items.location.short_name,
                    //     name: items.location.name,
                    //     address: items.location.address,
                    //     city: items.location.city,
                    //     pk: items.location.pk,
                    // },
                    user: {
                        id: items.user.pk,
                        username: items.user.username,
                        full_name: items.user.full_name,
                        is_private: items.user.is_private,
                        is_verified: items.user.is_verified,
                    },
                    like_count: abbreviateNumber(items.like_count, 1, {
                        padding: false,
                    }),
                    caption: items.caption.text,
                    comment_count: abbreviateNumber(items.comment_count, 1, {
                        padding: false,
                    }),
                }, ];
            });
    } catch (err) {
        console.warn("Invalid post or rate limited!");
    }
    try {
        if (!Array.isArray(post_meta) || !post_meta.length) {
            post_meta = [{
                error: "The specified post was not found!",
            }, ];
            res.status(404).json(post_meta);
        } else {
            res.json(post_meta);
        }
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.get("/post/:id/", async(req, res, next) => {
    let shortcode = req.params.id;
    let post_meta = [];
    let is_video = false;
    let id = 0;
    id = fromShortcode(shortcode);

    try {
        await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                headers: headers,
            })
            .then((res) => res.json())
            .then((res) => {
                const items = res.items[0];
                if ("video_versions" in items) {
                    is_video = true;
                }

                post_meta = [{
                    taken_at: items.taken_at,
                    like_and_view_counts_disabled: items.like_and_view_counts_disabled,
                    shortcode: items.code,
                    caption_is_edited: items.caption_is_edited,
                    id: items.id,
                    carousel_media_count: items.carousel_media_count,
                    user: {
                        id: items.user.pk,
                        username: items.user.username,
                        full_name: items.user.full_name,
                        is_private: items.user.is_private,
                        is_verified: items.user.is_verified,
                    },
                    like_count: items.like_count,
                    caption: items.caption.text,
                    comment_count: items.comment_count,
                }, ];
            });
    } catch (err) {
        console.warn("Invalid post or rate limited!");
    }
    try {
        if (!Array.isArray(post_meta) || !post_meta.length) {
            return res.status(404).sendFile(`${__dirname}/public/404.html`);
        }
        let is_verified = "";

        if (post_meta[0].user.is_verified) {
            is_verified = "bi bi-patch-check-fill";
        } else {
            is_verified = "";
        }
        res.render(`${__dirname}/views/post.pug`, {
            title: `${post_meta[0].user.full_name} on Instagram: "${post_meta[0].caption}"`,
            caption: post_meta[0].caption,
            shortcode: post_meta[0].shortcode,
            username: post_meta[0].user.username,
            taken_at: post_meta[0].taken_at,
            like_count: post_meta[0].like_count,
            comment_count: post_meta[0].comment_count,
            carousel_media_count: post_meta[0].carousel_media_count,
            is_verified: is_verified,
            is_video: is_video,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/post/:id/thumb", async(req, res, next) => {
    let shortcode = req.params.id;
    let post = "";
    try {
        post = await fetch(
            `https://www.instagram.com/p/${shortcode}/media/?size=m`, {
                headers: bypass_headers,
            }
        ).then((res) => res.arrayBuffer());
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        res.type("png").send(Buffer.from(post));
    } catch {
        res.sendStatus(500);
    }
});

app.get("/post/:id/comments", async(req, res, next) => {
    let shortcode = req.params.id;
    let comments = [];
    try {
        if (req.query.end_cursor) {
            let end_cursor = req.query.end_cursor;
            let test = end_cursor.toString().trim().toLowerCase();
            let result = !(
                test === "false" ||
                test === "0" ||
                test === "" ||
                test === "undefined" ||
                test === "NaN" ||
                test === "null" ||
                test === "true"
            );
            if (!result) {
                return res.status(404).json([{
                    error: "The specified post does not have any comments!",
                }, ]);
            }
            await fetch(
                    `https://instagram.com/graphql/query/?query_hash=33ba35852cb50da46f5b5e889df7d159&&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            shortcode: shortcode,
                            include_reel: true,
                            fetch_mutual: true,
                            first: 20,
                            after: end_cursor,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let edges = res.data.shortcode_media.edge_media_to_comment.edges;
                    deletePropFromObj(edges, "profile_pic_url");
                    let mod = [{
                        edges: edges,
                        end_cursor: res.data.shortcode_media.edge_media_to_comment.page_info
                            .end_cursor,
                        has_next_page: res.data.shortcode_media.edge_media_to_comment.page_info
                            .has_next_page,
                    }, ];
                    return (comments = mod);
                });
        }
        if (!req.query.end_cursor) {
            // let after = null,
            // has_next = true;
            await fetch(
                    `https://instagram.com/graphql/query/?query_hash=33ba35852cb50da46f5b5e889df7d159&&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            shortcode: shortcode,
                            include_reel: true,
                            fetch_mutual: true,
                            first: 20,
                            after: null,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let edges = res.data.shortcode_media.edge_media_to_comment.edges;
                    deletePropFromObj(edges, "profile_pic_url");
                    let mod = [{
                        edges: edges,
                        end_cursor: res.data.shortcode_media.edge_media_to_comment.page_info
                            .end_cursor,
                        has_next_page: res.data.shortcode_media.edge_media_to_comment.page_info
                            .has_next_page,
                    }, ];
                    return (comments = mod);
                });
        }
    } catch (err) {
        console.warn("Invalid post or rate limited!");
    }
    try {
        if (!Array.isArray(comments) || !comments.length) {
            comments = [{
                error: "The specified post does not have any comments!",
            }, ];
            res.status(404).json(comments);
        } else {
            res.json(comments);
        }
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.get("/post/:id/content", async(req, res, next) => {
    let shortcode = req.params.id;
    let post = "";
    let image_url = "";
    let is_video = false;
    let id = 0;
    id = fromShortcode(shortcode);

    try {
        if (Object.keys(req.query).length > 0) {
            await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                    headers: headers,
                })
                .then((res) => res.json())
                .then((res) => {
                    const items = res.items[0];
                    if ("video_versions" in items.carousel_media[req.query.index]) {
                        is_video = true;
                        const video_versions =
                            items.carousel_media[req.query.index].video_versions;
                        let maxres = video_versions.reduce((highvid, vid) =>
                            highvid.height > vid.height ? highvid : vid
                        );
                        image_url = maxres.url;
                        return;
                    }
                    const image_versions =
                        items.carousel_media[req.query.index].image_versions2.candidates;
                    let maxres = image_versions.reduce((highimg, img) =>
                        highimg.width > img.width ? highimg : img
                    );
                    image_url = maxres.url;
                });
        }

        await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                headers: headers,
            })
            .then((res) => res.json())
            .then((res) => {
                const items = res.items[0];
                if ("video_versions" in items) {
                    is_video = true;
                    const video_versions = items.video_versions;
                    let maxres = video_versions.reduce((highvid, vid) =>
                        highvid.height > vid.height ? highvid : vid
                    );
                    image_url = maxres.url;
                    return;
                }
                const image_versions = items.image_versions2.candidates;
                let maxres = image_versions.reduce((highimg, img) =>
                    highimg.width > img.width ? highimg : img
                );
                image_url = maxres.url;
            })
            .catch(
                () =>
                (post = fetch(`https://www.instagram.com/p/${id}/media/?size=l`, {
                    headers: bypass_headers,
                }).then((res) => res.arrayBuffer()))
            );

        if (!is_video) {
            post = await fetch(image_url, {
                headers: headers,
            }).then((res) => res.arrayBuffer());
        }
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        if (is_video) {
            await fetch(image_url, { headers: headers })
                .then((response) => response.body)
                .then((response) => {
                    res.type("mp4");
                    response.pipe(res);
                });
        } else {
            res.type("png").send(Buffer.from(post));
        }
    } catch {
        res.sendStatus(500);
    }
});

const server = app.listen(port, () =>
    console.log(`Listening on port ${port}!`)
);
server.setTimeout(15000);
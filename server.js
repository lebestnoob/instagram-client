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
import normalize from "normalize-strings";
import { normalizeName } from "normalize-text";
import pkg from "normalize-unicode-text";
const { normalizeUnicodeText } = pkg;

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

let headers = new Headers({
    referer: "https://www.instagram.com/",
    cookie: "ig_pr=2; dpr=1; ig_nrcb=1; ds_user_id=null; sessionid=" +
        process.env.SESSION_ID +
        ";",
    "Cache-Control": "max-age=10800, immutable",
    scheme: "https",
    "user-agent": "Mozilla/5.0 (Linux; Android 12; SM-F926U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.61 Mobile Safari/537.36 Instagram 214.0.0.27.120 Android (31/12; 420dpi; 2208x1768; samsung; SM-F926U; o1s; exynos2100; it_IT; 332901678", // Using a Samsung Galaxy Z Fold 3 tricks Instagram into serving higher resolution images.
});

// Some private APIs do not work correctly with Samsung useragent.
let bypass_headers = new Headers({
    ...headers,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
});

app.set("view engine", "pug");
app.set("json spaces", 2);

app.use("/assets", express.static(path.join(__dirname, "public")));

function userCheck(username) {
    let a = new RegExp(
        /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
    );
    return a.test(username);
}

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

async function getBasicUserInfo(username) {
    await isRateLimited();
    let user = "";
    await fetch(
            `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${username}`, { headers: headers, redirect: "follow", follow: 20 }
        )
        .then((res) => res.json())
        .then((res) => {
            user = res.users.find((obj) => {
                return obj.user.username == username;
            });
        });
    if (!user) return undefined;
    return user;
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

app.get("/", async(req, res, next) => {
    return res.render(`${__dirname}/views/index.pug`, {
        service_name: service_name,
    });
});

app.get("/search", async(req, res, next) => {
    if (!req.query.q) return res.redirect("/");
    let query = decodeURIComponent(req.query.q);
    if (query.includes("#"))
        return res.redirect(`/tag/${query.replace("#", "")}`);
    if (query.includes("@"))
        return res.redirect(`/user/${query.replace("@", "")}`);
    if (query) {
        let users = "";
        try {
            await fetch(
                    `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${query}`, { headers: headers, redirect: "follow", follow: 20 }
                )
                .then((res) => res.json())
                .then((res) => {
                    deletePropFromObj(res, "profile_pic_url");
                    deletePropFromObj(res, "friendship_status");
                    deletePropFromObj(res, "rank_token");
                    deletePropFromObj(res, "see_more");
                    deletePropFromObj(res, "profile_pic_id");
                    deletePropFromObj(res, "has_more");
                    deletePropFromObj(res, "clear_client_cache");
                    deletePropFromObj(res, "position");
                    users = res;
                });
        } catch {
            console.warn("Invalid text or rate limited!");
        }
        try {
            res.render(`${__dirname}/views/search.pug`, {
                service_name: service_name,
                users: users.users,
            });
        } catch (err) {
            console.warn(err);
            res.sendStatus(500);
        }
    }
});

app.get("/user/:username/", async(req, res, next) => {
    let username = req.params.username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    let validuser = userCheck(username);

    if (!validuser || username.length > 30 || !username) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let name,
        bio,
        followers,
        posts_num,
        following,
        isprivate,
        verified,
        link,
        link_short,
        userId,
        category = "";

    let basic_user_info = await getBasicUserInfo(username);
    userId = basic_user_info.user.pk;
    name = basic_user_info.user.full_name;
    isprivate = basic_user_info.user.is_private;
    verified = basic_user_info.user.is_verified;

    if (!userId) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    try {
        // let res = await fetch(
        //     `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: headers }
        // ).then((res) => res.json());

        let res = await fetch(
            `https://i.instagram.com/api/v1/users/${userId}/info/`, { headers: headers }
        );
        // let res = await fetch(
        //     `https://www.instagram.com/${username}/channel/?__a=1`
        //     , {
        //         headers: headers,
        //     }
        // );
        res = await res.json();
        bio = res.user.biography;
        category = res.user.category;
        link = res.user.external_url;

        if (link) {
            link_short = link.replace(/(^\w+:|^)\/\//, "");
            link_short = link_short.replace(/\/$/, "");
        }

        if (isprivate) {
            isprivate = "This Account is Private.";
        } else {
            isprivate = "";
        }

        if (verified) {
            verified = "bi bi-patch-check-fill";
        } else {
            verified = "";
        }

        followers = abbreviateNumber(res.user.follower_count, 1, {
            padding: false,
        });
        following = abbreviateNumber(res.user.following_count, 1, {
            padding: false,
        });
        posts_num = abbreviateNumber(res.user.media_count, 1, {
            padding: false,
        });
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        res.render(`${__dirname}/views/user.pug`, {
            title: `${name} - (@${username})`,
            username: username,
            name: name,
            bio: bio,
            followers: followers,
            following: following,
            private: isprivate,
            posts_num: posts_num,
            verified: verified,
            id: userId,
            category: category,
            link: link,
            link_short: link_short,
            service_name: service_name,
        });
    } catch (err) {
        console.warn(err);
        res.sendStatus(500);
    }
});

// LOW RESOLUTON PROFILE PICTURE
app.get("/user/:username/thumb_pfp", async(req, res, next) => {
    let username = req.params.username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    let validuser = userCheck(username);

    if (!validuser || username.length > 30 || !username) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let pfp_url = "";
    let pfp = "";

    try {
        await fetch(
                `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${username}`, { headers: headers }
            )
            .then((res) => res.json())
            .then((res) => {
                pfp_url = res.users.find((obj) => {
                    return obj.user.username == username;
                });
            });
        pfp_url = pfp_url.user.profile_pic_url;

        pfp = await fetch(pfp_url, { headers: headers }).then((res) =>
            res.arrayBuffer()
        );
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        res.type("png").send(Buffer.from(pfp));
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

// HIGH RESOLUTION PROFILE PICTURE
app.get("/user/:username/pfp", async(req, res, next) => {
    let username = req.params.username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    let validuser = userCheck(username);

    if (!validuser || username.length > 30 || !username) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let userId = "";

    let basic_user_info = await getBasicUserInfo(username);
    userId = basic_user_info.user.pk;

    if (!userId) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let pfp_url = "";
    let pfp = "";

    try {
        await fetch(`https://i.instagram.com/api/v1/users/${userId}/info/`, {
                headers: headers,
            })
            .then((res) => res.json())
            .then((res) => {
                pfp_url = res.user.hd_profile_pic_url_info.url;
            });

        pfp = await fetch(pfp_url, { headers: headers }).then((res) =>
            res.arrayBuffer()
        );
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        res.type("png").send(Buffer.from(pfp));
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

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

app.get(
    ["/user/:username/posts", "/user/:username/posts.json"],
    async(req, res, next) => {
        let username = req.params.username;
        if (username.includes("@")) {
            username = username.replace("@", "");
        }
        username = username.toLowerCase();

        let validuser = userCheck(username);

        if (!validuser || username.length > 30 || !username) {
            return res.status(404).sendFile(`${__dirname}/public/404.html`);
        }

        let userId = "";

        let basic_user_info = await getBasicUserInfo(username);
        userId = basic_user_info.user.pk;

        if (!userId) {
            return res.status(404).sendFile(`${__dirname}/public/404.html`);
        }

        let posts = [];
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
                        error: "The specified user does not have any posts!",
                    }, ]);
                }
                await fetch(
                        `https://instagram.com/graphql/query/?query_id=17888483320059182&&variables=` +
                        encodeURIComponent(
                            JSON.stringify({
                                id: userId,
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
                        let mod = [];
                        let edges = res.data.user.edge_owner_to_timeline_media.edges.map(
                            ({ node }) => {
                                return {
                                    taken_at_timestamp: node.taken_at_timestamp,
                                    shortcode: node.shortcode,
                                    is_video: node.is_video,
                                    type: node.__typename,
                                    id: node.id,
                                };
                            }
                        );
                        mod = [{
                            end_cursor: res.data.user.edge_owner_to_timeline_media.page_info
                                .end_cursor,
                            has_next_page: res.data.user.edge_owner_to_timeline_media.page_info
                                .has_next_page,
                            edges: edges,
                        }, ];
                        return (posts = mod);
                    });
            }
            if (req.query.all) {
                let after = null,
                    has_next = true;
                while (has_next) {
                    await fetch(
                            `https://instagram.com/graphql/query/?query_id=17888483320059182&&variables=` +
                            encodeURIComponent(
                                JSON.stringify({
                                    id: userId,
                                    include_reel: true,
                                    fetch_mutual: true,
                                    first: 50,
                                    after: after,
                                })
                            ), {
                                headers: headers,
                            }
                        )
                        .then((res) => res.json())
                        .then((res) => {
                            has_next =
                                res.data.user.edge_owner_to_timeline_media.page_info
                                .has_next_page;
                            after =
                                res.data.user.edge_owner_to_timeline_media.page_info.end_cursor;

                            return (posts = posts.concat(
                                res.data.user.edge_owner_to_timeline_media.edges.map(
                                    ({ node }) => {
                                        return {
                                            taken_at_timestamp: node.taken_at_timestamp,
                                            shortcode: node.shortcode,
                                            is_video: node.is_video,
                                            type: node.__typename,
                                            id: node.id,
                                        };
                                    }
                                )
                            ));
                        });
                }
            }
            if (!req.query.end_cursor && !req.query.all) {
                // let after = null,
                // has_next = true;
                await fetch(
                        `https://instagram.com/graphql/query/?query_id=17888483320059182&&variables=` +
                        encodeURIComponent(
                            JSON.stringify({
                                id: userId,
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
                        let mod = [];
                        let edges = res.data.user.edge_owner_to_timeline_media.edges.map(
                            ({ node }) => {
                                return {
                                    taken_at_timestamp: node.taken_at_timestamp,
                                    shortcode: node.shortcode,
                                    is_video: node.is_video,
                                    type: node.__typename,
                                    id: node.id,
                                };
                            }
                        );
                        mod = [{
                            end_cursor: res.data.user.edge_owner_to_timeline_media.page_info
                                .end_cursor,
                            has_next_page: res.data.user.edge_owner_to_timeline_media.page_info
                                .has_next_page,
                            edges: edges,
                        }, ];
                        return (posts = mod);
                    });
            }
        } catch (err) {
            console.warn("Invalid user or rate limited!");
        }
        try {
            if (!Array.isArray(posts) || !posts.length) {
                posts = [{
                    error: "The specified user does not have any posts!",
                }, ];
                res.status(404).json(posts);
            } else {
                res.json(posts);
            }
        } catch {
            res.status(500).json({ error: "An Unknown Error Occurred!" });
        }
    }
);

app.get("/tag/:hashtag", async(req, res, next) => {
    let hashtag = req.params.hashtag;
    if (hashtag.includes("#")) {
        hashtag = hashtag.replace("#", "");
    }
    hashtag = hashtag.toLowerCase();

    if (hashtag.length > 30 || !hashtag) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let posts = [];
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
                    error: "The specified user does not have any posts!",
                }, ]);
            }
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=298b92c8d7cad703f7565aa892ede943&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            tag_name: hashtag,
                            first: 20,
                            after: end_cursor,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let mod = [];
                    let edges = res.data.hashtag.edge_hashtag_to_media.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    let top_edges = res.data.hashtag.edge_hashtag_to_top_posts.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    mod = [{
                        end_cursor: res.data.hashtag.edge_hashtag_to_media.page_info.end_cursor,
                        has_next_page: res.data.hashtag.edge_hashtag_to_media.page_info.has_next_page,
                        edges: edges,
                        edge_hashtag_to_top_posts: top_edges,
                    }, ];
                    return (posts = mod);
                });
        }
        if (req.query.all) {
            let after = null,
                has_next = true;
            while (has_next) {
                await fetch(
                        `https://www.instagram.com/graphql/query/?query_hash=298b92c8d7cad703f7565aa892ede943&variables=` +
                        encodeURIComponent(
                            JSON.stringify({
                                tag_name: hashtag,
                                first: 20,
                                after: after,
                            })
                        ), {
                            headers: headers,
                        }
                    )
                    .then((res) => res.json())
                    .then((res) => {
                        has_next =
                            res.data.hashtag.edge_hashtag_to_media.page_info.has_next_page;
                        after = res.data.hashtag.edge_hashtag_to_media.page_info.end_cursor;

                        posts = posts.concat(
                            res.data.user.edge_owner_to_timeline_media.edges.map(
                                ({ node }) => {
                                    return {
                                        taken_at_timestamp: node.taken_at_timestamp,
                                        shortcode: node.shortcode,
                                        is_video: node.is_video,
                                        type: node.__typename,
                                        id: node.id,
                                    };
                                }
                            )
                        );
                        return (posts = posts.concat(
                            res.data.hashtag.edge_hashtag_to_top_posts.edges.map(
                                ({ node }) => {
                                    return {
                                        shortcode: node.shortcode,
                                        taken_at_timestamp: node.taken_at_timestamp,
                                        is_video: node.is_video,
                                        type: node.__typename,
                                        id: node.id,
                                    };
                                }
                            )
                        ));
                    });
            }
        }
        if (!req.query.end_cursor && !req.query.all) {
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=298b92c8d7cad703f7565aa892ede943&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            tag_name: hashtag,
                            first: 20,
                            after: null,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let mod = [];
                    let edges = res.data.hashtag.edge_hashtag_to_media.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    let top_edges = res.data.hashtag.edge_hashtag_to_top_posts.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    mod = [{
                        end_cursor: res.data.hashtag.edge_hashtag_to_media.page_info.end_cursor,
                        has_next_page: res.data.hashtag.edge_hashtag_to_media.page_info.has_next_page,
                        edges: edges,
                        edge_hashtag_to_top_posts: top_edges,
                    }, ];
                    return (posts = mod);
                });
        }
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        if (!Array.isArray(posts) || !posts.length) {
            posts = [{
                error: "The specified user does not have any posts!",
            }, ];
            res.status(404).json(posts);
        } else {
            res.json(posts);
        }
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.get("/user/:username/followers", async(req, res, next) => {
    let username = req.params.username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    let validuser = userCheck(username);

    if (!validuser || username.length > 30 || !username) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let userId = "";

    let basic_user_info = await getBasicUserInfo(username);
    userId = basic_user_info.user.pk;

    if (!userId) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let followers = [];
    try {
        let after = null,
            has_next = true;
        while (has_next) {
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            id: userId,
                            include_reel: true,
                            fetch_mutual: true,
                            first: 50,
                            after: after,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    has_next = res.data.user.edge_followed_by.page_info.has_next_page;
                    after = res.data.user.edge_followed_by.page_info.end_cursor;
                    followers = followers.concat(
                        res.data.user.edge_followed_by.edges.map(({ node }) => {
                            return {
                                username: node.username,
                                full_name: normalizeName(
                                    normalize(normalizeUnicodeText(node.full_name))
                                ), // This triple conversion, or conversion, is really needed. This shouldn't be necessary at all, but WOW these people REALLY love their fancy usernames.
                            };
                        })
                    );
                });
        }
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        if (!Array.isArray(followers) || !followers.length) {
            followers = [{
                error: "The user was not found!",
            }, ];
            res.status(404).json(followers);
        } else {
            res.json(followers);
        }
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.get("/user/:username/following", async(req, res, next) => {
    let username = req.params.username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    let validuser = userCheck(username);

    if (!validuser || username.length > 30 || !username) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let userId = "";

    let basic_user_info = await getBasicUserInfo(username);
    userId = basic_user_info.user.pk;

    if (!userId) {
        return res.status(404).sendFile(`${__dirname}/public/404.html`);
    }

    let followings = [];
    try {
        let after = null,
            has_next = true;

        while (has_next) {
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            id: userId,
                            include_reel: true,
                            fetch_mutual: true,
                            first: 50,
                            after: after,
                        })
                    ), {
                        headers: headers,
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    has_next = res.data.user.edge_follow.page_info.has_next_page;
                    after = res.data.user.edge_follow.page_info.end_cursor;
                    followings = followings.concat(
                        res.data.user.edge_follow.edges.map(({ node }) => {
                            return {
                                username: node.username,
                                full_name: normalizeName(
                                    normalize(normalizeUnicodeText(node.full_name)) // This triple conversion, rather conversion at all, shouldn't be necessary at all, but WOW these people REALLY love their fancy usernames.
                                ),
                            };
                        })
                    );
                });
        }
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        if (!Array.isArray(followings) || !followings.length) {
            followings = [{
                error: "The user was not found!",
            }, ];
            res.status(404).json(followings);
        } else {
            res.json(followings);
        }
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.use(async(req, res, next) => {
    return res.status(404).sendFile(`${__dirname}/public/404.html`);
});

const server = app.listen(port, () =>
    console.log(`Listening on port ${port}!`)
);
server.setTimeout(15000);
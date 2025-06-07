import { Hono } from "hono";
const app = new Hono()

import headers from "../../utils/headers.js";
import { fromShortcode } from "../../utils/postID.js";

app.get("/:id/content", async(c) => {
    let shortcode = c.req.param().id;
    let post = "";
    let image_url = "";
    let is_video = false;
    let id = 0;
    id = fromShortcode(shortcode);

    try {
        if (Object.keys(c.req.query("id")).length > 0) {
            await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                    headers: headers(c),
                })
                .then((res) => res.ok ? res.json() : new Error(res))
                .then((res) => {
                    const items = res.items[0];
                    if ("video_versions" in items.carousel_media[req.query.index]) {
                        is_video = true;
                        const video_versions =
                            items.carousel_media[req.query.index].video_versions;
                        let maxres = video_versions.reduce((vid, vid2) =>
                            vid.height * vid.width > vid2.height * vid2.width ? vid : vid2
                        );
                        image_url = maxres.url;
                        return;
                    }
                    const image_versions =
                        items.carousel_media[req.query.index].image_versions2.candidates;
                    let maxres = image_versions.reduce((img, img2) =>
                        img.width * img.height > img2.width * img2.height ? img : img2
                    );
                    image_url = maxres.url;
                });
        }

        await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                headers: headers(c),
            })
            .then((res) => res.ok ? res.json() : new Error(res))
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
                headers: headers(c),
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
            return c.body(Buffer.from(post));
        }
    } catch {
        c.status(500);
    }
});


export default app;
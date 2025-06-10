import { Hono } from "hono";
const app = new Hono()

import headers from "../../utils/headers.js";
import { fromShortcode } from "../../utils/postID.js";

app.get("/:id/content", async(c) => {
    let shortcode = c.req.param().id;
    let post;
    let image_url;
    let is_video = false;
    let id = 0;
    id = fromShortcode(shortcode);

    try {
        await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                headers: headers(c),
            })
            .then((res) => res.ok ? res.json() : new Error(res))
            .then((res) => {
                const items = res.items[0];
                if ("video_versions" in items) {
                    is_video = true;
                    const video_versions = items.video_versions;
                    let maxres = video_versions.reduce((vid, vid2) =>
                        vid.height * vid.width > vid2.height * vid2.width ? vid : vid2
                    );
                    image_url = maxres.url;
                    return;
                }
                if ("image_versions2" in items) {
                    const image_versions = items.image_versions2.candidates;
                    let maxres = image_versions.reduce((img, img2) =>
                        img.width * img.height > img2.width * img2.height ? img : img2)
                    image_url = maxres.url;
                }
            })
            .catch(
                () =>
                (post = fetch(`https://www.instagram.com/p/${id}/media/?size=l`, {
                    headers: headers(c, {alternative: true}),
                }).then((res) => res.arrayBuffer()))
            );
        
            if (c.req.query("id") > 0) {
            await fetch(`https://i.instagram.com/api/v1/media/${id}/info/`, {
                    headers: headers(c),
                })
                .then((res) => res.ok ? res.json() : new Error(res))
                .then((res) => {
                    const items = res.items[0];
                    if ("video_versions" in items.carousel_media[c.req.query("id")]) {
                        is_video = true;
                        const video_versions =
                            items.carousel_media[c.req.query("id")].video_versions;
                        let maxres = video_versions.reduce((vid, vid2) =>
                            vid.height * vid.width > vid2.height * vid2.width ? vid : vid2
                        );
                        image_url = maxres.url;
                        return;
                    }
                    if("image_versions2" in items.carousel_media[c.req.query("id")]) {
                        const image_versions =
                            items.carousel_media[c.req.query("id")].image_versions2.candidates;
                            let maxres = image_versions.reduce((img, img2) =>
                                img.width * img.height > img2.width * img2.height ? img : img2
                        );
                        image_url = maxres.url;
                    }
                });
        }

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
            console.log(is_video)
            post = await fetch(image_url, { headers: headers(c) })
                .then((res) => res.arrayBuffer());
            c.header("Content-Type", "video/mp4");
            return c.body(Buffer.from(post));
        } else {
            return c.body(Buffer.from(post));
        }
    } catch {
        c.status(500);
    }
});


export default app;
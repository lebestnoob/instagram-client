import { Hono } from "hono";
import { fromShortcode } from "../../utils/postID.js";
import headers from "../../utils/headers.js";

const app = new Hono();

app.get("/:id", async(c) => {
    let shortcode = c.req.param().id;
    let post_meta = [];
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
                }];
            });
    } catch (err) {
        console.warn("Invalid post or rate limited!");
    }
    try {
        if (!Array.isArray(post_meta) || !post_meta.length) {
            return c.notFound();
        }
        return c.json(post_meta);
    } catch (err) {
        console.error(err);
        c.status(500);
    }
});

export default app;
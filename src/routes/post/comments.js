import { Hono } from "hono";
import headers from "../../utils/headers.js";
import { fromShortcode } from "../../utils/postID.js";

const app = new Hono();

app.get("/:id/comments", async(c) => {
    let shortcode = c.req.param().id;
    let comments = [];
    let id = 0;
    id = fromShortcode(shortcode);
    
    try {
            await fetch(
                    `https://i.instagram.com/api/v1/media/${id}/comments/?can_support_threading=true`, {
                        headers: headers(c),
                    }
                )
                .then((res) => res.ok ? res.json() : new Error(res))
                .then((res) => {
                    console.log(res)
                    comments = [res]
                });
    } catch (err) {
        console.warn("Invalid post or rate limited!");
    }
    try {
        if (!Array.isArray(comments) || !comments.length) {
            c.notFound()
        } else {
            return c.json(comments);
        }
    } catch {
        return c.status(500);
    }
});

export default app;

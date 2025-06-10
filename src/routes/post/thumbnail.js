import { Hono } from "hono";
import headers from "../../utils/headers.js";

const app = new Hono();

app.get("/:id/thumb", async(c) => {
    let shortcode = c.req.param().id;
    let post;
    try {
        post = await fetch(
            `https://www.instagram.com/p/${shortcode}/media/?size=m`, {
                headers: headers(c, {alternative: true}),
            }
        ).then((res) => res.arrayBuffer());
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        return c.body(Buffer.from(post));
    } catch {
        c.status(500);
    }
});

export default app;
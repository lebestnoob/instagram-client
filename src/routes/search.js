import { Hono } from 'hono'
import headers from "../utils/headers.js"

const app = new Hono()

app.get("/", async(c) => {
    const query = decodeURIComponent(c.req.query('q'));
    if (!query) return res.redirect("/");
    if (query.includes("#"))
        return res.redirect(`/tag/${query.replace("#", "")}`);
    if (query.includes("@"))
        return res.redirect(`/user/${query.replace("@", "")}`);
    if (query) {
        let search = {}
        try {
            await fetch(
                    `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${query}`, { headers: headers(c), redirect: "follow", follow: 20 }
                )
                .then((res) => res.ok ? res.json() : new Error(res))
                .then((res) => search = res);
        } catch {
            console.warn("Invalid request or rate limited!");
        }
        try {
            return c.json(search)
        } catch (err) {
            console.warn(err);
            return c.status(500);
        }
    }
}  
);

export default app
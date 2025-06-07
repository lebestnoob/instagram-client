import { Hono } from "hono";
const app = new Hono();

import headers from "../../utils/headers.js"
import userCheck from "../../utils/userCheck.js";
import getBasicUserInfo from '../../utils/getBasicUserInfo.js';

app.get("/:username/posts", async(c) => {
        let username = c.req.param().username;
        if (username.includes("@")) {
            username = username.replace("@", "");
        }
        username = username.toLowerCase();

        if (!userCheck(username) || username.length > 30 || !username) {
           return c.notFound()
        }

        let userId = "";

        let basic_user_info = await getBasicUserInfo(username);
        userId = basic_user_info.user.pk;

        if (!userId) {
            return c.notFound()
        }

        let posts = [];
        try {
                await fetch(`https://i.instagram.com/api/v1/feed/user/${userId}/`, {
                            headers: headers(c),
                        }
                    )
                    .then((res) => res.ok ? res.json() : null)
                    .then((res) => {
                        posts.push(res);
                    });
        } catch (err) {
            console.warn("Invalid user or rate limited!");
        }
        try {
            if (!Array.isArray(posts) || !posts.length) {
                posts = [{
                    error: "The specified user does not have any posts!",
                }, ];
                return c.notFound();
            } else {
                return c.json(posts);
            }
        } catch {
            return c.status(500);
        }
    }
);

export default app;
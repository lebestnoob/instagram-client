import { Hono } from "hono";
const app = new Hono()

import headers from "../../utils/headers.js"
import userCheck from "../../utils/userCheck.js";
import getBasicUserInfo from '../../utils/getBasicUserInfo.js';

app.get("/:username/pfp", async(c) => {
    let username = c.req.param().username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    if (!userCheck(username) || username.length > 30 || !username) return c.notFound()

    let userId = "";

    let basic_user_info = await getBasicUserInfo(username, c);
    userId = basic_user_info.user.pk;

    if (!userId) return c.notFound()

    let pfp_url = "";
    let pfp = "";

    try {
        await fetch(`https://i.instagram.com/api/v1/users/${userId}/info/`, {
                headers: headers(c),
            })
            .then((res) => res.json())
            .then((res) => {
                pfp_url = res.user.hd_profile_pic_url_info.url;
            });

        pfp = await fetch(pfp_url, { headers: headers(c) }).then((res) =>
            res.arrayBuffer()
        );
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        return c.body(Buffer.from(pfp));
    } catch {
        res.status(500).json({ error: "An Unknown Error Occurred!" });
    }
});

app.get("/:username/thumb_pfp", async(c) => {
    let username = c.req.param().username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase();

    if (!userCheck(username) || username.length > 30 || !username) return c.notFound()

    let userId = "";

    let basic_user_info = await getBasicUserInfo(username, c);
    userId = basic_user_info.user.pk;

    if (!userId) return c.notFound()

    let pfp_url = "";
    let pfp = "";

    try {
        await fetch(
                `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${username}`, { headers: headers(c) }
            )
            .then((res) => res.json())
            .then((res) => {
                pfp_url = res.users.find((obj) => {
                    return obj.user.username == username;
                }).user.profile_pic_url;
            });
        pfp = await fetch(pfp_url, { headers: headers(c) }).then((res) =>
            res.arrayBuffer()
        );
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        return c.body(Buffer.from(pfp));
    } catch {
        c.status(500);
    }
});


export default app
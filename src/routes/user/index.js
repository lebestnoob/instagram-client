import { Hono } from "hono";
const app = new Hono();

import headers from "../../utils/headers.js"
import userCheck from "../../utils/userCheck.js";
import getBasicUserInfo from '../../utils/getBasicUserInfo.js';

app.get(":username", async(c) => {
    let username = c.req.param().username;
    if (username.includes("@")) {
        username = username.replace("@", "");
    }
    username = username.toLowerCase(); 

    if (!userCheck(username) || username.length > 30 || !username) return c.notFound()

    let name,
        bio,
        followers,
        posts,
        following,
        isPrivate,
        verified,
        url,
        shortURL,
        userId,
        category;

    let basic_user_info = await getBasicUserInfo(username, c);
    userId = basic_user_info.user.pk;
    name = basic_user_info.user.full_name;
    isPrivate = basic_user_info.user.is_private;
    verified = basic_user_info.user.is_verified;

    if (!userId) return c.notFound()

    try {
        await fetch(
            `https://i.instagram.com/api/v1/users/${userId}/info/`, { headers: headers(c) }
        ).then((res) => res.ok ? res.json() : null).then((res) => {
            bio = res.user.biography;
            category = res.user.category;
            url = res.user.external_url;
    
            if (url) {
                shortURL = url.replace(/(^\w+:|^)\/\//, "");
                shortURL = shortURL.replace(/\/$/, "");
            }
    
            followers = res.user.follower_count;
            following = res.user.following_count;
            posts = res.user.media_count;
        })
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        return c.json({
            username: username,
            name: name,
            bio: bio,
            followers: followers,
            following: following,
            private: isPrivate,
            verified: verified,
            posts: posts,
            id: userId,
            category: category,
            url: url,
            shortURL: shortURL,
        })
    } catch (err) {
        console.warn(err);
        return c.status(500);
    }
});

export default app
import { Hono } from 'hono'
const app = new Hono()

import headers from "../../utils/headers.js"
import userCheck from '../../utils/userCheck.js';
import getBasicUserInfo from '../../utils/getBasicUserInfo.js';

import normalize from "normalize-strings";
import { normalizeName } from "normalize-text";
import pkg from "normalize-unicode-text";
const { normalizeUnicodeText } = pkg;

app.get("/:username/followers", async(c) => {
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
                        headers: headers(c),
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
                                normalized_name: normalizeName(
                                    normalize(normalizeUnicodeText(node.full_name))
                                ), // This triple conversion, or conversion, is really needed. This shouldn't be necessary at all, but WOW these people REALLY love their fancy usernames.
                                full_name: node.full_name,
                                is_verified: node.is_verified,
                                reel: node.reel,
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
            return c.notFound();
        } else {
            return c.json(followers);
        }
    } catch {
        return c.status(500);
    }
});

export default app
import { Hono } from "hono";
const app = new Hono()

import headers from "../utils/headers.js";

app.get("/:hashtag", async(c) => {
    let hashtag = c.req.param().hashtag;
    if (hashtag.includes("#")) {
        hashtag = hashtag.replace("#", "");
    }
    hashtag = hashtag.toLowerCase();

    if (hashtag.length > 30 || !hashtag) {
        return c.notFound()
    }

    let posts = [];
    try {
        if (c.req.query("end_cursor")) {
            let end_cursor = c.req.query("end_cursor");
            let test = end_cursor.toString().trim().toLowerCase();
            let result = !(
                test === "false" ||
                test === "0" ||
                test === "" ||
                test === "undefined" ||
                test === "NaN" ||
                test === "null" ||
                test === "true"
            );
            if (!result) {
                return c.notFound()
            }
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=298b92c8d7cad703f7565aa892ede943&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            tag_name: hashtag,
                            first: 20,
                            after: end_cursor,
                        })
                    ), {
                        headers: headers(c),
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let mod = [];
                    let edges = res.data.hashtag.edge_hashtag_to_media.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    let top_edges = res.data.hashtag.edge_hashtag_to_top_posts.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    mod = [{
                        end_cursor: res.data.hashtag.edge_hashtag_to_media.page_info.end_cursor,
                        has_next_page: res.data.hashtag.edge_hashtag_to_media.page_info.has_next_page,
                        edges: edges,
                        edge_hashtag_to_top_posts: top_edges,
                    }, ];
                    return (posts = mod);
                });
        }
        if (!c.req.query("end_cursor")) {
            await fetch(
                    `https://www.instagram.com/graphql/query/?query_hash=298b92c8d7cad703f7565aa892ede943&variables=` +
                    encodeURIComponent(
                        JSON.stringify({
                            tag_name: hashtag,
                            first: 20,
                            after: null,
                        })
                    ), {
                        headers: headers(c),
                    }
                )
                .then((res) => res.json())
                .then((res) => {
                    let mod = [];
                    let edges = res.data.hashtag.edge_hashtag_to_media.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    let top_edges = res.data.hashtag.edge_hashtag_to_top_posts.edges.map(
                        ({ node }) => {
                            return {
                                shortcode: node.shortcode,
                                taken_at_timestamp: node.taken_at_timestamp,
                                is_video: node.is_video,
                                type: node.__typename,
                                id: node.id,
                            };
                        }
                    );
                    mod = [{
                        end_cursor: res.data.hashtag.edge_hashtag_to_media.page_info.end_cursor,
                        has_next_page: res.data.hashtag.edge_hashtag_to_media.page_info.has_next_page,
                        edges: edges,
                        edge_hashtag_to_top_posts: top_edges,
                    }, ];
                    return (posts = mod);
                });
        }
    } catch (err) {
        console.warn("Invalid user or rate limited!");
    }
    try {
        if (!Array.isArray(posts) || !posts.length) {
            posts = [{
                error: "The specified user does not have any posts!",
            }, ];
            return c.notFound()
        } else {
            return c.json(posts)
        }
    } catch {
        return c.status(500)
    }
});

export default app
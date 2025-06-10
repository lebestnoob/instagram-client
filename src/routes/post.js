import { Hono } from "hono";
const app = new Hono()

import content from "./post/content.js"
import thumbnail from "./post/thumbnail.js"
import comments from "./post/comments.js"
import index from "./post/index.js"

app.route("/", content);
app.route("/", thumbnail);
app.route("/", comments);
app.route("/", index);

export default app
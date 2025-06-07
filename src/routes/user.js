import { Hono } from 'hono'
const app = new Hono()

import followers from "./user/followers.js"
import following from "./user/following.js"
import pfp from "./user/pfp.js"
import posts from "./user/posts.js"
import index from "./user/index.js"

app.route("/", followers)
app.route("/", following)
app.route("/", pfp)
app.route("/", posts)
app.route("/", index)

export default app
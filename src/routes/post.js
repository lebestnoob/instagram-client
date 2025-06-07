import { Hono } from "hono";
const app = new Hono()

import content from "./post/content"

app.route("/", content)

export default app
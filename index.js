import { Hono } from 'hono'
import { serve } from '@hono/node-server'

import search from "./src/routes/search.js"
import user from "./src/routes/user.js"
import tag from "./src/routes/tag.js"

const app = new Hono()

app.route("/search", search)
app.route("/user", user)
app.route("/tag", tag)

export default app
serve(app)
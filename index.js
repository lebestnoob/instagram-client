import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cache } from 'hono/cache'
import { trimTrailingSlash } from 'hono/trailing-slash'

import search from "./src/routes/search.js"
import user from "./src/routes/user.js"
import tag from "./src/routes/tag.js"
import post from './src/routes/post.js'

const app = new Hono()

app.use(trimTrailingSlash());

app.get("*",
  cache({
    cacheName: 'instagram-proxy',
    cacheControl: 'max-age=3600',
  }))

app.route("/search", search)
app.route("/user", user)
app.route("/tag", tag)
app.route("/post", post)

export default app
serve(app)
import { env } from 'hono/adapter'

function headers(c, {alternative = false} = {}) {
    const { SESSION_ID } = env(c);
    let h = new Headers({
        referer: "https://www.instagram.com/",
        cookie: "ig_pr=2; dpr=1; ig_nrcb=1; ds_user_id=null; sessionid=" +
        SESSION_ID + ";",
        "Cache-Control": "max-age=10800, immutable",
        scheme: "https",
        "user-agent": "Mozilla/5.0 (Linux; Android 12; SM-F926U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.61 Mobile Safari/537.36 Instagram 214.0.0.27.120 Android (31/12; 420dpi; 2208x1768; samsung; SM-F926U; o1s; exynos2100; it_IT; 332901678", // Using a Samsung Galaxy Z Fold 3 tricks Instagram into serving higher resolution images.
    });

    // Some private APIs do not work correctly with Samsung useragent.
    if(alternative)
        h = new Headers({
            ...h,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        });

    return h;
}

export default headers;



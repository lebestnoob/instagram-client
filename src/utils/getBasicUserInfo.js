import headers from "./headers.js";

async function getBasicUserInfo(username, c) {
    // await isRateLimited();
    let user = "";
    await fetch(
            `https://www.instagram.com/web/search/topsearch/?context=user&count=0&query=${username}`, { headers: headers(c), redirect: "follow", follow: 20 }
        )
        .then((res) => res.ok ? res.json() : new Error(res))
        .then((res) => {
            user = res.users.find((obj) => {
                return obj.user.username == username;
            });
        });
    if (!user) return undefined;
    return user;
}

export default getBasicUserInfo;
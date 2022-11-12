function clickableMentions(elm) {
    let usernames = elm.textContent.match(/@[a-zA-Z._0-9]+/g);
    if (usernames) {
        for (let username of usernames) {
            username = username.replace("@", "");
            if (username.length < 30) {
                if (username.endsWith(".")) username = username.slice(0, -1); // Extract username even if it is at the end of a sentence.
                let is_valid = new RegExp(
                    /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
                );
                if (is_valid.test(username)) {
                    const a = document.createElement("a");
                    a.href = `/user/${username}/`;
                    let linkText = document.createTextNode(`@${username}`);
                    a.appendChild(linkText);
                    elm.innerHTML = elm.innerHTML.replace(`@${username}`, a.outerHTML);
                    return elm;
                }
            }
        }
    }
}

function clickableHashtags(elm) {
    let hashtags = elm.textContent.match(/\#[a-zA-Z_]+/g);
    if (hashtags) {
        for (let hashtag of hashtags) {
            if (hashtag.length < 31) {
                let is_valid = new RegExp(/^#\w+$/gm);
                if (is_valid.test(hashtag)) {
                    const a = document.createElement("a");
                    a.href = `/tag/${hashtag.replace("#", "")}/`;
                    let linkText = document.createTextNode(hashtag);
                    a.appendChild(linkText);
                    elm.innerHTML = elm.innerHTML.replace(hashtag, a.outerHTML);
                    return elm;
                }
            }
        }
    }
}

export { clickableMentions, clickableHashtags };
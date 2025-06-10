function userCheck(username) {
    let a = new RegExp(
        /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
    );
    return a.test(username);
}

export default userCheck;
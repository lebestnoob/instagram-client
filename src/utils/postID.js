import bigInt from "big-integer";

let id = 0;
let lower = "abcdefghijklmnopqrstuvwxyz";
let upper = lower.toUpperCase();
let numbers = "0123456789";
let ig_alphabet = upper + lower + numbers + "-_";
let bigint_alphabet = numbers + lower;

function fromShortcode(shortcode) {
    let o = shortcode.replace(/\S/g, (m) => {
        let c = ig_alphabet.indexOf(m);
        let b = bigint_alphabet.charAt(c);
        return b != "" ? b : `<${c}>`;
    });
    id = bigInt(o, 64).toString(10);
    return id;
}

function toShortcode(longid) {
    let o = bigInt(longid).toString(64);
    return o.replace(/<(\d+)>|(\w)/g, (m, m1, m2) => {
        id = ig_alphabet.charAt(m1 ? parseInt(m1) : bigint_alphabet.indexOf(m2));
        return id;
    });
}

export { fromShortcode, toShortcode };
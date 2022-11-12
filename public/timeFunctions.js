const getCurrentTime = new Date();
const getCurrentYear = getCurrentTime.getFullYear();

function getMinuteDifference(
    start_date = new Date(0),
    end_date = getCurrentTime
) {
    start_date = new Date(start_date);
    end_date = new Date(end_date);
    return Math.trunc((Math.abs(start_date - end_date) / (1000 * 60)) % 60);
}

function getHourDifference(
    start_date = new Date(0),
    end_date = getCurrentTime
) {
    start_date = new Date(start_date);
    end_date = new Date(end_date);
    return Math.trunc(Math.abs(end_date - start_date) / 36e5);
}

function getDayDifference(start_date = new Date(0), end_date = getCurrentTime) {
    start_date = new Date(start_date);
    end_date = new Date(end_date);
    return Math.trunc(Math.abs(end_date - start_date) / (1000 * 3600 * 24));
}

function getWeekDifference(
    start_date = new Date(0),
    end_date = getCurrentTime
) {
    start_date = new Date(start_date);
    end_date = new Date(end_date);
    return Math.round(
        Math.abs(end_date - start_date) / (1000 * 60 * 60 * 24 * 7)
    );
}

function DatesDifference(
    start_date = new Date(0),
    end_date = getCurrentTime,
    options
) {
    let defaults = { short_mode: false, weeks: false };
    let params = {...defaults, ...options };

    const week_difference = getWeekDifference(start_date, end_date);
    const day_difference = getDayDifference(start_date, end_date);
    const hour_difference = getHourDifference(start_date, end_date);
    const minute_difference = getMinuteDifference(start_date, end_date);
    const locale_string = getLocaleString(start_date || end_date);
    let timestamp = "";
    if (!params.short_mode) {
        timestamp = locale_string;
    }

    if (hour_difference === 0 && day_difference === 0 && minute_difference < 60) {
        timestamp = `${minute_difference} minutes ago`;
        if (getMinuteDifference(start_date, end_date) === 1) {
            timestamp = `${minute_difference} minute ago`;
        }
        if (getMinuteDifference(start_date, end_date) === 0) {
            timestamp = "Now";
        }
    }
    if (hour_difference > 0 && hour_difference < 24 && day_difference === 0) {
        timestamp = `${hour_difference} hours ago`;
        if (getDayDifference(start_date, end_date) === 1) {
            timestamp = `${hour_difference} hour ago`;
        }
    }
    if (day_difference > 0 && day_difference < 8) {
        timestamp = `${day_difference} days ago`;
        if (day_difference === 1) {
            timestamp = `${day_difference} day ago`;
        }
    }
    if (day_difference > 7 && week_difference > 0 && params.weeks) {
        timestamp = `${week_difference} weeks ago`;
        if (week_difference === 1) {
            timestamp = `${week_difference} week ago`;
        }
    }
    if (params.short_mode) {
        const mapObj = {
            " weeks ago": "w",
            " week ago": "w",
            " days ago": "d",
            " day ago": "d",
            " hours ago": "hr",
            " hour ago": "hr",
            " minutes ago": "min",
            " minute ago": "min",
        };
        timestamp = timestamp.replace(
            /\b(?: weeks ago| week ago| days ago| day ago| hours ago| hour ago| minutes ago| minute ago)\b/gi,
            (matched) => mapObj[matched]
        );
        return timestamp;
    }
    return timestamp;
}

function getISOString(time = getCurrentTime) {
    time = new Date(time);
    return new Date(time).toISOString();
}

function getLocaleString(time = getCurrentTime, locale = undefined) {
    time = new Date(time);
    let written_date = new Date(time).toLocaleString(locale, {
        year: "numeric",
        month: "long",
        day: "2-digit",
    });
    if (written_date.includes(`, ${getCurrentYear}`)) {
        return (written_date = written_date.replace(`, ${getCurrentYear}`, ""));
    }
    return (written_date = written_date.replace(/\b0/g, ""));
}

function getSimplifiedDate(time = getCurrentTime, locale = undefined) {
    time = new Date(time);
    let short_date = new Date(time).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
    return (short_date = short_date.replace(/\b0/g, ""));
}

export {
    getCurrentTime,
    getCurrentYear,
    getISOString,
    getLocaleString,
    getSimplifiedDate,
    getMinuteDifference,
    getHourDifference,
    getDayDifference,
    getWeekDifference,
    DatesDifference,
};

export { getCurrentTime as default };
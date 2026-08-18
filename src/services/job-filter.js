const {
    jobPreferences
} = require("../config");


// ------------------------------------------
// Normalize text
// ------------------------------------------

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


// ------------------------------------------
// Check whether title matches target roles
// ------------------------------------------

function matchesTargetRole(title) {
    const normalizedTitle = normalizeText(title);

    return jobPreferences.targetRoles.some(role =>
        normalizedTitle.includes(normalizeText(role))
    );
}


// ------------------------------------------
// Check whether title is excluded
// ------------------------------------------

function isExcludedTitle(title) {
    const normalizedTitle = normalizeText(title);

    return jobPreferences.excludedTitles.some(keyword =>
        normalizedTitle.includes(normalizeText(keyword))
    );
}


// ------------------------------------------
// Check location
// ------------------------------------------

function matchesLocation(location) {
    const normalizedLocation = normalizeText(location);

    return jobPreferences.preferredLocations.some(place =>
        normalizedLocation.includes(normalizeText(place))
    );
}


// ------------------------------------------
// Calculate basic deterministic score
// ------------------------------------------

function calculateScore(job) {

    let score = 0;

    const title = normalizeText(job.title);
    const location = normalizeText(job.location);

    // Target role
    if (matchesTargetRole(title)) {
        score += 50;
    }

    // Location
    if (matchesLocation(location)) {
        score += 30;
    }

    // Remote
    if (job.remote) {
        score += 20;
    }

    // Excluded title
    if (isExcludedTitle(title)) {
        score = 0;
    }

    return Math.min(score, 100);
}


// ------------------------------------------
// Filter one job
// ------------------------------------------

function evaluateJob(job) {

    const title = normalizeText(job.title);
    const location = normalizeText(job.location);

    // First: reject unwanted titles
    if (isExcludedTitle(title)) {
        return {
            job,
            score: 0,
            eligible: false,
            reason: "EXCLUDED_TITLE"
        };
    }

    // Second: require target role
    if (!matchesTargetRole(title)) {
        return {
            job,
            score: 0,
            eligible: false,
            reason: "ROLE_MISMATCH"
        };
    }

    // Third: location
    if (!matchesLocation(location) && !job.remote) {
        return {
            job,
            score: 50,
            eligible: false,
            reason: "LOCATION_MISMATCH"
        };
    }

    const score = calculateScore(job);

    return {
        job,
        score,
        eligible: score >= jobPreferences.minMatchScore,
        reason:
            score >= jobPreferences.minMatchScore
                ? "MATCH"
                : "LOW_SCORE"
    };
}


// ------------------------------------------
// Filter all jobs
// ------------------------------------------

function filterJobs(jobs) {

    const results = jobs.map(evaluateJob);

    const eligible = results
        .filter(result => result.eligible)
        .sort((a, b) => b.score - a.score);

    return {
        all: results,
        eligible
    };
}


module.exports = {
    normalizeText,
    matchesTargetRole,
    isExcludedTitle,
    matchesLocation,
    calculateScore,
    evaluateJob,
    filterJobs
};
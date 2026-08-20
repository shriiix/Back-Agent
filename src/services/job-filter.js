const {
    jobPreferences
} = require("../config");

const fs = require("fs");
const path = require("path");

// ==================================================
// Load candidate profile
// ==================================================

const candidatePath = path.join(
    __dirname,
    "../../data/candidate.json"
);

if (!fs.existsSync(candidatePath)) {
    throw new Error(
        `Candidate profile not found: ${candidatePath}`
    );
}

const candidate = JSON.parse(
    fs.readFileSync(candidatePath, "utf8")
);


// ==================================================
// Text normalization
// ==================================================

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


// ==================================================
// Target role matching
// ==================================================

function getRoleMatches(title) {

    const normalizedTitle = normalizeText(title);

    return candidate.targetRoles.filter(role =>
        normalizedTitle.includes(
            normalizeText(role)
        )
    );
}


// ==================================================
// Excluded title matching
// ==================================================

function getExcludedTitleMatches(title) {

    const normalizedTitle = normalizeText(title);

    return jobPreferences.excludedTitles.filter(
        keyword =>
            normalizedTitle.includes(
                normalizeText(keyword)
            )
    );
}


// ==================================================
// Seniority detection
// ==================================================

function detectSeniority(title) {

    const normalizedTitle = normalizeText(title);

    const seniorityPatterns = {

        intern: [
            "intern",
            "internship"
        ],

        entry_level: [
            "entry level",
            "entry-level",
            "junior",
            "jr.",
            "jr "
        ],

        senior: [
            "senior",
            "sr.",
            "sr "
        ],

        staff: [
            "staff"
        ],

        principal: [
            "principal"
        ],

        lead: [
            "lead"
        ],

        manager: [
            "manager",
            "management"
        ],

        director: [
            "director"
        ],

        executive: [
            "vp",
            "vice president",
            "head of"
        ]
    };

    for (
        const [level, keywords]
        of Object.entries(seniorityPatterns)
    ) {

        if (
            keywords.some(keyword =>
                normalizedTitle.includes(
                    normalizeText(keyword)
                )
            )
        ) {
            return level;
        }
    }

    return "individual_contributor";
}


// ==================================================
// Location analysis
// ==================================================

function analyzeLocation(job) {

    const location = normalizeText(
        job.location
    );

    const indiaLocations = [
        "india",
        "pune",
        "mumbai",
        "bangalore",
        "bengaluru",
        "hyderabad",
        "delhi",
        "gurgaon",
        "gurugram",
        "noida",
        "chennai",
        "kolkata",
        "ahmedabad"
    ];

    const indiaMatch =
        indiaLocations.some(place =>
            location.includes(place)
        );

    const remoteMatch =
        location.includes("remote");

    const explicitIndiaRemote =
        remoteMatch &&
        (
            location.includes("india") ||
            location.includes("in-remote") ||
            location.includes("remote - india") ||
            location.includes("remote, india")
        );

    /*
     * Example:
     *
     * US - Remote
     * UK - Remote
     *
     * These should NOT automatically be treated
     * as India-eligible.
     */

    const regionSpecificRemote =
        remoteMatch &&
        (
            location.includes("us") ||
            location.includes("usa") ||
            location.includes("united states") ||
            location.includes("uk") ||
            location.includes("united kingdom") ||
            location.includes("canada") ||
            location.includes("europe") ||
            location.includes("australia")
        );

    const genericRemote =
        remoteMatch &&
        !indiaMatch &&
        !regionSpecificRemote;

    return {
        raw: job.location || "",

        indiaMatch,

        remoteMatch,

        explicitIndiaRemote,

        regionSpecificRemote,

        genericRemote
    };
}


// ==================================================
// Location eligibility
// ==================================================

function checkLocation(job) {

    const info = analyzeLocation(job);

    // Direct Indian location
    if (info.indiaMatch) {

        return {
            eligible: true,
            reason: "INDIA_LOCATION"
        };
    }

    // Explicit India remote
    if (info.explicitIndiaRemote) {

        return {
            eligible: true,
            reason: "INDIA_REMOTE"
        };
    }

    // US / UK / Canada / Europe etc. remote
    if (info.regionSpecificRemote) {

        return {
            eligible: false,
            reason: "REMOTE_REGION_NOT_INDIA"
        };
    }

    // Generic remote
    if (info.genericRemote) {

        return {
            eligible: false,
            reason: "REMOTE_REGION_UNCLEAR"
        };
    }

    return {
        eligible: false,
        reason: "LOCATION_NOT_ELIGIBLE"
    };
}


// ==================================================
// Career track detection
// ==================================================

function detectCareerTrack(title) {

    const normalizedTitle =
        normalizeText(title);

    const qaKeywords = [
        "qa engineer",
        "quality assurance",
        "software tester",
        "test engineer",
        "automation test",
        "test automation",
        "sdet",
        "quality engineer"
    ];

    const developmentKeywords = [
        "software engineer",
        "software developer",
        "full stack",
        "frontend",
        "front end",
        "backend",
        "back end",
        "react",
        "node",
        "javascript",
        "web developer",
        "web engineer",
        "ai engineer"
    ];

    const qaMatch =
        qaKeywords.some(keyword =>
            normalizedTitle.includes(keyword)
        );

    const developmentMatch =
        developmentKeywords.some(keyword =>
            normalizedTitle.includes(keyword)
        );

    if (qaMatch && developmentMatch) {
        return "hybrid";
    }

    if (qaMatch) {
        return "qa";
    }

    if (developmentMatch) {
        return "development";
    }

    return "unknown";
}


// ==================================================
// Experience extraction
// ==================================================

function extractRequiredYears(description) {

    const text = normalizeText(
        description
    );

    const patterns = [

        /(\d+)\s*\+?\s*years?\s*(?:of)?\s*experience/,

        /(\d+)\s*-\s*(\d+)\s*years?\s*(?:of)?\s*experience/,

        /minimum\s*(?:of)?\s*(\d+)\s*years?/,

        /at least\s*(\d+)\s*years?/
    ];

    for (
        const pattern of patterns
    ) {

        const match =
            text.match(pattern);

        if (!match) {
            continue;
        }

        if (match[2]) {

            return {
                min: Number(match[1]),
                max: Number(match[2])
            };
        }

        return {
            min: Number(match[1]),
            max: null
        };
    }

    return null;
}


// ==================================================
// Experience analysis
// ==================================================

function checkExperience(job) {

    const required =
        extractRequiredYears(
            job.description
        );

    const candidateYears =
        Number(
            candidate.experience
                ?.totalRelevantYears || 0
        );

    // JD doesn't clearly mention years
    if (!required) {

        return {
            eligible: true,

            borderline: false,

            reason:
                "EXPERIENCE_NOT_SPECIFIED",

            candidateYears,

            requiredYears: null
        };
    }

    // Clearly too senior
    if (
        required.min >
        candidateYears + 2
    ) {

        return {
            eligible: false,

            borderline: false,

            reason:
                "EXPERIENCE_SIGNIFICANTLY_HIGH",

            candidateYears,

            requiredYears:
                required.min
        };
    }

    // Slightly above candidate's
    // estimated experience.
    //
    // Don't reject automatically.
    // Let the AI matcher evaluate it later.
    if (
        required.min >
        candidateYears
    ) {

        return {
            eligible: true,

            borderline: true,

            reason:
                "EXPERIENCE_BORDERLINE",

            candidateYears,

            requiredYears:
                required.min
        };
    }

    return {
        eligible: true,

        borderline: false,

        reason:
            "EXPERIENCE_COMPATIBLE",

        candidateYears,

        requiredYears:
            required.min
    };
}


// ==================================================
// Score calculation
// ==================================================

function calculateScore(
    job,
    checks
) {

    let score = 0;

    // ----------------------------------------------
    // Role
    // ----------------------------------------------

    if (
        checks.roleMatches.length > 0
    ) {
        score += 40;
    }


    // ----------------------------------------------
    // Location
    // ----------------------------------------------

    if (
        checks.location.eligible
    ) {
        score += 25;
    }


    // ----------------------------------------------
    // Experience
    // ----------------------------------------------

    if (
        checks.experience.eligible
    ) {

        score +=
            checks.experience.borderline
                ? 10
                : 20;
    }


    // ----------------------------------------------
    // Career track
    // ----------------------------------------------

    if (
        checks.careerTrack !== "unknown"
    ) {

        score += 15;
    }


    return Math.min(
        score,
        100
    );
}


// ==================================================
// Evaluate one job
// ==================================================

function evaluateJob(job) {

    const roleMatches =
        getRoleMatches(
            job.title
        );

    const excludedMatches =
        getExcludedTitleMatches(
            job.title
        );

    const seniority =
        detectSeniority(
            job.title
        );

    const careerTrack =
        detectCareerTrack(
            job.title
        );

    const location =
        checkLocation(job);

    const experience =
        checkExperience(job);


    // ----------------------------------------------
    // Reject excluded titles
    // ----------------------------------------------

    if (
        excludedMatches.length > 0
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                "EXCLUDED_TITLE",

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Reject internship
    // ----------------------------------------------

    if (
        seniority === "intern"
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                "INTERNSHIP_ROLE",

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Reject senior roles
    // ----------------------------------------------

    if (
        [
            "senior",
            "staff",
            "principal",
            "lead",
            "manager",
            "director",
            "executive"
        ].includes(seniority)
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                "SENIOR_ROLE",

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Reject non-target roles
    // ----------------------------------------------

    if (
        roleMatches.length === 0
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                "ROLE_NOT_TARGETED",

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Reject location
    // ----------------------------------------------

    if (
        !location.eligible
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                location.reason,

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Significant experience mismatch
    // ----------------------------------------------

    if (
        !experience.eligible
    ) {

        return {
            job,

            eligible: false,

            score: 0,

            reason:
                experience.reason,

            roleMatches,

            excludedMatches,

            seniority,

            careerTrack,

            location,

            experience
        };
    }


    // ----------------------------------------------
    // Calculate score
    // ----------------------------------------------

    const score =
        calculateScore(
            job,
            {
                roleMatches,
                location,
                experience,
                careerTrack
            }
        );


    return {

        job,

        eligible:
            score >=
            jobPreferences.minMatchScore,

        score,

        reason:
            score >=
            jobPreferences.minMatchScore
                ? "MATCH"
                : "LOW_SCORE",

        roleMatches,

        excludedMatches,

        seniority,

        careerTrack,

        location,

        experience
    };
}


// ==================================================
// Filter all jobs
// ==================================================

function filterJobs(jobs) {

    const results =
        jobs.map(
            evaluateJob
        );

    const eligible =
        results
            .filter(
                result =>
                    result.eligible
            )
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    return {
        all: results,
        eligible
    };
}


// ==================================================
// Exports
// ==================================================

module.exports = {

    filterJobs,

    evaluateJob,

    detectSeniority,

    detectCareerTrack,

    checkLocation,

    checkExperience,

    extractRequiredYears,

    analyzeLocation
};
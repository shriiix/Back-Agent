const DEFAULT_MAX_CANDIDATES = 15;

/*
|--------------------------------------------------------------------------
| Candidate Role Configuration
|--------------------------------------------------------------------------
|
| Phase 3 is intentionally broad.
| It should identify potentially relevant jobs and leave detailed
| qualification decisions to Phase 4 (Groq).
|
*/

const ROLE_GROUPS = {
    development: [
        "software engineer",
        "software developer",
        "full stack engineer",
        "full stack developer",
        "frontend engineer",
        "frontend developer",
        "backend engineer",
        "backend developer",
        "web developer",
        "application developer",
        "application engineer",
        "node.js developer",
        "react developer",
        "javascript developer",
        "python developer",
        "java developer",
        "api developer",
        "platform engineer",
        "product engineer"
    ],

    qa: [
        "qa engineer",
        "quality assurance engineer",
        "software test engineer",
        "test engineer",
        "automation engineer",
        "qa automation engineer",
        "sdet",
        "quality engineer",
        "software quality engineer"
    ],

    hybrid: [
        "software engineer in test",
        "test automation developer",
        "qa developer",
        "quality automation engineer",
        "developer in test"
    ]
};


/*
|--------------------------------------------------------------------------
| Titles that should never reach Phase 4
|--------------------------------------------------------------------------
|
| These are clearly unrelated to the candidate's career direction.
|
*/

const HARD_EXCLUDED_ROLES = [
    "account executive",
    "account manager",
    "sales manager",
    "sales development",
    "business development representative",
    "business development manager",
    "recruiter",
    "recruiting",
    "human resources",
    "hr manager",
    "legal counsel",
    "attorney",
    "paralegal",
    "finance manager",
    "financial analyst",
    "accountant",
    "controller",
    "marketing manager",
    "marketing specialist",
    "communications manager",
    "customer success manager",
    "customer support",
    "technical writer",
    "office manager",
    "executive assistant",
    "operations manager",
    "procurement manager"
];


/*
|--------------------------------------------------------------------------
| Internship / student roles
|--------------------------------------------------------------------------
*/

const INTERNSHIP_KEYWORDS = [
    "intern",
    "internship",
    "student",
    "co-op",
    "coop"
];


/*
|--------------------------------------------------------------------------
| Senior roles
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These are NOT hard rejected.
|
| Phase 3 only marks them as senior.
| Phase 4 decides whether the experience gap is acceptable.
|
*/

const SENIOR_KEYWORDS = [
    "senior",
    "staff",
    "principal",
    "lead",
    "manager",
    "director",
    "head of",
    "architect"
];


/*
|--------------------------------------------------------------------------
| Location classification
|--------------------------------------------------------------------------
*/

function classifyLocation(job) {

    const location =
        String(job.location || "")
            .trim()
            .toLowerCase();

    const remote =
        Boolean(job.remote);


    if (!location || location === "n/a" || location === "na") {

        return {
            type: "UNKNOWN",
            priority: 2,
            score: 50
        };
    }


    /*
     * India
     */

    const indiaKeywords = [
        "india",
        "bengaluru",
        "bangalore",
        "pune",
        "mumbai",
        "hyderabad",
        "chennai",
        "gurgaon",
        "gurugram",
        "noida",
        "new delhi",
        "delhi",
        "kolkata",
        "ahmedabad",
        "jaipur",
        "kochi"
    ];


    if (
        indiaKeywords.some(
            keyword => location.includes(keyword)
        )
    ) {

        return {
            type: "INDIA",
            priority: 1,
            score: 100
        };
    }


    /*
     * India remote
     */

    if (
        location.includes("remote") &&
        (
            location.includes("india") ||
            location.includes("ind")
        )
    ) {

        return {
            type: "INDIA_REMOTE",
            priority: 1,
            score: 100
        };
    }


    /*
     * Generic remote.
     *
     * Don't assume it means India.
     */

    if (
        remote ||
        location.includes("remote")
    ) {

        return {
            type: "REMOTE",
            priority: 2,
            score: 70
        };
    }


    /*
     * Foreign location
     */

    return {
        type: "OTHER_REGION",
        priority: 3,
        score: 20
    };
}

function locationToText(location) {
    if (!location) {
        return "N/A";
    }

    if (typeof location === "string") {
        return location;
    }

    if (Array.isArray(location)) {
        return location.join(", ");
    }

    if (typeof location === "object") {
        return (
            location.city ||
            location.name ||
            location.country ||
            "N/A"
        );
    }

    return String(location);
}


/*
|--------------------------------------------------------------------------
| Detect role
|--------------------------------------------------------------------------
*/

function detectRole(title) {

    const normalized =
        String(title || "")
            .toLowerCase()
            .trim();


    for (
        const [
            track,
            roles
        ] of Object.entries(ROLE_GROUPS)
    ) {

        for (
            const role of roles
        ) {

            if (
                normalized.includes(role)
            ) {

                return {
                    match: true,
                    track,
                    role
                };
            }
        }
    }


    return {
        match: false,
        track: "unknown",
        role: null
    };
}


/*
|--------------------------------------------------------------------------
| Internship detection
|--------------------------------------------------------------------------
*/

function isInternship(title) {

    const normalized =
        String(title || "")
            .toLowerCase();


    return INTERNSHIP_KEYWORDS.some(
        keyword =>
            normalized.includes(keyword)
    );
}


/*
|--------------------------------------------------------------------------
| Seniority detection
|--------------------------------------------------------------------------
*/

function detectSeniority(title) {

    const normalized =
        String(title || "")
            .toLowerCase();


    for (
        const keyword of SENIOR_KEYWORDS
    ) {

        if (
            normalized.includes(keyword)
        ) {

            return {
                senior: true,
                keyword
            };
        }
    }


    return {
        senior: false,
        keyword: null
    };
}


/*
|--------------------------------------------------------------------------
| Hard unrelated role
|--------------------------------------------------------------------------
*/

function isHardExcluded(title) {

    const normalized =
        String(title || "")
            .toLowerCase();


    return HARD_EXCLUDED_ROLES.some(
        keyword =>
            normalized.includes(keyword)
    );
}


/*
|--------------------------------------------------------------------------
| Calculate Phase 3 priority
|--------------------------------------------------------------------------
|
| Higher score = send to Phase 4 earlier.
|
*/

function calculateCandidatePriority(job) {

    const role =
        detectRole(job.title);

    const location =
        classifyLocation(job);

    const seniority =
        detectSeniority(job.title);


    let score = 0;


    /*
     * Role is the most important Phase 3 signal.
     */

    if (role.match) {
        score += 50;
    }


    /*
     * India gets highest priority.
     */

    if (location.type === "INDIA") {
        score += 40;
    }

    else if (
        location.type === "INDIA_REMOTE"
    ) {
        score += 40;
    }

    else if (
        location.type === "REMOTE"
    ) {
        score += 20;
    }

    else if (
        location.type === "UNKNOWN"
    ) {
        score += 15;
    }


    /*
     * Senior roles are not rejected.
     *
     * We simply lower their priority slightly.
     */

    if (seniority.senior) {
        score -= 10;
    }


    /*
     * Jobs with descriptions are more useful
     * for Phase 4 AI analysis.
     */

    if (
        job.description &&
        String(job.description).length > 500
    ) {
        score += 5;
    }


    return score;
}


/*
|--------------------------------------------------------------------------
| Build candidate queue
|--------------------------------------------------------------------------
*/

function buildCandidateQueue(
    jobs,
    options = {}
) {

    const maxCandidates =
        Number(
            options.maxCandidates ||
            DEFAULT_MAX_CANDIDATES
        );


    const stats = {

        totalJobs:
            jobs.length,

        targetRoleJobs:
            0,

        rejectedInternship:
            0,

        rejectedUnrelated:
            0,

        rejectedLocation:
            0,

        seniorityFlags:
            0,

        aiCandidates:
            0
    };


    const candidates = [];


    for (
        const job of jobs
    ) {

        const title =
            String(
                job.title || ""
            ).trim();


        /*
         * No title = useless job.
         */

        if (!title) {
            continue;
        }


        /*
         * Hard reject clearly unrelated jobs.
         */

        if (
            isHardExcluded(title)
        ) {

            stats.rejectedUnrelated++;

            continue;
        }


        /*
         * Detect role.
         */

        const role =
            detectRole(title);


        if (!role.match) {

            stats.rejectedUnrelated++;

            continue;
        }


        stats.targetRoleJobs++;


        /*
         * Internships are excluded because
         * the candidate is targeting full-time roles.
         */

        if (
            isInternship(title)
        ) {

            stats.rejectedInternship++;

            continue;
        }


        /*
         * Location.
         *
         * IMPORTANT:
         * Foreign jobs are NOT automatically rejected here.
         *
         * They are simply ranked lower.
         *
         * This allows Phase 4 to inspect jobs whose
         * location may be ambiguous.
         */

        const location =
            classifyLocation(job);


        /*
         * Seniority is now a SOFT signal.
         */

        const seniority =
            detectSeniority(title);


        if (
            seniority.senior
        ) {

            stats.seniorityFlags++;
        }


        const priority =
            calculateCandidatePriority(
                job
            );


        candidates.push({

            ...job,

            phase3: {

                careerTrack:
                    role.track,

                roleMatch:
                    role.role,

                seniority:
                    seniority.senior
                        ? "senior"
                        : "individual_contributor",

                seniorityKeyword:
                    seniority.keyword,

                locationType:
                    location.type,

                locationPriority:
                    location.priority,

                locationScore:
                    location.score,

                priorityScore:
                    priority
            }
        });
    }


    /*
     * Sort:
     *
     * 1. India
     * 2. India Remote
     * 3. Remote
     * 4. Unknown
     * 5. Other regions
     *
     * Within those groups, use priority score.
     */

    candidates.sort(
        (a, b) => {

            const locationDifference =
                a.phase3.locationPriority -
                b.phase3.locationPriority;


            if (
                locationDifference !== 0
            ) {

                return locationDifference;
            }


            return (
                b.phase3.priorityScore -
                a.phase3.priorityScore
            );
        }
    );


    /*
     * Keep only the top N candidates.
     */

    const selected =
        candidates.slice(
            0,
            maxCandidates
        );


    stats.aiCandidates =
        selected.length;


    return {

        candidates:
            selected,

        stats
    };
}


/*
|--------------------------------------------------------------------------
| Backward-compatible filter function
|--------------------------------------------------------------------------
|
| Your existing index.js may already import filterJobs().
| Keep this function so the new implementation doesn't
| break the rest of the project.
|
*/

function filterJobs(
    jobs,
    options = {}
) {

    return buildCandidateQueue(
        jobs,
        options
    );
}


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {
    buildCandidateQueue,
    filterJobs,
    classifyLocation,
    detectRole,
    detectSeniority,
    isInternship,
    isHardExcluded,
    calculateCandidatePriority,
    locationToText
};
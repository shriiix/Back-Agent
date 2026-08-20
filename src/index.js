console.log("DEBUG 1: index.js started");

require("dotenv").config();

console.log("DEBUG 2: dotenv loaded");

const {
    collectGreenhouseJobs
} = require("./collectors/greenhouse");

console.log(
    "DEBUG 3: greenhouse collector loaded"
);

const {
    initDatabase,
    saveJobs,
    getJobs,
    closeDatabase
} = require("./db/database");

console.log(
    "DEBUG 4: database module loaded"
);

const {
    filterJobs,
    locationToText
} = require("./services/job-filter");

console.log(
    "DEBUG 5: job filter loaded"
);

const {
    runBatchMatching
} = require("./ai/batch-matcher");

console.log(
    "DEBUG 6: batch matcher loaded"
);

const fs = require("fs");
const path = require("path");


// ==================================================
// Load candidate profile
// ==================================================

const candidatePath = path.join(
    __dirname,
    "../data/candidate.json"
);

if (!fs.existsSync(candidatePath)) {
    throw new Error(
        `Candidate profile not found: ${candidatePath}`
    );
}

const candidate =
    JSON.parse(
        fs.readFileSync(
            candidatePath,
            "utf8"
        )
    );


// ==================================================
// MAIN
// ==================================================

async function main() {

    console.log(
        "================================="
    );

    console.log(
        "🚀 Job Application Agent"
    );

    console.log(
        "=================================\n"
    );


    try {

        // ==================================================
        // 1. Initialize database
        // ==================================================

        console.log(
            "🗄️ Initializing database..."
        );

        await initDatabase();

        console.log(
            "✅ Database ready\n"
        );


        // ==================================================
        // 2. Get board token
        // ==================================================

        const boardToken =
            process.argv[2];

        if (!boardToken) {

            console.log(
                "❌ Greenhouse board token missing."
            );

            console.log("");

            console.log(
                "Usage:"
            );

            console.log(
                "  node src/index.js <board-token>"
            );

            console.log("");

            console.log(
                "Example:"
            );

            console.log(
                "  node src/index.js stripe"
            );

            await closeDatabase();

            process.exit(1);
        }


        console.log(
            `🔎 Fetching jobs from: ${boardToken}\n`
        );


        // ==================================================
        // 3. Fetch jobs
        // ==================================================

        console.log(
            "🌐 Calling Greenhouse API..."
        );

        const jobs =
            await collectGreenhouseJobs(
                boardToken
            );

        console.log(
            "✅ Greenhouse API completed"
        );

        console.log(
            `📦 Found ${jobs.length} jobs\n`
        );


        // ==================================================
        // 4. Save jobs
        // ==================================================

        console.log(
            "💾 Saving jobs to database...\n"
        );

        const saveResult =
            await saveJobs(jobs);

        console.log(
            `✅ ${saveResult.total} jobs processed`
        );

        console.log(
            `🆕 ${saveResult.newJobs} new jobs`
        );

        console.log(
            `🔁 ${saveResult.existingJobs} already known\n`
        );


        // ==================================================
        // 5. Load jobs
        // ==================================================

        const storedJobs =
            await getJobs(1000);

        console.log(
            `📚 Loaded ${storedJobs.length} jobs from database\n`
        );


        // ==================================================
        // 6. Phase 3 — Candidate filtering
        // ==================================================

        console.log(
            "🔎 Building candidate queue..."
        );

        const filtered =
            filterJobs(
                storedJobs,
                {
                    maxCandidates: 15
                }
            );


        // ==================================================
        // 7. Phase 3 statistics
        // ==================================================

        const stats =
            filtered.stats || {};

        const candidates =
            filtered.candidates || [];


        const totalJobs =
            stats.totalJobs ??
            storedJobs.length;

        const roleMatches =
            stats.targetRoleJobs ?? 0;

        const internshipRejected =
            stats.rejectedInternship ?? 0;

        /*
         * Seniority is now a SOFT signal.
         *
         * Therefore we don't call these "rejected".
         */
        const seniorityFlags =
            stats.seniorityFlags ?? 0;

        const excludedRejected =
            stats.rejectedUnrelated ?? 0;

        const locationRejected =
            stats.rejectedLocation ?? 0;


        // ==================================================
        // 8. Candidate location breakdown
        // ==================================================

        const locationBreakdown = {

            INDIA: 0,

            INDIA_REMOTE: 0,

            REMOTE: 0,

            OTHER_REGION: 0,

            UNKNOWN: 0
        };


        candidates.forEach(
            result => {

                const category =
                    result.phase3?.locationType ||
                    "UNKNOWN";


                if (
                    locationBreakdown[
                        category
                    ] !== undefined
                ) {

                    locationBreakdown[
                        category
                    ]++;
                }
            }
        );


        // ==================================================
        // 9. Career track breakdown
        // ==================================================

        const trackBreakdown = {

            development: 0,

            qa: 0,

            hybrid: 0,

            unknown: 0
        };


        candidates.forEach(
            result => {

                const track =
                    result.phase3?.careerTrack ||
                    "unknown";


                if (
                    trackBreakdown[
                        track
                    ] !== undefined
                ) {

                    trackBreakdown[
                        track
                    ]++;
                }

                else {

                    trackBreakdown.unknown++;
                }
            }
        );


        // ==================================================
        // 10. Candidate queue summary
        // ==================================================

        console.log(
            "\n================================="
        );

        console.log(
            "📊 PHASE 3 — CANDIDATE QUEUE"
        );

        console.log(
            "================================="
        );


        console.log(
            `Total jobs:             ${totalJobs}`
        );

        console.log(
            `Target-role jobs:       ${roleMatches}`
        );

        console.log(
            `Rejected - internship:  ${internshipRejected}`
        );

        console.log(
            `Seniority flags:        ${seniorityFlags}`
        );

        console.log(
            `Rejected - unrelated:   ${excludedRejected}`
        );

        console.log(
            `Rejected - location:    ${locationRejected}`
        );

        console.log(
            `🤖 AI candidates:       ${candidates.length}`
        );


        // ==================================================
        // 11. Location breakdown
        // ==================================================

        console.log(
            "\n📍 AI CANDIDATE LOCATIONS"
        );

        console.log(
            `   India:          ${locationBreakdown.INDIA}`
        );

        console.log(
            `   India Remote:   ${locationBreakdown.INDIA_REMOTE}`
        );

        console.log(
            `   Remote:         ${locationBreakdown.REMOTE}`
        );

        console.log(
            `   Other Region:   ${locationBreakdown.OTHER_REGION}`
        );

        console.log(
            `   Unknown/N/A:    ${locationBreakdown.UNKNOWN}`
        );


        // ==================================================
        // 12. Career track
        // ==================================================

        console.log(
            "\n💼 CAREER TRACK"
        );

        console.log(
            `   Development:    ${trackBreakdown.development}`
        );

        console.log(
            `   QA:             ${trackBreakdown.qa}`
        );

        console.log(
            `   Hybrid:         ${trackBreakdown.hybrid}`
        );

        console.log(
            `   Unknown:        ${trackBreakdown.unknown}`
        );


        // ==================================================
        // 13. Display Phase 3 candidates
        // ==================================================

        console.log(
            "\n================================="
        );

        console.log(
            "🤖 PHASE 3 AI CANDIDATES"
        );

        console.log(
            "=================================\n"
        );


        if (
            candidates.length === 0
        ) {

            console.log(
                "No candidate jobs found."
            );

        }

        else {

            candidates.forEach(
                (result, index) => {

                    const job =
                        result;


                    const phase3 =
                        result.phase3 || {};


                    console.log(
                        `${index + 1}. ${job.title}`
                    );

                    console.log(
                        `   Company: ${
                            job.company || "N/A"
                        }`
                    );

                    console.log(
                        `   Location: ${
                            job.location || "N/A"
                        }`
                    );

                    console.log(
                        `   Location Type: ${
                            phase3.locationType ||
                            "UNKNOWN"
                        }`
                    );

                    console.log(
                        `   Track: ${
                            phase3.careerTrack ||
                            "unknown"
                        }`
                    );

                    console.log(
                        `   Seniority: ${
                            phase3.seniority ||
                            "individual_contributor"
                        }`
                    );

                    console.log(
                        `   Role Match: ${
                            phase3.roleMatch ||
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Priority Score: ${
                            phase3.priorityScore ??
                            "N/A"
                        }`
                    );

                    console.log(
                        `   URL: ${job.url}`
                    );

                    console.log("");
                }
            );
        }


        // ==================================================
        // 14. Phase 4 — AI matching
        // ==================================================

        console.log(
            "\n================================="
        );

        console.log(
            "🤖 PHASE 4 — AI JOB MATCHING"
        );

        console.log(
            "================================="
        );


        if (
            candidates.length === 0
        ) {

            console.log(
                "No jobs available for AI matching."
            );

            return;
        }


        console.log(
            `Candidate jobs: ${candidates.length}`
        );


        console.log(
            `Candidate: ${
                candidate.name || "N/A"
            }`
        );


        console.log(
            `Location: ${
                locationToText
                    ? locationToText(
                        candidate.location
                    )
                    : (
                        typeof candidate.location === "string"
                            ? candidate.location
                            : "N/A"
                    )
            }`
        );


        console.log(
            `Target roles: ${
                candidate.targetRoles
                    ? candidate.targetRoles.length
                    : 0
            }`
        );


        // ==================================================
        // 15. Run Groq batch matching
        // ==================================================

        console.log(
            "\n================================="
        );

        console.log(
            "🤖 STARTING GROQ BATCH ANALYSIS"
        );

        console.log(
            "=================================\n"
        );


        const batchResult =
            await runBatchMatching(
                candidate,
                candidates,
                {
                    delayMs: 1500
                }
            );


        // ==================================================
        // 16. Phase 4 summary
        // ==================================================

        const summary =
            batchResult.summary || {};


        console.log(
            "\n================================="
        );

        console.log(
            "📊 PHASE 4 — AI SUMMARY"
        );

        console.log(
            "================================="
        );


        console.log(
            `Total jobs:        ${
                summary.total ?? candidates.length
            }`
        );

        console.log(
            `Successful:        ${
                summary.successful ?? 0
            }`
        );

        console.log(
            `Failed:            ${
                summary.failed ?? 0
            }`
        );


        console.log("");

        console.log(
            `STRONG_MATCH:      ${
                summary.strongMatch ?? 0
            }`
        );

        console.log(
            `GOOD_MATCH:        ${
                summary.goodMatch ?? 0
            }`
        );

        console.log(
            `REVIEW:            ${
                summary.review ?? 0
            }`
        );

        console.log(
            `WEAK_MATCH:        ${
                summary.weakMatch ?? 0
            }`
        );

        console.log(
            `SKIP:              ${
                summary.skip ?? 0
            }`
        );


        // ==================================================
        // 17. Ranked jobs
        // ==================================================

        console.log(
            "\n================================="
        );

        console.log(
            "🏆 PHASE 4 — RANKED JOBS"
        );

        console.log(
            "=================================\n"
        );


        const ranked =
            batchResult.ranked || [];


        if (
            ranked.length === 0
        ) {

            console.log(
                "No successfully analyzed jobs."
            );

        }

        else {

            ranked.forEach(
                (item, index) => {

                    const job =
                        item.job;

                    const match =
                        item.match || {};


                    console.log(
                        `${index + 1}. ${job.title}`
                    );

                    console.log(
                        `   Company: ${
                            job.company || "N/A"
                        }`
                    );

                    console.log(
                        `   Location: ${
                            job.location || "N/A"
                        }`
                    );

                    console.log(
                        `   Score: ${
                            match.score ?? "N/A"
                        }/100`
                    );

                    console.log(
                        `   Recommendation: ${
                            match.recommendation ||
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Career Track: ${
                            match.careerTrack ||
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Role Match: ${
                            match.roleMatch ??
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Skills Match: ${
                            match.skillsMatch ??
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Experience: ${
                            match.experienceMatch ??
                            "N/A"
                        }`
                    );

                    console.log(
                        `   Location: ${
                            match.locationMatch ??
                            "N/A"
                        }`
                    );

                    console.log(
                        `   URL: ${job.url}`
                    );

                    console.log(
                        `   Reason: ${
                            match.reason ||
                            "N/A"
                        }`
                    );

                    console.log("");
                }
            );
        }


        // ==================================================
        // 18. Failed jobs
        // ==================================================

        const failedJobs =
            (batchResult.results || [])
                .filter(
                    item =>
                        !item.success
                );


        if (
            failedJobs.length > 0
        ) {

            console.log(
                "\n================================="
            );

            console.log(
                "❌ PHASE 4 FAILED JOBS"
            );

            console.log(
                "=================================\n"
            );


            failedJobs.forEach(
                item => {

                    console.log(
                        `❌ ${
                            item.job.title
                        }`
                    );

                    console.log(
                        `   Error: ${
                            item.error
                        }`
                    );

                    console.log("");
                }
            );
        }


        // ==================================================
        // 19. Phase 5 status
        // ==================================================

        const goodMatches =
            ranked.filter(
                item =>
                    item.match &&
                    (
                        item.match.recommendation ===
                            "GOOD_MATCH" ||

                        item.match.recommendation ===
                            "STRONG_MATCH"
                    )
            );


        console.log(
            "\n================================="
        );

        console.log(
            "📦 PHASE 5 — APPLICATION READINESS"
        );

        console.log(
            "================================="
        );


        console.log(
            `Application-ready jobs: ${
                goodMatches.length
            }`
        );


        if (
            goodMatches.length > 0
        ) {

            console.log(
                "\n🎯 Jobs eligible for Phase 5A:"
            );


            goodMatches.forEach(
                (item, index) => {

                    console.log(
                        `${index + 1}. ${
                            item.job.title
                        }`
                    );

                    console.log(
                        `   Company: ${
                            item.job.company
                        }`
                    );

                    console.log(
                        `   Score: ${
                            item.match.score
                        }/100`
                    );

                    console.log(
                        `   Recommendation: ${
                            item.match.recommendation
                        }`
                    );

                    console.log(
                        `   URL: ${
                            item.job.url
                        }`
                    );

                    console.log("");
                }
            );

        }

        else {

            console.log(
                "No GOOD_MATCH or STRONG_MATCH jobs yet."
            );

            console.log(
                "Phase 5A will not prepare an application."
            );
        }


        // ==================================================
        // 20. Safety
        // ==================================================

        console.log(
            "================================="
        );

        console.log(
            "🛡️ SAFETY CHECK"
        );

        console.log(
            "================================="
        );

        console.log(
            "No applications were submitted."
        );

        console.log(
            "Phase 4 only analyzed and stored AI matches."
        );

        console.log(
            "Phase 5 submission has NOT been triggered."
        );

        console.log(
            "================================="
        );


        console.log(
            "\n✅ PHASE 4 COMPLETED"
        );


    } finally {

        await closeDatabase();
    }
}


// ==================================================
// ERROR HANDLING
// ==================================================

main().catch(
    error => {

        console.error(
            "\n================================="
        );

        console.error(
            "❌ AGENT FAILED"
        );

        console.error(
            "================================="
        );

        console.error(
            "Error name:",
            error.name
        );

        console.error(
            "Error message:",
            error.message
        );


        if (error.stack) {

            console.error(
                "\nStack:"
            );

            console.error(
                error.stack
            );
        }


        process.exit(1);
    }
);
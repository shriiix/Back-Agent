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
    filterJobs
} = require("./services/job-filter");

console.log(
    "DEBUG 5: job filter loaded"
);


// ==================================================
// MAIN
// ==================================================

async function main() {

    console.log("=================================");
    console.log("🚀 Job Application Agent");
    console.log("=================================\n");


    // ==================================================
    // 1. Initialize database
    // ==================================================

    console.log("🗄️ Initializing database...");

    await initDatabase();

    console.log("✅ Database ready\n");


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

        console.log("Usage:");

        console.log(
            "  node src/index.js <board-token>"
        );

        console.log("");

        console.log("Example:");

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
    // 5. Load jobs from database
    // ==================================================

    const storedJobs =
        await getJobs(1000);

    console.log(
        `📚 Loaded ${storedJobs.length} jobs from database\n`
    );


    // ==================================================
    // 6. Apply deterministic filters
    // ==================================================

    console.log(
        "🔎 Applying candidate-aware filters...\n"
    );

    const filtered =
        filterJobs(storedJobs);


    // ==================================================
    // 7. Calculate statistics
    // ==================================================

    const roleMatches =
        filtered.all.filter(
            result =>
                result.roleMatches &&
                result.roleMatches.length > 0
        ).length;


    const locationMatches =
        filtered.all.filter(
            result =>
                result.location &&
                result.location.eligible
        ).length;


    const experienceCompatible =
        filtered.all.filter(
            result =>
                result.experience &&
                result.experience.eligible
        ).length;


    const experienceBorderline =
        filtered.all.filter(
            result =>
                result.experience &&
                result.experience.borderline
        ).length;


    const seniorityRejected =
        filtered.all.filter(
            result =>
                [
                    "INTERNSHIP_ROLE",
                    "SENIOR_ROLE"
                ].includes(
                    result.reason
                )
        ).length;


    const locationRejected =
        filtered.all.filter(
            result =>
                [
                    "LOCATION_NOT_ELIGIBLE",
                    "REMOTE_REGION_NOT_INDIA",
                    "REMOTE_REGION_UNCLEAR"
                ].includes(
                    result.reason
                )
        ).length;


    const experienceRejected =
        filtered.all.filter(
            result =>
                [
                    "EXPERIENCE_SIGNIFICANTLY_HIGH"
                ].includes(
                    result.reason
                )
        ).length;


    // ==================================================
    // 8. Rejection breakdown
    // ==================================================

    const reasonCounts = {};

    filtered.all.forEach(
        result => {

            reasonCounts[result.reason] =
                (
                    reasonCounts[
                        result.reason
                    ] || 0
                ) + 1;
        }
    );


    // ==================================================
    // 9. Print filter summary
    // ==================================================

    console.log(
        "================================="
    );

    console.log(
        "📊 FILTER RESULTS"
    );

    console.log(
        "================================="
    );

    console.log(
        `Total jobs:             ${storedJobs.length}`
    );

    console.log(
        `Role matches:           ${roleMatches}`
    );

    console.log(
        `Location matches:       ${locationMatches}`
    );

    console.log(
        `Experience compatible:  ${experienceCompatible}`
    );

    console.log(
        `Experience borderline:  ${experienceBorderline}`
    );

    console.log(
        `Seniority rejected:     ${seniorityRejected}`
    );

    console.log(
        `Location rejected:      ${locationRejected}`
    );

    console.log(
        `Experience rejected:    ${experienceRejected}`
    );

    console.log(
        `Final matches:          ${filtered.eligible.length}`
    );


    // ==================================================
    // 10. Rejection breakdown
    // ==================================================

    console.log(
        "\n📌 REJECTION BREAKDOWN\n"
    );

    Object.entries(
        reasonCounts
    )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .forEach(
            ([reason, count]) => {

                console.log(
                    `   ${reason}: ${count}`
                );
            }
        );


    console.log(
        "=================================\n"
    );


    // ==================================================
    // 11. Analyze role-matched jobs
    // ==================================================

    console.log(
        "🔍 ROLE-MATCHED JOB ANALYSIS\n"
    );


    const roleMatchedJobs =
        filtered.all
            .filter(
                result =>
                    result.roleMatches &&
                    result.roleMatches.length > 0
            )
            .slice(0, 50);


    if (
        roleMatchedJobs.length === 0
    ) {

        console.log(
            "No role-matched jobs found."
        );

    } else {

        roleMatchedJobs.forEach(
            (result, index) => {

                const job =
                    result.job;

                console.log(
                    `${index + 1}. ${job.title}`
                );

                console.log(
                    `   Location: ${job.location}`
                );

                console.log(
                    `   Role: ${
                        result.roleMatches.join(", ")
                    }`
                );

                console.log(
                    `   Track: ${result.careerTrack}`
                );

                console.log(
                    `   Seniority: ${result.seniority}`
                );

                console.log(
                    `   Location OK: ${
                        result.location.eligible
                    }`
                );

                console.log(
                    `   Location Reason: ${
                        result.location.reason
                    }`
                );

                console.log(
                    `   Experience OK: ${
                        result.experience.eligible
                    }`
                );

                console.log(
                    `   Experience Reason: ${
                        result.experience.reason
                    }`
                );

                console.log(
                    `   Required Years: ${
                        result.experience.requiredYears ??
                        "Not specified"
                    }`
                );

                console.log(
                    `   Candidate Years: ${
                        result.experience.candidateYears
                    }`
                );

                console.log(
                    `   Final Reason: ${
                        result.reason
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
    // 12. Final eligible jobs
    // ==================================================

    console.log(
        "================================="
    );

    console.log(
        "🎯 RELEVANT JOBS"
    );

    console.log(
        "=================================\n"
    );


    if (
        filtered.eligible.length === 0
    ) {

        console.log(
            "No jobs matched your current deterministic preferences."
        );

        console.log(
            "\nThese jobs are not necessarily bad matches."
        );

        console.log(
            "The next AI phase will evaluate borderline cases using your resume."
        );

    } else {

        filtered.eligible
            .slice(0, 50)
            .forEach(
                (result, index) => {

                    const job =
                        result.job;

                    console.log(
                        `${index + 1}. ${job.title}`
                    );

                    console.log(
                        `   Company: ${job.company}`
                    );

                    console.log(
                        `   Location: ${job.location}`
                    );

                    console.log(
                        `   Track: ${result.careerTrack}`
                    );

                    console.log(
                        `   Score: ${result.score}/100`
                    );

                    console.log(
                        `   Reason: ${result.reason}`
                    );

                    console.log(
                        `   Experience: ${
                            result.experience.reason
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
    // 13. Close database
    // ==================================================

    await closeDatabase();


    console.log(
        "================================="
    );

    console.log(
        "✅ Phase 3.1 completed"
    );

    console.log(
        "================================="
    );
}


// ==================================================
// ERROR HANDLING
// ==================================================

main().catch(
    async error => {

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

        try {

            await closeDatabase();

        } catch (closeError) {

            console.error(
                "Database close error:",
                closeError.message
            );
        }

        process.exit(1);
    }
);